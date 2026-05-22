import { marked } from 'marked'

const pages = {
  "Main_Page": `
{{Infobox}}
# Welcome to WikiO

WikiO is a free encyclopedia.

Visit the [[User:Example]] page.

You can also create new pages by changing the URL.
`,

  "User:Example": `
# User:Example

This is an example user page.
`
}

function templateReplace(text) {
  return text.replace(/\{\{Infobox\}\}/g, `
    <div class="infobox">
      <b>WikiO</b><br>
      Example template box
    </div>
  `)
}

function parseWikiLinks(text) {
  return text.replace(/\[\[(.*?)\]\]/g, (_, page) => {
    const safe = page.replace(/ /g, "_")
    return `<a href="/wiki/${safe}">${page}</a>`
  })
}

function renderPage(name) {
  const raw = pages[name] || `
# ${name}

This page does not exist yet.

You can create it below.
`

  let html = raw
  html = templateReplace(html)
  html = parseWikiLinks(html)
  html = marked.parse(html)

  document.getElementById('app').innerHTML = `
    <header>
      <div class="logo">WikiO</div>
      <input id="search" placeholder="Search WikiO">
    </header>

    <div class="container">
      <nav>
        <p><a href="/wiki/Main_Page">Main Page</a></p>
        <p><a href="/wiki/User:Example">User Page</a></p>
      </nav>

      <main>
        <h1 class="title">${name.replace(/_/g, ' ')}</h1>

        <div>${html}</div>

        <textarea id="editor">${raw.trim()}</textarea>
        <br>
        <button id="saveBtn">Save Page</button>
      </main>
    </div>
  `

  document.getElementById('saveBtn').onclick = () => {
    const content = document.getElementById('editor').value
    pages[name] = content
    localStorage.setItem('wikio-pages', JSON.stringify(pages))
    renderPage(name)
  }

  document.getElementById('search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const page = e.target.value.replace(/ /g, '_')
      history.pushState({}, '', `/wiki/${page}`)
      route()
    }
  })
}

const saved = JSON.parse(localStorage.getItem('wikio-pages') || '{}')
Object.assign(pages, saved)

function route() {
  let path = window.location.pathname

  if (path === '/') {
    history.replaceState({}, '', '/wiki/Main_Page')
    path = '/wiki/Main_Page'
  }

  const match = path.match(/^\/wiki\/(.+)$/)

  if (match) {
    renderPage(decodeURIComponent(match[1]))
  } else {
    renderPage('Main_Page')
  }
}

window.addEventListener('popstate', route)

route()
