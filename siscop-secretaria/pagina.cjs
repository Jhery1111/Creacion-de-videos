// Utilidades compartidas: servidor estatico del repositorio y apertura de la pagina del video.
const http = require('http')
const fs = require('fs')
const path = require('path')

const RAIZ = __dirname
const REPO = path.dirname(RAIZ)
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }

function servir() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(REPO, decodeURIComponent(req.url.split('?')[0]))
      if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end() }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' })
      fs.createReadStream(p).pipe(res)
    })
    srv.listen(0, '127.0.0.1', () => ok(srv))
  })
}

async function abrir(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (e) => console.log('ERROR página:', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()) })
  await page.goto(`http://127.0.0.1:${port}/${path.basename(RAIZ)}/index.html`)
  await page.evaluate('window.ready')
  return page
}

module.exports = { RAIZ, servir, abrir }
