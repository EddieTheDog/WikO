// WikiO — main.js
// Wikipedia-style wiki with wikitext parser

// ─── Template Cache ───────────────────────────────────────────────────────────
const templateCache = new Map()

async function fetchTemplatePage(name) {
  const title = 'Template:' + name
  if (templateCache.has(title)) return templateCache.get(title)
  try {
    const res = await fetch(`/api/page/${encodeURIComponent(title)}`)
    const data = await res.json()
    const content = data.content || null
    templateCache.set(title, content)
    return content
  } catch {
    templateCache.set(title, null)
    return null
  }
}

// ─── Wikitext Parser ──────────────────────────────────────────────────────────

async function parseWikitext(raw) {
  if (!raw) return ''

  let text = raw

  // Collect <ref> citations before processing
  const refs = []
  text = text.replace(/<ref>([\s\S]*?)<\/ref>/g, (_, content) => {
    refs.push(content.trim())
    return `<sup class="reference"><a href="#cite_note-${refs.length}" id="cite_ref-${refs.length}">[${refs.length}]</a></sup>`
  })

  // <references/> tag — render footnote list
  text = text.replace(/<references\s*\/>/g, () => {
    if (refs.length === 0) return ''
    const items = refs.map((r, i) => {
      const rendered = r.replace(/\{\{([\s\S]*?)\}\}/g, (_, inner) => parseSyncTemplate(inner.trim()))
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

  // ── Template transclusion (async) ──────────────────────────────────────────
  text = await expandTemplates(text)

  // Headers
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

  // Tables — must run before wikilink parsing to protect {| ... |} syntax
  text = parseWikiTables(text)

  // Wikilinks
  text = text.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const pipeIdx = inner.indexOf('|')
    const page = pipeIdx >= 0 ? inner.slice(0, pipeIdx).trim() : inner.trim()
    const label = pipeIdx >= 0 ? inner.slice(pipeIdx + 1).trim() : inner.trim()
    const href = '/wiki/' + page.replace(/ /g, '_')
    return `<a href="${href}" class="wikilink">${label}</a>`
  })

  // External links
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
    (_, url, label) => `<a href="${url}" class="external" target="_blank" rel="noopener">${label}</a>`)
  text = text.replace(/\[(https?:\/\/[^\s\]]+)\]/g,
    (_, url) => `<a href="${url}" class="external" target="_blank" rel="noopener">[link]</a>`)

  // Bold/italic
  text = text.replace(/'''''(.+?)'''''/g, '<b><i>$1</i></b>')
  text = text.replace(/'''(.+?)'''/g, '<b>$1</b>')
  text = text.replace(/''(.+?)''/g, '<i>$1</i>')

  // Definition lists
  text = text.replace(/^;(.+)$/gm, '<dt>$1</dt>')
  text = text.replace(/^:(.+)$/gm, '<dd>$1</dd>')
  text = text.replace(/(<dt>.*?<\/dt>\s*<dd>.*?<\/dd>)/gs, '<dl>$1</dl>')

  // Lists
  text = parseWikiLists(text, 'ul')
  text = parseWikiLists(text, 'ol')

  // Horizontal rule
  text = text.replace(/^----$/gm, '<hr>')

  // Paragraphs
  text = text.split(/\n\n+/).map(block => {
    block = block.trim()
    if (!block) return ''
    if (/^<(h[1-6]|ul|ol|dl|table|div|hr|blockquote)/i.test(block)) return block
    return `<p>${block.replace(/\n/g, ' ')}</p>`
  }).join('\n')

  return text
}

// ─── Template expansion ───────────────────────────────────────────────────────
// BUG FIX: The original used a simple regex that broke on:
//   1. Pipes inside wikilinks within template params: {{T|link=[[Page|Label]]}}
//   2. Multi-line template bodies from fetched Template: pages
//   3. Nested templates where inner resolution produced more {{ }}
//
// Fix: parse template boundaries with a proper brace-counter so pipes
// inside [[...]] and nested {{ }} don't confuse the splitter.

async function expandTemplates(text, depth = 0) {
  if (depth > 10) return text // prevent infinite transclusion loops

  let safety = 0
  while (safety++ < 200) {
    // Find innermost {{ }} — no nested {{ }} inside (safe for all cases)
    const m = text.match(/\{\{([^{}]*)\}\}/)
    if (!m) break
    const inner = m[1]
    const resolved = await resolveTemplate(inner.trim(), depth)
    text = text.slice(0, m.index) + resolved + text.slice(m.index + m[0].length)
  }
  return text
}

