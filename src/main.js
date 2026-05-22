// WikiO — main.js
// Wikipedia-style wiki with wikitext parser

// ─── Wikitext Parser ──────────────────────────────────────────────────────────

function parseWikitext(raw) {
  if (!raw) return ''

  let text = raw

  // Collect <ref> citations before processing
  const refs = []
  text = text.replace(/<ref>([\s\S]*?)<\/ref>/g, (_, content) => {
    refs.push(content.trim())
    return `<sup class="reference"><a href="#cite_note-${refs.length}" id="cite_ref-${refs.length}">[${refs.length}]</a></sup>`
  })

  // <references/> tag → render footnote list
  text = text.replace(/<references\s*\/>/g, () => {
    if (refs.length === 0) return ''
    const items = refs.map((r, i) =>
      `<li id="cite_note-${i + 1}">
        <span class="mw-cite-backlink"><a href="#cite_ref-${i + 1}">↑</a></span>
        ${parseCiteTemplate(r)}
      </li>`
    ).join('')
    return `<div class="references"><ol>${items}</ol></div>`
  })

  // <nowiki> — escape wikitext inside
  text = text.replace(/<nowiki>([\s\S]*?)<\/nowiki>/g, (_, inner) =>
    inner
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\[/g, '&#91;')
      .replace(/\]/g, '&#93;')
      .replace(/\{/g, '&#123;')
      .replace(/\}/g, '&#125;')
  )

  // Templates: {{...}} — multi-line supported
  text = text.replace(/\{\{([\s\S]*?)\}\}/g, (_, inner) => parseTemplate(inner.trim()))

  // Headers (must be on their own line)
  // Process from deepest level first to avoid conflicts
  text = text.replace(/^======(.+?)======\s*$/gm, (_, t) => `<h6>${t.trim()}</h6>`)
  text = text.replace(/^=====(.+?)=====\s*$/gm, (_, t) => `<h5>${t.trim()}</h5>`)
  text = text.replace(/^====(.+?)====\s*$/gm, (_, t) => `<h4>${t.trim()}</h4>`)
  text = text.replace(/^===(.+?)===\s*$/gm, (_, t) => `<h3>${t.trim()}</h3>`)
  text = text.replace(/^==(.+?)==\s*$/gm, (_, t) => {
    const id = t.trim().replace(/\s+/g, '_')
    return `<h2 id="${id}"><span class="mw-headline">${t.trim()}</span></h2>`
  })
  text = text.replace(/^=(.+?)=\s*$/gm, (_, t) => `<h1>${t.trim()}</h1>`)

  // Tables: basic {| ... |}
  text = parseWikiTables(text)

  // Wikilinks [[Page|Label]] and [[Page]]
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const pipeIdx = inner.indexOf('|')
    const page = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner.trim()
    const label = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim() : inner.trim()
    const href = '/wiki/' + page.replace(/ /g, '_')
    const isRed = '' // Could check existence, skipping for now
    return `<a href="${href}" class="wikilink">${label}</a>`
  })

  // External links [url text] and bare [url]
  text = text.replace(/\[https?:\/\/([^\s\]]+)\s+([^\]]+)\]/g,
    (_, url, label) => `<a href="https://${url}" class="external" target="_blank" rel="noopener">${label}</a>`)
  text = text.replace(/\[https?:\/\/([^\s\]]+)\]/g,
    (_, url) => `<a href="https://${url}" class="external" target="_blank" rel="noopener">[link]</a>`)

  // Bold italic: '''''text'''''
  text = text.replace(/'''''(.+?)'''''/g, '<b><i>$1</i></b>')
  // Bold: '''text'''
  text = text.replace(/'''(.+?)'''/g, '<b>$1</b>')
  // Italic: ''text''
  text = text.replace(/''(.+?)''/g, '<i>$1</i>')

  // Definition lists: ;term :definition
  text = text.replace(/^;(.+)$/gm, '<dt>$1</dt>')
  text = text.replace(/^:(.+)$/gm, '<dd>$1</dd>')
  // Wrap dt/dd pairs
  text = text.replace(/(<dt>.*?<\/dt>\s*<dd>.*?<\/dd>)/gs,
    '<dl>$1</dl>')

  // Unordered lists: * item, ** sub-item
  text = parseWikiLists(text, /^\*+ /, 'ul')
  // Ordered lists: # item
  text = parseWikiLists(text, /^#+ /, 'ol')

  // Horizontal rule
  text = text.replace(/^----$/gm, '<hr>')

  // Paragraphs: blank lines → <p> breaks
  text = text.split(/\n\n+/).map(block => {
    block = block.trim()
    if (!block) return ''
    // Don't wrap block-level elements in <p>
    if (/^<(h[1-6]|ul|ol|dl|table|div|hr|blockquote)/i.test(block)) return block
    return `<p>${block.replace(/\n/g, ' ')}</p>`
  }).join('\n')

  return text
}

