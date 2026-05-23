// functions/api/auth/login.js

export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const { username, password } = body

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 })
    }

    const user = await context.env.DB
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first()

    if (!user) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Verify password
    const [salt, storedHash] = user.password_hash.split(':')
    const encoder = new TextEncoder()
    const data = encoder.encode(salt + password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (hashHex !== storedHash) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Create session
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await context.env.DB
      .prepare('INSERT INTO sessions (token, user_id, username, expires_at) VALUES (?, ?, ?, ?)')
      .bind(token, user.id, username, expires)
      .run()

    return new Response(JSON.stringify({ success: true, username }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `wikio_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      }
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
