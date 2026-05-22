export async function onRequestGet(context) {
  try {
    const title = context.params.title

    if (!context.env.DB) {
      return Response.json({
        error: 'D1 database not connected'
      }, {
        status: 500
      })
    }

    const page =
      await context.env.DB
        .prepare(
          'SELECT * FROM pages WHERE title = ?'
        )
        .bind(title)
        .first()

    return Response.json(
      page || {
        title,
        content: ''
      }
    )

  } catch (err) {

    return Response.json({
      error: err.message
    }, {
      status: 500
    })
  }
}

export async function onRequestPost(context) {
  try {
    const title = context.params.title

    const body =
      await context.request.json()

    if (!context.env.DB) {
      return Response.json({
        error: 'D1 database not connected'
      }, {
        status: 500
      })
    }

    await context.env.DB
      .prepare(`
        INSERT INTO pages
          (title, content)
        VALUES (?, ?)

        ON CONFLICT(title)
        DO UPDATE SET
          content = excluded.content,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(
        title,
        body.content
      )
      .run()

    return Response.json({
      success: true
    })

  } catch (err) {

    return Response.json({
      error: err.message
    }, {
      status: 500
    })
  }
}
