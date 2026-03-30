import { useEffect, useRef, useState, useCallback } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import useAppContext from '@hooks/useAppContext'
import Loading from './components/Loading'
import { editorFonts } from './constants/fonts'

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
    let cancelled = false

    const loadFonts = async () => {
      const promisesList = editorFonts.map(font => {
        return new FontFace(font.name, `url(${font.url})`, font.options as unknown as FontFaceDescriptors)
          .load()
          .catch(() => null)
      })

      try {
        const results = await Promise.all(promisesList)
        results.forEach(uniqueFont => {
          if (uniqueFont && uniqueFont.family) {
            document.fonts.add(uniqueFont)
          }
        })
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    loadFonts()

    return () => {
      cancelled = true
    }
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
