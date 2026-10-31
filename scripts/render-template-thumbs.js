#!/usr/bin/env node
/**
 * Render real preview images for templates whose thumbnail is a placeholder
 * (data: URL from generate-templates.js). Each template is opened in the running
 * editor, the page is drawn straight from the live fabric canvas, and the result
 * is written to public/data/template-thumbs/<id>.webp; template.json is updated.
 *
 *   yarn start                      # or serve a production build
 *   node scripts/render-template-thumbs.js [baseUrl=http://localhost:3000] [workers=3]
 *
 * Needs Google Chrome; set CHROME_PATH if it isn't /usr/bin/google-chrome-stable.
 * Already-rendered templates are skipped, so the script can be re-run safely.
 */
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

const ROOT = path.join(__dirname, '..')
const TEMPLATES = path.join(ROOT, 'public/data/template.json')
const OUT_DIR = path.join(ROOT, 'public/data/template-thumbs')
const base = process.argv[2] || 'http://localhost:3000'
const workers = Number(process.argv[3]) || 3
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable'
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Patch fabric once its classes exist so the page's canvas is reachable.
const HOOK = () => {
  const t = setInterval(() => {
    const f = window.fabric
    if (!f || !f.StaticCanvas) return
    clearInterval(t)
    const orig = f.StaticCanvas.prototype.renderCanvas
    f.StaticCanvas.prototype.renderCanvas = function () {
      if (this.clipPath && this.lowerCanvasEl) window.__cv = this
      return orig.apply(this, arguments)
    }
  }, 20)
}

// Same crop as the editor's dashboard thumbnails, at a sharper size.
const SNAP = () => {
  const canvas = window.__cv
  const clip = canvas && canvas.clipPath
  if (!clip) return ''
  const w = clip.width * (clip.scaleX || 1)
  const h = clip.height * (clip.scaleY || 1)
  const vp = canvas.viewportTransform
  const zoom = vp[0]
  canvas.skipOffscreen = false
  canvas.getObjects().forEach(o => o.setCoords && o.setCoords())
  const el = canvas.toCanvasElement(Math.min(480, w) / (w * zoom), {
    left: vp[4] + clip.left * zoom,
    top: vp[5] + clip.top * zoom,
    width: w * zoom,
    height: h * zoom,
  })
  const out = document.createElement('canvas')
  out.width = el.width
  out.height = el.height
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(el, 0, 0)
  return out.toDataURL('image/webp', 0.8)
}

async function render(page, t) {
  await page
    .goto(`${base}/design/thumb-${t.id.slice(0, 8)}/edit?demo=true&template=${t.id}`, { waitUntil: 'networkidle2', timeout: 60000 })
    .catch(() => null)
  const texts = JSON.parse(t.json).objects.filter(o => /Text/.test(o.type)).length
  const ready = await page
    .waitForFunction(n => window.__cv && window.__cv.getObjects().filter(o => /text/i.test(o.type)).length >= n, { timeout: 30000 }, texts)
    .then(() => true)
    .catch(() => false)
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete), { timeout: 15000 }).catch(() => null)
  await sleep(2500)
  await page.evaluate(() => document.fonts.ready)
  return ready ? page.evaluate(SNAP).catch(() => '') : ''
}

async function worker(queue, done) {
  // One browser per worker: background tabs pause requestAnimationFrame, which
  // the editor uses to restore stacking order after images load.
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(HOOK)
  await page.setViewport({ width: 1440, height: 900 })
  // The first render of a session can miss web fonts; render once and discard.
  if (queue.length) await render(page, queue[0])
  while (queue.length) {
    const t = queue.shift()
    const data = await render(page, t)
    if (data.startsWith('data:image/webp')) {
      fs.writeFileSync(path.join(OUT_DIR, `${t.id}.webp`), Buffer.from(data.split(',')[1], 'base64'))
      done.push(t.id)
      console.log('ok  ', t.name)
    } else console.log('FAIL', t.name)
  }
  await browser.close()
}

;(async () => {
  const raw = fs.readFileSync(TEMPLATES, 'utf8')
  const doc = JSON.parse(raw)
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const queue = doc.data.filter(t => (t.thumbnailUrl || '').startsWith('data:') && !fs.existsSync(path.join(OUT_DIR, `${t.id}.webp`)))
  console.log(`${queue.length} template(s) to render against ${base}`)
  const done = []
  await Promise.all(Array.from({ length: workers }, () => worker(queue, done)))

  // Point every template that has a rendered file at it.
  let changed = 0
  doc.data.forEach(t => {
    const file = path.join(OUT_DIR, `${t.id}.webp`)
    if ((t.thumbnailUrl || '').startsWith('data:') && fs.existsSync(file)) {
      t.thumbnailUrl = `/data/template-thumbs/${t.id}.webp`
      changed++
    }
  })
  if (changed) fs.writeFileSync(TEMPLATES, JSON.stringify(doc))
  console.log(`rendered ${done.length}, updated ${changed} thumbnail URL(s)`)
})()
