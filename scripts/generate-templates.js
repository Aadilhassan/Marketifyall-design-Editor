#!/usr/bin/env node
/**
 * Template Generator v3 — Correct SDK format
 * Objects use Scenify SDK types (StaticText, StaticImage, Background)
 * with metadata-based properties and frame-relative positioning.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

function genId() { return crypto.randomUUID() }

// ─── Canvas Sizes ────────────────────────────────────────────────
const SIZES = {
  'Instagram Post':    { width: 1080, height: 1080 },
  'Instagram Story':   { width: 1080, height: 1920 },
  'Facebook Post':     { width: 940,  height: 788  },
  'YouTube Thumbnail': { width: 1280, height: 720  },
  'Twitter Post':      { width: 1200, height: 675  },
  'LinkedIn Post':     { width: 1200, height: 627  },
  'Pinterest Pin':     { width: 1000, height: 1500 },
  'Poster':            { width: 900,  height: 1200 },
  'Presentation':      { width: 1920, height: 1080 },
  'Business Card':     { width: 1050, height: 600  },
}

// ─── Unsplash Photos ─────────────────────────────────────────────
const PH = {
  travel:      ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
                'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1080&q=80',
                'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1080&q=80'],
  food:        ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=80',
                'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1080&q=80',
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&q=80'],
  fitness:     ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&q=80',
                'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&q=80',
                'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1080&q=80'],
  fashion:     ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1080&q=80',
                'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1080&q=80',
                'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1080&q=80'],
  tech:        ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80',
                'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1080&q=80',
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1080&q=80'],
  business:    ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080&q=80',
                'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1080&q=80',
                'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1080&q=80'],
  realestate:  ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1080&q=80',
                'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1080&q=80',
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&q=80'],
  nature:      ['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80',
                'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1080&q=80'],
  music:       ['https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1080&q=80',
                'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1080&q=80',
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1080&q=80'],
  education:   ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1080&q=80',
                'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=1080&q=80',
                'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1080&q=80'],
  celebration: ['https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1080&q=80',
                'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1080&q=80',
                'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1080&q=80'],
  abstract:    ['https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1080&q=80',
                'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1080&q=80',
                'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&q=80'],
  coffee:      ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1080&q=80',
                'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1080&q=80'],
  beauty:      ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1080&q=80',
                'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1080&q=80'],
  gaming:      ['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1080&q=80',
                'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1080&q=80'],
  wedding:     ['https://images.unsplash.com/photo-1519741497674-611481863552?w=1080&q=80',
                'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1080&q=80'],
  sale:        ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1080&q=80',
                'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1080&q=80'],
}

// ─── SDK Object Builders ─────────────────────────────────────────
// Positions are RELATIVE to frame (0,0). SDK adds frame offset internally.

function staticImage(x, y, w, h, src, o = {}) {
  return {
    id: genId(),
    type: 'StaticImage',
    left: x, top: y, width: w, height: h,
    scaleX: o.scaleX || 1, scaleY: o.scaleY || 1,
    opacity: o.opacity ?? 1,
    angle: o.angle || 0,
    flipX: false, flipY: false,
    skewX: 0, skewY: 0,
    originX: 'left', originY: 'top',
    metadata: { src, cropX: 0, cropY: 0 },
  }
}

function staticText(x, y, str, o = {}) {
  return {
    id: genId(),
    type: 'StaticText',
    left: x, top: y,
    width: o.width || 300, height: o.height || 50,
    scaleX: o.scaleX || 1, scaleY: o.scaleY || 1,
    opacity: o.opacity ?? 1,
    angle: o.angle || 0,
    flipX: false, flipY: false,
    skewX: 0, skewY: 0,
    originX: 'left', originY: 'top',
    metadata: {
      text: str,
      fill: o.fill || '#ffffff',
      fontFamily: o.font || 'Arial Black',
      fontSize: o.size || 45,
      fontWeight: o.weight || 500,
      textAlign: o.align || 'center',
      charSpacing: o.spacing || 0,
      lineheight: o.lh || 1.16,
    },
  }
}

function background(w, h, fill) {
  return {
    id: genId(),
    type: 'Background',
    left: 0, top: 0, width: w, height: h,
    scaleX: 1, scaleY: 1, opacity: 1,
    angle: 0, flipX: false, flipY: false,
    skewX: 0, skewY: 0,
    originX: 'left', originY: 'top',
    metadata: { fill, width: w, height: h },
  }
}

// ─── SVG Preview ─────────────────────────────────────────────────
function preview(w, h, bgColor, name) {
  const sw = 320, sh = Math.round((h / w) * 320)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}">
<rect width="${sw}" height="${sh}" fill="${bgColor}"/>
<rect x="5%" y="8%" width="90%" height="45%" rx="6" fill="#ffffff" opacity=".1"/>
<rect x="8%" y="55%" width="55%" height="8%" rx="3" fill="#ffffff" opacity=".6"/>
<rect x="8%" y="66%" width="40%" height="5%" rx="2" fill="#ffffff" opacity=".3"/>
<text x="50%" y="62%" text-anchor="middle" font-size="11" fill="#ffffff" font-family="Arial,sans-serif">${name.slice(0, 28)}</text>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ─── Layout Builders (all positions relative to 0,0 of the frame) ──

function photoOverlay(w, h, photo, bgColor, heading, sub, cta, o = {}) {
  const objs = []
  // Background
  objs.push(background(w, h, bgColor))
  // Full-bleed photo
  const imgScale = Math.max(w / 1080, h / 720) * 1.1
  objs.push(staticImage(-20, -20, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale }))
  // Dark overlay (using a background-like approach — we use another image or just rely on bg)
  // Since SDK doesn't support rects, we use text elements for all visible content
  // The photo + dark bg color creates the overlay effect via opacity

  // Heading
  objs.push(staticText(w * 0.08, h * (o.headY || 0.28), heading, {
    fill: '#ffffff', size: Math.round(w * (o.headSize || 0.08)),
    font: 'Arial Black', weight: 700,
    width: w * 0.84, align: 'left',
  }))
  // Subtitle
  objs.push(staticText(w * 0.08, h * (o.subY || 0.6), sub, {
    fill: 'rgba(255,255,255,0.85)', size: Math.round(w * (o.subSize || 0.03)),
    font: 'Arial', weight: 400,
    width: w * 0.84, align: 'left',
  }))
  // CTA text
  if (cta) {
    objs.push(staticText(w * 0.08, h * (o.ctaY || 0.78), cta, {
      fill: '#ffffff', size: Math.round(w * 0.035),
      font: 'Arial Black', weight: 700,
      width: w * 0.4, align: 'left', spacing: 100,
    }))
  }
  return objs
}

function cardStyle(w, h, photo, bgColor, badge, heading, sub, cta) {
  const objs = []
  objs.push(background(w, h, bgColor))
  // Photo top portion
  const photoH = h * 0.48
  const imgScale = Math.max(w / 1080, photoH / 720) * 1.15
  objs.push(staticImage(0, 0, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale }))
  // Badge
  if (badge) {
    objs.push(staticText(w * 0.05, h * 0.02, badge, {
      fill: '#ffffff', size: 16, font: 'Arial Black', weight: 700, width: w * 0.3, align: 'left',
    }))
  }
  // Heading
  objs.push(staticText(w * 0.06, h * 0.52, heading, {
    fill: '#ffffff', size: Math.round(w * 0.055), font: 'Arial Black', weight: 700,
    width: w * 0.88, align: 'left',
  }))
  // Sub
  objs.push(staticText(w * 0.06, h * 0.72, sub, {
    fill: 'rgba(255,255,255,0.75)', size: Math.round(w * 0.025), font: 'Arial', weight: 400,
    width: w * 0.88, align: 'left',
  }))
  // CTA
  if (cta) {
    objs.push(staticText(w * 0.06, h * 0.88, cta, {
      fill: '#ffffff', size: 18, font: 'Arial Black', weight: 700, width: w * 0.5, align: 'left', spacing: 100,
    }))
  }
  return objs
}

function quoteStyle(w, h, photo, bgColor, quote, author) {
  const objs = []
  objs.push(background(w, h, bgColor))
  const imgScale = Math.max(w / 1080, h / 720) * 1.1
  objs.push(staticImage(-10, -10, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale, opacity: 0.6 }))
  // Quote mark
  objs.push(staticText(w * 0.08, h * 0.12, '\u201C', {
    fill: 'rgba(255,255,255,0.3)', size: Math.round(w * 0.2), font: 'Georgia', width: w * 0.3,
  }))
  // Quote text
  objs.push(staticText(w * 0.1, h * 0.3, quote, {
    fill: '#ffffff', size: Math.round(w * 0.048), font: 'Georgia', weight: 400,
    width: w * 0.8, align: 'left', lh: 1.5,
  }))
  // Author
  objs.push(staticText(w * 0.1, h * 0.78, `\u2014 ${author}`, {
    fill: 'rgba(255,255,255,0.8)', size: Math.round(w * 0.03), font: 'Arial', weight: 600,
    width: w * 0.8, align: 'left',
  }))
  return objs
}

function boldNumber(w, h, photo, bgColor, number, heading, sub) {
  const objs = []
  objs.push(background(w, h, bgColor))
  const imgScale = Math.max(w / 1080, h / 720) * 1.1
  objs.push(staticImage(-10, -10, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale, opacity: 0.5 }))
  // Big number
  objs.push(staticText(w * 0.08, h * 0.12, number, {
    fill: '#ffffff', size: Math.round(w * 0.2), font: 'Arial Black', weight: 700,
    width: w * 0.84, align: 'left',
  }))
  // Heading
  objs.push(staticText(w * 0.08, h * 0.5, heading, {
    fill: '#ffffff', size: Math.round(w * 0.07), font: 'Arial Black', weight: 700,
    width: w * 0.84, align: 'left',
  }))
  // Sub
  objs.push(staticText(w * 0.08, h * 0.75, sub, {
    fill: 'rgba(255,255,255,0.8)', size: Math.round(w * 0.025), font: 'Arial', weight: 400,
    width: w * 0.84, align: 'left',
  }))
  return objs
}

function bottomBar(w, h, photo, bgColor, tag, heading, sub, cta) {
  const objs = []
  objs.push(background(w, h, bgColor))
  const imgScale = Math.max(w / 1080, h / 720) * 1.15
  objs.push(staticImage(-10, -10, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale }))
  // Tag
  if (tag) {
    objs.push(staticText(w * 0.05, h * 0.04, tag, {
      fill: '#ffffff', size: Math.round(w * 0.02), font: 'Arial', weight: 600,
      width: w * 0.5, align: 'left', spacing: 200,
    }))
  }
  // Bottom section text
  objs.push(staticText(w * 0.05, h * 0.68, heading, {
    fill: '#ffffff', size: Math.round(w * 0.055), font: 'Arial Black', weight: 700,
    width: w * 0.9, align: 'left',
  }))
  objs.push(staticText(w * 0.05, h * 0.84, sub, {
    fill: 'rgba(255,255,255,0.75)', size: Math.round(w * 0.022), font: 'Arial', weight: 400,
    width: w * 0.65, align: 'left',
  }))
  if (cta) {
    objs.push(staticText(w * 0.6, h * 0.86, cta, {
      fill: '#ffffff', size: 16, font: 'Arial Black', weight: 700, width: w * 0.35, align: 'right', spacing: 100,
    }))
  }
  return objs
}

function textOnly(w, h, bgColor, accent, heading, sub, cta) {
  const objs = []
  objs.push(background(w, h, bgColor))
  // Accent label
  objs.push(staticText(w * 0.08, h * 0.08, accent, {
    fill: 'rgba(255,255,255,0.5)', size: Math.round(w * 0.02), font: 'Arial', weight: 600,
    width: w * 0.84, align: 'left', spacing: 300,
  }))
  // Heading
  objs.push(staticText(w * 0.08, h * 0.22, heading, {
    fill: '#ffffff', size: Math.round(w * 0.07), font: 'Arial Black', weight: 700,
    width: w * 0.84, align: 'left',
  }))
  // Sub
  objs.push(staticText(w * 0.08, h * 0.62, sub, {
    fill: 'rgba(255,255,255,0.7)', size: Math.round(w * 0.025), font: 'Arial', weight: 400,
    width: w * 0.84, align: 'left',
  }))
  if (cta) {
    objs.push(staticText(w * 0.08, h * 0.82, cta, {
      fill: '#ffffff', size: Math.round(w * 0.03), font: 'Arial Black', weight: 700,
      width: w * 0.4, align: 'left', spacing: 150,
    }))
  }
  return objs
}

function splitPhoto(w, h, photo, bgColor, heading, sub, cta) {
  const objs = []
  objs.push(background(w, h, bgColor))
  // Photo left half
  const photoW = w * 0.48
  const imgScale = Math.max(photoW / 1080, h / 720) * 1.2
  objs.push(staticImage(0, 0, 1080, 720, photo, { scaleX: imgScale, scaleY: imgScale }))
  // Text right side
  const tx = w * 0.54
  const tw = w * 0.42
  objs.push(staticText(tx, h * 0.18, heading, {
    fill: '#ffffff', size: Math.round(w * 0.045), font: 'Arial Black', weight: 700,
    width: tw, align: 'left',
  }))
  objs.push(staticText(tx, h * 0.5, sub, {
    fill: 'rgba(255,255,255,0.7)', size: Math.round(w * 0.02), font: 'Arial', weight: 400,
    width: tw, align: 'left', lh: 1.5,
  }))
  if (cta) {
    objs.push(staticText(tx, h * 0.75, cta, {
      fill: '#ffffff', size: 16, font: 'Arial Black', weight: 700, width: tw, align: 'left', spacing: 100,
    }))
  }
  return objs
}

// ─── Template Definitions ────────────────────────────────────────
const TEMPLATES = [
  // ═══ SOCIAL MEDIA — TRAVEL ═══
  { cat: 'Social Media', name: 'Tropical Getaway', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#0a1628', build: (w,h) => photoOverlay(w,h, PH.travel[0], '#0a1628', 'PARADISE\nAWAITS', 'Discover breathtaking beaches\nand crystal clear waters', 'BOOK NOW →') },
  { cat: 'Social Media', name: 'Mountain Adventure', sizes: ['Instagram Post','Instagram Story','Pinterest Pin'],
    bg: '#1b2d1b', build: (w,h) => photoOverlay(w,h, PH.travel[1], '#1b2d1b', 'EXPLORE\nTHE WILD', 'Adventure starts where\ncomfort zones end', 'LEARN MORE →') },
  { cat: 'Social Media', name: 'Wanderlust', sizes: ['Instagram Post','Facebook Post'],
    bg: '#0a0a0a', build: (w,h) => bottomBar(w,h, PH.travel[2], '#0a0a0a', 'WANDERLUST', 'Your Next\nDestination', 'Starting from $299', 'EXPLORE →') },

  // ═══ FOOD ═══
  { cat: 'Food', name: 'Restaurant Special', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#2d1b0e', build: (w,h) => photoOverlay(w,h, PH.food[0], '#2d1b0e', 'TODAY\'S\nSPECIAL', 'Fresh ingredients crafted\nwith passion and love', 'ORDER NOW →') },
  { cat: 'Food', name: 'Pizza Night', sizes: ['Instagram Post','Instagram Story'],
    bg: '#2d0a0a', build: (w,h) => boldNumber(w,h, PH.food[1], '#2d0a0a', '$9.99', 'PIZZA\nNIGHT', 'Every Friday • Dine in or takeout\nFree delivery over $25') },
  { cat: 'Food', name: 'Healthy Bowl', sizes: ['Instagram Post','Facebook Post','Pinterest Pin'],
    bg: '#1b2d1b', build: (w,h) => cardStyle(w,h, PH.food[2], '#1b2d1b', 'FRESH', 'Eat Clean,\nFeel Great', 'Organic bowls made with\nlove and local ingredients', 'ORDER TODAY →') },
  { cat: 'Food', name: 'Cafe Vibes', sizes: ['Instagram Post','Instagram Story'],
    bg: '#2d1b0e', build: (w,h) => bottomBar(w,h, PH.coffee[0], '#2d1b0e', 'COFFEE HOUSE', 'Morning\nRituals', 'Freshly roasted, daily brewed', 'VISIT US →') },
  { cat: 'Food', name: 'Brunch Menu', sizes: ['Instagram Post','Poster'],
    bg: '#2d1b0e', build: (w,h) => photoOverlay(w,h, PH.coffee[1], '#2d1b0e', 'WEEKEND\nBRUNCH', 'Pancakes, waffles, and more\nSat & Sun 9am-2pm', 'RESERVE →') },

  // ═══ FITNESS ═══
  { cat: 'Fitness', name: 'Gym Promo', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.fitness[0], '#0a0a0a', 'JOIN THE\nFITNESS\nREVOLUTION', 'First month FREE\nState-of-the-art equipment', 'JOIN NOW →', { headY: 0.2 }) },
  { cat: 'Fitness', name: '30-Day Challenge', sizes: ['Instagram Post','Instagram Story','Pinterest Pin'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.fitness[1], '#0a0a0a', '30-DAY\nCHALLENGE', 'Transform your body\nand mind in 30 days', 'START FREE →') },
  { cat: 'Fitness', name: 'Personal Training', sizes: ['Instagram Post','Facebook Post'],
    bg: '#0a0a0a', build: (w,h) => splitPhoto(w,h, PH.fitness[2], '#0a0a0a', 'PERSONAL\nTRAINING', '1-on-1 sessions with\ncertified trainers.\nCustom plans for goals.', 'BOOK SESSION →') },

  // ═══ FASHION ═══
  { cat: 'Fashion', name: 'Spring Collection', sizes: ['Instagram Post','Instagram Story','Pinterest Pin'],
    bg: '#2d0a1e', build: (w,h) => photoOverlay(w,h, PH.fashion[0], '#2d0a1e', 'SPRING\nCOLLECTION\n2026', 'Discover the latest trends\nin modern fashion', 'SHOP NOW →', { headY: 0.2 }) },
  { cat: 'Fashion', name: 'Fashion Sale', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#1a0033', build: (w,h) => boldNumber(w,h, PH.fashion[1], '#1a0033', '50%', 'SEASON\nSALE', 'All items half price\nThis weekend only') },
  { cat: 'Fashion', name: 'Style Guide', sizes: ['Instagram Post','Pinterest Pin'],
    bg: '#2d0a1e', build: (w,h) => cardStyle(w,h, PH.fashion[2], '#2d0a1e', 'TRENDING', 'Street Style\nGuide', 'The hottest looks for\nspring and summer', 'READ MORE →') },
  { cat: 'Fashion', name: 'Beauty Essentials', sizes: ['Instagram Post','Instagram Story'],
    bg: '#2d0a1e', build: (w,h) => bottomBar(w,h, PH.beauty[0], '#2d0a1e', 'BEAUTY', 'Glow Up\nEssentials', 'Skincare that actually works', 'DISCOVER →') },

  // ═══ TECHNOLOGY ═══
  { cat: 'Technology', name: 'App Launch', sizes: ['Instagram Post','Twitter Post','LinkedIn Post'],
    bg: '#0a1628', build: (w,h) => photoOverlay(w,h, PH.tech[0], '#0a1628', 'THE FUTURE\nIS HERE', 'Download our new app\nAvailable on iOS & Android', 'GET STARTED →') },
  { cat: 'Technology', name: 'Tech Summit', sizes: ['Instagram Post','LinkedIn Post','Presentation'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.tech[1], '#0a0a0a', 'TECH\nSUMMIT\n2026', 'The biggest technology event\nof the year', 'REGISTER →', { headY: 0.2 }) },
  { cat: 'Technology', name: 'Cyber Security', sizes: ['Instagram Post','Twitter Post'],
    bg: '#0a1628', build: (w,h) => splitPhoto(w,h, PH.tech[2], '#0a1628', 'PROTECT\nYOUR DATA', 'Enterprise-grade security\nfor your digital life.\nStart with a free audit.', 'LEARN MORE →') },

  // ═══ BUSINESS ═══
  { cat: 'Business', name: 'Quarterly Review', sizes: ['LinkedIn Post','Presentation','Facebook Post'],
    bg: '#0d1b2a', build: (w,h) => photoOverlay(w,h, PH.business[0], '#0d1b2a', 'QUARTERLY\nBUSINESS\nREVIEW', 'Q1 2026 Results\nGrowth & Strategy', null, { headY: 0.2 }) },
  { cat: 'Business', name: 'Startup Pitch', sizes: ['Presentation','LinkedIn Post'],
    bg: '#0a0a0a', build: (w,h) => splitPhoto(w,h, PH.business[1], '#0a0a0a', 'INNOVATE.\nDISRUPT.\nGROW.', 'Transform your business\nwith cutting-edge solutions.\nBacked by industry leaders.', 'CONTACT US →') },
  { cat: 'Business', name: 'Team Culture', sizes: ['Instagram Post','LinkedIn Post'],
    bg: '#0a1628', build: (w,h) => bottomBar(w,h, PH.business[2], '#0a1628', 'OUR TEAM', 'Building\nTogether', 'Great things happen when\ngreat minds collaborate', null) },
  { cat: 'Business', name: 'Business Card Dark', sizes: ['Business Card'],
    bg: '#0a0a0a', build: (w,h) => textOnly(w,h, '#0a0a0a', 'COMPANY NAME', 'JOHN DOE\nCreative Director', 'john@company.com\n+1 (555) 123-4567\nwww.company.com', null) },
  { cat: 'Business', name: 'Business Card Minimal', sizes: ['Business Card'],
    bg: '#1e1e2e', build: (w,h) => textOnly(w,h, '#1e1e2e', 'BRAND', 'SARAH SMITH\nMarketing Lead', 'sarah@brand.com\n+1 (555) 987-6543\nwww.brand.com', null) },

  // ═══ REAL ESTATE ═══
  { cat: 'Real Estate', name: 'Property Listing', sizes: ['Instagram Post','Facebook Post','Poster'],
    bg: '#1e1e2e', build: (w,h) => cardStyle(w,h, PH.realestate[0], '#1e1e2e', 'FOR SALE', 'Modern Family\nHome — $750K', '4 Bed • 3 Bath • 2,500 sqft\nCall: (555) 123-4567', 'SCHEDULE TOUR →') },
  { cat: 'Real Estate', name: 'Luxury Home', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#1c1402', build: (w,h) => photoOverlay(w,h, PH.realestate[1], '#1c1402', 'LUXURY\nLIVING', 'Exclusive properties in\nprime locations', 'VIEW LISTINGS →') },
  { cat: 'Real Estate', name: 'Open House', sizes: ['Instagram Story','Poster'],
    bg: '#1e1e2e', build: (w,h) => bottomBar(w,h, PH.realestate[2], '#1e1e2e', 'OPEN HOUSE', 'Saturday\n2-5 PM', '123 Maple St, Suburb\nRefreshments served', 'RSVP →') },

  // ═══ EDUCATION ═══
  { cat: 'Education', name: 'Online Course', sizes: ['Instagram Post','Facebook Post','YouTube Thumbnail'],
    bg: '#0a1628', build: (w,h) => photoOverlay(w,h, PH.education[0], '#0a1628', 'MASTER\nDIGITAL\nMARKETING', '12 Modules • 40+ Hours\nCertificate Included', 'ENROLL — $49', { headY: 0.2 }) },
  { cat: 'Education', name: 'Graduation', sizes: ['Instagram Post','Instagram Story'],
    bg: '#1a0033', build: (w,h) => photoOverlay(w,h, PH.education[1], '#1a0033', 'CLASS OF\n2026', 'Congratulations to all\nour graduates!', null) },
  { cat: 'Education', name: 'Study Tips', sizes: ['Instagram Post','Pinterest Pin'],
    bg: '#0a1628', build: (w,h) => cardStyle(w,h, PH.education[2], '#0a1628', '5 TIPS', 'Ace Your\nExams', '1. Set goals  2. Take breaks\n3. Active recall  4. Teach others', null) },

  // ═══ EVENTS & MUSIC ═══
  { cat: 'Events', name: 'Concert Poster', sizes: ['Poster','Instagram Story','Instagram Post'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.music[0], '#0a0a0a', 'LIVE IN\nCONCERT', 'WORLD TOUR 2026\nApril 15 • City Arena • 7PM', 'GET TICKETS →', { headY: 0.22 }) },
  { cat: 'Events', name: 'DJ Night', sizes: ['Instagram Story','Poster'],
    bg: '#1a0033', build: (w,h) => photoOverlay(w,h, PH.music[1], '#1a0033', 'DJ NIGHT\nSATURDAY', 'Featuring the best\nelectronic music artists', 'RSVP →') },
  { cat: 'Events', name: 'Festival Vibes', sizes: ['Instagram Post','Facebook Post'],
    bg: '#2d0a0a', build: (w,h) => bottomBar(w,h, PH.music[2], '#2d0a0a', 'SUMMER FEST', 'Music\nFestival', '3 Days • 50 Artists • 1 Stage', 'BUY PASSES →') },

  // ═══ MOTIVATION ═══
  { cat: 'Motivation', name: 'Nature Quote', sizes: ['Instagram Post','Instagram Story','Pinterest Pin'],
    bg: '#1b2d1b', build: (w,h) => quoteStyle(w,h, PH.nature[0], '#1b2d1b', 'The only way to\ndo great work is\nto love what you do.', 'Steve Jobs') },
  { cat: 'Motivation', name: 'Ocean Wisdom', sizes: ['Instagram Post','Instagram Story'],
    bg: '#0a1628', build: (w,h) => quoteStyle(w,h, PH.nature[1], '#0a1628', 'In the middle of\ndifficulty lies\nopportunity.', 'Albert Einstein') },
  { cat: 'Motivation', name: 'Mountain Strength', sizes: ['Instagram Post','Pinterest Pin'],
    bg: '#0a0a0a', build: (w,h) => quoteStyle(w,h, PH.nature[2], '#0a0a0a', 'Believe in your\npotential. Every day\nis a new chance.', 'Unknown') },

  // ═══ CELEBRATION ═══
  { cat: 'Celebration', name: 'Birthday Party', sizes: ['Instagram Post','Instagram Story'],
    bg: '#2d0a1e', build: (w,h) => photoOverlay(w,h, PH.celebration[0], '#2d0a1e', 'HAPPY\nBIRTHDAY!', 'Wishing you a day full\nof joy and happiness', null) },
  { cat: 'Celebration', name: 'Party Invite', sizes: ['Instagram Post','Instagram Story'],
    bg: '#1a0033', build: (w,h) => photoOverlay(w,h, PH.celebration[1], '#1a0033', 'YOU\'RE\nINVITED', 'Saturday Night\nApril 12, 2026 • 8 PM', 'RSVP →') },
  { cat: 'Celebration', name: 'Confetti', sizes: ['Instagram Post','Poster'],
    bg: '#1c1402', build: (w,h) => photoOverlay(w,h, PH.celebration[2], '#1c1402', 'LET\'S\nCELEBRATE!', 'A night to remember\nwith friends and family', null) },
  { cat: 'Celebration', name: 'Wedding Save the Date', sizes: ['Instagram Post','Poster'],
    bg: '#2d1b0e', build: (w,h) => quoteStyle(w,h, PH.wedding[0], '#2d1b0e', 'Sarah & Michael\n\nJune 20, 2026\nThe Grand Estate', 'Save the Date') },
  { cat: 'Celebration', name: 'Elegant Wedding', sizes: ['Instagram Post','Instagram Story'],
    bg: '#1c1402', build: (w,h) => photoOverlay(w,h, PH.wedding[1], '#1c1402', 'TOGETHER\nFOREVER', 'You are cordially invited\nto celebrate our union', null) },

  // ═══ YOUTUBE ═══
  { cat: 'YouTube', name: 'Gaming Thumbnail', sizes: ['YouTube Thumbnail'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.gaming[0], '#0a0a0a', 'EPIC\nGAMEPLAY', 'World Record Attempt!\nEpisode 42', null, { headSize: 0.1, headY: 0.15, subY: 0.6 }) },
  { cat: 'YouTube', name: 'Tech Review', sizes: ['YouTube Thumbnail'],
    bg: '#0a1628', build: (w,h) => splitPhoto(w,h, PH.tech[0], '#0a1628', 'HONEST\nREVIEW', 'Is this the best gadget\nof 2026? Watch now.', null) },
  { cat: 'YouTube', name: 'Vlog Thumbnail', sizes: ['YouTube Thumbnail'],
    bg: '#0a0a0a', build: (w,h) => bottomBar(w,h, PH.travel[2], '#0a0a0a', 'DAILY VLOG', 'A Day In\nMy Life', 'NYC Edition • Episode 15', null) },
  { cat: 'YouTube', name: 'Tutorial', sizes: ['YouTube Thumbnail'],
    bg: '#0a0a0a', build: (w,h) => photoOverlay(w,h, PH.education[0], '#0a0a0a', 'COMPLETE\nGUIDE', 'Step by step tutorial\nfor beginners', null, { headSize: 0.09, headY: 0.15, subY: 0.6 }) },
  { cat: 'YouTube', name: 'Gaming Stream', sizes: ['YouTube Thumbnail'],
    bg: '#2d0a0a', build: (w,h) => boldNumber(w,h, PH.gaming[1], '#2d0a0a', 'LIVE', 'STREAM\nTONIGHT', '8PM EST • Chat & Giveaways\nDon\'t miss out!') },

  // ═══ SEASONAL / SALES ═══
  { cat: 'Seasonal', name: 'Summer Sale', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#0a0a0a', build: (w,h) => boldNumber(w,h, PH.travel[0], '#0a0a0a', '70%', 'SUMMER\nSALE', 'Limited time only\nAll items on sale') },
  { cat: 'Seasonal', name: 'Black Friday', sizes: ['Instagram Post','Instagram Story','Facebook Post'],
    bg: '#0a0a0a', build: (w,h) => boldNumber(w,h, PH.abstract[0], '#0a0a0a', '80%', 'BLACK\nFRIDAY', 'One day only • November 28\nBiggest sale of the year') },
  { cat: 'Seasonal', name: 'Winter Collection', sizes: ['Instagram Post','Instagram Story'],
    bg: '#0a1628', build: (w,h) => photoOverlay(w,h, PH.abstract[2], '#0a1628', 'WINTER\nCOLLECTION', 'Warm wishes and\ncold weather deals', 'SHOP NOW →') },
  { cat: 'Seasonal', name: 'Flash Sale', sizes: ['Instagram Post','Facebook Post'],
    bg: '#2d0a0a', build: (w,h) => boldNumber(w,h, PH.sale[0], '#2d0a0a', '40%', 'FLASH\nSALE', '48 hours only\nUse code: FLASH40') },
  { cat: 'Seasonal', name: 'End of Season', sizes: ['Instagram Post','Instagram Story'],
    bg: '#1c1402', build: (w,h) => photoOverlay(w,h, PH.sale[1], '#1c1402', 'CLEARANCE\nSALE', 'Everything must go\nUp to 60% off', 'SHOP SALE →') },

  // ═══ MINIMALIST ═══
  { cat: 'Minimalist', name: 'Clean Announcement', sizes: ['Instagram Post','LinkedIn Post','Twitter Post'],
    bg: '#1e1e2e', build: (w,h) => textOnly(w,h, '#1e1e2e', 'ANNOUNCEMENT', 'Something\nWonderful\nis Coming.', 'Stay tuned for updates.\nwww.company.com', 'NOTIFY ME →') },
  { cat: 'Minimalist', name: 'Modern Minimal', sizes: ['Instagram Post','LinkedIn Post'],
    bg: '#0d1b2a', build: (w,h) => textOnly(w,h, '#0d1b2a', 'DESIGN PHILOSOPHY', 'Less is\nMore.', 'Timeless design meets\nmodern simplicity.', null) },
  { cat: 'Minimalist', name: 'Abstract Art', sizes: ['Instagram Post','Instagram Story'],
    bg: '#1a0033', build: (w,h) => photoOverlay(w,h, PH.abstract[1], '#1a0033', 'CREATE\nWITHOUT\nLIMITS', 'Unleash your creativity\nwith our design tools', 'TRY FREE →', { headY: 0.2 }) },
  { cat: 'Minimalist', name: 'Gradient Vibes', sizes: ['Instagram Post','Instagram Story'],
    bg: '#0a1628', build: (w,h) => photoOverlay(w,h, PH.abstract[2], '#0a1628', 'THINK\nDIFFERENT', 'Innovation starts with\na single idea', null) },

  // ═══ BRANDING ═══
  { cat: 'Branding', name: 'Brand Identity Dark', sizes: ['Instagram Post','Presentation'],
    bg: '#0a0a0a', build: (w,h) => textOnly(w,h, '#0a0a0a', 'BRANDING', 'YOUR\nBRAND\nHERE', 'Building memorable experiences\nthrough design and strategy.', 'GET STARTED →') },
  { cat: 'Branding', name: 'Brand Identity Light', sizes: ['Instagram Post','Presentation'],
    bg: '#0d1b2a', build: (w,h) => textOnly(w,h, '#0d1b2a', 'STUDIO', 'MODERN\nBRANDING', 'Clean, professional identity\nthat speaks for itself.', 'CONTACT US →') },
]


// ─── Generate & Write ────────────────────────────────────────────
function generateAll() {
  const results = []
  for (const tpl of TEMPLATES) {
    for (const sizeName of tpl.sizes) {
      const size = SIZES[sizeName]
      if (!size) continue
      const { width, height } = size
      const objects = tpl.build(width, height)

      results.push({
        id: genId(),
        name: `${tpl.name} — ${sizeName}`,
        category: tpl.cat,
        userId: '00000000-0000-0000-0000-000000000000',
        json: JSON.stringify({
          version: '5.3.0',
          objects,
          background: { type: 'color', value: tpl.bg },
          frame: { width, height },
        }),
        height, width,
        thumbnailUrl: preview(width, height, tpl.bg, tpl.name),
        isTemplate: true,
        isPro: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }
  return results
}

const newTemplates = generateAll()
const templatePath = path.join(__dirname, '..', 'public', 'data', 'template.json')

let existing = { data: [] }
try { existing = JSON.parse(fs.readFileSync(templatePath, 'utf8')) } catch {}
const originals = existing.data.filter(t => !t.category)
const all = [...originals, ...newTemplates]

fs.writeFileSync(templatePath, JSON.stringify({ data: all }, null, 2))

console.log(`Generated ${newTemplates.length} templates (kept ${originals.length} originals)`)
console.log(`Total: ${all.length}`)
const cats = {}
newTemplates.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1 })
console.log('\nBy category:')
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`))
