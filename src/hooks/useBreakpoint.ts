import { useEffect, useState } from 'react'

/**
 * Editor layout breakpoints: phone < 768, tablet 768–1199, desktop ≥ 1200.
 * Driven by matchMedia (not resize events) so it only re-renders when the
 * bucket actually changes. Without `window`/matchMedia (SSR, jsdom) it reports
 * 'desktop', which is the layout the editor had before it became responsive.
 */
export type Breakpoint = 'phone' | 'tablet' | 'desktop'

export const TABLET_MIN = 768
export const DESKTOP_MIN = 1200

export const PHONE_QUERY = `(max-width: ${TABLET_MIN - 0.02}px)`
export const DESKTOP_QUERY = `(min-width: ${DESKTOP_MIN}px)`
export const COARSE_QUERY = '(pointer: coarse)'

export function breakpointFor(width: number): Breakpoint {
  if (width < TABLET_MIN) return 'phone'
  if (width < DESKTOP_MIN) return 'tablet'
  return 'desktop'
}

type MatchMedia = (query: string) => { matches: boolean }

export function readBreakpoint(matchMedia: MatchMedia | undefined): Breakpoint {
  if (!matchMedia) return 'desktop'
  if (matchMedia(PHONE_QUERY).matches) return 'phone'
  if (matchMedia(DESKTOP_QUERY).matches) return 'desktop'
  return 'tablet'
}

const getMatchMedia = (): MatchMedia | undefined =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? q => window.matchMedia(q) : undefined

/** Subscribe to a list of media queries; returns an unsubscribe function. */
function watch(queries: string[], onChange: () => void): () => void {
  const mm = getMatchMedia()
  if (!mm) return () => undefined
  const lists = queries.map(q => window.matchMedia(q))
  lists.forEach(l => {
    // Safari < 14 only has the deprecated addListener.
    if (typeof l.addEventListener === 'function') l.addEventListener('change', onChange)
    else l.addListener(onChange)
  })
  return () =>
    lists.forEach(l => {
      if (typeof l.removeEventListener === 'function') l.removeEventListener('change', onChange)
      else l.removeListener(onChange)
    })
}

export default function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => readBreakpoint(getMatchMedia()))
  useEffect(() => {
    const update = () => setBp(readBreakpoint(getMatchMedia()))
    update()
    return watch([PHONE_QUERY, DESKTOP_QUERY], update)
  }, [])
  return bp
}

/** True when the primary pointer is a finger (phones, tablets). */
export function isCoarsePointer(): boolean {
  const mm = getMatchMedia()
  return !!mm && mm(COARSE_QUERY).matches
}

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(isCoarsePointer)
  useEffect(() => {
    const update = () => setCoarse(isCoarsePointer())
    update()
    return watch([COARSE_QUERY], update)
  }, [])
  return coarse
}
