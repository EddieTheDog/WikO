// WikiO — main.js
// Wikipedia-style wiki with wikitext parser

// ─── Wikitext Parser ──────────────────────────────────────────────────────────

function parseWikitext(raw) {
  if (!raw) return ''

  let text = raw

  // Collect <ref> citations before processing (store raw wikitext for later rendering)
  const refs = []
  text = text.replace(/<ref>([\s\S]*?)<\/ref>/g, (_, content) => {
    refs.push(content.trim())
    return `<sup class="reference"><a href="#cite_note-${refs.length}" id="cite_ref-${refs.length}">[${refs.length}]</a></sup>`
  })

  // <references/> tag → render footnote list
  // Must run AFTER refs are collected but BEFORE template substitution so we render
  // the stored ref content (which may itself contain {{cite ...}} templates)
  text = text.replace(/<references\s*\/>/g, () => {
    if (refs.length === 0) return ''
    const items = refs.map((r, i) => {
      // Render any citation templates inside the ref
      const rendered = r.replace(/\{\{([\s\S]*?)\}\}/g, (_, inner) => parseTemplate(inner.trim()))
      return `<li id="cite_note-${i + 1}">
        <span class="mw-cite-backlink"><a href="#cite_ref-${i + 1}">↑</a></span>
        ${rendered}
      </li>`
    }).join('')
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
  text = text.replace(/^======(.+?)======\s*$/gm, (_, t) => `<h6 id="${t.trim().replace(/\s+/g,'_')}">${t.trim()}</h6>`)
  text = text.replace(/^=====(.+?)=====\s*$/gm, (_, t) => `<h5 id="${t.trim().replace(/\s+/g,'_')}">${t.trim()}</h5>`)
  text = text.replace(/^====(.+?)====\s*$/gm, (_, t) => `<h4 id="${t.trim().replace(/\s+/g,'_')}">${t.trim()}</h4>`)
  text = text.replace(/^===(.+?)===\s*$/gm, (_, t) => {
    const id = t.trim().replace(/\s+/g, '_')
    return `<h3 id="${id}"><span class="mw-headline">${t.trim()}</span></h3>`
  })
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
    return `<a href="${href}" class="wikilink">${label}</a>`
  })

  // BUG FIX: External links — was losing the scheme by capturing URL without it
  // [https://url text] and bare [https://url]
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    (_, url, label) => `<a href="${url}" class="external" target="_blank" rel="noopener">${label}</a>`)
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\]/g,
    (_, url) => `<a href="${url}" class="external" target="_blank" rel="noopener">[link]</a>`)

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
  text = parseWikiLists(text, 'ul')
  // Ordered lists: # item
  text = parseWikiLists(text, 'ol')

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
    } else {
      // Positional param
      const posKey = String(Object.keys(params).length + 1)
      params[posKey] = part.trim()
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

  // BUG FIX: cite templates — was double-wrapping with {{...}} then regex-matching them
  // Now pass params directly to renderCitation
  if (['cite web', 'cite news', 'cite book', 'cite journal'].includes(nameLower)) {
    return renderCitation(nameLower.replace('cite ', ''), params)
  }

  // Unknown template — render as a generic notice
  return `<span class="template-unknown" title="Template: ${name}">{{${name}}}</span>`
}

// BUG FIX: Replaced broken parseCiteTemplate (regex-based) with renderCitation (params-based)
// Old code received {{cite web|...}} as a string, split on | losing multi-line content,
// and had a scheme-doubling bug in URL handling.
function renderCitation(type, params) {
  const author = params.author || params.last || ''
  const date = params.date || params.year || ''
  const title = params.title || ''
  const url = params.url || ''
  const publisher = params.publisher || params.newspaper || params.journal || params.website || ''
  const isbn = params.isbn || ''
  const accessdate = params.accessdate || params['access-date'] || ''

  const parts = []
  if (author) parts.push(author)
  if (date) parts.push(`(${date})`)
  if (title) {
    parts.push(url
      ? `"<a href="${url}" class="external" target="_blank" rel="noopener">${title}</a>"`
      : `"${title}"`)
  }
  if (publisher) parts.push(`<i>${publisher}</i>`)
  if (isbn) parts.push(`ISBN ${isbn}`)
  if (accessdate) parts.push(`Retrieved ${accessdate}`)

  return `<span class="citation">${parts.join('. ')}${parts.length ? '.' : ''}</span>`
}

