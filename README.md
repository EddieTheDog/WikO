# WikiO

Wikipedia-style wiki software using Cloudflare Pages + Workers + D1.

## Features

- /wiki/Main_Page URLs
- User:, Template:, Category: namespaces
- Persistent Cloudflare D1 storage
- Wiki links like [[Main Page]]
- Template support like {{Infobox}}
- GitHub ready
- Cloudflare Pages ready

## Setup

### Install

```bash
npm install
```

### Create D1 Database

```bash
npx wrangler d1 create wikio
```

### Apply Schema

```bash
npx wrangler d1 execute wikio --file=schema.sql
```

### Run Local

```bash
npm run dev
```

### Deploy

Push to GitHub and connect to Cloudflare Pages.
