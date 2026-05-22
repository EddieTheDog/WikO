# WikiO

A simple Wikipedia-style wiki built for GitHub + Cloudflare Pages.

## Features

- `/wiki/Main_Page` style URLs
- `User:` namespace support
- Internal wiki links like `[[Main Page]]`
- Simple template support like `{{Infobox}}`
- Cloudflare Pages compatible
- GitHub-ready

## Deploy

### 1. Upload to GitHub
Create a new GitHub repo and upload all files.

### 2. Deploy to Cloudflare Pages
- Go to Cloudflare Pages
- Connect GitHub
- Select your repo
- Build command: `npm run build`
- Output directory: `dist`

## Development

```bash
npm install
npm run dev
```
