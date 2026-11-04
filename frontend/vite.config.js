import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy is injected for production builds only: the dev server
// needs inline scripts for hot reload. READMEs are untrusted, so scripts, objects,
// frames and form targets are locked down; images may come from any https host.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  "connect-src 'self' https://raw.githubusercontent.com https://buttondown.com",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ')

const securityHeaders = () => ({
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  <meta name="referrer" content="strict-origin-when-cross-origin" />`
    ),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), securityHeaders()],
  base: './',
})
