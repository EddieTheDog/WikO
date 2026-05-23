// functions/api/pages/index.js
// Returns a list of all page titles (used for Random Article, search, etc.)

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB
      .prepare('SELECT title, updated_at FROM pages ORDER BY updated_at DESC')
      .all()

    return Response.json({ pages: results })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