// ─── Template parameter parser ────────────────────────────────────────────────
// BUG FIX: The original `allText.split('|')` broke on wikilinks like
// [[Page|Label]] inside parameter values, because the pipe inside [[ ]]
// was treated as a parameter separator.
//
// Fix: split on pipes only when NOT inside [[ ]], respecting bracket depth.
function splitTemplateParts(inner) {
  const parts = []
  let depth = 0 // track [[ ]] depth
  let current = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '[' && inner[i + 1] === '[') { depth++; current += ch; continue }
    if (ch === ']' && inner[i + 1] === ']') { depth--; current += ch; continue }
    if (ch === '|' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

async function resolveTemplate(inner, depth) {
  if (!inner.trim()) return ''

  // Use bracket-aware splitter to correctly parse params containing wikilinks
  const parts = splitTemplateParts(inner)
  const name = parts[0].trim()
  const params = {}
  let positional = 1
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const eq = part.indexOf('=')
    if (eq >= 0) {
      const key = part.slice(0, eq).trim()
      const val = part.slice(eq + 1).trim()
      params[key] = val
    } else {
      params[String(positional++)] = part.trim()
    }
  }

  const nameLower = name.toLowerCase()

  // ── Built-in hardcoded templates ──────────────────────────────────────────

  if (nameLower === 'infobox' || nameLower.startsWith('infobox ') || nameLower.startsWith('infobox/'))
    return renderInfobox(params)
  if (nameLower === 'stub' || nameLower.endsWith('-stub')) return renderStub(params)

  // ── Citation templates ────────────────────────────────────────────────────
  if (nameLower.startsWith('cite ') || nameLower === 'citation') {
    return renderCitation(nameLower.replace('cite ','') || 'generic', params)
  }
  if (nameLower === 'sfn' || nameLower === 'harvnb' || nameLower === 'harv') {
    const authors = [params['1'],params['2'],params['3'],params['4']].filter(Boolean)
    const year = params['5'] || params.year || ''
    const page = params.p || params.pp || params.loc || ''
    const id = authors.join('') + year
    return `<sup class="reference"><a href="#${escapeHtml(id)}">${authors.join(' &amp; ')} ${year}${page ? ', p.\u00a0' + page : ''}</a></sup>`
  }

  // ── Navigation / disambiguation ────────────────────────────────────────────
  if (nameLower === 'disambiguation' || nameLower === 'dab' || nameLower === 'disambig') {
    return `<div class="dmbox dmbox-disambig" role="note"><span class="dmbox-image">📋</span><span>This <a href="/wiki/Help:Disambiguation" class="wikilink">disambiguation</a> page lists articles associated with the same title.</span></div>`
  }
  if (nameLower === 'redirect' || nameLower === 'r') {
    const target = params['1'] || ''
    return `<div class="hatnote">↪ Redirect to <a href="/wiki/${target.replace(/ /g,'_')}" class="wikilink">${target}</a></div>`
  }
  if (nameLower === 'hatnote' || nameLower === 'note') return `<div class="hatnote" role="note">${params['1'] || ''}</div>`
  if (nameLower === 'for' || nameLower === 'for other uses') {
    const about = params['1'] || 'other uses', target = params['2'] || ''
    return `<div class="hatnote" role="note">This article is about ${about}. For other uses, see ${target ? `<a href="/wiki/${target.replace(/ /g,'_')}" class="wikilink">${target}</a>` : 'the disambiguation page'}.</div>`
  }
  if (nameLower === 'about') {
    const use1=params['1']||'', see1=params['2']||''
    let msg = use1 ? `This article is about ${use1}.` : ''
    if (see1) msg += ` For ${see1}, see <a href="/wiki/${(params['4']||see1).replace(/ /g,'_')}" class="wikilink">${params['4']||see1}</a>.`
    if (params['3']) msg += ` For ${params['3']}, see <a href="/wiki/${(params['5']||params['3']).replace(/ /g,'_')}" class="wikilink">${params['5']||params['3']}</a>.`
    return `<div class="hatnote" role="note">${msg}</div>`
  }
  if (nameLower === 'main') {
    const links = [params['1'],params['2'],params['3']].filter(Boolean).map(p=>`<a href="/wiki/${p.replace(/ /g,'_')}" class="wikilink">${p}</a>`).join(', ')
    return `<div class="hatnote" role="note"><i>Main article${[params['1'],params['2'],params['3']].filter(Boolean).length>1?'s':''}:</i> ${links}</div>`
  }
  if (nameLower === 'see also') {
    const links = [params['1'],params['2'],params['3'],params['4'],params['5']].filter(Boolean).map(p=>`<a href="/wiki/${p.replace(/ /g,'_')}" class="wikilink">${p}</a>`).join(', ')
    return `<div class="hatnote" role="note"><i>See also:</i> ${links}</div>`
  }
  if (nameLower === 'further' || nameLower === 'further information') {
    const links = [params['1'],params['2'],params['3']].filter(Boolean).map(p=>`<a href="/wiki/${p.replace(/ /g,'_')}" class="wikilink">${p}</a>`).join(', ')
    return `<div class="hatnote" role="note"><i>Further information:</i> ${links}</div>`
  }
  if (nameLower === 'details' || nameLower === 'more details') {
    const links = [params['1'],params['2']].filter(Boolean).map(p=>`<a href="/wiki/${p.replace(/ /g,'_')}" class="wikilink">${p}</a>`).join(', ')
    return `<div class="hatnote" role="note"><i>More details:</i> ${links}</div>`
  }

  // ── Inline formatting ──────────────────────────────────────────────────────
  if (nameLower === 'quote' || nameLower === 'blockquote' || nameLower === 'bq') {
    const text=params.text||params['1']||'', author=params.author||params.sign||params['2']||'', source=params.source||params.title||params['3']||''
    return `<blockquote class="wiki-quote"><p>${text}</p>${author||source?`<footer>— ${author}${source?`, <cite>${source}</cite>`:''}</footer>`:''}</blockquote>`
  }
  if (nameLower === 'pull quote' || nameLower === 'pullquote') {
    return `<blockquote class="wiki-pull-quote"><p>${params.text||params['1']||''}</p>${params.char?`<footer>— ${params.char}</footer>`:''}</blockquote>`
  }
  if (nameLower === 'poem') {
    return `<div class="poem"><p>${(params['1']||'').replace(/\n/g,'<br>')}</p></div>`
  }
  if (nameLower === 'abbr' || nameLower === 'acronym') return `<abbr title="${escapeHtml(params['2']||params.meaning||'')}">${params['1']||''}</abbr>`
  if (nameLower === 'color' || nameLower === 'colour') return `<span style="color:${escapeHtml(params['1']||'inherit')}">${params['2']||''}</span>`
  if (nameLower === 'background color' || nameLower === 'background colour' || nameLower === 'bg') return `<span style="background-color:${escapeHtml(params['1']||'transparent')};padding:1px 3px">${params['2']||''}</span>`
  if (nameLower === 'colorbox') return `<span style="background-color:${escapeHtml(params['1']||params.color||'#eee')};color:${escapeHtml(params.textcolor||'inherit')};padding:1px 5px;border-radius:2px">${params['2']||params.text||''}</span>`
  if (nameLower === 'small')   return `<small>${params['1']||''}</small>`
  if (nameLower === 'big')     return `<big>${params['1']||''}</big>`
  if (nameLower === 'sub')     return `<sub>${params['1']||''}</sub>`
  if (nameLower === 'sup')     return `<sup>${params['1']||''}</sup>`
  if (nameLower === 'code')    return `<code class="mw-code">${escapeHtml(params['1']||'')}</code>`
  if (nameLower === 'kbd')     return `<kbd>${escapeHtml(params['1']||'')}</kbd>`
  if (nameLower === 'var')     return `<var>${params['1']||''}</var>`
  if (nameLower === 'samp')    return `<samp>${escapeHtml(params['1']||'')}</samp>`
  if (nameLower === 'mono' || nameLower === 'tt') return `<span style="font-family:monospace">${params['1']||''}</span>`
  if (nameLower === 'pre')     return `<pre>${escapeHtml(params['1']||'')}</pre>`
  if (nameLower === 'nowrap')  return `<span style="white-space:nowrap">${params['1']||''}</span>`
  if (nameLower === 'strikethrough'||nameLower==='strike'||nameLower==='s'||nameLower==='del') return `<s>${params['1']||''}</s>`
  if (nameLower === 'underline' || nameLower === 'u') return `<u>${params['1']||''}</u>`
  if (nameLower === 'overline') return `<span style="text-decoration:overline">${params['1']||''}</span>`
  if (nameLower === 'resize')  return `<span style="font-size:${escapeHtml(params['2']||'1em')}">${params['1']||''}</span>`
  if (nameLower === 'center' || nameLower === 'centre') return `<div style="text-align:center">${params['1']||''}</div>`
  if (nameLower === 'right')   return `<div style="text-align:right">${params['1']||''}</div>`
  if (nameLower === 'left')    return `<div style="text-align:left">${params['1']||''}</div>`
  if (nameLower === 'indent') { const n=Math.max(1,parseInt(params['1']||'1')||1); return `<div style="margin-left:${n*1.6}em">${params['2']||params['1']||''}</div>` }
  if (nameLower === 'hidden' || nameLower === 'hide') return ''

  // ── Layout ─────────────────────────────────────────────────────────────────
  if (nameLower === 'clear')       return `<div style="clear:both"></div>`
  if (nameLower === 'clear left')  return `<div style="clear:left"></div>`
  if (nameLower === 'clear right') return `<div style="clear:right"></div>`
  if (nameLower === 'toc right')   return `<div style="float:right;clear:right;margin:0 0 1em 2em" id="toc-right-anchor"></div>`
  if (nameLower === 'notoc')       return ''
  if (nameLower === 'br')          return '<br>'
  if (nameLower === 'spaced ndash') return ' \u2013 '
  if (nameLower === 'ndash')       return '\u2013'
  if (nameLower === 'mdash')       return '\u2014'
  if (nameLower === 'nbsp')        return '\u00a0'
  if (nameLower === 'thinsp' || nameLower === 'thin space') return '\u202f'
  if (nameLower === 'shy')         return '\u00ad'
  if (nameLower === '=')           return '='
  if (nameLower === '!')           return '|'
  if (nameLower === 'div col' || nameLower === 'columns') {
    const w = params.colwidth || params['1'] || '30em'
    return `<div class="mw-columns" style="column-width:${w};column-gap:1.5em">`
  }
  if (nameLower === 'div col end' || nameLower === 'columns end' || nameLower === 'end div col') return `</div>`

  // ── Dates / numbers ────────────────────────────────────────────────────────
  if (nameLower === 'date') return `<span class="date-format">${params['1']||''}</span>`
  if (nameLower === 'start date' || nameLower === 'birth date' || nameLower === 'birth-date') {
    const [y,m,d]=[params['1']||params.year||'',params['2']||params.month||'',params['3']||params.day||'']
    const isoDate=[y,m&&m.padStart(2,'0'),d&&d.padStart(2,'0')].filter(Boolean).join('-')
    return `<time class="bday" datetime="${escapeHtml(isoDate)}">${[d,m,y].filter(Boolean).join(' ')||isoDate}</time>`
  }
  if (nameLower === 'death date' || nameLower === 'end date') {
    const [y,m,d]=[params['1']||params.year||'',params['2']||params.month||'',params['3']||params.day||'']
    const isoDate=[y,m&&m.padStart(2,'0'),d&&d.padStart(2,'0')].filter(Boolean).join('-')
    return `<time datetime="${escapeHtml(isoDate)}">${[d,m,y].filter(Boolean).join(' ')||isoDate}</time>`
  }
  if (nameLower === 'birth date and age') {
    const [y,m,d]=[parseInt(params['1']||'0'),parseInt(params['2']||'0'),parseInt(params['3']||'0')]
    const now=new Date(); let age=now.getFullYear()-y
    if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d))age--
    const isoDate=[String(y),String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-')
    return `<time class="bday" datetime="${isoDate}">${d} ${new Date(y,m-1,d).toLocaleString('en',{month:'long'})} ${y}</time> (age\u00a0${age})`
  }
  if (nameLower === 'age') { const y=parseInt(params['1']||'0'); return y?String(new Date().getFullYear()-y):'' }
  if (nameLower === 'formatnum' || nameLower === 'formatnumber') {
    const n=parseFloat(String(params['1']||'').replace(/,/g,''))
    return isNaN(n)?(params['1']||''):n.toLocaleString()
  }
  if (nameLower === 'convert') {
    const val=params['1']||'',from=params['2']||'',to=params['3']||''
    const conv={'km':{'mi':0.621371},'mi':{'km':1.60934},'kg':{'lb':2.20462},'lb':{'kg':0.453592},'m':{'ft':3.28084},'ft':{'m':0.3048},'cm':{'in':0.393701},'in':{'cm':2.54},'km2':{'sqmi':0.386102},'sqmi':{'km2':2.58999}}
    const factor=conv[from]?.[to]
    if(factor&&to){const c=(parseFloat(val)*factor).toFixed(1);return `${val}\u00a0${from} (${c}\u00a0${to})`}
    return `${val}${from?' '+from:''}${to?' ('+to+')':''}`
  }
  if (nameLower === 'lang' || nameLower === 'language') return `<span lang="${escapeHtml(params['1']||'')}">${params['2']||''}</span>`
  if (nameLower === 'transliteration' || nameLower === 'transl') return `<span class="transliteration">${params['2']||params['1']||''}</span>`
  if (nameLower === 'native name') return `<span lang="${escapeHtml(params.lang||params['1']||'')}">${params['2']||params['1']||''}</span>`

  // ── Flags / geography ──────────────────────────────────────────────────────
  if (nameLower === 'flag' || nameLower === 'flagicon' || nameLower === 'flagcountry') {
    const country=params['1']||''
    const flagMap={'US':'🇺🇸','United States':'🇺🇸','UK':'🇬🇧','United Kingdom':'🇬🇧','GB':'🇬🇧','France':'🇫🇷','FR':'🇫🇷','Germany':'🇩🇪','DE':'🇩🇪','Japan':'🇯🇵','JP':'🇯🇵','China':'🇨🇳','CN':'🇨🇳','India':'🇮🇳','IN':'🇮🇳','Brazil':'🇧🇷','BR':'🇧🇷','Canada':'🇨🇦','CA':'🇨🇦','Australia':'🇦🇺','AU':'🇦🇺','Russia':'🇷🇺','RU':'🇷🇺','Spain':'🇪🇸','ES':'🇪🇸','Italy':'🇮🇹','IT':'🇮🇹','Mexico':'🇲🇽','MX':'🇲🇽','South Korea':'🇰🇷','KR':'🇰🇷','Netherlands':'🇳🇱','NL':'🇳🇱','Sweden':'🇸🇪','SE':'🇸🇪','Norway':'🇳🇴','NO':'🇳🇴','Poland':'🇵🇱','PL':'🇵🇱','Ukraine':'🇺🇦','UA':'🇺🇦','Argentina':'🇦🇷','AR':'🇦🇷','Portugal':'🇵🇹','PT':'🇵🇹','Switzerland':'🇨🇭','CH':'🇨🇭'}
    const flag=flagMap[country]||''
    return `${flag} <a href="/wiki/${country.replace(/ /g,'_')}" class="wikilink">${country}</a>`
  }
  if (nameLower === 'coord' || nameLower === 'coordinates') {
    const lat=params['1']||params.lat||'',lon=params['2']||params.lon||params.long||''
    if(!lat&&!lon)return ''
    const mapsUrl=`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}`
    return `<span class="geo-default"><a href="${mapsUrl}" class="external" target="_blank" rel="noopener">${lat}°N, ${lon}°E</a></span>`
  }

  // ── Maintenance boxes ──────────────────────────────────────────────────────
  if (nameLower === 'warning') return `<div class="tmbox tmbox-warning" role="note"><span class="tmbox-icon">⚠️</span><div><b>Warning:</b> ${params['1']||''}</div></div>`
  if (nameLower === 'notice' || nameLower === 'info' || nameLower === 'information') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">ℹ️</span><div>${params['1']||''}</div></div>`
  if (nameLower === 'tip' || nameLower === 'hint') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">💡</span><div><b>Tip:</b> ${params['1']||''}</div></div>`
  if (nameLower === 'under construction' || nameLower === 'wip' || nameLower === 'construction') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🚧</span><div><b>This page is under construction.</b> It may be incomplete or contain errors.</div></div>`
  if (nameLower === 'outdated' || nameLower === 'update') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🕐</span><div><b>This article may be outdated.</b>${params['1']?' '+params['1']:''}</div></div>`
  if (nameLower === 'cleanup' || nameLower === 'clean up') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🧹</span><div><b>This article needs cleanup.</b>${params['1']?' '+params['1']:''}</div></div>`
  if (nameLower === 'expand' || nameLower === 'expandsection') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">📝</span><div><b>This article needs to be expanded.</b>${params['1']?' '+params['1']:''}</div></div>`
  if (nameLower === 'merge') { const t=params['1']||''; return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🔀</span><div><b>It has been suggested this article be merged with <a href="/wiki/${t.replace(/ /g,'_')}" class="wikilink">${t}</a>.</b></div></div>` }
  if (nameLower === 'split') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">✂️</span><div><b>It has been suggested this article be split into separate articles.</b></div></div>`
  if (nameLower === 'delete' || nameLower === 'deletion') return `<div class="tmbox tmbox-delete" role="note"><span class="tmbox-icon">🗑️</span><div><b>This page has been proposed for deletion.</b> Reason: ${params['1']||params.reason||'No reason given.'}</div></div>`
  if (nameLower === 'speedy deletion' || nameLower === 'db' || nameLower === 'csd') return `<div class="tmbox tmbox-delete" role="note"><span class="tmbox-icon">⚡🗑️</span><div><b>Speedy deletion requested.</b> Reason: ${params['1']||'No reason given.'}</div></div>`
  if (nameLower === 'copyvio' || nameLower === 'copyright violation') return `<div class="tmbox tmbox-delete" role="note"><span class="tmbox-icon">©️</span><div><b>This page may contain a copyright violation.</b>${params['1']?' '+params['1']:''}</div></div>`
  if (nameLower === 'unreferenced' || nameLower === 'unref' || nameLower === 'no references') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">📚</span><div><b>This article does not cite any sources.</b> Please add references to improve verifiability.</div></div>`
  if (nameLower === 'refimprove' || nameLower === 'more citations needed') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">📚</span><div><b>This article needs additional citations for verification.</b></div></div>`
  if (nameLower === 'citation needed') return `<sup class="template-citation-needed" title="This claim needs a citation">[<i>citation needed</i>]</sup>`
  if (nameLower === 'pov' || nameLower === 'neutrality' || nameLower === 'npov') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">⚖️</span><div><b>The neutrality of this article is disputed.</b>${params['1']?' '+params['1']:''}</div></div>`
  if (nameLower === 'original research' || nameLower === 'or') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🔬</span><div><b>This article may contain original research.</b></div></div>`
  if (nameLower === 'globalize' || nameLower === 'western bias') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🌍</span><div><b>This article may not represent a worldwide view.</b></div></div>`
  if (nameLower === 'lead too short' || nameLower === 'lead rewrite') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">📄</span><div><b>This article's introduction may not adequately summarize the article.</b></div></div>`
  if (nameLower === 'featured article' || nameLower === 'fa') return `<div class="tmbox tmbox-featured" role="note"><span class="tmbox-icon">⭐</span><div><b>This is a featured article.</b> It has been identified as one of the best articles on this wiki.</div></div>`
  if (nameLower === 'good article' || nameLower === 'ga') return `<div class="tmbox tmbox-good" role="note"><span class="tmbox-icon">✅</span><div><b>This is a good article.</b></div></div>`
  if (nameLower === 'spoken wikipedia' || nameLower === 'spoken') return `<div class="tmbox tmbox-notice" role="note"><span class="tmbox-icon">🔊</span><div><b>This article has a spoken version.</b>${params['1']?' File: '+params['1']:''}</div></div>`

  // ── References ─────────────────────────────────────────────────────────────
  if (nameLower === 'reflist' || nameLower === 'references' || nameLower === 'notelist') return `<references/>`
  if (nameLower === 'refn') return `<ref group="${escapeHtml(params.group||'')}">${params['1']||''}</ref>`
  if (nameLower === 'efn' || nameLower === 'efn-ua') return `<ref group="note">${params['1']||''}</ref>`

  // ── Protection ─────────────────────────────────────────────────────────────
  if (nameLower === 'protection' || nameLower === 'protected' || nameLower === 'pp' ||
      nameLower === 'pp-move' || nameLower === 'pp-semi' || nameLower === 'pp-full') {
    const level=nameLower==='pp-semi'?'semi':nameLower==='pp-move'?'move':(params.level||params['1']||'full').toLowerCase()
    const reason=params.reason||params['2']||'', expiry=params.expiry||params['3']||'indefinite'
    const icons={full:'🔒',semi:'🔓',move:'🔀',create:'🚫'}, labels={full:'fully protected',semi:'semi-protected',move:'move-protected',create:'creation-protected'}
    return `<div class="tmbox tmbox-protection" role="note"><span class="tmbox-icon">${icons[level]||'🔒'}</span><div><b>This page is ${labels[level]||'protected'}.</b>${reason?' Reason: '+reason+'.':''}${expiry!=='indefinite'?' Expires: '+expiry+'.':''} Only <a href="/wiki/WikiO:Administrators" class="wikilink">administrators</a> can ${level==='semi'?'make certain edits to':'edit'} this page.</div></div>`
  }

  // ── Try fetching from Template: namespace ─────────────────────────────────  // ── Try fetching from Template: namespace ─────────────────────────────────
  // BUG FIX: Original used `name.charAt(0).toUpperCase() + name.slice(1)` which
  // failed for names with underscores vs spaces — e.g. {{My_Template}} vs
  // {{My Template}}. Normalise spaces↔underscores so both forms resolve correctly.
  const lookupName = (name.charAt(0).toUpperCase() + name.slice(1)).replace(/_/g, ' ')
  const lookupNameUnderscored = lookupName.replace(/ /g, '_')

  // Try space form first, then underscore form
  let templateContent = await fetchTemplatePage(lookupName)
  if (!templateContent && lookupName !== lookupNameUnderscored) {
    templateContent = await fetchTemplatePage(lookupNameUnderscored)
  }

  if (templateContent) {
    // Strip == Usage == / == Parameters == / == Examples == documentation sections
    let body = templateContent.replace(/\n==\s*(Usage|Parameters|Examples?|Documentation|Notes?)\s*==[\s\S]*$/i, '').trim()

    // BUG FIX: Substitute {{{param|default}}} BEFORE recursive expansion,
    // but use the bracket-aware approach to handle pipes in default values correctly.
    // The regex handles: {{{name}}}, {{{name|default}}}, {{{name|default with spaces}}}
    body = body.replace(/\{\{\{([^|{}]+?)(?:\|([^{}]*))?\}\}\}/g, (_, paramName, defaultVal) => {
      const key = paramName.trim()
      if (params[key] !== undefined) return params[key]
      // Also try positional: if key is a number, look it up
      if (/^\d+$/.test(key) && params[key] !== undefined) return params[key]
      if (defaultVal !== undefined) return defaultVal
      return '' // omit if not provided and no default
    })

    // Recursively expand any templates inside the transcluded content
    body = await expandTemplates(body, depth + 1)
    return body
  }

  // Unknown template — render as visible placeholder so editors can spot missing templates
  return `<span class="template-unknown" title="Template:${escapeHtml(name)} not found">{{${escapeHtml(name)}}}</span>`
}

