// functions/api/page/[title]/index.js

// ── Helper: resolve session from cookie → { username, is_admin } or null
async function getSession(context) {
  const cookie = context.request.headers.get('Cookie') || ''
  const m = cookie.match(/wikio_session=([^;]+)/)
  if (!m) return null
  return context.env.DB
    .prepare(`
      SELECT s.username, u.is_admin
      FROM sessions s
      JOIN users u ON u.username = s.username
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `)
    .bind(m[1])
    .first()
}

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

    const session = await getSession(context)
    const editor = session ? session.username : 'Anonymous'

    // Check if page is protected — only admins can edit protected pages
    const existing = await context.env.DB
      .prepare('SELECT protected FROM pages WHERE title = ?')
      .bind(title)
      .first()

    if (existing && existing.protected && !(session && session.is_admin)) {
      return Response.json({ error: 'This page is protected. Only administrators can edit it.' }, { status: 403 })
    }

    await context.env.DB
      .prepare(`
        INSERT INTO pages (title, content)
        VALUES (?, ?)
        ON CONFLICT(title)
        DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
      `)
      .bind(title, content)
      .run()

    await context.env.DB
      .prepare('INSERT INTO revisions (page_title, content, editor, summary) VALUES (?, ?, ?, ?)')
      .bind(title, content, editor, summary)
      .run()

    return Response.json({ success: true, editor })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function onRequestDelete(context) {
  try {
    const title = context.params.title

    const session = await getSession(context)
    if (!session || !session.is_admin) {
      return Response.json({ error: 'Only administrators can delete pages.' }, { status: 403 })
    }

    const existing = await context.env.DB
      .prepare('SELECT id FROM pages WHERE title = ?')
      .bind(title)
      .first()

    if (!existing) {
      return Response.json({ error: 'Page not found.' }, { status: 404 })
    }

    // Record deletion in revisions before deleting
    await context.env.DB
      .prepare('INSERT INTO revisions (page_title, content, editor, summary) VALUES (?, ?, ?, ?)')
      .bind(title, '', session.username, `Page deleted by ${session.username}`)
      .run()

    await context.env.DB
      .prepare('DELETE FROM pages WHERE title = ?')
      .bind(title)
      .run()

    return Response.json({ success: true, deleted: title, by: session.username })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
