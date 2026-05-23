import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Copy _redirects into the dist folder so Cloudflare Pages serves it
  publicDir: 'public',
})
