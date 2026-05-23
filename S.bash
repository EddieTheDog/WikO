-- ─── Template pages ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Hatnote',
'<div class="hatnote" role="note">{{{1}}}</div>

== Usage ==
Place at the top of an article to add a navigational note.

  {{Hatnote|For other uses, see [[Disambiguation Page]].}}

== Parameters ==
{| class="wikitable"
|-
! Parameter !! Description
|-
| 1 (unnamed) || The full text of the note, including any wikilinks.
|}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Main',
'<div class="hatnote" role="note">→ Main article: [[{{{1}}}]]</div>

== Usage ==
  {{Main|Article Name}}

Points readers to the main article on a topic covered briefly in a section.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:See also',
'<div class="hatnote" role="note">See also: [[{{{1}}}]]{{#if:{{{2|}}}| · [[{{{2}}}]]}}{{#if:{{{3|}}}| · [[{{{3}}}]]}}</div>

== Usage ==
  {{See also|Page One|Page Two|Page Three}}

Up to three pages. Place at the top of a section.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Note',
'<div class="hatnote" role="note">{{{1}}}</div>

== Usage ==
  {{Note|This article is about the UK band. For the US band, see [[Other Band]].}}

Generic hatnote for disambiguation notes.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Warning',
'<div class="tmbox tmbox-warning"><span class="tmbox-icon">⚠️</span><div><b>Warning:</b> {{{1}}}</div></div>

== Usage ==
  {{Warning|This page contains spoilers.}}
  {{Warning|This article discusses sensitive topics.}}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Infobox person',
'{{Infobox
| title       = {{{name|}}}
| image       = {{{image|}}}
| caption     = {{{caption|}}}
| Born        = {{{birth_date|}}}
| Died        = {{{death_date|}}}
| Nationality = {{{nationality|}}}
| Occupation  = {{{occupation|}}}
| Known for   = {{{known_for|}}}
| Website     = {{{website|}}}
}}

== Usage ==
  {{Infobox person
  | name        = Jane Doe
  | birth_date  = 1 January 1980
  | death_date  =
  | nationality = British
  | occupation  = Scientist
  | known_for   = Discovery of X
  | image       =
  | caption     =
  | website     =
  }}

== Parameters ==
{| class="wikitable"
|-
! Parameter !! Description
|-
| name || Full name displayed as the infobox title
|-
| birth_date || Date of birth
|-
| death_date || Date of death (leave blank if living)
|-
| nationality || Country or nationality
|-
| occupation || Job title or profession
|-
| known_for || Notable achievement or work
|-
| image || URL to an image
|-
| caption || Caption shown under the image
|-
| website || Personal or official website URL
|}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Infobox country',
'{{Infobox
| title      = {{{common_name|}}}
| image      = {{{flag|}}}
| caption    = Flag of {{{common_name|}}}
| Capital    = {{{capital|}}}
| Language   = {{{language|}}}
| Currency   = {{{currency|}}}
| Population = {{{population|}}}
| Area       = {{{area|}}}
| Government = {{{government|}}}
| Founded    = {{{founded|}}}
}}

== Usage ==
  {{Infobox country
  | common_name = France
  | capital     = Paris
  | language    = French
  | currency    = Euro
  | population  = 68 million
  | area        = 643,801 km²
  | government  = Republic
  | founded     = 843 AD
  }}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Infobox film',
'{{Infobox
| title     = {{{title|}}}
| image     = {{{poster|}}}
| caption   = {{{caption|}}}
| Director  = {{{director|}}}
| Producer  = {{{producer|}}}
| Writer    = {{{writer|}}}
| Starring  = {{{starring|}}}
| Music     = {{{music|}}}
| Released  = {{{release_date|}}}
| Runtime   = {{{runtime|}}}
| Country   = {{{country|}}}
| Language  = {{{language|}}}
| Studio    = {{{studio|}}}
}}

== Usage ==
  {{Infobox film
  | title        = The Example Film
  | director     = Jane Smith
  | producer     = John Doe
  | writer       = Jane Smith
  | starring     = Actor One, Actor Two
  | release_date = 15 March 2024
  | runtime      = 120 minutes
  | country      = United States
  | language     = English
  | studio       = Example Studios
  }}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Quote',
