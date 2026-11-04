// Cuadros sueltos del video: node preview.cjs t1 t2 ...  -> build/preview/h_<t>.png
// Con --eventos guarda build/events_h.json (sonidos sincronizados para audio.py).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const { RAIZ, servir, abrir } = require('./pagina.cjs')

;(async () => {
  const srv = await servir()
  const b = await chromium.launch()
  const page = await abrir(b, srv.address().port)
  if (process.argv.includes('--eventos')) {
    const evs = await page.evaluate('window.EVENTS')
    fs.writeFileSync(path.join(RAIZ, 'build', 'events_h.json'), JSON.stringify(evs))
    console.log(evs.length, 'eventos')
  }
  const out = path.join(RAIZ, 'build', 'preview')
  fs.mkdirSync(out, { recursive: true })
  for (const a of process.argv.slice(2).filter((x) => !x.startsWith('--'))) {
    const t = Number(a)
    await page.evaluate(`window.seek(${t})`)
    await page.screenshot({ path: path.join(out, `h_${t.toFixed(2).padStart(7, '0')}.png`) })
  }
  await b.close(); srv.close()
})()
