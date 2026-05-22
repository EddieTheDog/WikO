export async function onRequestGet(context) {
  const title = context.params.title

  const result = await context.env.DB
    .prepare('SELECT * FROM pages WHERE title = ?')
    .bind(title)
    .first()

  return Response.json(
    result || { title, content: '' }
  )
}

export async function onRequestPost(context) {
  const title = context.params.title

  const body = await context.request.json()

  await context.env.DB.prepare(`
    INSERT INTO pages (title, content)
    VALUES (?, ?)
    ON CONFLICT(title)
    DO UPDATE SET
      content = excluded.content,
      updated_at = CURRENT_TIMESTAMP
  `)
  .bind(title, body.content)
  .run()

  return Response.json({
    success: true
  })
}
