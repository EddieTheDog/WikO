# WikiO

Wikipedia-style wiki built on Cloudflare Pages + Workers + D1.

## Features

- `/wiki/Page_Title` URL routing
- Full **wikitext parser**: `''italic''`, `'''bold'''`, `== Headers ==`, `[[Links]]`, `{{Templates}}`
- **Citation system**: `<ref>{{cite web|...}}</ref>` + `<references/>`
- **Templates**: `{{Infobox}}`, `{{cite web}}`, `{{cite book}}`, `{{cite news}}`, `{{stub}}`, `{{disambiguation}}`
- **Tables**: `{| class="wikitable" ... |}` syntax
- **Table of Contents** auto-generated from headings
- **Edit tab** with wikitext toolbar and live preview
- **Revision history** per page
- **User accounts** (register, login, logout) with session cookies
- **Random article** button
- Cloudflare D1 persistent storage
- Namespace support: `User:`, `Help:`, `Template:`, `Category:`, `WikiO:`, `Special:`

## Setup

### 1. Install

```bash
npm install
```

### 2. Create D1 Database

```bash
npx wrangler d1 create wikio
```

Copy the `database_id` from the output.

### 3. Configure wrangler.toml

Create `wrangler.toml` in the project root:

```toml
name = "wikio"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "wikio"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 4. Apply Schema

```bash
npx wrangler d1 execute wikio --local --file=schema.sql
```

### 5. Run Locally

```bash
npm run dev
```

Then in a second terminal:

```bash
npx wrangler pages dev dist --d1=DB=wikio
```

Or use the Cloudflare Pages local dev server directly:

```bash
npx wrangler pages dev --d1 DB=<database_id>
```

### 6. Deploy

Push to GitHub and connect to Cloudflare Pages. Set the D1 binding in the Cloudflare dashboard under:
**Pages → Your project → Settings → Functions → D1 database bindings**

- Variable name: `DB`
- D1 database: `wikio`

## Wikitext Quick Reference

| Syntax | Result |
|--------|--------|
| `''text''` | *italic* |
| `'''text'''` | **bold** |
| `== Heading ==` | Section heading |
| `[[Page Name]]` | Internal link |
| `[[Page\|Label]]` | Link with custom label |
| `[https://example.com Text]` | External link |
| `* item` | Bullet list |
| `# item` | Numbered list |
| `<ref>...</ref>` | Footnote citation |
| `<references/>` | Citation list |
| `{{Infobox\|title=X\|field=value}}` | Info sidebar |
| `{{cite web\|url=...\|title=...}}` | Web citation |
| `{{stub}}` | Stub notice |

## File Structure

```
wikio/
├── index.html                    # App shell + styles
├── src/
│   └── main.js                   # Wikitext parser + SPA router
├── functions/
│   └── api/
│       ├── page/[title].js       # GET/POST wiki pages
│       ├── pages/index.js        # List all pages
│       ├── revisions/[title].js  # Revision history
│       └── auth/
│           ├── me.js             # Check current session
│           ├── login.js          # Login
│           ├── register.js       # Register
│           └── logout.js         # Logout
├── schema.sql                    # D1 schema + seed data
├── package.json
└── wrangler.toml                 # (create this yourself)
```