// ── Sync template resolver (used only for <ref> inline cite, no transclusion needed)
function parseSyncTemplate(inner) {
  const parts = splitTemplateParts(inner)
  if (!parts.length) return ''
  const name = parts[0].trim().toLowerCase()
  const params = {}
  let pos = 1
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const eq = part.indexOf('=')
    if (eq >= 0) params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
    else params[String(pos++)] = part.trim()
  }
  const citeTypes = ['cite web','cite news','cite book','cite journal','cite magazine',
    'cite report','cite press release','cite podcast','cite interview','cite speech',
    'cite av media','cite episode']
  if (citeTypes.includes(name)) return renderCitation(name.replace('cite ',''), params)
  return `{{${inner}}}`
}

// ── Infobox renderer — Wikipedia label1/data1 style
// Supports: name/title (caption), image/image_size/alt/caption,
//           label1..label99 / data1..data99 for rows,
//           header1..header99 for section headers,
//           above (bold name row), below (footer row),
//           bodystyle, labelstyle, datastyle, headerstyle (inline styles),
//           subheader, subheader2 (italic subheadings under name)
function renderInfobox(params) {
  let html = '<table class="infobox">'

  // Caption (above / name / title)
  const caption = params.above || params.name || params.title || ''
  if (caption) html += `<caption class="infobox-title">${caption}</caption>`

  // Subheader rows
  for (const k of ['subheader','subheader2','subheader3']) {
    if (params[k]) html += `<tr><td colspan="2" class="infobox-subheader">${params[k]}</td></tr>`
  }

  // Image row
  const img = params.image || params.image1 || ''
  if (img) {
    const alt = params.alt || params.caption || ''
    const cap = params.caption || ''
    const sz  = params.image_size || params.imagesize || ''
    const imgTag = `<img src="${img}" alt="${escapeHtml(alt)}" style="max-width:${sz||'100%'};height:auto">`
    html += `<tr><td colspan="2" class="infobox-image">${imgTag}${cap ? `<div class="infobox-caption">${cap}</div>` : ''}</td></tr>`
  }

  // Image2 row (some infoboxes have a second image)
  if (params.image2) {
    const alt2 = params.alt2 || params.caption2 || ''
    const cap2 = params.caption2 || ''
    html += `<tr><td colspan="2" class="infobox-image"><img src="${params.image2}" alt="${escapeHtml(alt2)}" style="max-width:100%;height:auto">${cap2 ? `<div class="infobox-caption">${cap2}</div>` : ''}</td></tr>`
  }

  // Numbered rows: header1..99, label1..99 / data1..99
  const bodystyle    = params.bodystyle    ? ` style="${params.bodystyle}"`    : ''
  const labelstyle   = params.labelstyle   ? ` style="${params.labelstyle}"`   : ''
  const datastyle    = params.datastyle    ? ` style="${params.datastyle}"`    : ''
  const headerstyle  = params.headerstyle  ? ` style="${params.headerstyle}"`  : ''

  let hasNumbered = false
  for (let i = 1; i <= 99; i++) {
    const header = params[`header${i}`]
    const label  = params[`label${i}`]
    const data   = params[`data${i}`]

    if (header !== undefined) {
      html += `<tr><th colspan="2" class="infobox-header"${headerstyle}>${header}</th></tr>`
      hasNumbered = true
    } else if (data !== undefined) {
      if (label !== undefined) {
        html += `<tr><th class="infobox-label"${labelstyle}>${label}</th><td class="infobox-data"${datastyle}>${data}</td></tr>`
      } else {
        html += `<tr><td colspan="2" class="infobox-data infobox-data-full"${datastyle}>${data}</td></tr>`
      }
      hasNumbered = true
    }
  }

  // Fallback: if no label1/data1 style params, render all unknown params as rows
  if (!hasNumbered) {
    const skip = new Set(['above','name','title','image','image1','image2','image_size','imagesize',
      'alt','alt2','caption','caption2','subheader','subheader2','subheader3','below',
      'bodystyle','labelstyle','datastyle','headerstyle'])
    for (const [k, v] of Object.entries(params)) {
      if (!skip.has(k) && v) {
        html += `<tr><th class="infobox-label">${capitalise(k.replace(/_/g,' '))}</th><td class="infobox-data">${v}</td></tr>`
      }
    }
  }

  // Below row
  if (params.below) {
    html += `<tr><td colspan="2" class="infobox-below">${params.below}</td></tr>`
  }

  html += '</table>'
  return html
}

