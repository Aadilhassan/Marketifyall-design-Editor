import { log } from '@/lib/logger'

/**
 * Load a template's custom fonts, then import it. Waits for every font to settle
 * (loaded or failed): a template whose font URLs fail (offline / CORS) must still
 * import rather than hang.
 */
export async function applyTemplate(editor: any, template: any): Promise<void> {
  const fonts = (template.objects || [])
    .filter((o: any) => o.type === 'StaticText' || o.type === 'DynamicText')
    .map((o: any) => ({ name: o.metadata?.fontFamily || o.fontFamily, url: o.metadata?.fontURL || o.fontURL }))
    .filter((f: any) => !!f.url)
  const loaded = await Promise.all(
    fonts.map((f: any) => new FontFace(f.name, `url(${f.url})`, { style: 'normal', weight: '400' }).load().catch(() => null)),
  )
  loaded.forEach(face => {
    if (!face) return
    try {
      document.fonts.add(face)
    } catch (err) {
      log.warn('templates', 'font registration failed during template load — template still loads', err)
    }
  })
  editor.importFromJSON(template)
}
