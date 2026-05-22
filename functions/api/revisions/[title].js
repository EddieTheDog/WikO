// functions/api/revisions/[title].js

export async function onRequestGet(context) {
  try {
    const title = context.params.title

    const { results } = await context.env.DB
      .prepare(`
        SELECT id, page_title, editor, summary, created_at
        FROM revisions
        WHERE page_title = ?
        ORDER BY created_at DESC
        LIMIT 50
      `)
      .bind(title)
      .all()

    return Response.json({ revisions: results })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