// Parse {{template|key=value|...}} blocks
function parseTemplate(inner) {
  const lines = inner.split('\n').map(l => l.trim()).filter(Boolean)
  const firstLine = lines[0]

  // Determine template name (may be on first line with or without pipe)
  let name = firstLine.split('|')[0].trim()

  // Collect params from all lines
  const params = {}
  const allText = lines.join('\n')
  const parts = allText.split('|').slice(1)
  parts.forEach(part => {
    const eq = part.indexOf('=')
    if (eq >= 0) {
      const k = part.slice(0, eq).trim()
      const v = part.slice(eq + 1).trim()
      params[k] = v
    }
  })

  const nameLower = name.toLowerCase()

  // Infobox
  if (nameLower === 'infobox') {
    const rows = Object.entries(params)
      .filter(([k]) => k !== 'title' && k !== 'image' && k !== 'caption')
      .map(([k, v]) => `<tr><th>${capitalise(k)}</th><td>${v}</td></tr>`)
      .join('')
    const titleRow = params.title
      ? `<caption class="infobox-title">${params.title}</caption>` : ''
    const imageRow = params.image
      ? `<tr><td colspan="2" class="infobox-image"><img src="${params.image}" alt="${params.caption || ''}"></td></tr>` : ''
    return `<table class="infobox">${titleRow}<tbody>${imageRow}${rows}</tbody></table>`
  }

  // Stub notice
  if (nameLower === 'stub') {
    return `<div class="stub-notice">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Writing_stub.svg/30px-Writing_stub.svg.png" alt="">
      <i>This article is a <a href="/wiki/Help:Stub" class="wikilink">stub</a>. You can help WikiO by expanding it.</i>
    </div>`
  }

  // Disambiguation
  if (nameLower === 'disambiguation') {
    return `<div class="hatnote">This is a <a href="/wiki/Help:Disambiguation" class="wikilink">disambiguation</a> page — a list of articles with similar titles.</div>`
  }

  // Redirect
  if (nameLower === 'redirect') {
    const target = params['1'] || ''
    return `<div class="hatnote">↪ Redirect to <a href="/wiki/${target.replace(/ /g, '_')}" class="wikilink">${target}</a></div>`
  }

  // cite web / cite news / cite book / cite journal
  if (['cite web', 'cite news', 'cite book', 'cite journal'].includes(nameLower)) {
    return parseCiteTemplate(`{{${inner}}}`)
  }

  // Unknown template — render as a generic notice
  return `<span class="template-unknown" title="Template: ${name}">{{${name}}}</span>`
}

// Render citation templates to HTML inline
function parseCiteTemplate(raw) {
  // If raw is a {{cite ...}} string, parse it; otherwise treat as freetext
  const m = raw.match(/^\{\{cite (web|book|news|journal)([\s\S]*)\}\}$/i)
  if (!m) return raw

  const type = m[1].toLowerCase()
  const paramStr = m[2]
  const params = {}
  paramStr.split('|').forEach(part => {
    const eq = part.indexOf('=')
    if (eq >= 0) {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    }
  })

  const author = params.author || params.last || ''
  const date = params.date || params.year || ''
  const title = params.title || ''
  const url = params.url || ''
  const publisher = params.publisher || params.newspaper || params.journal || params.website || ''
  const isbn = params.isbn || ''
  const accessdate = params.accessdate || params['access-date'] || ''

  let parts = []
  if (author) parts.push(author)
  if (date) parts.push(`(${date})`)
  if (title) parts.push(url ? `"<a href="${url}" class="external" target="_blank">${title}</a>"` : `"${title}"`)
  if (publisher) parts.push(`<i>${publisher}</i>`)
  if (isbn) parts.push(`ISBN ${isbn}`)
  if (accessdate) parts.push(`Retrieved ${accessdate}`)

  return parts.join('. ') + '.'
}

