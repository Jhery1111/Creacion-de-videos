// Render cuadro por cuadro (Chromium en paralelo) + audio + subtitulos.
// Uso: node render.cjs [--workers 4]  ->  renders/siscop-secretaria.mp4 (+ .srt)
const { chromium } = require('playwright')
const { fork, spawn, execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { RAIZ, servir, abrir } = require('./pagina.cjs')

const BUILD = path.join(RAIZ, 'build')
const TROZOS = path.join(BUILD, 'chunks_h')

async function trozo({ idx, f0, f1, fps, port }) {
  const out = path.join(TROZOS, `c${String(idx).padStart(2, '0')}.mp4`)
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] })
  const b = await chromium.launch()
  const page = await abrir(b, port)
  const t0 = Date.now()
  for (let f = f0; f < f1; f++) {
    await page.evaluate(`window.seek(${f / fps})`)
    const img = await page.screenshot({ type: 'jpeg', quality: 93 })
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r))
    if ((f - f0) % 300 === 0) console.log(`[${idx}] ${f - f0}/${f1 - f0} (${Math.round((Date.now() - t0) / 1000)}s)`)
  }
  await b.close()
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
  return out
}

const srtT = (s) => {
  const ms = Math.round(s * 1000)
  const p = (n, w) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor(ms / 60000) % 60, 2)}:${p(Math.floor(ms / 1000) % 60, 2)},${p(ms % 1000, 3)}`
}

async function principal() {
  const nW = process.argv.includes('--workers') ? Number(process.argv[process.argv.indexOf('--workers') + 1]) : 4
  const tl = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline_h.json'), 'utf8'))
  const fps = tl.fps, total = Math.round(tl.duration * fps)
  fs.rmSync(TROZOS, { recursive: true, force: true }); fs.mkdirSync(TROZOS, { recursive: true })
  const srv = await servir()
  const port = srv.address().port
  const n = nW * 3, paso = Math.ceil(total / n)
  const trabajos = []
  for (let i = 0; i < n && i * paso < total; i++) trabajos.push({ idx: i, f0: i * paso, f1: Math.min(total, (i + 1) * paso), fps, port })
  const t0 = Date.now()
  const partes = []
  let sig = 0
  await Promise.all(Array.from({ length: nW }, async () => {
    while (sig < trabajos.length) {
      const job = trabajos[sig++]
      partes[job.idx] = await new Promise((ok, mal) => {
        const h = fork(__filename, ['--trozo', JSON.stringify(job)])
        h.on('message', ok); h.on('exit', (c) => { if (c) mal(new Error(`trozo ${job.idx} falló`)) })
      })
    }
  }))
  srv.close()
  const lista = path.join(TROZOS, 'list.txt')
  fs.writeFileSync(lista, partes.map((p) => `file '${path.basename(p)}'\n`).join(''))
  const video = path.join(BUILD, 'video_noaudio_h.mp4')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', video])
  console.log(`video sin audio en ${Math.round((Date.now() - t0) / 1000)}s`)
  const dir = path.join(RAIZ, 'renders'); fs.mkdirSync(dir, { recursive: true })
  const final = path.join(dir, 'siscop-secretaria.mp4')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', path.join(BUILD, 'mix_h.wav'), '-c:v', 'copy',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final])
  const srt = tl.cues.map((c, i) => `${i + 1}\n${srtT(c.start)} --> ${srtT(c.end)}\n${c.text}\n`).join('\n')
  fs.writeFileSync(final.replace(/\.mp4$/, '.srt'), srt)
  console.log('final:', final)
}

if (process.argv.includes('--trozo')) {
  const job = JSON.parse(process.argv[process.argv.indexOf('--trozo') + 1])
  trozo(job).then((out) => process.send(out, () => process.exit(0))).catch((e) => { console.error(e); process.exit(1) })
} else {
  principal().catch((e) => { console.error(e); process.exit(1) })
}