// Basic wiki table parser
function parseWikiTables(text) {
  return text.replace(/\{\|(.*?)\|\}/gs, (match) => {
    const classMatch = (match.match(/^\{\|([^\n]*)/) || [])[1] || ''
    const cls = classMatch.includes('wikitable') ? 'wikitable' : 'wikitable'

    // Extract everything after the first line
    const newlineIdx = match.indexOf('\n')
    const inner = newlineIdx >= 0 ? match.slice(newlineIdx + 1, -2) : ''

    let html = `<table class="${cls}">`

    const lines = inner.split('\n')
    let inRow = false

    for (let line of lines) {
      line = line.trim()
      if (!line) continue

      if (line.startsWith('|-')) {
        if (inRow) html += '</tr>'
        html += '<tr>'
        inRow = true
      } else if (line.startsWith('|+')) {
        html += `<caption>${line.slice(2).trim()}</caption>`
      } else if (line.startsWith('!')) {
        if (!inRow) { html += '<tr>'; inRow = true }
        const cells = line.slice(1).split('!!')
        cells.forEach(c => { html += `<th>${c.trim()}</th>` })
      } else if (line.startsWith('|')) {
        if (!inRow) { html += '<tr>'; inRow = true }
        const cells = line.slice(1).split('||')
        cells.forEach(c => { html += `<td>${c.trim()}</td>` })
      }
    }

    if (inRow) html += '</tr>'
    html += '</table>'
    return html
  })
}

// BUG FIX: Rewrote parseWikiLists — old version had broken depth tracking for mixed lists
function parseWikiLists(text, tag) {
  const char = tag === 'ul' ? '*' : '#'
  const lines = text.split('\n')
  const result = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^([*#]+)\s(.*)/)
    if (m && m[1][0] === char) {
      const { html, nextI } = collectList(lines, i, 1, char)
      result.push(html)
      i = nextI
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

function collectList(lines, startI, depth, char) {
  const tag = char === '*' ? 'ul' : 'ol'
  let html = `<${tag}>`
  let i = startI

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^([*#]+)\s(.*)/)
    if (!m || m[1][0] !== char) break
    const lvl = m[1].split('').filter(c => c === char).length
    if (lvl < depth) break
    if (lvl === depth) {
      // Check if next line starts a sub-list
      const nextLine = lines[i + 1]
      const nextM = nextLine && nextLine.match(/^([*#]+)\s(.*)/)
      const nextLvl = nextM && nextM[1][0] === char ? nextM[1].length : 0
      if (nextLvl > depth) {
        html += `<li>${m[2]}`
        i++
        const sub = collectList(lines, i, depth + 1, char)
        html += sub.html + '</li>'
        i = sub.nextI
      } else {
        html += `<li>${m[2]}</li>`
        i++
      }
    } else {
      // lvl > depth: shouldn't happen if called correctly, skip
      i++
    }
  }

  html += `</${tag}>`
  return { html, nextI: i }
}

function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// BUG FIX: buildTOC regex now matches both h2 and h3 with id attributes
// Old version only matched headings that already had id attributes, but h3 didn't get them
function buildTOC(html) {
  const headings = []
  const re = /<h([23])[^>]*id="([^"]*)"[^>]*>.*?<span class="mw-headline">([^<]+)<\/span>/g
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

async function movePage(oldTitle, newTitle, summary) {
  const res = await fetch(`/api/page/${encodeURIComponent(oldTitle)}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newTitle, summary })
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
let currentTab = 'read' // 'read' | 'edit' | 'history' | 'move'
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

  // Detect query param: ?action=edit|history|move
  const params = new URLSearchParams(window.location.search)
  const action = params.get('action')
  if (action === 'edit') currentTab = 'edit'
  else if (action === 'history') currentTab = 'history'
  else if (action === 'move') currentTab = 'move'
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
  } else if (currentTab === 'move') {
    mainContent = `
      <div class="mw-editnotice">
        <p>Move page: <b>${displayTitle}</b></p>
        <p>Moving a page renames it and leaves a redirect at the old title.</p>
      </div>
      <div id="move-error" class="auth-error" style="display:none"></div>
      <table class="mw-auth-table">
        <tr>
          <td><label for="new-title">New title:</label></td>
          <td><input id="new-title" type="text" size="40" value="${escapeHtml(displayTitle)}" class="mw-summary-input"></td>
        </tr>
        <tr>
          <td><label for="move-summary">Reason:</label></td>
          <td><input id="move-summary" type="text" size="40" placeholder="Reason for move" class="mw-summary-input"></td>
        </tr>
        <tr>
          <td></td>
          <td>
            <label>
              <input type="checkbox" id="leave-redirect" checked>
              Leave a redirect behind
            </label>
          </td>
        </tr>
      </table>
      <br>
      <div class="mw-edit-actions">
        <button id="move-page-btn" class="mw-btn mw-btn-primary">Move page</button>
        <button id="cancel-move" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>
    `
  }

  // Tabs — include Move tab when page exists
  const tabs = [
    { id: 'read',    label: 'Article',  href: `/wiki/${title}` },
    { id: 'edit',    label: 'Edit',     href: `/wiki/${title}?action=edit` },
    { id: 'history', label: 'History',  href: `/wiki/${title}?action=history` },
    ...(pageExists ? [{ id: 'move', label: 'Move', href: `/wiki/${title}?action=move` }] : []),
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
  } else if (currentTab === 'move') {
    bindMovePage(title)
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

function bindMovePage(title) {
  document.getElementById('cancel-move').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'
    render()
  }

  document.getElementById('move-page-btn').onclick = async () => {
    const newTitleRaw = document.getElementById('new-title').value.trim()
    const summary = document.getElementById('move-summary').value.trim()
    const leaveRedirect = document.getElementById('leave-redirect').checked
    const errEl = document.getElementById('move-error')
    errEl.style.display = 'none'

    if (!newTitleRaw) {
      errEl.textContent = 'Please enter a new title.'
      errEl.style.display = 'block'
      return
    }

    // Normalise: spaces → underscores
    const newTitle = newTitleRaw.replace(/ /g, '_')
    const displayOld = title.replace(/_/g, ' ')
    const displayNew = newTitle.replace(/_/g, ' ')

    if (newTitle === title) {
      errEl.textContent = 'The new title is the same as the current title.'
      errEl.style.display = 'block'
      return
    }

    const btn = document.getElementById('move-page-btn')
    btn.disabled = true
    btn.textContent = 'Moving…'

    const result = await movePage(title, newTitle, summary || `Moved from ${displayOld} to ${displayNew}`)

    if (result.error) {
      errEl.textContent = result.error
      errEl.style.display = 'block'
      btn.disabled = false
      btn.textContent = 'Move page'
      return
    }

    // If leave-redirect checked, create a redirect at the old title
    if (leaveRedirect) {
      await savePage(title, `{{redirect|${displayNew}}}`, `Redirect to [[${displayNew}]]`)
    }

    navigate('/wiki/' + newTitle)
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
