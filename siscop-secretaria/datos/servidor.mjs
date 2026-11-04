// Sirve el frontend compilado de SISCOP y reenvía /api y /socket.io al backend local.
// Uso: node servidor.mjs <dir-dist> [puerto=5050] [backend=127.0.0.1:3000]
import http from 'node:http'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(process.argv[2])
const PORT = Number(process.argv[3] || 5050)
const [BH, BP] = (process.argv[4] || '127.0.0.1:3000').split(':')
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }
const esBackend = (u) => u.startsWith('/api/') || u.startsWith('/socket.io/')

const srv = http.createServer((req, res) => {
  if (esBackend(req.url)) {
    const p = http.request({ host: BH, port: BP, method: req.method, path: req.url,
      headers: { ...req.headers, 'x-forwarded-for': '127.0.0.1' } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
    p.on('error', () => { res.writeHead(502); res.end('backend no disponible') })
    req.pipe(p)
    return
  }
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]))
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
// WebSocket: túnel TCP crudo hacia el backend
srv.on('upgrade', (req, sock, head) => {
  const up = net.connect(BP, BH, () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n')
    up.write(head); up.pipe(sock); sock.pipe(up)
  })
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy())
})
srv.listen(PORT, '127.0.0.1', () => console.log(`SISCOP en http://127.0.0.1:${PORT}`))
