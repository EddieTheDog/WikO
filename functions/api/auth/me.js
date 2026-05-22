// functions/api/auth/me.js

export async function onRequestGet(context) {
  try {
    const cookie = context.request.headers.get('Cookie') || ''
    const tokenMatch = cookie.match(/wikio_session=([^;]+)/)

    if (!tokenMatch) {
      return Response.json({ user: null })
    }

    const session = await context.env.DB
      .prepare('SELECT username FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(tokenMatch[1])
      .first()

    return Response.json({ user: session ? session.username : null })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
