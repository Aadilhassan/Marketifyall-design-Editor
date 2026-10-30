import React, {
  CSSProperties,
  ReactElement,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { Button, KIND, SIZE } from 'baseui/button'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { MoreHorizontal } from 'lucide-react'
import { color, radius, shadow } from '@/theme/tokens'
import useBreakpoint from '@/hooks/useBreakpoint'

/**
 * Contextual-toolbar row that never scrolls: items that don't fit move, in
 * order, into a "More" popover at the right end.
 *
 * Children form a flat list (fragments and arrays are flattened):
 *  - any element is an item; wrap it in <OverflowItem pinned> to keep it in
 *    the bar no matter what (used for lock / duplicate / delete),
 *  - <OverflowDivider /> is a separator, dropped at the cut point and at the
 *    edges / doubled up in the menu,
 *  - <OverflowSpacer /> pushes what follows to the right (never moves).
 *
 * How it decides: every item is always rendered in the bar. Items that fit sit
 * in the normal flow; the rest stay mounted but are taken out of the flow
 * (position: absolute, visibility: hidden), so their width can still be read,
 * and a second copy is rendered inside the More menu (popover-triggering items
 * like Flip or Opacity therefore work from the menu too). Item widths are
 * max-content (flex: none, nowrap), so they don't depend on which items are
 * hidden: the result is a pure function of the bar width and the item widths
 * and re-measuring after a change gives the same answer, so there is no
 * measure loop. State is only set when the result differs.
 *
 * On phones the bar does not collapse: everything stays in flow and the row
 * scrolls horizontally (the phone toolbar strip is a swipeable row).
 */

const GAP = 4

interface MarkerProps {
  pinned?: boolean
}

export function OverflowItem({ children }: MarkerProps & { children?: ReactNode }) {
  return <>{children}</>
}

export function OverflowDivider(_: MarkerProps) {
  return <div style={{ height: 24, width: 1, backgroundColor: color.line, margin: '0 6px' }} />
}

export function OverflowSpacer() {
  return null
}

type Kind = 'item' | 'divider' | 'spacer'

interface Entry {
  key: string
  kind: Kind
  pinned: boolean
  element: ReactElement
}

function flatten(children: ReactNode, prefix = ''): Entry[] {
  const out: Entry[] = []
  React.Children.toArray(children).forEach((child, i) => {
    if (!React.isValidElement(child)) return
    const key = `${prefix}${child.key ?? i}`
    if (child.type === React.Fragment) {
      out.push(...flatten((child.props as any).children, `${key}/`))
      return
    }
    const kind: Kind =
      child.type === OverflowDivider ? 'divider' : child.type === OverflowSpacer ? 'spacer' : 'item'
    out.push({ key, kind, pinned: !!(child.props as any)?.pinned, element: child })
  })
  return out
}

export interface LayoutInput {
  kind: Kind
  pinned: boolean
  width: number
}

export interface Layout {
  /** per entry: rendered in the bar's flow */
  inBar: boolean[]
  /** indices shown in the More menu, in order */
  menu: number[]
}

/** Drop leading, trailing and doubled dividers from a sequence of indices. */
function tidyDividers(idx: number[], entries: LayoutInput[]): number[] {
  const out: number[] = []
  idx.forEach(i => {
    if (entries[i].kind === 'divider') {
      const prev = out.length ? entries[out[out.length - 1]] : null
      if (!prev || prev.kind === 'divider') return
    }
    out.push(i)
  })
  while (out.length && entries[out[out.length - 1]].kind === 'divider') out.pop()
  return out
}

function flowWidth(entries: LayoutInput[], idx: number[], extra = 0): number {
  const n = idx.length + (extra > 0 ? 1 : 0)
  const sum = idx.reduce((s, i) => s + entries[i].width, 0) + extra
  return sum + GAP * Math.max(0, n - 1)
}

/** Pure layout: which entries stay in the bar, which go to the menu. */
export function computeOverflow(entries: LayoutInput[], available: number, moreWidth: number): Layout {
  // zero-width items (components rendering nothing) take no room anywhere
  const all = entries.map((_, i) => i).filter(i => entries[i].kind === 'spacer' || entries[i].width > 0)
  const tidyAll = tidyBar(all, entries)
  if (flowWidth(entries, tidyAll) <= available + 0.5) {
    return { inBar: entries.map((_, i) => tidyAll.includes(i)), menu: [] }
  }

  const fixed = all.filter(i => entries[i].pinned || entries[i].kind === 'spacer')
  const movable = all.filter(i => !fixed.includes(i))
  const kept: number[] = []
  let cut = movable.length
  for (let k = 0; k < movable.length; k++) {
    const trial = [...kept, movable[k], ...fixed].sort((a, b) => a - b)
    if (flowWidth(entries, tidyBar(trial, entries), moreWidth) > available + 0.5) {
      cut = k
      break
    }
    kept.push(movable[k])
  }
  const bar = tidyBar(
    [...kept, ...fixed].sort((a, b) => a - b),
    entries,
    kept[kept.length - 1]
  )
  // empty when only dividers overflowed: then there is nothing worth a menu
  const menu = tidyDividers(movable.slice(cut), entries)
  return { inBar: entries.map((_, i) => bar.includes(i)), menu }
}

/** Divider clean-up for the bar; spacers don't separate anything. */
function tidyBar(idx: number[], entries: LayoutInput[], lastKept?: number): number[] {
  const out: number[] = []
  idx.forEach(i => {
    if (entries[i].kind === 'divider') {
      const prev = [...out].reverse().find(j => entries[j].kind !== 'spacer')
      if (prev === undefined || entries[prev].kind === 'divider') return
      // a movable divider right at the cut point has nothing after it
      if (lastKept !== undefined && i === lastKept && !entries[i].pinned) return
    }
    out.push(i)
  })
  // trailing divider (ignoring spacers)
  for (let k = out.length - 1; k >= 0; k--) {
    const e = entries[out[k]]
    if (e.kind === 'spacer') continue
    if (e.kind === 'divider') out.splice(k, 1)
    break
  }
  // a divider directly before another one once spacers are ignored
  return out.filter((i, k) => {
    if (entries[i].kind !== 'divider') return true
    const next = out.slice(k + 1).find(j => entries[j].kind !== 'spacer')
    return next === undefined || entries[next].kind !== 'divider'
  })
}

function sameLayout(a: Layout | null, b: Layout): boolean {
  if (!a) return false
  return (
    a.inBar.length === b.inBar.length &&
    a.inBar.every((v, i) => v === b.inBar[i]) &&
    a.menu.length === b.menu.length &&
    a.menu.every((v, i) => v === b.menu[i])
  )
}

const OUT_OF_FLOW: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
}

