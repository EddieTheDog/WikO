import { marked } from 'marked'

function parseWiki(text) {
  text = text.replace(/\{\{Infobox\}\}/g, `
    <div class="infobox">
      <b>WikiO</b><br>
      Example Infobox Template
    </div>
  `)

  text = text.replace(/\[\[(.*?)\]\]/g, (_, page) => {
    const url = page.replace(/ /g, '_')
    return `<a href="/wiki/${url}">${page}</a>`
  })

  return marked.parse(text)
}

async function getPage(title) {
  const res = await fetch(`/api/page/${title}`)
  return await res.json()
}

async function savePage(title, content) {
  await fetch(`/api/page/${title}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })
}

async function render() {
  let path = window.location.pathname

  if (path === '/') {
    history.replaceState({}, '', '/wiki/Main_Page')
    path = '/wiki/Main_Page'
  }

  const title = decodeURIComponent(
    path.replace('/wiki/', '')
  )

  const data = await getPage(title)

  const content = data.content || `# ${title}\n\nPage does not exist.`

  document.getElementById('app').innerHTML = `
    <header>
      <div class="logo">WikiO</div>
      <input id="search" placeholder="Search WikiO">
    </header>

    <div class="layout">
      <aside>
        <p><a href="/wiki/Main_Page">Main Page</a></p>
        <p><a href="/wiki/User:Admin">User:Admin</a></p>
        <p><a href="/wiki/Template:Infobox">Template:Infobox</a></p>
      </aside>

      <main>
        <h1>${title.replace(/_/g, ' ')}</h1>

        <div>
          ${parseWiki(content)}
        </div>

        <textarea id="editor">${content}</textarea>
        <br>
        <button id="save">Save Page</button>
      </main>
    </div>
  `

  document.getElementById('save').onclick = async () => {
    const newContent =
      document.getElementById('editor').value

    await savePage(title, newContent)

    render()
  }

  document.getElementById('search')
    .addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const page =
          e.target.value.replace(/ /g, '_')

        history.pushState({}, '', `/wiki/${page}`)
        render()
      }
    })
}

window.addEventListener('popstate', render)

document.addEventListener('click', e => {
  const link = e.target.closest('a')

  if (link && link.href.startsWith(window.location.origin)) {
    e.preventDefault()

    const url = new URL(link.href)

    history.pushState({}, '', url.pathname)

    render()
  }
})

render()
