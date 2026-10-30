import { ReactNode, useEffect, useRef } from 'react'
import useAppContext from '@/hooks/useAppContext'
import useBreakpoint from '@/hooks/useBreakpoint'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { color, font } from '@/theme/tokens'
import Panels from '../components/Panels'
import Toolbox from '../components/Toolbox'
import PhoneChrome, { PhoneSelectionStrip } from './PhoneChrome'
import TimelineDock from './TimelineDock'

/**
 * Editor shell shared by the standalone and embed editors.
 *
 *  desktop (≥1200): navbar / rail + drawer (pushes the stage) / toolbar,
 *                   stage, timeline dock, pages bar — unchanged.
 *  tablet (768–1199): same, but the drawer floats over the stage
 *                   (PanelItem) so opening it never refits the page.
 *  phone (<768):    48 px top bar, full-bleed stage (100dvh, safe areas),
 *                   collapsed timeline, pages pill, selection strip floating
 *                   over the stage's bottom edge, tab bar, panels in bottom
 *                   sheets (PhoneChrome).
 *
 * The stage element keeps the same position in the React tree at every
 * breakpoint (conditional siblings leave holes rather than shifting it), so
 * rotating a tablet across 1200 px never remounts the canvas.
 */
interface Props {
  topbar: ReactNode
  /** Extra class on the top bar wrapper (lets embed chrome be compacted in CSS). */
  topbarClassName?: string
  stage: ReactNode
  timeline: ReactNode
  pagesBar?: ReactNode
  /** Rendered first (toasts). */
  before?: ReactNode
  /** Rendered after the shell (context menu, modals). */
  after?: ReactNode
}

/** Phones and tablets start with the drawer closed so the page is visible,
 * unless the URL asked for a panel (?panel= dashboard quick-start). */
function useInitialPanelState(phone: boolean, tablet: boolean) {
  const { setIsPanelOpen } = useAppContext()
  const first = useRef(true)
  useEffect(() => {
    const wasFirst = first.current
    first.current = false
    const askedForPanel = new URLSearchParams(window.location.search).has('panel')
    if ((phone || (tablet && wasFirst)) && !(wasFirst && askedForPanel)) setIsPanelOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])
}

export default function ResponsiveEditorLayout({ topbar, topbarClassName, stage, timeline, pagesBar, before, after }: Props) {
  const bp = useBreakpoint()
  const phone = bp === 'phone'
  useInitialPanelState(phone, bp === 'tablet')

  return (
    <div
      className={phone ? 'mfa-editor mfa-editor--phone' : bp === 'tablet' ? 'mfa-editor mfa-editor--tablet' : 'mfa-editor'}
      style={{
        width: '100vw',
        // phone: 100dvh + safe-area padding from .mfa-editor--phone
        height: phone ? undefined : '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: color.surface,
        fontFamily: font.sans,
      }}
    >
      {before}
      <div className={topbarClassName} style={{ position: 'relative', zIndex: 100 }}>
        {topbar}
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!phone && (
          <ErrorBoundary fallback={<div style={{ padding: 20, color: '#ef4444' }}>Panel failed to load</div>}>
            <Panels />
          </ErrorBoundary>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {!phone && (
            <ErrorBoundary fallback={<div style={{ padding: 10, color: '#ef4444' }}>Toolbar error</div>}>
              <Toolbox />
            </ErrorBoundary>
          )}
          {stage}
          {/* Docked below the stage (never over it): the stage shrinks once,
              by exactly the dock height, and the viewport re-fits once. */}
          <TimelineDock compact={phone} overlay={<PhoneSelectionStrip />}>
            {timeline}
          </TimelineDock>
          {pagesBar}
          {phone && <PhoneChrome />}
        </div>
      </div>
      {after}
    </div>
  )
}
