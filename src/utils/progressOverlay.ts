/**
 * Canva-style "processing" overlay that sits directly on top of the image being
 * worked on: an animated shimmer sweep + floating sparkle particles, with a
 * percentage badge in the centre. Rendered onto document.body at a very high
 * z-index and positioned over the fabric object's on-screen bounding box, so it
 * visually conveys that work is happening *on that image* and is never clipped.
 *
 * Used for long in-browser operations like AI upscaling and background removal.
 */
import { ignoreError } from '@/lib/logger'

export interface ProcessingHandle {
  /** ratio 0..1 (use <=0 for an indeterminate stage), with a short label. */
  update: (ratio: number, stage: string) => void
  close: () => void
}

let stylesInjected = false

function injectStyles() {
  if (stylesInjected || document.getElementById('mfa-processing-style')) {
    stylesInjected = true
    return
  }
  const style = document.createElement('style')
  style.id = 'mfa-processing-style'
  style.textContent = `
    @keyframes mfa-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes mfa-float {
      0%{ transform:translateY(8px) scale(0.6); opacity:0 }
      25%{ opacity:1 }
      100%{ transform:translateY(-38px) scale(1); opacity:0 }
    }
    @keyframes mfa-proc-spin { to { transform:rotate(360deg) } }
  `
  document.head.appendChild(style)
  stylesInjected = true
}

function objectScreenRect(canvas: any, obj: any): { left: number; top: number; width: number; height: number } | null {
  try {
    const upper = canvas.upperCanvasEl || canvas.lowerCanvasEl || (canvas.getElement && canvas.getElement())
    if (!upper || !obj || typeof obj.getBoundingRect !== 'function') return null
    const cRect = upper.getBoundingClientRect()
    const logicalW = upper.clientWidth || cRect.width
    const logicalH = upper.clientHeight || cRect.height
    const sx = logicalW ? cRect.width / logicalW : 1
    const sy = logicalH ? cRect.height / logicalH : 1
    const b = obj.getBoundingRect(false, true)
    return {
      left: cRect.left + b.left * sx,
      top: cRect.top + b.top * sy,
      width: Math.max(40, b.width * sx),
      height: Math.max(40, b.height * sy),
    }
  } catch {
    return null
  }
}

export function showImageProcessingOverlay(canvas: any, obj: any, initialStage = 'Processing'): ProcessingHandle {
  injectStyles()

  const rect = objectScreenRect(canvas, obj)

  const host = document.createElement('div')
  host.setAttribute('role', 'status')
  host.style.cssText =
    'position:fixed;z-index:99999;overflow:hidden;border-radius:10px;pointer-events:all;' +
    'box-shadow:0 0 0 2px rgba(99,102,241,0.55), 0 8px 30px rgba(15,23,42,0.25);' +
    'background:rgba(79,70,229,0.16);backdrop-filter:blur(1.5px)'
  if (rect) {
    host.style.left = rect.left + 'px'
    host.style.top = rect.top + 'px'
    host.style.width = rect.width + 'px'
    host.style.height = rect.height + 'px'
  } else {
    // Fallback: cover the whole canvas element area.
    const upper = canvas?.upperCanvasEl || canvas?.lowerCanvasEl
    const cr = upper?.getBoundingClientRect?.()
    host.style.left = (cr?.left ?? 0) + 'px'
    host.style.top = (cr?.top ?? 0) + 'px'
    host.style.width = (cr?.width ?? window.innerWidth) + 'px'
    host.style.height = (cr?.height ?? window.innerHeight) + 'px'
  }

  // Shimmer sweep.
  const shimmer = document.createElement('div')
  shimmer.style.cssText =
    'position:absolute;inset:0;background-size:250% 100%;animation:mfa-shimmer 1.5s linear infinite;' +
    'background-image:linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)'
  host.appendChild(shimmer)

  // Floating sparkle particles.
  const w = parseFloat(host.style.width) || 200
  const count = Math.max(8, Math.min(26, Math.round(w / 22)))
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    const size = 3 + Math.random() * 5
    const left = Math.random() * 100
    const dur = 1.8 + Math.random() * 1.8
    const delay = Math.random() * 2
    p.style.cssText =
      'position:absolute;bottom:-6px;border-radius:50%;pointer-events:none;' +
      `left:${left}%;width:${size}px;height:${size}px;` +
      'background:radial-gradient(circle, #ffffff 0%, rgba(199,210,254,0.9) 45%, rgba(199,210,254,0) 70%);' +
      `animation:mfa-float ${dur}s ${delay}s linear infinite`
    host.appendChild(p)
  }

  // Centre badge with percentage / spinner + stage label.
  const badge = document.createElement('div')
  badge.style.cssText =
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'display:flex;flex-direction:column;align-items:center;gap:6px;' +
    'padding:14px 18px;border-radius:12px;background:rgba(17,24,39,0.74);' +
    "color:#fff;font-family:Inter,'Poppins',system-ui,-apple-system,sans-serif;text-align:center;min-width:96px"

  const big = document.createElement('div')
  big.style.cssText = 'font-size:24px;font-weight:800;line-height:1;letter-spacing:0.5px'

  const spinner = document.createElement('div')
  spinner.style.cssText =
    'width:26px;height:26px;border:3px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;' +
    'animation:mfa-proc-spin 0.8s linear infinite'

  const label = document.createElement('div')
  label.style.cssText = 'font-size:12px;font-weight:600;opacity:0.9'
  label.textContent = initialStage

  badge.appendChild(spinner)
  badge.appendChild(big)
  badge.appendChild(label)
  host.appendChild(badge)
  document.body.appendChild(host)

  let closed = false
  const setIndeterminate = () => {
    spinner.style.display = 'block'
    big.style.display = 'none'
  }
  const setPercent = (pct: number) => {
    spinner.style.display = 'none'
    big.style.display = 'block'
    big.textContent = pct + '%'
  }
  setIndeterminate()

  return {
    update: (ratio: number, stage: string) => {
      if (closed) return
      if (stage) label.textContent = stage
      if (ratio > 0) setPercent(Math.min(100, Math.round(ratio * 100)))
      else setIndeterminate()
    },
    close: () => {
      if (closed) return
      closed = true
      try {
        document.body.removeChild(host)
      } catch (err) {
        ignoreError(err, 'overlay already removed')
      }
    },
  }
}
