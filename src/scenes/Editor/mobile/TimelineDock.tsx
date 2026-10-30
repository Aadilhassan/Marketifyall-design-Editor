import { ReactNode, useEffect, useRef } from 'react'
import useVideoContext from '@/hooks/useVideoContext'
import MobileTimeline from '../components/timeline/MobileTimeline'

/**
 * Wraps the timeline dock.
 *  - desktop / tablet: `display: contents`, so the full <VideoTimeline/>
 *    (passed as children) stays a direct flex row of the stage column;
 *  - phone: the simplified combined strip (MobileTimeline: main track + one
 *    overlay lane, big trim handles, split, scrub by dragging) replaces it.
 *    It starts collapsed (a 44 px bar) until the user opens it, and when open
 *    is capped at 40% of the screen (see .mfa-phone-timeline in editor-theme.css).
 * The wrapper element never changes type; crossing the phone breakpoint swaps
 * only its content (all timeline state lives in the video contexts).
 */
export default function TimelineDock({
  compact,
  overlay,
  children,
}: {
  compact: boolean
  /** Phone only: floats just above the dock, i.e. over the stage's bottom edge. */
  overlay?: ReactNode
  children: ReactNode
}) {
  const { isTimelineOpen, setTimelineOpen } = useVideoContext()
  // Once the user has touched the dock, their open/closed choice wins.
  const touched = useRef(false)
  useEffect(() => {
    if (compact && isTimelineOpen && !touched.current) setTimelineOpen(false)
  }, [compact, isTimelineOpen, setTimelineOpen])

  return (
    <div
      className={compact ? 'mfa-phone-timeline' : undefined}
      style={compact ? { flex: 'none', display: 'flex', flexDirection: 'column', position: 'relative' } : { display: 'contents' }}
      onPointerDownCapture={e => {
        // taps on the floating selection strip don't count as using the dock
        if (!(e.target as HTMLElement).closest('.mfa-phone-toolbar')) touched.current = true
      }}
    >
      {compact && overlay}
      {compact ? <MobileTimeline /> : children}
    </div>
  )
}