// ── Stub renderer
function renderStub(params) {
  const type = params && params['1'] ? params['1'] + ' ' : ''
  return `<div class="stub-notice">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Writing_stub.svg/30px-Writing_stub.svg.png" alt="">
    <i>This ${type}article is a <a href="/wiki/Help:Stub" class="wikilink">stub</a>. You can help WikiO by expanding it.</i>
  </div>`
}

// ── Citation renderer — Wikipedia-style
// Supports: last/first, last2/first2 ... last9/first9, author, authors,
//           title, url, work, website, newspaper, journal, publisher,
//           date, year, access-date, accessdate, pages, page, doi, isbn,
//           archive-url, archive-date, url-status, chapter, edition,
//           volume, issue, location
function renderCitation(type, params) {
  // ── Build author string ────────────────────────────────────────────────────
  let authorStr = ''
  if (params.authors) {
    authorStr = params.authors
  } else {
    const authorList = []
    // Supports last/first, last2/first2 ... last9/first9
    for (let i = 1; i <= 9; i++) {
      const suffix = i === 1 ? '' : String(i)
      const last = params[`last${suffix}`] || params[`surname${suffix}`] || ''
      const first = params[`first${suffix}`] || params[`given${suffix}`] || ''
      if (last || first) {
        authorList.push(last && first ? `${last}, ${first}` : last || first)
      }
    }
    // Fall back to |author= or |author1=
    if (!authorList.length) {
      const a = params.author || params.author1 || ''
      if (a) authorList.push(a)
    }
    if (authorList.length > 4) {
      authorStr = authorList.slice(0, 4).join('; ') + '; et al.'
    } else {
      authorStr = authorList.join('; ')
    }
  }

  // ── Core fields ─────────────────────────────────────────────────────────────
  const date      = params.date || (params.year ? (params.month ? `${params.month} ${params.year}` : params.year) : '')
  const title     = params.title || ''
  const url       = params.url || ''
  const chapter   = params.chapter || ''
  const chapterUrl= params['chapter-url'] || params.chapterurl || ''
  // Work/venue
  const work      = params.work || params.website || params.newspaper || params.magazine ||
                    params.journal || params.encyclopaedia || params.encyclopedia || ''
  const publisher = params.publisher || ''
  const location  = params.location || params.place || ''
  const edition   = params.edition || ''
  const volume    = params.volume || ''
  const issue     = params.issue || params.number || ''
  const pages     = params.pages || params.page || ''
  const doi       = params.doi || ''
  const isbn      = params.isbn || params.ISBN || ''
  const issn      = params.issn || ''
  const pmid      = params.pmid || ''
  const arxiv     = params.arxiv || ''
  const accessdate= params['access-date'] || params.accessdate || params['accessdate'] || ''
  const archiveUrl= params['archive-url'] || params.archiveurl || ''
  const archiveDate=params['archive-date'] || params.archivedate || ''
  const urlStatus = (params['url-status'] || 'live').toLowerCase()
  const language  = params.language || params.lang || ''
  const quote     = params.quote || ''
  const via       = params.via || ''
  const ref       = params.ref || ''

  // ── Assemble ────────────────────────────────────────────────────────────────
  const parts = []

  // Authors
  if (authorStr) parts.push(authorStr)

  // Date
  if (date) parts.push(`(${date})`)

  // Chapter (for books)
  if (chapter) {
    const chDisplay = chapterUrl
      ? `"<a href="${chapterUrl}" class="external" target="_blank" rel="noopener">${chapter}</a>"`
      : `"${chapter}"`
    parts.push(chDisplay)
  }

  // Title — italicised for books/journals, quoted for articles/web
  if (title) {
    const needsItalics = ['book','journal','magazine','report','podcast','av media','episode'].includes(type)
    let titleDisplay
    if (url && urlStatus !== 'dead') {
      titleDisplay = needsItalics
        ? `<i><a href="${url}" class="external" target="_blank" rel="noopener">${title}</a></i>`
        : `"<a href="${url}" class="external" target="_blank" rel="noopener">${title}</a>"`
    } else if (archiveUrl) {
      titleDisplay = needsItalics
        ? `<i><a href="${archiveUrl}" class="external" target="_blank" rel="noopener">${title}</a></i>`
        : `"<a href="${archiveUrl}" class="external" target="_blank" rel="noopener">${title}</a>"`
    } else {
      titleDisplay = needsItalics ? `<i>${title}</i>` : `"${title}"`
    }
    if (url && urlStatus === 'dead' && archiveUrl) {
      titleDisplay += ` [<a href="${archiveUrl}" class="external" target="_blank" rel="noopener">archived</a> ${archiveDate}]`
    }
    parts.push(titleDisplay)
  }

  // Work / venue
  if (work) {
    const workDisplay = ['book','report'].includes(type) ? work : `<i>${work}</i>`
    parts.push(workDisplay)
  }

  // Location + publisher
  if (location && publisher) parts.push(`${location}: ${publisher}`)
  else if (publisher) parts.push(publisher)
  else if (location) parts.push(location)

  // Edition, volume, issue, pages
  const extras = []
  if (edition) extras.push(`${edition} ed.`)
  if (volume)  extras.push(`vol. ${volume}`)
  if (issue)   extras.push(`no. ${issue}`)
  if (pages)   extras.push(`pp. ${pages}`)
  if (extras.length) parts.push(extras.join(', '))

  // Identifiers
  if (doi)   parts.push(`<a href="https://doi.org/${doi}" class="external" target="_blank" rel="noopener">doi:${doi}</a>`)
  if (isbn)  parts.push(`<a href="/wiki/Special:BookSources/${isbn.replace(/-/g,'')}" class="wikilink">ISBN ${isbn}</a>`)
  if (issn)  parts.push(`ISSN ${issn}`)
  if (pmid)  parts.push(`<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}/" class="external" target="_blank" rel="noopener">PMID ${pmid}</a>`)
  if (arxiv) parts.push(`<a href="https://arxiv.org/abs/${arxiv}" class="external" target="_blank" rel="noopener">arXiv:${arxiv}</a>`)
  if (via)   parts.push(`via ${via}`)

  // Access date
  if (accessdate) parts.push(`Retrieved ${accessdate}`)

  // Language
  if (language && language.toLowerCase() !== 'en') parts.push(`(in ${language})`)

  // Quote
  if (quote) parts.push(`"${quote}"`)

  const body = parts.join('. ').replace(/\.\./g, '.') + (parts.length ? '.' : '')
  const idAttr = ref && ref !== 'harv' ? ` id="${escapeHtml(ref)}"` : ''
  return `<span class="citation cite-${type}"${idAttr}>${body}</span>`
}

