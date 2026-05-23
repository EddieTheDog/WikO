CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
