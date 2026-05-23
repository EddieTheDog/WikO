// functions/api/auth/me.js

export async function onRequestGet(context) {
  try {
    const cookie = context.request.headers.get('Cookie') || ''
    const tokenMatch = cookie.match(/wikio_session=([^;]+)/)

    if (!tokenMatch) {
      return Response.json({ user: null, is_admin: false })
    }

    const session = await context.env.DB
      .prepare(`
        SELECT s.username, u.is_admin
        FROM sessions s
        JOIN users u ON u.username = s.username
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `)
      .bind(tokenMatch[1])
      .first()

    if (!session) return Response.json({ user: null, is_admin: false })

    return Response.json({ user: session.username, is_admin: session.is_admin === 1 })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