// ── Wiki tables
// BUG FIX: Original regex `/\{\|(.*?)\|\}/gs` used a non-greedy match that could
// still be confused by `|}` appearing inside template output that ran before tables.
// Moving table parsing AFTER template expansion (already done in parseWikitext)
// fixes the ordering issue. Additionally guard against matching template `}}`.
function parseWikiTables(text) {
  // Use a brace-aware loop instead of a regex to correctly find {| ... |} boundaries
  const result = []
  let i = 0
  while (i < text.length) {
    // Look for start of wiki table
    if (text[i] === '{' && text[i + 1] === '|') {
      // Find matching |}
      let j = i + 2
      let depth = 1
      while (j < text.length - 1 && depth > 0) {
        if (text[j] === '{' && text[j + 1] === '|') { depth++; j += 2; continue }
        if (text[j] === '|' && text[j + 1] === '}') { depth--; if (depth === 0) break; j += 2; continue }
        j++
      }
      const tableSource = text.slice(i, j + 2)
      result.push(renderWikiTable(tableSource))
      i = j + 2
    } else {
      result.push(text[i])
      i++
    }
  }
  return result.join('')
}

function renderWikiTable(match) {
  const firstLine = match.slice(2, match.indexOf('\n'))
  // Extract class/style from first line attributes
  const clsMatch = firstLine.match(/class="([^"]*)"/)
  const cls = clsMatch ? clsMatch[1] : 'wikitable'
  const styleMatch = firstLine.match(/style="([^"]*)"/)
  const styleAttr = styleMatch ? ` style="${styleMatch[1]}"` : ''

  const inner = match.slice(match.indexOf('\n') + 1, -2)
  let html = `<table class="${cls}"${styleAttr}>`
  const lines = inner.split('\n')
  let inRow = false
  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    if (line.startsWith('|-')) {
      if (inRow) html += '</tr>'
      // Extract row attributes (e.g. |- style="...")
      const rowStyle = line.slice(2).trim()
      html += rowStyle ? `<tr ${rowStyle}>` : '<tr>'
      inRow = true
    } else if (line.startsWith('|+')) {
      html += `<caption>${line.slice(2).trim()}</caption>`
    } else if (line.startsWith('!')) {
      if (!inRow) { html += '<tr>'; inRow = true }
      line.slice(1).split('!!').forEach(c => { html += renderCell('th', c.trim()) })
    } else if (line.startsWith('|')) {
      if (!inRow) { html += '<tr>'; inRow = true }
      line.slice(1).split('||').forEach(c => { html += renderCell('td', c.trim()) })
    }
  }
  if (inRow) html += '</tr>'
  html += '</table>'
  return html
}

