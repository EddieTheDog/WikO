CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  protected INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration for existing databases: add the protected column
-- Run once if upgrading:
--   npx wrangler d1 execute wikio --command "ALTER TABLE pages ADD COLUMN protected INTEGER DEFAULT 0"
-- (D1 will error harmlessly if the column already exists — just ignore it)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_admin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_title TEXT NOT NULL,
  content TEXT NOT NULL,
  editor TEXT DEFAULT 'Anonymous',
  summary TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  expires_at DATETIME NOT NULL
);

-- Seed pages
INSERT OR IGNORE INTO pages (title, content) VALUES ('Main_Page', '== Welcome to WikiO ==

WikiO is a free, collaborative encyclopedia that anyone can edit.

{{Infobox
| title = WikiO
| image =
| caption = The free encyclopedia
| founded = 2025
| type = Wiki
}}

== Getting Started ==

* [[Help:Editing]] — Learn how to edit pages
* [[Help:Wikitext]] — Wikitext formatting guide
* [[Help:Templates]] — Using templates
* [[WikiO:About]] — About this wiki

== Recent Changes ==

Visit [[Special:RecentChanges]] to see what has been changed recently.

== Did you know? ==

You can use <nowiki>[[double brackets]]</nowiki> to link to any page on the wiki.

<references/>');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Help:Editing', '== Editing Pages ==

To edit a page, click the '''Edit''' tab at the top of the page.

=== Basic Formatting ===

; Bold : <nowiki>'''bold text'''</nowiki>
; Italic : <nowiki>''italic text''</nowiki>
; Bold+Italic : <nowiki>'''bold italic'''</nowiki>

=== Headers ===

<nowiki>== Section ==</nowiki> creates a level 2 heading.

<nowiki>=== Subsection ===</nowiki> creates a level 3 heading.

=== Links ===

Use <nowiki>[[Page Name]]</nowiki> to link to another page.

Use <nowiki>[[Page Name|Display Text]]</nowiki> to use different display text.

=== Lists ===

* Bullet item
* Another item
** Sub-item

# Numbered item
# Another item

=== Citations ===

Add a citation with <nowiki><ref>{{cite web|url=https://example.com|title=Example|author=Author|date=2024}}</ref></nowiki>

Place <nowiki><references/></nowiki> at the bottom of the page to display all citations.

<references/>');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Help:Wikitext', '== Wikitext Reference ==

This page documents all supported wikitext syntax in WikiO.

=== Text Formatting ===

{| class="wikitable"
|-
! Wikitext !! Result
|-
| <nowiki>''italic''</nowiki> || result: italic
|-
| <nowiki>'''bold'''</nowiki> || result: bold
|-
| <nowiki>'''bold italic'''</nowiki> || result: bold italic
|}

=== Links ===

{| class="wikitable"
|-
! Wikitext !! Result
|-
| <nowiki>[[Page Name]]</nowiki> || Internal link
|-
| <nowiki>[[Page Name|Label]]</nowiki> || Link with custom label
|-
| <nowiki>[https://example.com Text]</nowiki> || External link
|}

=== Templates ===

Templates are called using <nowiki>{{Template Name}}</nowiki>.

Supported templates:
* <nowiki>{{Infobox}}</nowiki> — Sidebar info box
* <nowiki>{{cite web}}</nowiki> — Web citation
* <nowiki>{{cite book}}</nowiki> — Book citation
* <nowiki>{{stub}}</nowiki> — Mark article as a stub
* <nowiki>{{disambiguation}}</nowiki> — Disambiguation notice
* <nowiki>{{redirect}}</nowiki> — Redirect notice

<references/>');

INSERT OR IGNORE INTO pages (title, content) VALUES ('Help:Templates', '== Using Templates ==

Templates allow reusable content blocks to be inserted into pages.

=== Infobox ===

<nowiki>{{Infobox
| title = Article Title
| image =
| caption = Image caption
| field1 = Value 1
| field2 = Value 2
}}</nowiki>

=== Citation Templates ===

==== cite web ====

<nowiki>{{cite web|url=https://example.com|title=Page Title|author=Author Name|date=2024-01-01|publisher=Publisher}}</nowiki>

==== cite book ====

<nowiki>{{cite book|title=Book Title|author=Author Name|year=2024|publisher=Publisher|isbn=978-0000000000}}</nowiki>

==== cite news ====

<nowiki>{{cite news|url=https://example.com|title=Article Title|author=Reporter|date=2024-01-01|newspaper=The Times}}</nowiki>

=== Maintenance Templates ===

* <nowiki>{{stub}}</nowiki> — Marks an article as incomplete
* <nowiki>{{disambiguation}}</nowiki> — Marks a disambiguation page

<references/>');

INSERT OR IGNORE INTO pages (title, content) VALUES ('WikiO:About', '== About WikiO ==

WikiO is a wiki platform inspired by [[Wikipedia]], built on Cloudflare Pages, Workers, and D1.

=== Technology ===

* '''Frontend''': Vanilla JavaScript with wikitext parser
* '''Backend''': Cloudflare Pages Functions
* '''Database''': Cloudflare D1 (SQLite)
* '''Hosting''': Cloudflare Pages

=== Contributing ===

Anyone can edit pages on WikiO. To get started, [[Special:CreateAccount|create an account]] or edit as an anonymous user.

<references/>');

-- Colorbox template: a banner/box with a configurable background color, title, and body text
INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Colorbox', '<div style="background-color:{{{color|#eaf3fb}}};border:2px solid {{{border|#a2cce3}}};border-radius:4px;padding:12px 16px;margin:0.8em 0;line-height:1.5;">
<span style="font-weight:700;font-size:1rem;color:{{{title-color|#1a1a1a}}}">{{{title|}}}</span>
{{{body|{{{1|}}}}}}
</div>

== Usage ==

<nowiki>{{Colorbox
| color       = #fef6e7
| border      = #f0c860
| title       = ⚠️ Note
| title-color = #7a5700
| body        = Your message here.
}}</nowiki>

Parameters:
* '''color''' — background color (any CSS color: hex, rgb, named). Default: light blue.
* '''border''' — border color. Default: matches color.
* '''title''' — bold heading text shown at the top of the box.
* '''title-color''' — color for the title text. Default: near-black.
* '''body''' / positional '''1''' — main content of the box.');

-- Module:Documentation/styles.css
-- Styles for Template:Documentation (template doc pages)
INSERT OR IGNORE INTO pages (title, content) VALUES ('Module:Documentation/styles.css',
'.documentation {
    background: #ecfcf4;
    border: 1px solid #a3bfb1;
    padding: 12px 16px;
    margin-top: 1em;
    clear: both;
}
.documentation-header {
    background: #cee0d4;
    border-bottom: 1px solid #a3bfb1;
    padding: 6px 16px;
    margin: -12px -16px 12px;
    font-weight: 600;
    font-size: 0.9rem;
}
.documentation-toolbar {
    font-size: 0.8rem;
    color: #54595d;
    margin-top: 8px;
}
.documentation-startbox {
    margin-bottom: 8px;
}');

-- Template:Documentation/styles.css (same as Module version)
INSERT OR IGNORE INTO pages (title, content) VALUES ('Template:Documentation/styles.css',
'/* Loaded automatically when Template:Documentation is transcluded */
.documentation { background: #ecfcf4; border: 1px solid #a3bfb1; padding: 12px 16px; margin-top: 1em; clear: both; }
.documentation-header { background: #cee0d4; border-bottom: 1px solid #a3bfb1; padding: 6px 16px; margin: -12px -16px 12px; font-weight: 600; }
.documentation-toolbar { font-size: 0.8rem; color: #54595d; margin-top: 8px; }');

-- MediaWiki:Common.css starter (users can edit this in the wiki)
INSERT OR IGNORE INTO pages (title, content) VALUES ('MediaWiki:Common.css',
'/* MediaWiki:Common.css — edit this page in the wiki to apply site-wide CSS */

/* Example: make external links show an icon */
/* a.external::after { content: " ↗"; font-size: 0.7em; } */

/* Example: widen infoboxes */
/* table.infobox { width: 280px; } */');

-- MediaWiki:Vector.css starter
INSERT OR IGNORE INTO pages (title, content) VALUES ('MediaWiki:Vector.css',
'/* MediaWiki:Vector.css — skin-specific CSS (Vector skin only) */
/* Edit this page in the wiki to apply additional styles. */');