// Basic wiki table parser
function parseWikiTables(text) {
  return text.replace(/\{\|(.*?)\|\}/gs, (_, inner) => {
    const classMatch = (_.match(/\{\|([^\n]*)/) || [])[1] || ''
    const cls = classMatch.includes('wikitable') ? 'wikitable' : 'wikitable'
    let html = `<table class="${cls}">`

    const lines = inner.split('\n')
    let inRow = false
    let inHeader = false

    for (let line of lines) {
      line = line.trim()
      if (!line) continue

      if (line.startsWith('|-')) {
        if (inRow) html += '</tr>'
        html += '<tr>'
        inRow = true
      } else if (line.startsWith('!')) {
        const cells = line.slice(1).split('!!')
        cells.forEach(c => { html += `<th>${c.trim()}</th>` })
      } else if (line.startsWith('|')) {
        const cells = line.slice(1).split('||')
        cells.forEach(c => { html += `<td>${c.trim()}</td>` })
      } else if (line.startsWith('|+')) {
        html += `<caption>${line.slice(2).trim()}</caption>`
      }
    }

    if (inRow) html += '</tr>'
    html += '</table>'
    return html
  })
}

// Parse nested wiki lists (ul or ol)
function parseWikiLists(text, pattern, tag) {
  const lines = text.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^([*#]+) (.*)/)
    if (m && ((tag === 'ul' && m[1][0] === '*') || (tag === 'ol' && m[1][0] === '#'))) {
      const { html, nextI } = collectList(lines, i, 1, tag)
      result.push(html)
      i = nextI
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

function collectList(lines, startI, depth, tag) {
  const char = tag === 'ul' ? '*' : '#'
  let html = `<${tag}>`
  let i = startI

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^([*#]+) (.*)/)
    if (!m) break
    const lvl = m[1].split('').filter(c => c === char).length
    if (lvl < depth) break
    if (lvl === depth) {
      html += `<li>${m[2]}</li>`
      i++
    } else {
      const sub = collectList(lines, i, depth + 1, tag)
      html = html.slice(0, -5) // remove </li>
      html += sub.html + '</li>'
      i = sub.nextI
    }
  }

  html += `</${tag}>`
  return { html, nextI: i }
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Build a Table of Contents from h2/h3 headings in the rendered HTML
function buildTOC(html) {
  const headings = []
  const re = /<h([23])[^>]*id="([^"]*)"[^>]*>.*?<span class="mw-headline">([^<]+)<\/span><\/h[23]>/g
  let m
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: parseInt(m[1]), id: m[2], text: m[3] })
  }
  if (headings.length < 3) return ''

  let toc = `<div class="toc" id="toc">
    <div class="toctitle"><h2>Contents</h2></div>
    <ul>`
  let sectionNum = 0
  let subNum = 0
  for (const h of headings) {
    if (h.level === 2) {
      sectionNum++
      subNum = 0
      toc += `<li class="toclevel-1"><a href="#${h.id}"><span class="tocnumber">${sectionNum}</span> <span class="toctext">${h.text}</span></a></li>`
    } else {
      subNum++
      toc += `<li class="toclevel-2"><a href="#${h.id}"><span class="tocnumber">${sectionNum}.${subNum}</span> <span class="toctext">${h.text}</span></a></li>`
    }
  }
  toc += `</ul></div>`
  return toc
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function getPage(title) {
  const res = await fetch(`/api/page/${encodeURIComponent(title)}`)
  return res.json()
}

async function savePage(title, content, summary) {
  const res = await fetch(`/api/page/${encodeURIComponent(title)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, summary })
  })
  return res.json()
}

async function getPageList() {
  const res = await fetch('/api/pages')
  return res.json()
}

async function getRevisions(title) {
  const res = await fetch(`/api/revisions/${encodeURIComponent(title)}`)
  return res.json()
}

async function getCurrentUser() {
  try {
    const res = await fetch('/api/auth/me')
    const data = await res.json()
    return data.user || null
  } catch {
    return null
  }
}

async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  return res.json()
}

async function register(username, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  return res.json()
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
}

// ─── State ───────────────────────────────────────────────────────────────────

let currentUser = null
let currentTab = 'read' // 'read' | 'edit' | 'history'
let currentTitle = ''

// ─── Router ──────────────────────────────────────────────────────────────────

function navigate(path) {
  history.pushState({}, '', path)
  render()
}

// ─── Render ──────────────────────────────────────────────────────────────────

async function render() {
  currentUser = await getCurrentUser()
  let path = window.location.pathname

  // Redirect root
  if (path === '/') {
    history.replaceState({}, '', '/wiki/Main_Page')
    path = '/wiki/Main_Page'
  }

  // Special pages
  if (path === '/wiki/Special:Random' || path === '/Special:Random') {
    const data = await getPageList()
    const pages = (data.pages || []).filter(p => !p.title.startsWith('Special:'))
    if (pages.length) {
      const rand = pages[Math.floor(Math.random() * pages.length)]
      navigate('/wiki/' + rand.title)
      return
    }
  }

  if (path.startsWith('/wiki/Special:CreateAccount') || path.startsWith('/wiki/Special:Login')) {
    renderAuthPage(path.includes('CreateAccount') ? 'register' : 'login')
    return
  }

  if (path.startsWith('/wiki/')) {
    currentTitle = decodeURIComponent(path.replace('/wiki/', ''))
    await renderWikiPage(currentTitle)
    return
  }

  // Fallback
  navigate('/wiki/Main_Page')
}

// ─── Auth Page ───────────────────────────────────────────────────────────────

function renderAuthPage(mode) {
  const app = document.getElementById('app')
  if (!app) return

  const isRegister = mode === 'register'
  const title = isRegister ? 'Create Account' : 'Log In'

  app.innerHTML = buildChrome(title, `
    <div class="auth-form">
      <h1>${title}</h1>
      ${isRegister ? '<p>Create a WikiO account to track your edits and contribute to the wiki.</p>' : ''}
      <div id="auth-error" class="auth-error" style="display:none"></div>
      <table class="mw-auth-table">
        <tr>
          <td><label for="username">Username:</label></td>
          <td><input id="username" type="text" size="25" autocomplete="username"></td>
        </tr>
        <tr>
          <td><label for="password">Password:</label></td>
          <td><input id="password" type="password" size="25" autocomplete="${isRegister ? 'new-password' : 'current-password'}"></td>
        </tr>
        ${isRegister ? `<tr>
          <td><label for="confirm">Confirm password:</label></td>
          <td><input id="confirm" type="password" size="25" autocomplete="new-password"></td>
        </tr>` : ''}
      </table>
      <br>
      <button id="auth-submit" class="mw-btn mw-btn-primary">${title}</button>
      &nbsp;
      ${isRegister
        ? `<a href="/wiki/Special:Login" class="wikilink">Already have an account?</a>`
        : `<a href="/wiki/Special:CreateAccount" class="wikilink">Create an account</a>`}
    </div>
  `)

  document.getElementById('auth-submit').onclick = async () => {
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value
    const errEl = document.getElementById('auth-error')
    errEl.style.display = 'none'

    if (!username || !password) {
      errEl.textContent = 'Please fill in all fields.'
      errEl.style.display = 'block'
      return
    }

    if (isRegister) {
      const confirm = document.getElementById('confirm').value
      if (password !== confirm) {
        errEl.textContent = 'Passwords do not match.'
        errEl.style.display = 'block'
        return
      }
      const data = await register(username, password)
      if (data.error) {
        errEl.textContent = data.error
        errEl.style.display = 'block'
        return
      }
    } else {
      const data = await login(username, password)
      if (data.error) {
        errEl.textContent = data.error
        errEl.style.display = 'block'
        return
      }
    }

    navigate('/wiki/Main_Page')
  }

  bindChrome()
}

// ─── Wiki Page ────────────────────────────────────────────────────────────────

async function renderWikiPage(title) {
  const app = document.getElementById('app')
  if (!app) return

  // Detect query param: ?action=edit
  const params = new URLSearchParams(window.location.search)
  const action = params.get('action')
  if (action === 'edit') currentTab = 'edit'
  else if (action === 'history') currentTab = 'history'
  else currentTab = 'read'

  const data = await getPage(title)
  const content = data.content || ''
  const pageExists = !!data.content

  const displayTitle = title.replace(/_/g, ' ')

  // Determine namespace for styling
  let nsClass = 'ns-main'
  if (title.startsWith('Help:')) nsClass = 'ns-help'
  else if (title.startsWith('User:')) nsClass = 'ns-user'
  else if (title.startsWith('WikiO:')) nsClass = 'ns-project'
  else if (title.startsWith('Template:')) nsClass = 'ns-template'
  else if (title.startsWith('Category:')) nsClass = 'ns-category'
  else if (title.startsWith('Special:')) nsClass = 'ns-special'

  let mainContent = ''

  if (currentTab === 'read') {
    const rendered = parseWikitext(content || `''This page does not exist yet.'' [[${title}|Create it]].`)
    const toc = buildTOC(rendered)
    // Insert TOC after first paragraph or before first h2
    const withToc = rendered.replace(/(<h2)/, toc + '$1')
    mainContent = `
      <div class="mw-parser-output ${!pageExists ? 'page-missing' : ''}">
        ${withToc}
      </div>
    `
  } else if (currentTab === 'edit') {
    mainContent = `
      <div class="mw-editnotice">
        <p>You are editing <b>${displayTitle}</b>. ${!pageExists ? '<span class="new-page-notice">This page does not exist yet — your edit will create it.</span>' : ''}</p>
      </div>
      <textarea id="editor" class="mw-editbox" spellcheck="true">${escapeHtml(content)}</textarea>
      <div class="mw-edittools">
        <div class="edit-buttons-bar">
          <button class="wikitext-btn" data-wrap="''|''" title="Italic">I</button>
          <button class="wikitext-btn" data-wrap="'''|'''" title="Bold"><b>B</b></button>
          <button class="wikitext-btn" data-wrap="[[|]]" title="Link">🔗</button>
          <button class="wikitext-btn" data-wrap="<ref>|</ref>" title="Citation"><sup>[1]</sup></button>
          <button class="wikitext-btn" data-wrap="== | ==" title="Heading">H2</button>
        </div>
      </div>
      <div class="mw-summary-row">
        <label for="summary">Edit summary:</label>
        <input id="summary" type="text" placeholder="Briefly describe your changes" class="mw-summary-input">
      </div>
      <div class="mw-edit-actions">
        <button id="save-page" class="mw-btn mw-btn-primary">Save changes</button>
        <button id="preview-btn" class="mw-btn">Show preview</button>
        <button id="cancel-edit" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>
      <div id="preview-area" class="mw-preview" style="display:none">
        <h2>Preview (not saved)</h2>
        <div id="preview-content" class="mw-parser-output"></div>
        <hr>
      </div>
    `
  } else if (currentTab === 'history') {
    const histData = await getRevisions(title)
    const revs = histData.revisions || []
    const rows = revs.length
      ? revs.map(r => `
          <tr>
            <td class="hist-date">${new Date(r.created_at).toLocaleString()}</td>
            <td class="hist-user"><a href="/wiki/User:${r.editor}" class="wikilink">${r.editor}</a></td>
            <td class="hist-summary">${escapeHtml(r.summary || '')}</td>
          </tr>`).join('')
      : '<tr><td colspan="3">No revision history.</td></tr>'

    mainContent = `
      <p>Revision history for <b>${displayTitle}</b></p>
      <table class="wikitable" id="pagehistory">
        <thead><tr><th>Date</th><th>User</th><th>Edit summary</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }

  // Tabs
  const tabs = [
    { id: 'read',    label: 'Article',  href: `/wiki/${title}` },
    { id: 'edit',    label: 'Edit',     href: `/wiki/${title}?action=edit` },
    { id: 'history', label: 'History',  href: `/wiki/${title}?action=history` },
  ]

  const tabsHtml = tabs.map(t => `
    <li class="mw-tab ${currentTab === t.id ? 'selected' : ''}">
      <a href="${t.href}">${t.label}</a>
    </li>`).join('')

  app.innerHTML = buildChrome(displayTitle, `
    <div class="mw-page-container ${nsClass}">
      <div class="mw-tabs-container">
        <ul class="mw-tabs">${tabsHtml}</ul>
        <ul class="mw-tabs-right">
          ${currentUser
            ? `<li><a href="/wiki/User:${currentUser}" class="wikilink">User:${currentUser}</a></li>
               <li><a id="logout-link" href="#">Log out</a></li>`
            : `<li><a href="/wiki/Special:Login" class="wikilink">Log in</a></li>
               <li><a href="/wiki/Special:CreateAccount" class="wikilink">Create account</a></li>`}
        </ul>
      </div>
      <h1 class="firstHeading" id="firstHeading">${displayTitle}</h1>
      <div class="mw-body-content">${mainContent}</div>
    </div>
  `)

  bindChrome()

  // Logout
  const logoutLink = document.getElementById('logout-link')
  if (logoutLink) {
    logoutLink.onclick = async (e) => {
      e.preventDefault()
      await logout()
      navigate('/wiki/Main_Page')
    }
  }

  // Tab navigation
  document.querySelectorAll('.mw-tabs a, .mw-tabs-right a').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href')
      if (href && href.startsWith('/wiki/')) {
        e.preventDefault()
        history.pushState({}, '', href)
        render()
      }
    })
  })

  if (currentTab === 'edit') {
    bindEditPage(title)
  }
}