const WRAP: CSSProperties = {
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  width: 'max-content',
}

function OverflowBar({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  const entries = flatten(children)
  const scroll = useBreakpoint() === 'phone'
  const barRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const layoutRef = useRef<Layout | null>(null)
  const kindsRef = useRef<LayoutInput[]>([])
  kindsRef.current = entries.map(e => ({ kind: e.kind, pinned: e.pinned, width: 0 }))

  const measure = useCallback(() => {
    const bar = barRef.current
    if (!bar) return
    const cs = window.getComputedStyle(bar)
    const available = bar.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
    const inputs = kindsRef.current.map((e, i) => {
      const el = itemRefs.current[i]
      return { ...e, width: e.kind === 'spacer' ? 0 : el ? el.getBoundingClientRect().width : 0 }
    })
    const moreWidth = moreRef.current ? moreRef.current.getBoundingClientRect().width : 36
    const next = computeOverflow(inputs, available, moreWidth)
    if (!sameLayout(layoutRef.current, next)) {
      layoutRef.current = next
      setLayout(next)
    }
  }, [])

  // after every render (children may have changed width or count); state only
  // changes when the result does, so this settles after at most one re-render
  useLayoutEffect(() => {
    measure()
  })

  // size changes of the bar (drawer opening, window resize) or of any item
  // (e.g. a longer font name) re-run the measurement on the next frame
  const roRef = useRef<ResizeObserver | null>(null)
  const observed = useRef<Set<Element>>(new Set())
  useLayoutEffect(() => {
    let frame = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    roRef.current = ro
    const seen = observed.current
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      seen.clear()
      roRef.current = null
    }
  }, [measure])
  useLayoutEffect(() => {
    const ro = roRef.current
    if (!ro) return
    const current = new Set<Element>(
      [barRef.current, moreRef.current, ...itemRefs.current.slice(0, entries.length)].filter(
        Boolean
      ) as Element[]
    )
    observed.current.forEach(el => {
      if (!current.has(el)) {
        ro.unobserve(el)
        observed.current.delete(el)
      }
    })
    current.forEach(el => {
      if (!observed.current.has(el)) {
        ro.observe(el)
        observed.current.add(el)
      }
    })
  })

  // Before the first measurement (and if the entry count changed since), show
  // everything in flow; the layout effect corrects it before paint.
  const valid = !scroll && layout && layout.inBar.length === entries.length ? layout : null
  const menu = valid ? valid.menu : []
  const showMore = menu.length > 0

  return (
    <div
      ref={barRef}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        position: 'relative',
        overflowX: scroll ? 'auto' : 'hidden',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: GAP,
        paddingLeft: '1rem',
        paddingRight: '1rem',
        ...style,
      }}
    >
      {entries.map((e, i) => {
        const inFlow = e.kind === 'spacer' || (valid ? valid.inBar[i] : true)
        const wrapStyle: CSSProperties =
          e.kind === 'spacer' ? { flex: '1 1 0', minWidth: 0 } : inFlow ? WRAP : { ...WRAP, ...OUT_OF_FLOW }
        return (
          <div
            key={e.key}
            ref={el => {
              itemRefs.current[i] = el
            }}
            style={wrapStyle}
            aria-hidden={inFlow ? undefined : true}
          >
            {e.element}
          </div>
        )
      })}
      <div
        ref={moreRef}
        style={showMore ? WRAP : { ...WRAP, ...OUT_OF_FLOW }}
        aria-hidden={showMore ? undefined : true}
      >
        <StatefulPopover
          placement={PLACEMENT.bottomRight}
          overrides={{
            Body: {
              style: {
                backgroundColor: color.white,
                borderTopLeftRadius: radius.md,
                borderTopRightRadius: radius.md,
                borderBottomLeftRadius: radius.md,
                borderBottomRightRadius: radius.md,
                boxShadow: shadow.pop,
                zIndex: 20,
              },
            },
            Inner: { style: { backgroundColor: color.white } },
          }}
          content={() => (
            <div
              role="menu"
              aria-label="More tools"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 2,
                padding: 6,
                minWidth: 180,
              }}
            >
              {menu.map(i => {
                const e = entries[i]
                if (!e) return null
                return e.kind === 'divider' ? (
                  <div key={e.key} style={{ height: 1, backgroundColor: color.line, margin: '4px 2px' }} />
                ) : (
                  <div key={e.key} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                    {e.element}
                  </div>
                )
              })}
            </div>
          )}
        >
          <Button
            size={SIZE.compact}
            kind={KIND.tertiary}
            aria-label="More tools"
            disabled={!showMore}
            startEnhancer={() => <MoreHorizontal size={18} />}
          >
            More
          </Button>
        </StatefulPopover>
      </div>
    </div>
  )
}

export default OverflowBar
