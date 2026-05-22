// functions/api/auth/logout.js

export async function onRequestPost(context) {
  try {
    const cookie = context.request.headers.get('Cookie') || ''
    const tokenMatch = cookie.match(/wikio_session=([^;]+)/)

    if (tokenMatch) {
      await context.env.DB
        .prepare('DELETE FROM sessions WHERE token = ?')
        .bind(tokenMatch[1])
        .run()
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'wikio_session=; Path=/; Max-Age=0'
      }
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