'<blockquote class="wiki-quote"><p>{{{1}}}</p>{{#if:{{{author|}}}|<footer>— {{{author|}}}</footer>}}</blockquote>

== Usage ==
  {{Quote|To be or not to be, that is the question.|author=William Shakespeare}}
  {{Quote|The only way to do great work is to love what you do.|author=Steve Jobs}}

Single unnamed parameter is the quote text. Named parameter ''author'' is optional.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Blockquote',
'<blockquote class="wiki-quote"><p>{{{1}}}</p>{{#if:{{{2|}}}|<footer>— {{{2|}}}</footer>}}</blockquote>

== Usage ==
  {{Blockquote|Quote text here.|Author Name}}

Positional version of [[Template:Quote]]. First parameter is the text, second is the author.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Abbr',
'<abbr title="{{{2}}}">{{{1}}}</abbr>

== Usage ==
  {{Abbr|NATO|North Atlantic Treaty Organization}}
  {{Abbr|HTML|HyperText Markup Language}}

Renders the first parameter as visible text with the second parameter as a tooltip on hover.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Color',
'<span style="color:{{{2|inherit}}}">{{{1}}}</span>

== Usage ==
  {{Color|This text is red.|red}}
  {{Color|This text is blue.|#3366cc}}

First parameter: text. Second parameter: any valid CSS colour value.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Highlight',
'<span style="background:{{{2|#ffff99}}};padding:0 2px">{{{1}}}</span>

== Usage ==
  {{Highlight|important text}}
  {{Highlight|danger text|#ffcccc}}

Highlights text with a background colour. Default is yellow.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Kbd',
'<kbd>{{{1}}}</kbd>

== Usage ==
  {{Kbd|Ctrl+C}}
  {{Kbd|Enter}}

Formats text as a keyboard key using the HTML <kbd> element.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Code',
'<code>{{{1}}}</code>

== Usage ==
  {{Code|git commit -m "message"}}
  {{Code|SELECT * FROM pages;}}

Renders inline code in monospace font.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Clear',
'<div style="clear:both"></div>

== Usage ==
  {{Clear}}

Clears floating elements (like infoboxes). Put after a section to stop text wrapping under a floated element.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:TOC right',
'<div style="float:right;clear:right;margin:0 0 1em 2em" id="toc-right-anchor"></div>

== Usage ==
  {{TOC right}}

Forces the Table of Contents to float to the right of the page instead of appearing inline.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Date',
'<span class="date-format" title="{{{1}}}">{{{1}}}</span>

== Usage ==
  {{Date|15 March 2024}}
  {{Date|2024-03-15}}

Wraps a date in a semantic span. Useful for consistent date styling across the wiki.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Under construction',
'<div class="tmbox tmbox-notice"><span class="tmbox-icon">🚧</span><div><b>This page is under construction.</b> It may be incomplete or contain errors. You can [[{{{1|Help:Editing}}}|help by editing it]].</div></div>

== Usage ==
  {{Under construction}}
  {{Under construction|Page Name}}

The optional parameter links to a specific page for contribution guidance.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Outdated',
'<div class="tmbox tmbox-notice"><span class="tmbox-icon">🕐</span><div><b>This article may be outdated.</b> Please help update it to reflect recent events. {{#if:{{{1|}}}|''Last verified: {{{1}}}.''|}}</div></div>

== Usage ==
  {{Outdated}}
  {{Outdated|January 2024}}

Optional parameter specifies when the article was last verified.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Delete',
'<div class="tmbox tmbox-delete"><span class="tmbox-icon">🗑️</span><div><b>This page has been proposed for deletion.</b> Reason: {{{1|No reason given.}}} If you disagree, discuss it on the [[WikiO:Deletion policy|deletion policy]] page.</div></div>

== Usage ==
  {{Delete|Duplicate of [[Other Page]].}}
  {{Delete|No sources provided.}}');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Protection',
'{{protection|level={{{level|full}}}|reason={{{reason|}}}|expiry={{{expiry|indefinite}}}}}

== Usage ==
  {{Protection}}
  {{Protection|level=semi|reason=Persistent vandalism|expiry=2025-06-01}}
  {{Protection|level=move|reason=Move warring}}

== Parameters ==
{| class="wikitable"
|-
! Parameter !! Values !! Description
|-
| level || full, semi, move, create || Protection level (default: full)
|-
| reason || any text || Reason for protection
|-
| expiry || date or "indefinite" || When protection expires
|}

Only [[WikiO:Administrators|administrators]] can add or remove page protection.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Reflist',
'<div class="references"><references/></div>

== Usage ==
  {{Reflist}}

Shorthand for the <nowiki><references/></nowiki> tag. Place at the bottom of any article that uses <nowiki><ref></nowiki> citations.');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Stub',
'<div class="stub-notice"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Writing_stub.svg/30px-Writing_stub.svg.png" alt=""><i>This article is a <a href="/wiki/Help:Stub" class="wikilink">stub</a>. You can help WikiO by expanding it.</i></div>

== Usage ==
  {{Stub}}

Place at the bottom of short articles that need expansion.');

-- ─── Example / Showcase pages ─────────────────────────────────────────────

INSERT OR IGNORE INTO pages (title, content) VALUES ('WikiO:Template examples',
'This page demonstrates all available templates on WikiO.

== Maintenance banners ==

=== Stub ===
{{Stub}}

=== Under construction ===
{{Under construction}}

=== Outdated ===
{{Outdated|March 2024}}

=== Warning ===
{{Warning|This section contains spoilers for the article.}}

=== Delete ===
{{Delete|No reliable sources cited.}}

=== Protection ===
{{Protection|level=semi|reason=Persistent vandalism|expiry=2025-12-01}}

== Navigation templates ==

=== Hatnote ===
{{Hatnote|This article is about the city. For the county, see [[Example County]].}}

=== Main ===
{{Main|George Washington}}

=== See also ===
{{See also|George Washington|Help:Editing|Help:Wikitext}}

== Formatting ==

=== Quote ===
{{Quote|The only true wisdom is in knowing you know nothing.|author=Socrates}}

=== Abbreviation ===
The {{Abbr|WWW|World Wide Web}} was invented in 1989.

=== Highlight ===
{{Highlight|This text is highlighted in yellow.}}

{{Highlight|This text is highlighted in red.|#ffcccc}}

=== Colour ===
{{Color|This text is in the wiki blue.|#3366cc}}

=== Keyboard key ===
Press {{Kbd|Ctrl+S}} to save, or {{Kbd|Ctrl+Z}} to undo.

=== Inline code ===
Run {{Code|npm run dev}} to start the development server.

== Infoboxes ==

=== Person ===
{{Infobox person
| name        = Ada Lovelace
| birth_date  = 10 December 1815
| death_date  = 27 November 1852
| nationality = British
| occupation  = Mathematician, writer
| known_for   = First computer programmer
}}

=== Country ===
{{Infobox country
| common_name = Japan
| capital     = Tokyo
| language    = Japanese
| currency    = Yen (¥)
| population  = 125 million
| area        = 377,975 km²
| government  = Constitutional monarchy
| founded     = 660 BC (traditional)
}}

== Citations ==

Here is a sentence with a citation.<ref>{{cite web|url=https://example.com|title=Example Source|author=Jane Smith|date=2024-01-15|publisher=Example News}}</ref>

Here is a book citation.<ref>{{cite book|title=The Art of the Wiki|author=John Doe|year=2023|publisher=Example Press|isbn=978-0-000-00000-0}}</ref>

== Tables ==

{| class="wikitable"
|-
! Template !! Type !! Description
|-
| {{Stub}} || Maintenance || Marks articles needing expansion
|-
| {{Abbr|TOC|Table of Contents}} || Formatting || Abbreviation tooltip
|-
| <nowiki>{{Quote|...}}</nowiki> || Formatting || Pull quotes
|-
| <nowiki>{{Infobox person}}</nowiki> || Infobox || Person sidebar
|}

<references/>');

INSERT OR IGNORE INTO pages (title, content) VALUES ('WikiO:CSS guide',
'This page explains how to customise WikiO''s appearance using CSS pages.

== How CSS pages work ==

WikiO loads two CSS pages automatically on every page:

* '''[[MediaWiki:Common.css]]''' — applied to all users and all skins
* '''[[MediaWiki:Vector.css]]''' — applied to the default Vector skin

Both pages are editable by [[WikiO:Administrators|administrators]]. Changes take effect immediately on the next page load — no redeployment needed.

== Editing a CSS page ==

Navigate to [[MediaWiki:Common.css]] and click the '''Edit CSS''' tab. The editor is a plain text area (no wikitext formatting). Write standard CSS and click '''Save changes'''.

== CSS variables ==

WikiO defines a set of CSS custom properties (variables) in <code>:root</code> that you can use or override:

{| class="wikitable"
|-
! Variable !! Default value !! Used for
|-
| <code>--color-base</code> || #202122 || Main body text
|-
| <code>--color-subtle</code> || #54595d || Secondary text
|-
| <code>--color-muted</code> || #72777d || Timestamps, captions
|-
| <code>--color-accent</code> || #3366cc || Links, active tabs
|-
| <code>--color-accent-hover</code> || #2a4b8d || Link hover state
|-
| <code>--color-surface-0</code> || #ffffff || Page background
|-
| <code>--color-surface-1</code> || #f8f9fa || Sidebar, infobox bg
|-
| <code>--color-surface-2</code> || #eaecf0 || Tabs, footer
|-
| <code>--color-border</code> || #a2a9b1 || Table/box borders
|-
| <code>--color-red</code> || #dd3333 || Errors, delete notices
|-
| <code>--font-serif</code> || Linux Libertine O || Article headings
|-
| <code>--font-sans</code> || Source Sans 3 || Body text, UI
|-
| <code>--font-mono</code> || Source Code Pro || Code, editor
|}

== Example customisations ==

=== Dark mode ===

<nowiki>
:root {
  --color-base:        #e8e8e8;
  --color-subtle:      #aaaaaa;
  --color-muted:       #888888;
  --color-surface-0:   #1a1a1a;
  --color-surface-1:   #242424;
  --color-surface-2:   #2e2e2e;
  --color-border:      #444444;
  --color-border-subtle: #333333;
  --color-accent:      #6699ff;
  --color-accent-hover:#88aaff;
}
body { background: var(--color-surface-0); }
</nowiki>

=== Wider content area ===

<nowiki>
#mw-content { max-width: 960px; }
</nowiki>

=== Larger body text ===

<nowiki>
body { font-size: 1rem; }
</nowiki>

=== Custom link colour ===

<nowiki>
a { color: #006600; }
a:hover { color: #009900; }
</nowiki>

== Important selectors ==

{| class="wikitable"
|-
! Selector !! What it targets
|-
| <code>#mw-header</code> || The sticky top navigation bar
|-
| <code>#mw-sidebar</code> || The left navigation sidebar
|-
| <code>#mw-content</code> || The main content area
|-
| <code>#mw-footer</code> || The bottom footer bar
|-
| <code>.mw-parser-output</code> || The rendered article body
|-
| <code>.infobox</code> || Infobox tables
|-
| <code>.wikitable</code> || Wiki-style data tables
|-
| <code>.hatnote</code> || Navigation hatnotes
|-
| <code>.tmbox</code> || Maintenance message boxes
|-
| <code>.toc</code> || Table of Contents box
|-
| <code>.stub-notice</code> || Stub article notice
|-
| <code>.firstHeading</code> || The article''s h1 title
|}

<references/>');

-- ─── MediaWiki CSS pages ───────────────────────────────────────────────────

INSERT OR IGNORE INTO pages (title, content) VALUES ('MediaWiki:Common.css',
'/* WikiO — Common.css
   Loaded on every page. Edit this to customise the wiki appearance.
   See [[WikiO:CSS guide]] for documentation. */

/* ── Message boxes (tmbox) ────────────────────────────────────── */
.tmbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  margin: 0.75em 0;
  border-radius: 2px;
  font-size: 0.875rem;
  border: 1px solid;
  clear: both;
}

.tmbox-icon { font-size: 1.25em; flex-shrink: 0; line-height: 1.4; }

.tmbox-notice  { background: #eaf3fb; border-color: #a2c5e8; }
.tmbox-warning { background: #fef6e4; border-color: #f0c060; }
.tmbox-delete  { background: #fde8e8; border-color: #f4b0b0; }
.tmbox-protection { background: #f0f0f0; border-color: #a2a9b1; }

/* ── Wiki quote ───────────────────────────────────────────────── */
.wiki-quote {
  border-left: 4px solid var(--color-border);
  margin: 1em 2em;
  padding: 0.5em 1em;
  color: var(--color-subtle);
  font-style: italic;
}

.wiki-quote p  { margin: 0; }
.wiki-quote footer {
  text-align: right;
  font-size: 0.875em;
  margin-top: 0.4em;
  font-style: normal;
  color: var(--color-muted);
}

/* ── CSS source view ──────────────────────────────────────────── */
.css-source {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}

.mw-editbox-css {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  background: #1e1e1e;
  color: #d4d4d4;
  border-color: #555;
}

/* ── Citation span ────────────────────────────────────────────── */
.citation { font-size: 0.9em; }

/* ── Date span ────────────────────────────────────────────────── */
.date-format { white-space: nowrap; }

/* ── Namespace banners ────────────────────────────────────────── */
.ns-template .firstHeading::before {
  content: "Template: ";
  color: var(--color-muted);
  font-family: var(--font-sans);
  font-size: 0.8em;
  font-weight: normal;
  display: block;
  font-style: italic;
}

.ns-help .firstHeading::before {
  content: "Help: ";
  color: var(--color-muted);
  font-family: var(--font-sans);
  font-size: 0.8em;
  font-weight: normal;
  display: block;
  font-style: italic;
}

.ns-mediawiki .firstHeading::before {
  content: "MediaWiki: ";
  color: var(--color-muted);
  font-family: var(--font-sans);
  font-size: 0.8em;
  font-weight: normal;
  display: block;
  font-style: italic;
}

/* ── Edit help link ───────────────────────────────────────────── */
.edit-help { font-size: 0.8rem; color: var(--color-muted); }');

INSERT OR IGNORE INTO pages (title, content) VALUES ('MediaWiki:Vector.css',
'/* WikiO — Vector.css
   Skin-specific overrides. Loaded after Common.css.
   See [[WikiO:CSS guide]] for documentation and variable reference. */

/* Add your skin customisations below this line */
');

-- ─── Article: The Internet ────────────────────────────────────────────────

INSERT OR IGNORE INTO pages (title, content) VALUES ('The_Internet',
'{{Infobox
| title      = The Internet
| Founded    = 1 January 1983
| Origin     = United States
| Type       = Global computer network
| Key people = Vint Cerf, Bob Kahn
}}

The '''Internet''' is a global system of interconnected computer networks that use the {{Abbr|TCP/IP|Transmission Control Protocol / Internet Protocol}} suite to communicate between networks and devices. It is a ''network of networks'' that consists of private, public, academic, business, and government networks of local to global scope, linked by a broad array of electronic, wireless, and optical networking technologies.

== History ==

=== Origins ===

{{Main|ARPANET}}

The origins of the Internet date to research commissioned by the United States government in the 1960s to build fault-tolerant communication networks. The primary precursor was '''ARPANET''', which was funded by the {{Abbr|DARPA|Defense Advanced Research Projects Agency}} and first went online in 1969, linking computers at UCLA, Stanford Research Institute, UC Santa Barbara, and the University of Utah.

Early milestones include:

* '''1969''' — First ARPANET message sent (the system crashed after two letters)
* '''1971''' — First email sent by Ray Tomlinson
* '''1973''' — First international connections to the UK and Norway
* '''1974''' — Vint Cerf and Bob Kahn publish the TCP/IP specification

=== The World Wide Web ===

{{Main|World Wide Web}}

The Internet and the [[World Wide Web]] are distinct: the Internet is the underlying infrastructure, while the Web is one of many services running on it.

{{Quote|The Web is an application running on the Internet, just as email is.|author=Vint Cerf}}

[[Tim Berners-Lee]] invented the World Wide Web in '''1989''' while working at {{Abbr|CERN|Conseil Européen pour la Recherche Nucléaire}} in Switzerland. He proposed a system of hypertext documents accessible via the Internet and wrote the first web browser, WorldWideWeb, in 1990.

The Web was opened to the public in '''1991''', and the {{Abbr|NCSA|National Center for Supercomputing Applications}} Mosaic browser — released in 1993 — brought graphical browsing to mainstream users, triggering explosive growth.

=== Growth and commercialisation ===

{| class="wikitable"
|-
! Year !! Internet users (approx.) !! Notable event
|-
| 1993 || 14 million || Mosaic browser released
|-
| 1995 || 45 million || Amazon and eBay founded
|-
| 1998 || 150 million || Google founded
|-
| 2004 || 800 million || Facebook launched
|-
| 2010 || 2 billion || Mobile internet overtakes desktop
|-
| 2020 || 4.5 billion || COVID-19 accelerates remote work
|-
| 2024 || 5.4 billion || Over 67% of world population online
|}

== How it works ==

=== Protocols ===

The Internet operates on a layered model of protocols. The foundational suite is {{Abbr|TCP/IP|Transmission Control Protocol / Internet Protocol}}:

* '''IP''' (Internet Protocol) — assigns addresses to devices and routes packets
* '''TCP''' (Transmission Control Protocol) — ensures reliable, ordered data delivery
* '''UDP''' (User Datagram Protocol) — faster, connectionless alternative to TCP
* '''HTTP/HTTPS''' — transfers web pages
* '''DNS''' (Domain Name System) — translates human-readable names (like <code>example.com</code>) into IP addresses

=== Infrastructure ===

The physical Internet is built from:

# '''Undersea cables''' — over 400 submarine cables carry ~99% of international traffic
# '''Data centres''' — warehouses of servers hosting websites, apps, and data
# '''Internet exchange points''' — physical locations where networks interconnect
# '''Last-mile infrastructure''' — the connection from your home to the broader network (fibre, cable, wireless)

== Governance ==

No single entity controls the Internet. Governance is distributed across several organisations:

; {{Abbr|IANA|Internet Assigned Numbers Authority}} : Manages IP address allocation and the DNS root zone
; {{Abbr|ICANN|Internet Corporation for Assigned Names and Numbers}} : Oversees domain name policy
; {{Abbr|IETF|Internet Engineering Task Force}} : Develops and promotes voluntary Internet standards
; {{Abbr|W3C|World Wide Web Consortium}} : Maintains web standards (HTML, CSS, etc.)

== Impact ==

{{Warning|Information on this page was last verified in 2024 and may not reflect the most current statistics.}}

The Internet has had profound effects on commerce, communication, culture, and politics:

* '''E-commerce''' generated over $5.8 trillion globally in 2023
* '''Social media''' has connected over 4.9 billion people
* '''Remote work''' became mainstream during the COVID-19 pandemic
* '''Misinformation''' and cybercrime have emerged as significant societal challenges

== See also ==

{{See also|World Wide Web|ARPANET|Tim Berners-Lee}}

== References ==

<ref>{{cite book|title=Where Wizards Stay Up Late|author=Katie Hafner|year=1996|publisher=Simon & Schuster|isbn=978-0-684-81201-4}}</ref>

<ref>{{cite web|url=https://home.cern/science/computing/birth-web|title=The birth of the Web|publisher=CERN|date=2019}}</ref>

<ref>{{cite web|url=https://www.internetworldstats.com|title=Internet World Stats|publisher=Miniwatts Marketing Group|date=2024}}</ref>

<references/>

{{Stub}}');
ENDSQL
echo "Done. Lines in schema.sql: $(wc -l < /home/claude/WikO-fixed/schema.sql)"
