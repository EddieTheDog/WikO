// functions/api/page/[title]/move.js
// Move (rename) a page — copies content to new title, deletes old title

export async function onRequestPost(context) {
  try {
    const oldTitle = context.params.title
    const body = await context.request.json()
    const newTitle = (body.newTitle || '').trim().replace(/ /g, '_')
    const summary = body.summary || `Moved from ${oldTitle} to ${newTitle}`

    if (!newTitle) {
      return Response.json({ error: 'New title is required' }, { status: 400 })
    }
    if (newTitle === oldTitle) {
      return Response.json({ error: 'New title is the same as the current title' }, { status: 400 })
    }

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

    // Check source page exists
    const sourcePage = await context.env.DB
      .prepare('SELECT content FROM pages WHERE title = ?')
      .bind(oldTitle)
      .first()

    if (!sourcePage) {
      return Response.json({ error: `Page "${oldTitle}" does not exist` }, { status: 404 })
    }

    // Check target page does not already exist
    const targetPage = await context.env.DB
      .prepare('SELECT id FROM pages WHERE title = ?')
      .bind(newTitle)
      .first()

    if (targetPage) {
      return Response.json({
        error: `A page named "${newTitle.replace(/_/g,' ')}" already exists. Delete it first or choose a different title.`
      }, { status: 409 })
    }

    // Insert new page with the old content
    await context.env.DB
      .prepare('INSERT INTO pages (title, content) VALUES (?, ?)')
      .bind(newTitle, sourcePage.content)
      .run()

    // Record revision on new page
    await context.env.DB
      .prepare('INSERT INTO revisions (page_title, content, editor, summary) VALUES (?, ?, ?, ?)')
      .bind(newTitle, sourcePage.content, editor, summary)
      .run()

    // Delete the old page row (frontend handles leaving a redirect if checked)
    await context.env.DB
      .prepare('DELETE FROM pages WHERE title = ?')
      .bind(oldTitle)
      .run()

    return Response.json({ success: true, oldTitle, newTitle, editor })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
