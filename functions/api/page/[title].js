// functions/api/page/[title].js

export async function onRequestGet(context) {
  try {
    const title = context.params.title

    const result = await context.env.DB
      .prepare('SELECT * FROM pages WHERE title = ?')
      .bind(title)
      .first()

    return Response.json(result || { title, content: '' })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function onRequestPost(context) {
  try {
    const title = context.params.title
    const body = await context.request.json()
    const content = body.content ?? ''
    const summary = body.summary ?? ''

    // Resolve editor from session cookie
    let editor = 'Anonymous'
    const cookie = context.request.headers.get('Cookie') || ''
    const tokenMatch = cookie.match(/wikio_session=([^;]+)/)
    if (tokenMatch) {
      const session = await context.env.DB
        .prepare('SELECT username FROM sessions WHERE token = ? AND expires_at > datetime("now")')
        .bind(tokenMatch[1])
        .first()
      if (session) editor = session.username
    }

    // Upsert page
    await context.env.DB
      .prepare(`
        INSERT INTO pages (title, content)
        VALUES (?, ?)
        ON CONFLICT(title)
        DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
      `)
      .bind(title, content)
      .run()

    // Save revision
    await context.env.DB
      .prepare('INSERT INTO revisions (page_title, content, editor, summary) VALUES (?, ?, ?, ?)')
      .bind(title, content, editor, summary)
      .run()

    return Response.json({ success: true, editor })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
