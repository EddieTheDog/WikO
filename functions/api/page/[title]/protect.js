// functions/api/page/[title]/protect.js
// Toggle protection on a page — admin only

export async function onRequestPost(context) {
  try {
    const title = context.params.title
    const body = await context.request.json()
    const protect = body.protect !== false // default true
    const reason = body.reason || ''

    // Verify admin session
    const cookie = context.request.headers.get('Cookie') || ''
    const m = cookie.match(/wikio_session=([^;]+)/)
    if (!m) return Response.json({ error: 'Not logged in.' }, { status: 401 })

    const session = await context.env.DB
      .prepare(`
        SELECT s.username, u.is_admin
        FROM sessions s
        JOIN users u ON u.username = s.username
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `)
      .bind(m[1])
      .first()

    if (!session || !session.is_admin) {
      return Response.json({ error: 'Only administrators can protect pages.' }, { status: 403 })
    }

    const existing = await context.env.DB
      .prepare('SELECT id FROM pages WHERE title = ?')
      .bind(title)
      .first()

    if (!existing) {
      return Response.json({ error: 'Page not found.' }, { status: 404 })
    }

    await context.env.DB
      .prepare('UPDATE pages SET protected = ?, updated_at = CURRENT_TIMESTAMP WHERE title = ?')
      .bind(protect ? 1 : 0, title)
      .run()

    // Log protection action in revisions
    await context.env.DB
      .prepare('INSERT INTO revisions (page_title, content, editor, summary) VALUES (?, ?, ?, ?)')
      .bind(
        title,
        '', // no content change — just a log entry
        session.username,
        protect
          ? `Page protected by ${session.username}${reason ? ': ' + reason : ''}`
          : `Page unprotected by ${session.username}${reason ? ': ' + reason : ''}`
      )
      .run()

    return Response.json({ success: true, protected: protect, title, by: session.username })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