function bindEditPage(title) {
  // Wikitext toolbar buttons
  document.querySelectorAll('.wikitext-btn').forEach(btn => {
    btn.onclick = () => {
      const editor = document.getElementById('editor')
      if (!editor) return
      const wrap = btn.dataset.wrap || ''
      const [before, after] = wrap.split('|')
      const start = editor.selectionStart
      const end = editor.selectionEnd
      const selected = editor.value.slice(start, end) || 'text'
      editor.setRangeText(before + selected + after, start, end, 'select')
      editor.focus()
    }
  })

  // Save
  document.getElementById('save-page').onclick = async () => {
    const content = document.getElementById('editor').value
    const summary = document.getElementById('summary').value
    const btn = document.getElementById('save-page')
    btn.disabled = true
    btn.textContent = 'Saving…'
    await savePage(title, content, summary)
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'
    render()
  }

  // Preview
  document.getElementById('preview-btn').onclick = () => {
    const content = document.getElementById('editor').value
    const previewArea = document.getElementById('preview-area')
    const previewContent = document.getElementById('preview-content')
    previewContent.innerHTML = parseWikitext(content)
    previewArea.style.display = 'block'
    previewArea.scrollIntoView({ behavior: 'smooth' })
  }

  // Cancel
  document.getElementById('cancel-edit').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'
    render()
  }
}

