/**
 * Keyless Google Fonts loading via the `google-fonts` package — it injects a
 * `<link href="//fonts.googleapis.com/css?family=...">` (the public CSS endpoint,
 * no developer API key required). For canvas rendering we then wait on the
 * Font Loading API so fabric only draws text once the face is actually ready.
 */
/* google-fonts ships no type declarations */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GoogleFonts: any = require('google-fonts')

const injected = new Set<string>()
const ready = new Set<string>()
const pending = new Map<string, Promise<boolean>>()

/** Inject the stylesheet so the family renders in the DOM (e.g. list previews). */
export function injectGoogleFont(family: string): void {
  if (!family || injected.has(family)) return
  injected.add(family)
  try {
    GoogleFonts.add({ [family]: [400, 700] })
  } catch {
    /* ignore */
  }
}

/** Inject + wait until the font face is actually available (for canvas use). */
export function loadGoogleFont(family: string): Promise<boolean> {
  if (!family) return Promise.resolve(false)
  if (ready.has(family)) return Promise.resolve(true)
  const existing = pending.get(family)
  if (existing) return existing

  const p = new Promise<boolean>(resolve => {
    injectGoogleFont(family)
    const fonts: any = (document as any).fonts
    if (!fonts || !fonts.load) {
      setTimeout(() => resolve(true), 300)
      return
    }
    const spec = `16px "${family}"`
    const run = async () => {
      // Poll: the injected stylesheet may not have registered its @font-face yet.
      for (let i = 0; i < 25; i++) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await fonts.load(spec)
          // eslint-disable-next-line no-await-in-loop
          await fonts.load(`700 ${spec}`)
        } catch {
          /* ignore */
        }
        try {
          if (fonts.check && fonts.check(spec)) break
        } catch {
          break
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 120))
      }
      ready.add(family)
      resolve(true)
    }
    run()
  })

  pending.set(family, p)
  return p
}
