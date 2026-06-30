import { useEffect, useRef, useState, useCallback } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import useAppContext from '@hooks/useAppContext'
import Loading from './components/Loading'
import { editorFonts } from './constants/fonts'
import { loadGoogleFont } from './utils/fontLoader'

function Container({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isMobile, setIsMobile } = useAppContext()
  const [loaded, setLoaded] = useState(false)

  const updateMediaQuery = useCallback(
    (value: number) => {
      setIsMobile(value < 800)
    },
    [setIsMobile],
  )

  useEffect(() => {
    const containerElement = containerRef.current
    if (!containerElement) return undefined

    const containerWidth = containerElement.clientWidth
    updateMediaQuery(containerWidth)
    const resizeObserver = new ResizeObserver(entries => {
      const { width = containerWidth } = (entries[0] && entries[0].contentRect) || {}
      updateMediaQuery(width)
    })
    resizeObserver.observe(containerElement)
    return () => {
      resizeObserver.unobserve(containerElement)
    }
  }, [updateMediaQuery])

  useEffect(() => {
    // Preload the default fonts in the background (keyless, via google-fonts).
    // Don't block the app's loading screen on the network.
    editorFonts.forEach(name => {
      loadGoogleFont(name)
    })
    setLoaded(true)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        height: '100vh',
      }}
    >
      {loaded ? children : <Loading />}
    </div>
  )
}

export default Container
