import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy is injected for production builds only: the dev server
// needs inline scripts for hot reload. READMEs are untrusted, so scripts, objects,
// frames and form targets are locked down; images may come from any https host.
const buildCsp = (gc) => [
  "default-src 'self'",
  `script-src 'self'${gc ? ' https://gc.zgo.at' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  `connect-src 'self' https://raw.githubusercontent.com https://buttondown.com${gc ? ` https://${gc}.goatcounter.com` : ''}`,
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
].join('; ')

const securityHeaders = (csp) => ({
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  <meta name="referrer" content="strict-origin-when-cross-origin" />`
    ),
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_GOATCOUNTER (optional) lets the usage-count script and endpoint through the CSP.
  const gc = (loadEnv(mode, '.', 'VITE_').VITE_GOATCOUNTER || '').replace(/[^a-z0-9-]/gi, '')
  return {
    plugins: [react(), securityHeaders(buildCsp(gc))],
    base: './',
  }
})
