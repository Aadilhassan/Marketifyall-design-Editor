/** Export a PNG data URL as a single-page PDF sized exactly to the design.
 *  jsPDF is dynamically imported so it never weighs down the initial bundle. */
export async function exportCanvasToPdf(opts: {
  dataUrl: string
  widthPx: number
  heightPx: number
  filename: string
}): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const orientation = opts.widthPx >= opts.heightPx ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [opts.widthPx, opts.heightPx] })
  pdf.addImage(opts.dataUrl, 'PNG', 0, 0, opts.widthPx, opts.heightPx)
  pdf.save(opts.filename)
}