// ─── Chrome (header + sidebar) ───────────────────────────────────────────────

function buildChrome(pageTitle, body) {
  return `
    <div id="mw-wrapper">
      <header id="mw-header">
        <div class="mw-header-inner">
          <a href="/wiki/Main_Page" class="mw-logo" id="logo-link">
            <span class="mw-logo-text">WikiO</span>
            <span class="mw-logo-tagline">The free wiki</span>
          </a>
          <div class="mw-search-container">
            <form id="search-form" action="" role="search">
              <input id="searchInput" type="search" placeholder="Search WikiO" autocomplete="off" aria-label="Search WikiO">
              <button type="submit" class="mw-search-btn" aria-label="Search">
                <svg width="14" height="14" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none"/><line x1="13" y1="13" x2="18" y2="18" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div id="mw-main-layout">
        <nav id="mw-sidebar">
          <div class="mw-portal">
            <h3>Navigation</h3>
            <ul>
              <li><a href="/wiki/Main_Page">Main page</a></li>
              <li><a href="/wiki/Special:Random">Random article</a></li>
            </ul>
          </div>
          <div class="mw-portal">
            <h3>Help</h3>
            <ul>
              <li><a href="/wiki/Help:Editing">Help: Editing</a></li>
              <li><a href="/wiki/Help:Wikitext">Help: Wikitext</a></li>
              <li><a href="/wiki/Help:Templates">Help: Templates</a></li>
            </ul>
          </div>
          <div class="mw-portal">
            <h3>WikiO</h3>
            <ul>
              <li><a href="/wiki/WikiO:About">About</a></li>
            </ul>
          </div>
        </nav>

        <div id="mw-content">
          ${body}
        </div>
      </div>

      <footer id="mw-footer">
        <ul>
          <li><a href="/wiki/WikiO:About">About WikiO</a></li>
          <li><a href="/wiki/Help:Editing">Help</a></li>
          <li>Built with Cloudflare Pages &amp; D1</li>
        </ul>
      </footer>
    </div>
  `
}

function bindChrome() {
  // Logo link
  document.getElementById('logo-link')?.addEventListener('click', e => {
    e.preventDefault()
    navigate('/wiki/Main_Page')
  })

  // Search
  const searchForm = document.getElementById('search-form')
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault()
      const q = document.getElementById('searchInput').value.trim()
      if (q) navigate('/wiki/' + q.replace(/ /g, '_'))
    })
  }

  // Internal link interception
  document.querySelectorAll('a.wikilink, #mw-sidebar a, #mw-footer a').forEach(a => {
    const href = a.getAttribute('href')
    if (href && href.startsWith('/wiki/')) {
      a.addEventListener('click', e => {
        e.preventDefault()
        navigate(href)
      })
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('popstate', render)

// Intercept ALL internal clicks
document.addEventListener('click', e => {
  const link = e.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  if (!href) return
  if (href.startsWith('/wiki/') || href.startsWith('/Special:')) {
    e.preventDefault()
    navigate(href)
  }
})

render()