// ── Wiki table cell renderer — preserves style="..." and bgcolor="..." attributes
// BUG FIX: The original stripped all cell attributes. Wikitext allows:
//   | style="background:red" | Cell content
//   | bgcolor="#ff0000"      | Cell content
// The pipe separates attributes from content only when attributes are present.
function renderCell(tag, raw) {
  // If the cell contains a double-pipe it was already split; raw is just content.
  // Check if there's an attribute block: "attr | content" (single pipe, not double)
  // We look for a pattern: something that looks like HTML attrs before a lone |
  const attrMatch = raw.match(/^([^|]*(?:style|bgcolor|colspan|rowspan|align|valign|width|class)[^|]*)\|(.*)$/i)
  if (attrMatch) {
    const attrs = attrMatch[1].trim()
    const content = attrMatch[2].trim()
    // Convert bgcolor="..." to style attribute if no style already present
    const safeAttrs = attrs.replace(/bgcolor=["']?([^"'\s>]+)["']?/gi,
      (_, color) => `style="background-color:${color}"`)
    return `<${tag} ${safeAttrs}>${content}</${tag}>`
  }
  return `<${tag}>${raw}</${tag}>`
}


function parseWikiLists(text, tag) {
  const char = tag === 'ul' ? '*' : '#'
  const lines = text.split('\n')
  const result = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(/^([*#]+)\s(.*)/)
    if (m && m[1][0] === char) {
      const { html, nextI } = collectList(lines, i, 1, char)
      result.push(html); i = nextI
    } else {
      result.push(lines[i]); i++
    }
  }
  return result.join('\n')
}

function collectList(lines, startI, depth, char) {
  const tag = char === '*' ? 'ul' : 'ol'
  let html = `<${tag}>`
  let i = startI
  while (i < lines.length) {
    const m = lines[i].match(/^([*#]+)\s(.*)/)
    if (!m || m[1][0] !== char) break
    const lvl = m[1].split('').filter(c => c === char).length
    if (lvl < depth) break
    if (lvl === depth) {
      const nextM = lines[i+1] && lines[i+1].match(/^([*#]+)\s(.*)/)
      const nextLvl = nextM && nextM[1][0] === char ? nextM[1].length : 0
      if (nextLvl > depth) {
        html += `<li>${m[2]}`
        i++
        const sub = collectList(lines, i, depth + 1, char)
        html += sub.html + '</li>'
        i = sub.nextI
      } else {
        html += `<li>${m[2]}</li>`; i++
      }
    } else { i++ }
  }
  html += `</${tag}>`
  return { html, nextI: i }
}

function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

// ── Table of Contents
// BUG FIX: Original regex `([^<]+)` for heading text broke when headings
// contained HTML tags (e.g. a wikilink inside a heading becomes <a>...</a>).
// Fix: strip HTML tags from the captured text for the TOC label.
function buildTOC(html) {
  const headings = []
  const re = /<h([23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h[23]>/g
  let m
  while ((m = re.exec(html)) !== null) {
    // Strip HTML tags to get plain text for the TOC entry
    const text = m[3].replace(/<[^>]+>/g, '').trim()
    headings.push({ level: parseInt(m[1]), id: m[2], text })
  }
  if (headings.length < 3) return ''
  let toc = `<div class="toc" id="toc"><div class="toctitle"><h2>Contents</h2></div><ul>`
  let sectionNum = 0, subNum = 0
  for (const h of headings) {
    if (h.level === 2) {
      sectionNum++; subNum = 0
      toc += `<li class="toclevel-1"><a href="#${h.id}"><span class="tocnumber">${sectionNum}</span> <span class="toctext">${h.text}</span></a></li>`
    } else {
      subNum++
      toc += `<li class="toclevel-2"><a href="#${h.id}"><span class="tocnumber">${sectionNum}.${subNum}</span> <span class="toctext">${h.text}</span></a></li>`
    }
  }
  toc += `</ul></div>`
  return toc
}

// ─── CSS / JS Pages ──────────────────────────────────────────────────────────
async function loadCustomCSS() {
  // Load all CSS pages: MediaWiki:Common.css, MediaWiki:*.css, Module:*/styles.css
  let combined = ''
  try {
    const res = await fetch('/api/pages')
    const data = await res.json()
    const cssPages = (data.pages || []).filter(p =>
      (p.title.startsWith('MediaWiki:') && p.title.endsWith('.css')) ||
      (p.title.startsWith('Module:') && p.title.endsWith('/styles.css')) ||
      (p.title.startsWith('Template:') && p.title.endsWith('/styles.css'))
    ).sort((a, b) => {
      // Common.css first, then Vector.css, then others
      if (a.title === 'MediaWiki:Common.css') return -1
      if (b.title === 'MediaWiki:Common.css') return 1
      if (a.title === 'MediaWiki:Vector.css') return -1
      if (b.title === 'MediaWiki:Vector.css') return 1
      return a.title.localeCompare(b.title)
    })
    for (const page of cssPages) {
      try {
        const r = await fetch(`/api/page/${encodeURIComponent(page.title)}`)
        const d = await r.json()
        if (d.content && d.content.trim()) {
          combined += `\n/* ${page.title} */\n${d.content}\n`
        }
      } catch { /* ignore individual failures */ }
    }
  } catch { /* ignore */ }
  if (!combined.trim()) return
  if (!combined.trim()) return
  let styleEl = document.getElementById('wikio-custom-css')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'wikio-custom-css'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = combined
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
    if (!data.user) return null
    return { username: data.user, is_admin: !!data.is_admin }
  } catch { return null }
}

async function deletePage(title) {
  const res = await fetch(`/api/page/${encodeURIComponent(title)}`, { method: 'DELETE' })
  return res.json()
}

async function protectPage(title, protect, reason) {
  const res = await fetch(`/api/page/${encodeURIComponent(title)}/protect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ protect, reason })
  })
  return res.json()
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
let currentTab = 'read'
let currentTitle = ''

// ─── Router ──────────────────────────────────────────────────────────────────

function navigate(path) {
  history.pushState({}, '', path)
  render()
}

// ─── Render ──────────────────────────────────────────────────────────────────

async function render() {
  templateCache.clear()

  currentUser = await getCurrentUser()
  let path = window.location.pathname

  if (path === '/') {
    history.replaceState({}, '', '/wiki/Main_Page')
    path = '/wiki/Main_Page'
  }

  if (path === '/wiki/Special:Random' || path === '/Special:Random') {
    const data = await getPageList()
    const pages = (data.pages || []).filter(p => !p.title.startsWith('Special:'))
    if (pages.length) {
      navigate('/wiki/' + pages[Math.floor(Math.random() * pages.length)].title)
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
        <tr><td><label for="username">Username:</label></td><td><input id="username" type="text" size="25" autocomplete="username"></td></tr>
        <tr><td><label for="password">Password:</label></td><td><input id="password" type="password" size="25" autocomplete="${isRegister?'new-password':'current-password'}"></td></tr>
        ${isRegister ? `<tr><td><label for="confirm">Confirm password:</label></td><td><input id="confirm" type="password" size="25" autocomplete="new-password"></td></tr>` : ''}
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
    if (!username || !password) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display = 'block'; return }
    if (isRegister) {
      const confirm = document.getElementById('confirm').value
      if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; return }
      const data = await register(username, password)
      if (data.error) { errEl.textContent = data.error; errEl.style.display = 'block'; return }
    } else {
      const data = await login(username, password)
      if (data.error) { errEl.textContent = data.error; errEl.style.display = 'block'; return }
    }
    navigate('/wiki/Main_Page')
  }
  bindChrome()
}

// ─── Wiki Page ────────────────────────────────────────────────────────────────

async function renderWikiPage(title) {
  const app = document.getElementById('app')
  if (!app) return

  const params = new URLSearchParams(window.location.search)
  const action = params.get('action')
  if (action === 'edit') currentTab = 'edit'
  else if (action === 'history') currentTab = 'history'
  else if (action === 'move') currentTab = 'move'
  else if (action === 'protect') currentTab = 'protect'
  else if (action === 'delete') currentTab = 'delete'
  else currentTab = 'read'

  const data = await getPage(title)
  const content = data.content || ''
  const pageExists = !!(data.content)
  const isProtected = !!(data.protected)
  const displayTitle = title.replace(/_/g, ' ')
  const isAdmin = !!(currentUser && currentUser.is_admin)
  const username = currentUser ? currentUser.username : null

  const isCSSPage = title.endsWith('.css')
  const isJSPage  = title.endsWith('.js')
  const isCodePage = isCSSPage || isJSPage
  const isModulePage = title.startsWith('Module:') && !title.endsWith('/styles.css') && !title.endsWith('/doc')

  let nsClass = 'ns-main'
  if (title.startsWith('Help:')) nsClass = 'ns-help'
  else if (title.startsWith('User:')) nsClass = 'ns-user'
  else if (title.startsWith('WikiO:')) nsClass = 'ns-project'
  else if (title.startsWith('Template:')) nsClass = 'ns-template'
  else if (title.startsWith('Category:')) nsClass = 'ns-category'
  else if (title.startsWith('Special:')) nsClass = 'ns-special'
  else if (title.startsWith('MediaWiki:')) nsClass = 'ns-mediawiki'

  let mainContent = ''

  if (currentTab === 'read') {
    if (isCodePage) {
      mainContent = `
        <div class="mw-parser-output">
          <div class="hatnote" role="note">This is a CSS stylesheet page. To apply changes, edit this page — styles load automatically on every page.</div>
          <pre class="css-source"><code>${escapeHtml(content || '/* This page is empty. Add CSS rules here to customise the wiki. */')}</code></pre>
        </div>`
    } else {
      const rendered = await parseWikitext(content || `''This page does not exist yet.''`)
      const toc = buildTOC(rendered)
      const withToc = rendered.replace(/(<h2)/, toc + '$1')
      mainContent = `<div class="mw-parser-output ${!pageExists ? 'page-missing' : ''}">${withToc}</div>`
    }
  } else if (currentTab === 'edit') {
    const editorNote = isCodePage
      ? '<span class="new-page-notice">Editing a ' + (isCSSPage ? 'CSS' : isJSPage ? 'JS' : 'code') + ' page — content is raw code, not wikitext. Changes take effect on next page load.</span>'
      : (!pageExists ? '<span class="new-page-notice">This page does not exist yet — your edit will create it.</span>' : '')
    mainContent = `
      <div class="mw-editnotice">
        <p>You are editing <b>${displayTitle}</b>. ${editorNote}</p>
        ${isCSSPage ? '' : `<p class="edit-help">Need help? See <a href="/wiki/Help:Wikitext" class="wikilink">Help:Wikitext</a>.</p>`}
      </div>
      <textarea id="editor" class="mw-editbox${isCodePage ? ' mw-editbox-css' : ''}" spellcheck="${isCodePage ? 'false' : 'true'}">${escapeHtml(content)}</textarea>
      ${isCodePage ? '' : `
      <div class="mw-edittools">
        <div class="edit-buttons-bar">
          <button class="wikitext-btn" data-wrap="''|''" title="Italic">I</button>
          <button class="wikitext-btn" data-wrap="'''|'''" title="Bold"><b>B</b></button>
          <button class="wikitext-btn" data-wrap="[[|]]" title="Link">🔗</button>
          <button class="wikitext-btn" data-wrap="<ref>|</ref>" title="Citation"><sup>[1]</sup></button>
          <button class="wikitext-btn" data-wrap="== | ==" title="Heading">H2</button>
        </div>
      </div>`}
      <div class="mw-summary-row">
        <label for="summary">Edit summary:</label>
        <input id="summary" type="text" placeholder="Briefly describe your changes" class="mw-summary-input">
      </div>
      <div class="mw-edit-actions">
        <button id="save-page" class="mw-btn mw-btn-primary">Save changes</button>
        ${isCodePage ? '' : '<button id="preview-btn" class="mw-btn">Show preview</button>'}
        <button id="cancel-edit" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>
      ${isCodePage ? '' : `
      <div id="preview-area" class="mw-preview" style="display:none">
        <h2>Preview (not saved)</h2>
        <div id="preview-content" class="mw-parser-output"></div>
        <hr>
      </div>`}
    `
  } else if (currentTab === 'history') {
    const histData = await getRevisions(title)
    const revs = histData.revisions || []
    const rows = revs.length
      ? revs.map(r => `<tr>
          <td class="hist-date">${new Date(r.created_at).toLocaleString()}</td>
          <td class="hist-user"><a href="/wiki/User:${r.editor}" class="wikilink">${escapeHtml(r.editor)}</a></td>
          <td class="hist-summary">${escapeHtml(r.summary || '')}</td>
        </tr>`).join('')
      : '<tr><td colspan="3">No revision history.</td></tr>'
    mainContent = `
      <p>Revision history for <b>${displayTitle}</b></p>
      <table class="wikitable" id="pagehistory">
        <thead><tr><th>Date</th><th>User</th><th>Edit summary</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
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
          <td><label><input type="checkbox" id="leave-redirect" checked> Leave a redirect behind</label></td>
        </tr>
      </table>
      <br>
      <div class="mw-edit-actions">
        <button id="move-page-btn" class="mw-btn mw-btn-primary">Move page</button>
        <button id="cancel-move" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>`
  } else if (currentTab === 'protect') {
    mainContent = `
      <div class="mw-editnotice">
        <p>${isProtected ? '🔒 This page is currently <b>protected</b>.' : '🔓 This page is currently <b>unprotected</b>.'}</p>
        <p>${isProtected ? 'Unprotecting will allow all logged-in users to edit it.' : 'Protecting will restrict editing to administrators only.'}</p>
      </div>
      <div id="protect-error" class="auth-error" style="display:none"></div>
      <table class="mw-auth-table">
        <tr>
          <td><label for="protect-reason">Reason:</label></td>
          <td><input id="protect-reason" type="text" size="40" placeholder="Reason for ${isProtected ? 'un' : ''}protecting" class="mw-summary-input"></td>
        </tr>
      </table>
      <br>
      <div class="mw-edit-actions">
        <button id="protect-page-btn" class="mw-btn ${isProtected ? 'mw-btn-quiet' : 'mw-btn-primary'}">
          ${isProtected ? '🔓 Unprotect page' : '🔒 Protect page'}
        </button>
        <button id="cancel-protect" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>`
  } else if (currentTab === 'delete') {
    mainContent = `
      <div class="mw-editnotice mw-editnotice-delete">
        <p>⚠️ You are about to <b>permanently delete</b> the page <b>${displayTitle}</b>.</p>
        <p>This cannot be undone. The page content will be removed from the database.</p>
      </div>
      <div id="delete-error" class="auth-error" style="display:none"></div>
      <table class="mw-auth-table">
        <tr>
          <td><label for="delete-reason">Reason:</label></td>
          <td><input id="delete-reason" type="text" size="40" placeholder="Reason for deletion" class="mw-summary-input"></td>
        </tr>
        <tr>
          <td></td>
          <td><label><input type="checkbox" id="delete-confirm"> I confirm I want to permanently delete this page</label></td>
        </tr>
      </table>
      <br>
      <div class="mw-edit-actions">
        <button id="delete-page-btn" class="mw-btn mw-btn-danger">🗑️ Delete page</button>
        <button id="cancel-delete" class="mw-btn mw-btn-quiet">Cancel</button>
      </div>`
  }

  const tabs = [
    { id: 'read',    label: 'Article',  href: `/wiki/${title}` },
    { id: 'edit',    label: isCSSPage ? 'Edit CSS' : isJSPage ? 'Edit JS' : isModulePage ? 'Edit Module' : 'Edit', href: `/wiki/${title}?action=edit` },
    { id: 'history', label: 'History',  href: `/wiki/${title}?action=history` },
    ...(pageExists ? [{ id: 'move', label: 'Move', href: `/wiki/${title}?action=move` }] : []),
    ...(pageExists && isAdmin ? [{ id: 'protect', label: isProtected ? '🔒 Unprotect' : '🔒 Protect', href: `/wiki/${title}?action=protect` }] : []),
    ...(pageExists && isAdmin ? [{ id: 'delete', label: '🗑️ Delete', href: `/wiki/${title}?action=delete`, danger: true }] : []),
  ]

  const tabsHtml = tabs.map(t => `
    <li class="mw-tab ${currentTab === t.id ? 'selected' : ''} ${t.danger ? 'mw-tab-danger' : ''}">
      <a href="${t.href}">${t.label}</a>
    </li>`).join('')

  app.innerHTML = buildChrome(displayTitle, `
    <div class="mw-page-container ${nsClass}">
      <div class="mw-tabs-container">
        <ul class="mw-tabs">${tabsHtml}</ul>
        <ul class="mw-tabs-right">
          ${username
            ? `<li><a href="/wiki/User:${username}" class="wikilink">User:${username}${isAdmin ? ' <span class="admin-badge">admin</span>' : ''}</a></li>
               <li><a id="logout-link" href="#">Log out</a></li>`
            : `<li><a href="/wiki/Special:Login" class="wikilink">Log in</a></li>
               <li><a href="/wiki/Special:CreateAccount" class="wikilink">Create account</a></li>`}
        </ul>
      </div>
      ${isProtected ? '<div class="page-protected-banner">🔒 This page is protected. Only administrators can edit it.</div>' : ''}
      <h1 class="firstHeading" id="firstHeading">${displayTitle}</h1>
      <div class="mw-body-content">${mainContent}</div>
    </div>
  `)

  bindChrome()

  document.getElementById('logout-link')?.addEventListener('click', async e => {
    e.preventDefault()
    await logout()
    navigate('/wiki/Main_Page')
  })

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

  if (currentTab === 'edit') bindEditPage(title, isCodePage || isModulePage)
  else if (currentTab === 'move') bindMovePage(title)
  else if (currentTab === 'protect') bindProtectPage(title, isProtected)
  else if (currentTab === 'delete') bindDeletePage(title)
}

function bindEditPage(title, isCodePage) {
  if (!isCodePage) {
    document.querySelectorAll('.wikitext-btn').forEach(btn => {
      btn.onclick = () => {
        const editor = document.getElementById('editor')
        if (!editor) return
        const [before, after] = (btn.dataset.wrap || '').split('|')
        const start = editor.selectionStart, end = editor.selectionEnd
        const selected = editor.value.slice(start, end) || 'text'
        editor.setRangeText(before + selected + after, start, end, 'select')
        editor.focus()
      }
    })
  }

  document.getElementById('save-page').onclick = async () => {
    const content = document.getElementById('editor').value
    const summary = document.getElementById('summary').value
    const btn = document.getElementById('save-page')
    btn.disabled = true; btn.textContent = 'Saving…'
    await savePage(title, content, summary)
    if (isCodePage) await loadCustomCSS()
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'
    render()
  }

  document.getElementById('preview-btn')?.addEventListener('click', async () => {
    const content = document.getElementById('editor').value
    const previewArea = document.getElementById('preview-area')
    const previewContent = document.getElementById('preview-content')
    previewContent.innerHTML = await parseWikitext(content)
    previewArea.style.display = 'block'
    previewArea.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('cancel-edit').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'; render()
  }
}

function bindMovePage(title) {
  document.getElementById('cancel-move').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'; render()
  }

  document.getElementById('move-page-btn').onclick = async () => {
    const newTitleRaw = document.getElementById('new-title').value.trim()
    const summary = document.getElementById('move-summary').value.trim()
    const leaveRedirect = document.getElementById('leave-redirect').checked
    const errEl = document.getElementById('move-error')
    errEl.style.display = 'none'

    if (!newTitleRaw) { errEl.textContent = 'Please enter a new title.'; errEl.style.display = 'block'; return }

    const newTitle = newTitleRaw.replace(/ /g, '_')
    const displayOld = title.replace(/_/g, ' ')
    const displayNew = newTitle.replace(/_/g, ' ')

    if (newTitle === title) { errEl.textContent = 'The new title is the same as the current title.'; errEl.style.display = 'block'; return }

    const btn = document.getElementById('move-page-btn')
    btn.disabled = true; btn.textContent = 'Moving…'

    const result = await movePage(title, newTitle, summary || `Moved from ${displayOld} to ${displayNew}`)
    if (result.error) {
      errEl.textContent = result.error; errEl.style.display = 'block'
      btn.disabled = false; btn.textContent = 'Move page'; return
    }

    if (leaveRedirect) await savePage(title, `{{redirect|${displayNew}}}`, `Redirect to [[${displayNew}]]`)
    navigate('/wiki/' + newTitle)
  }
}

function bindProtectPage(title, isProtected) {
  document.getElementById('cancel-protect').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'; render()
  }

  document.getElementById('protect-page-btn').onclick = async () => {
    const reason = document.getElementById('protect-reason').value.trim()
    const errEl = document.getElementById('protect-error')
    errEl.style.display = 'none'
    const btn = document.getElementById('protect-page-btn')
    btn.disabled = true
    btn.textContent = isProtected ? 'Unprotecting…' : 'Protecting…'

    const result = await protectPage(title, !isProtected, reason)
    if (result.error) {
      errEl.textContent = result.error; errEl.style.display = 'block'
      btn.disabled = false
      btn.textContent = isProtected ? '🔓 Unprotect page' : '🔒 Protect page'
      return
    }
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'; render()
  }
}

function bindDeletePage(title) {
  document.getElementById('cancel-delete').onclick = () => {
    history.pushState({}, '', `/wiki/${title}`)
    currentTab = 'read'; render()
  }

  document.getElementById('delete-page-btn').onclick = async () => {
    const confirmed = document.getElementById('delete-confirm').checked
    const errEl = document.getElementById('delete-error')
    errEl.style.display = 'none'

    if (!confirmed) {
      errEl.textContent = 'Please check the confirmation box before deleting.'
      errEl.style.display = 'block'
      return
    }

    const btn = document.getElementById('delete-page-btn')
    btn.disabled = true; btn.textContent = 'Deleting…'

    const result = await deletePage(title)
    if (result.error) {
      errEl.textContent = result.error; errEl.style.display = 'block'
      btn.disabled = false; btn.textContent = '🗑️ Delete page'
      return
    }
    navigate('/wiki/Main_Page')
  }
}

// ─── Chrome ───────────────────────────────────────────────────────────────────

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
              <li><a href="/wiki/MediaWiki:Common.css">Common CSS</a></li>
            </ul>
          </div>
        </nav>
        <div id="mw-content">${body}</div>
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
  document.getElementById('logo-link')?.addEventListener('click', e => { e.preventDefault(); navigate('/wiki/Main_Page') })

  const searchForm = document.getElementById('search-form')
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault()
      const q = document.getElementById('searchInput').value.trim()
      if (q) navigate('/wiki/' + q.replace(/ /g, '_'))
    })
  }

  document.querySelectorAll('a.wikilink, #mw-sidebar a, #mw-footer a').forEach(a => {
    const href = a.getAttribute('href')
    if (href && href.startsWith('/wiki/')) {
      a.addEventListener('click', e => { e.preventDefault(); navigate(href) })
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('popstate', render)

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

loadCustomCSS().then(() => render())
