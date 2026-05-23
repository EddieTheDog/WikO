// functions/api/auth/register.js

export async function onRequestPost(context) {
  try {
    const body = await context.request.json()
    const { username, password } = body

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 })
    }

    if (username.length < 2 || username.length > 40) {
      return Response.json({ error: 'Username must be 2–40 characters' }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Simple hash using Web Crypto (SHA-256 with a salt prefix)
    const encoder = new TextEncoder()
    const salt = crypto.randomUUID()
    const data = encoder.encode(salt + password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const passwordHash = `${salt}:${hashHex}`

    try {
      await context.env.DB
        .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
        .bind(username, passwordHash)
        .run()
    } catch (e) {
      if (e.message.includes('UNIQUE')) {
        return Response.json({ error: 'Username already taken' }, { status: 409 })
      }
      throw e
    }

    // Create session
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const user = await context.env.DB
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first()

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
