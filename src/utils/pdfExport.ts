/** Export a PNG data URL as a single-page PDF sized exactly to the design.
 *  jsPDF is dynamically imported so it never weighs down the initial bundle. */
/**
 * jsPDF stores PNGs losslessly (a near-empty page came out ~2.5 MB), and PDF
 * pages are opaque anyway, so re-encode as high-quality JPEG on white. Falls back
 * to the PNG wherever a 2D canvas isn't available (e.g. tests).
 */
export async function toPdfImage(dataUrl: string): Promise<{ data: string; format: 'PNG' | 'JPEG' }> {
  if (typeof document === 'undefined' || !dataUrl.startsWith('data:image/png')) return { data: dataUrl, format: 'PNG' }
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image decode failed'))
      img.src = dataUrl
    })
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    if (!ctx || !c.width) return { data: dataUrl, format: 'PNG' }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0)
    return { data: c.toDataURL('image/jpeg', 0.92), format: 'JPEG' }
  } catch (err) {
    void err // keep the lossless PNG rather than fail the export
    return { data: dataUrl, format: 'PNG' }
  }
}

export async function exportCanvasToPdf(opts: {
  dataUrl: string
  widthPx: number
  heightPx: number
  filename: string
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const orientation = opts.widthPx >= opts.heightPx ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [opts.widthPx, opts.heightPx] })
  const img = await toPdfImage(opts.dataUrl)
  pdf.addImage(img.data, img.format, 0, 0, opts.widthPx, opts.heightPx)
  pdf.save(opts.filename)
}
