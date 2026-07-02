import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ToasterContainer, PLACEMENT } from 'baseui/toast'
import useAppContext from '@/hooks/useAppContext'
import { useLocation, useParams, useHistory } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { getTemplates } from '@store/slices/templates/actions'
import { useAppDispatch } from '@store/store'
import useVideoContext from '@/hooks/useVideoContext'
import Navbar from './components/Navbar'
import Panels from './components/Panels'
import Toolbox from './components/Toolbox'
import Footer from './components/Footer'
import PagesBar from './components/PagesBar'
import WhiteboardToolbar from './components/WhiteboardToolbar'
import ContextMenu from './components/ContextMenu'
import VideoTimeline from './components/VideoTimeline'
import VideoCanvasPlayer from './components/VideoCanvasPlayer'
import AnimationDriver from './components/AnimationDriver'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal'
import { useCredits } from '@/contexts/CreditsContext'
import { SaveManagerContext } from '@/contexts/SaveManagerContext'
import Editor, { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { addStarterContent, StarterKind } from '@/utils/starterContent'
import { loadGoogleFont } from '@/utils/fontLoader'
import { applyWhiteboardBackground } from '@/utils/whiteboard'
import { getProject, patchProject, genProjectId } from '@/utils/projectStore'
import { createSaveManager } from '@/utils/saveManager'
import type { SaveManager } from '@/utils/saveManager'
import { log, ignoreError, fail } from '@/lib/logger'

interface CanvasObject {
  name?: string
  id?: string
  type?: string
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  fill?: string
  originX?: string
  originY?: string
  getBoundingRect: () => { left: number; top: number; width: number; height: number }
  set: (props: Record<string, unknown>) => void
  setCoords: () => void
}

interface CanvasWithExtras {
  canvas?: CanvasWithExtras
  clipPath?: CanvasObject | null
  getObjects?: () => CanvasObject[]
  getActiveObject?: () => CanvasObject | null
  requestRenderAll?: () => void
  controlsAboveOverlay?: boolean
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  off?: (event: string, handler: (...args: unknown[]) => void) => void
}

interface EditorWithCanvas {
  canvas?: CanvasWithExtras
  importFromJSON: (data: unknown) => void
  add: (options: unknown) => void
  update: (options: unknown) => void
}

function getCanvas(editor: EditorWithCanvas): CanvasWithExtras | null {
  const raw = editor.canvas as CanvasWithExtras | undefined
  return raw?.canvas || raw || null
}

/** The underlying fabric canvas (editor.handlers.canvas) — the object that
 * actually exposes toJSON/loadFromJSON/getObjects/events. getCanvas() returns a
 * wrapper that lacks toJSON, so persistence must go through this. */
function getFabricCanvas(editor: any): any {
  return editor?.handlers?.canvas || editor?.canvas?.canvas || editor?.canvas || null
}

/** Small JPEG preview of the design frame, for the dashboard cards. */
function makeThumbnail(canvas: any): string {
  try {
    const clip = canvas?.clipPath
    if (clip && typeof canvas.toCanvasElement === 'function') {
      const w = (clip.width || 0) * (clip.scaleX || 1)
      const h = (clip.height || 0) * (clip.scaleY || 1)
      if (w > 0 && h > 0) {
        const mult = Math.min(0.25, 320 / w)
        const el = canvas.toCanvasElement(mult, { left: clip.left, top: clip.top, width: w, height: h })
        if (!el || !el.toDataURL) return ''
        // Composite onto white so transparent pages (e.g. whiteboards) don't
        // come out black when encoded as JPEG.
        const out = document.createElement('canvas')
        out.width = el.width
        out.height = el.height
        const octx = out.getContext('2d')
        if (octx) {
          octx.fillStyle = '#ffffff'
          octx.fillRect(0, 0, out.width, out.height)
          octx.drawImage(el, 0, 0)
          return out.toDataURL('image/jpeg', 0.6)
        }
        return el.toDataURL('image/jpeg', 0.6)
      }
    }
    return canvas?.toDataURL ? canvas.toDataURL({ format: 'jpeg', quality: 0.5, multiplier: 0.15 }) : ''
  } catch {
    return ''
  }
}

function App() {
  const { setCurrentTemplate, setActivePanel } = useAppContext()
  const editor = useEditor() as unknown as EditorWithCanvas | null
  const location = useLocation()
  const { id: routeId } = useParams<{ id?: string }>()
  const history = useHistory()
  const frameReadyRef = useRef(true)
  const dispatch = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isWhiteboard, setIsWhiteboard] = useState(false)
  const { clips, audioClips, isTimelineOpen, restoreState } = useVideoContext()
  const { showUpgradeModal, upgradeModalData, dismissUpgradeModal } = useCredits()

  const hasTimelineContent = clips.length > 0 || audioClips.length > 0
  const shouldShowTimeline = hasTimelineContent && isTimelineOpen

  // Always-fresh refs so the (effect-scoped) auto-save persists the latest clips
  // without re-subscribing canvas listeners on every clip edit.
  const clipsRef = useRef(clips)
  clipsRef.current = clips
  const audioClipsRef = useRef(audioClips)
  audioClipsRef.current = audioClips

  // ---- Multi-page state ----------------------------------------------------
  // pagesRef is the authoritative store (mutated by autosave without re-render);
  // `pages` is the UI snapshot, refreshed on structural changes.
  type PageEntry = { id: string; json: any; thumbnail?: string }
  const [pages, setPages] = useState<PageEntry[]>([])
  const [activePage, setActivePage] = useState(0)
  const pagesRef = useRef<PageEntry[]>([])
  const activePageRef = useRef(0)
  const saveManagerRef = useRef<SaveManager | null>(null)
  const [saveManager, setSaveManager] = useState<SaveManager | null>(null)

  const refreshPages = useCallback(() => setPages([...pagesRef.current]), [])

  const persistPages = useCallback(() => {
    if (!routeId) return
    const idx = activePageRef.current
    patchProject(routeId, {
      pages: pagesRef.current,
      activePage: idx,
      json: pagesRef.current[idx]?.json ?? null,
      thumbnail: pagesRef.current[idx]?.thumbnail,
    }).catch((err) => log.warn('autosave', 'failed to persist pages after navigation', err))
    saveManagerRef.current?.markDirty()
  }, [routeId])

  // Snapshot the live canvas into the active page entry.
  const captureCurrentPage = useCallback(() => {
    const ed = editor as any
    if (!ed || !pagesRef.current.length) return
    try {
      const json = ed.exportToJSON?.()
      const cv = getFabricCanvas(editor)
      const idx = activePageRef.current
      if (json && pagesRef.current[idx]) {
        pagesRef.current[idx] = {
          ...pagesRef.current[idx],
          json,
          thumbnail: cv ? makeThumbnail(cv) : pagesRef.current[idx].thumbnail,
        }
      }
    } catch (err) {
      log.warn('editor', 'failed to capture current page snapshot before switching pages', err)
    }
  }, [editor])

  // Load a page's content into the canvas (a blank page gets a frame-only json).
  // opts let a brand-new typed page get its own frame size + starter content.
  const loadPageContent = useCallback(
    (index: number, opts?: { frame?: { width: number; height: number }; starter?: string }) => {
      const ed = editor as any
      if (!ed || index < 0 || index >= pagesRef.current.length) return
      activePageRef.current = index
      setActivePage(index)
      frameReadyRef.current = false
      const finish = () => {
        frameReadyRef.current = true
        try {
          if (opts?.frame && ed.frame?.setSize) ed.frame.setSize(opts.frame)
        } catch (err) {
          log.warn('editor', 'failed to apply frame size to new page', err)
        }
        try {
          ed.zoomToFit?.()
        } catch (err) {
          log.warn('editor', 'zoom-to-fit failed after loading page', err)
        }
        if (opts?.starter) {
          setTimeout(() => {
            const cv = getFabricCanvas(editor)
            if (cv) addStarterContent(editor, cv, opts.starter as any)
          }, 300)
        }
      }
      try {
        let json = pagesRef.current[index]?.json
        if (!json) {
          const cur = ed.exportToJSON?.()
          json = cur ? { ...cur, objects: [] } : null
        }
        if (json && ed.importFromJSON) {
          const r = ed.importFromJSON(json)
          if (r && typeof r.then === 'function') r.then(finish).catch(finish)
          else setTimeout(finish, 400)
        } else {
          finish()
        }
      } catch {
        finish()
      }
      refreshPages()
      persistPages()
    },
    [editor, refreshPages, persistPages]
  )

  const goToPage = useCallback(
    (index: number) => {
      if (index === activePageRef.current) return
      captureCurrentPage()
      loadPageContent(index)
    },
    [captureCurrentPage, loadPageContent]
  )

  const addPage = useCallback(() => {
    const ed = editor as any
    captureCurrentPage()
    let blank: any = null
    try {
      const cur = ed?.exportToJSON?.()
      blank = cur ? { ...cur, objects: [] } : null
    } catch (err) {
      log.warn('editor', 'failed to derive blank page template from current canvas', err)
    }
    pagesRef.current = [...pagesRef.current, { id: genProjectId(), json: blank }]
    loadPageContent(pagesRef.current.length - 1)
  }, [editor, captureCurrentPage, loadPageContent])

  // Add a new page of a specific design type (own size + tailored starter).
  const addPageOfType = useCallback(
    (width: number, height: number, starter?: string) => {
      captureCurrentPage()
      pagesRef.current = [...pagesRef.current, { id: genProjectId(), json: null }]
      loadPageContent(pagesRef.current.length - 1, { frame: { width, height }, starter })
    },
    [captureCurrentPage, loadPageContent]
  )

  const duplicatePage = useCallback(
    (index: number) => {
      captureCurrentPage()
      const src = pagesRef.current[index]
      const copy: PageEntry = {
        id: genProjectId(),
        json: src?.json ? JSON.parse(JSON.stringify(src.json)) : null,
        thumbnail: src?.thumbnail,
      }
      const next = [...pagesRef.current]
      next.splice(index + 1, 0, copy)
      pagesRef.current = next
      loadPageContent(index + 1)
    },
    [captureCurrentPage, loadPageContent]
  )

  const deletePage = useCallback(
    (index: number) => {
      if (pagesRef.current.length <= 1) return
      captureCurrentPage()
      const wasActive = activePageRef.current
      pagesRef.current = pagesRef.current.filter((_, i) => i !== index)
      let newActive = wasActive
      if (index < wasActive) newActive = wasActive - 1
      else if (index === wasActive) newActive = Math.min(wasActive, pagesRef.current.length - 1)
      loadPageContent(newActive)
    },
    [captureCurrentPage, loadPageContent]
  )

  // Auto-fit the design when the timeline opens/closes so it isn't left hidden
  // behind the timeline after the canvas area resizes. Uses the SDK's own
  // zoomToFit (keeps all content visible); the delays let the layout + the SDK's
  // resize observer settle before re-fitting.
  const fitDesignToView = useCallback(() => {
    try { (editor as any)?.zoomToFit?.() } catch (err) { log.warn('editor', 'zoom-to-fit failed', err) }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    const t1 = setTimeout(fitDesignToView, 300)
    const t2 = setTimeout(fitDesignToView, 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [editor, shouldShowTimeline, fitDesignToView])

  const searchParams = new URLSearchParams(location.search)
  const imgUrl = searchParams.get('img_url')
  const prebuiltJsonUrl = searchParams.get('prebuilt_json_url')

  // A plain /design (no project id, no external content) gets a fresh project id
  // pushed into the URL so the work auto-saves and survives reloads.
  useEffect(() => {
    if (!routeId && !prebuiltJsonUrl && !imgUrl) {
      history.replace(`/design/${genProjectId()}/edit`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    dispatch(getElements())
    dispatch(getFonts())
    dispatch(getTemplates())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Honour dashboard "quick start" intents: focus a tool panel (?panel=) and/or
  // drop in an image the user picked on the dashboard (sessionStorage handoff).
  useEffect(() => {
    if (!editor) return
    const panel = searchParams.get('panel')
    if (panel) {
      try {
        setActivePanel(panel as any)
      } catch (err) {
        ignoreError(err, 'unknown panel name from URL param')
      }
    }
    let pendingUpload: string | null = null
    try {
      pendingUpload = sessionStorage.getItem('mfa:pendingUpload')
      if (pendingUpload) sessionStorage.removeItem('mfa:pendingUpload')
    } catch (err) {
      ignoreError(err, 'sessionStorage unavailable')
    }
    if (pendingUpload) {
      const addWhenReady = (tries = 0) => {
        const cv = getFabricCanvas(editor)
        if (cv && cv.getObjects) {
          addObjectToCanvas(editor, { type: 'StaticImage', metadata: { src: pendingUpload } }, 600, cv)
        } else if (tries < 40) {
          setTimeout(() => addWhenReady(tries + 1), 150)
        }
      }
      // Wait for the frame/project to settle so the image lands inside it.
      setTimeout(() => addWhenReady(), 700)
    }

    // Tailored starter content (Doc / Whiteboard). Wait until the frame has been
    // sized (frameReadyRef) and the clip frame exists, so content lands inside it.
    const starter = searchParams.get('starter') as StarterKind | null
    if (starter === 'whiteboard') {
      setIsWhiteboard(true)
      if (routeId) patchProject(routeId, { kind: 'whiteboard' }).catch((err) => log.warn('autosave', 'could not persist whiteboard kind', err))
    }
    if (starter === 'doc' || starter === 'whiteboard') {
      const addStarterWhenReady = (tries = 0) => {
        const cv = getFabricCanvas(editor)
        if (frameReadyRef.current && cv && cv.clipPath) {
          addStarterContent(editor, cv, starter)
        } else if (tries < 60) {
          setTimeout(() => addStarterWhenReady(tries + 1), 150)
        }
      }
      addStarterWhenReady()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Ensure any text added (incl. on reload / page switch via importFromJSON)
  // has its Google font loaded, then re-render so it isn't shown in a fallback.
  useEffect(() => {
    if (!editor) return
    const cv = getFabricCanvas(editor)
    if (!cv?.on) return
    const onAdd = (e: any) => {
      const obj = e?.target
      if (!obj) return
      if (obj.type === 'StaticText' || obj.type === 'DynamicText' || obj.type === 'textbox') {
        const fam = obj.fontFamily || obj.metadata?.fontFamily
        if (fam) {
          loadGoogleFont(fam).then(() => {
            try {
              obj.dirty = true
              cv.requestRenderAll()
            } catch (err) {
              log.warn('editor', 'failed to re-render canvas after font load', err)
            }
          })
        }
      }
    }
    cv.on('object:added', onAdd)
    return () => {
      cv.off?.('object:added', onAdd)
    }
  }, [editor])

  // Paint the dotted whiteboard surface, but only once the frame has been sized
  // (adding the surface rect earlier would block the frame's format resize).
  useEffect(() => {
    if (!isWhiteboard || !editor) return
    const canvas = getFabricCanvas(editor)
    if (!canvas?.on) return
    const apply = () => {
      if (!frameReadyRef.current) return false
      applyWhiteboardBackground(canvas)
      return true
    }
    let tries = 0
    const iv = setInterval(() => {
      if (apply() || tries++ > 40) clearInterval(iv)
    }, 250)
    canvas.on('object:added', apply)
    return () => {
      clearInterval(iv)
      canvas.off?.('object:added', apply)
    }
  }, [isWhiteboard, editor])

  const editorConfig = useMemo(() => ({ clipToFrame: true, scrollLimit: 0 }), [])

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const imageUrl = e.dataTransfer.getData('image-url')
    if (!imageUrl || !editor) return
    const canvas = (editor as any).canvas?.canvas || (editor as any).canvas
    if (!canvas) return
    addObjectToCanvas(editor, {
      type: 'StaticImage',
      metadata: { src: imageUrl },
    }, 400, canvas)
  }, [editor])

  const loadFonts = useCallback((fonts: Array<{ name: string; url: string; options: FontFaceDescriptors }>) => {
    const promisesList = fonts.map(font => {
      return new FontFace(font.name, `url(${font.url})`, font.options).load().catch(() => null)
    })
    return Promise.all(promisesList).then(res => {
      res.forEach(uniqueFont => {
        if (uniqueFont && uniqueFont.family) {
          document.fonts.add(uniqueFont)
        }
      })
    })
  }, [])

  const handleLoadTemplate = useCallback(
    async (template: { objects: Array<{ type: string; metadata: { fontFamily: string; fontURL: string } }> }) => {
      const fonts: Array<{ name: string; url: string; options: FontFaceDescriptors }> = []
      template.objects.forEach(object => {
        if (object.type === 'StaticText' || object.type === 'DynamicText') {
          fonts.push({
            name: object.metadata.fontFamily,
            url: object.metadata.fontURL,
            options: { style: 'normal', weight: '400' } as FontFaceDescriptors,
          })
        }
      })

      const filteredFonts = fonts.filter(f => !!f.url)
      if (filteredFonts.length > 0) {
        await loadFonts(filteredFonts)
      }

      editor?.importFromJSON(template)
    },
    [editor, loadFonts],
  )

  const handleLoadImageTemplate = useCallback(
    (imageUrl: string) => {
      if (!editor) return
      try {
        const imageOptions = {
          type: 'StaticImage',
          metadata: { src: imageUrl },
        }
        editor.add(imageOptions)
      } catch (err) {
        setLoadError('Failed to load image onto canvas')
      }
    },
    [editor],
  )

  useEffect(() => {
    if (!editor || hasInitialized) return
    setHasInitialized(true)

    const canvas = getCanvas(editor)
    if (!canvas) return

    if (prebuiltJsonUrl) {
      fetch(prebuiltJsonUrl)
        .then(res => res.json())
        .then(template => {
          setCurrentTemplate(template)
          handleLoadTemplate(template)
        })
        .catch(() => {
          setLoadError('Failed to load template from URL')
        })
    } else if (imgUrl) {
      handleLoadImageTemplate(imgUrl)
    } else if (routeId) {
      // Restore a saved design from local storage (IndexedDB). Pause auto-save
      // (frameReadyRef) until the frame is settled, so it can't persist the
      // editor's default 1280x720 frame before the chosen format is applied.
      frameReadyRef.current = false
      getProject(routeId)
        .then(project => {
          const ed = editor as any
          const restoreCanvas = getFabricCanvas(editor)
          // Apply the chosen format size with setSize() (resizes BOTH frame and
          // background — update() leaves the background, stacking a 2nd rect).
          // Only while the design is still blank, so real content / a user resize wins.
          const applyFormatIfBlank = () => {
            const frame = project?.frame
            if (!frame) {
              frameReadyRef.current = true
              return
            }
            let tries = 0
            const tryApply = () => {
              const objs = getFabricCanvas(editor)?.getObjects?.() || []
              const hasFrame = objs.some((o: any) => o && o.type === 'Frame')
              const userObjs = objs.filter((o: any) => o && o.type !== 'Frame' && o.type !== 'Background').length
              if (hasFrame && ed?.frame?.setSize) {
                if (userObjs === 0) {
                  try {
                    ed.frame.setSize(frame)
                  } catch (err) {
                    log.warn('editor', 'failed to apply saved frame size on restore', err)
                  }
                }
                frameReadyRef.current = true
              } else if (tries++ < 40) {
                setTimeout(tryApply, 100)
              } else {
                frameReadyRef.current = true
              }
            }
            tryApply()
          }

          // Reattach the video metadata scenify's exportToJSON discards, then push
          // the persisted clips back into VideoContext — so a reloaded design keeps
          // its timeline and live video instead of degrading to a static poster.
          const restoreVideoClips = () => {
            const savedClips: any[] = (project as any)?.clips || []
            const savedAudio: any[] = (project as any)?.audioClips || []
            if (!savedClips.length && !savedAudio.length) return
            let tries = 0
            const attempt = () => {
              const cv = getFabricCanvas(editor)
              const objs: any[] = cv?.getObjects?.() || []
              const staticImgs = objs.filter(o => o && o.type === 'StaticImage')
              // Wait for the imported objects to materialize before matching them.
              if (savedClips.length && staticImgs.length === 0 && tries++ < 40) {
                setTimeout(attempt, 150)
                return
              }
              savedClips.forEach(clip => {
                // Match the backing canvas object: by its stable id, else by the
                // identical poster data-URL, else the first unclaimed StaticImage.
                let obj = objs.find(o => !o.__videoRelinked && clip.canvasObjectId && o.id === clip.canvasObjectId)
                if (!obj) obj = objs.find(o => !o.__videoRelinked && clip.poster && o.metadata?.src && o.metadata.src === clip.poster)
                if (!obj) obj = objs.find(o => !o.__videoRelinked && o.type === 'StaticImage' && !o.metadata?.isVideo)
                if (!obj) return
                obj.__videoRelinked = true
                if (!obj.metadata) obj.metadata = {}
                obj.metadata.isVideo = true
                obj.metadata.videoSrc = clip.src
                obj.metadata.id = clip.id
                obj.metadata.name = clip.name
                obj.metadata.duration = clip.duration
                if (!clip.poster && obj.metadata.src) clip.poster = obj.metadata.src
                obj.id = clip.id
                try { obj.set('selectable', false); obj.set('hasControls', false); obj.set('hasBorders', false) } catch (err) { log.warn('editor', 'failed to lock relinked video object controls', err) }
              })
              cv?.requestRenderAll?.()
              restoreState(savedClips as any, savedAudio as any)
            }
            attempt()
          }

          // Initialise multi-page state. Legacy single-page projects (no `pages`)
          // are migrated to a single page wrapping their json.
          const initialPages: PageEntry[] =
            project?.pages && project.pages.length
              ? project.pages
              : [{ id: genProjectId(), json: project?.json ?? null, thumbnail: project?.thumbnail }]
          const initActive = Math.min(Math.max(0, project?.activePage ?? 0), initialPages.length - 1)
          pagesRef.current = initialPages
          activePageRef.current = initActive
          setActivePage(initActive)
          setPages([...initialPages])
          if (project?.kind === 'whiteboard') setIsWhiteboard(true)

          const json = initialPages[initActive]?.json
          // Defensively drop any null/undefined/typeless objects — a single bad
          // entry makes scenify's objectToFabric throw "reading 'type' of
          // undefined" and aborts the whole restore.
          if (json && Array.isArray(json.objects)) {
            json.objects = json.objects.filter((o: any) => o && o.type)
          }
          if (json && json.frame && typeof ed.importFromJSON === 'function') {
            // scenify template format (new saves) — rebuilds frame, clip, zoom & animations.
            try {
              const r = ed.importFromJSON(json)
              const done = () => {
                frameReadyRef.current = true
                restoreVideoClips()
                // Re-fit after the design is in place (the SDK's own fit-on-load
                // runs before the layout settles, leaving it off-centre/clipped).
                setTimeout(fitDesignToView, 450)
              }
              if (r && typeof r.then === 'function') r.then(done).catch(done)
              else setTimeout(done, 500)
            } catch {
              frameReadyRef.current = true
            }
          } else if (json && restoreCanvas?.loadFromJSON) {
            // legacy fabric-format json — fallback restore.
            restoreCanvas.loadFromJSON(json, () => {
              restoreCanvas.renderAll?.()
              try {
                ed.zoomToFit?.()
              } catch (err) {
                log.warn('editor', 'zoom-to-fit failed after legacy restore', err)
              }
              applyFormatIfBlank()
              restoreVideoClips()
            })
          } else {
            applyFormatIfBlank()
          }
        })
        .catch(() => {
          frameReadyRef.current = true
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Auto-save via saveManager: content-hash change detection, a status chip,
  // retry/backoff, and unload-time recovery snapshots (replaces the old inline
  // length-signature loop). All editor-specific serialization stays here.
  useEffect(() => {
    if (!editor || !routeId) return
    const buildSerialize = () => {
      if (!frameReadyRef.current) return null
      const ed = editor as any
      // Use scenify's exportToJSON (frame + objects + background) so importFromJSON
      // can rebuild the design — frame, clipping, zoom and animations — on restore.
      const json = typeof ed.exportToJSON === 'function' ? ed.exportToJSON() : null
      if (!json) return null
      const objs = json.objects || []
      const cv = getFabricCanvas(editor)
      const liveObjs: any[] = cv?.getObjects?.() || []
      // Persist the timeline clips with the design. exportToJSON strips our video
      // metadata and clips live only in React state, so without this a reload
      // loses the timeline and the video reverts to a static image. Tag each clip
      // with its canvas object id so it can be relinked to its object on load.
      const clipsToSave = clipsRef.current.map(c => {
        const obj = liveObjs.find(o => o.metadata?.id === c.id || o.id === c.id)
        return { ...c, canvasObjectId: obj?.id || (c as any).canvasObjectId }
      })
      const audioToSave = audioClipsRef.current
      const clipSig = clipsToSave.map(c => `${c.id}:${c.start}:${c.duration}:${c.canvasObjectId || ''}`).join(',')
      const audioSig = audioToSave.map((a: any) => `${a.id}:${a.start}:${a.duration}:${a.volume}`).join(',')
      // changeKey hashes CONTENT (objects JSON), not byte-length — catches
      // same-length edits the old signature skipped.
      const changeKey = JSON.stringify(objs) + '|' + clipSig + '|' + audioSig
      // Write the live canvas into the active page, then persist the whole
      // pages array so multi-page designs survive reloads.
      const thumb = cv ? makeThumbnail(cv) : undefined
      if (pagesRef.current.length === 0) pagesRef.current = [{ id: genProjectId(), json: null }]
      const idx = Math.min(activePageRef.current, pagesRef.current.length - 1)
      pagesRef.current[idx] = { ...pagesRef.current[idx], json, thumbnail: thumb }
      return {
        payload: { pages: pagesRef.current, activePage: idx, json, clips: clipsToSave, audioClips: audioToSave, thumbnail: thumb },
        changeKey,
      }
    }

    let escalated = false
    const manager = createSaveManager({
      serialize: buildSerialize,
      persist: (payload) => patchProject(routeId, payload).then(() => undefined),
      projectId: routeId,
      onEscalate: (msg) => { if (!escalated) { escalated = true; fail('autosave', msg) } },
    })
    saveManagerRef.current = manager
    setSaveManager(manager)
    const removeUnload = manager.installUnloadHandlers()

    const cv = getFabricCanvas(editor)
    const onChange = () => manager.markDirty()
    cv?.on?.('object:added', onChange)
    cv?.on?.('object:modified', onChange)
    cv?.on?.('object:removed', onChange)

    return () => {
      removeUnload()
      cv?.off?.('object:added', onChange)
      cv?.off?.('object:modified', onChange)
      cv?.off?.('object:removed', onChange)
      manager.dispose()
      saveManagerRef.current = null
      setSaveManager(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, routeId])

  // Constrain objects to stay within canvas bounds
  useEffect(() => {
    if (!editor) return

    const canvas = getCanvas(editor)
    if (!canvas) return

    const getFrameBounds = () => {
      const clipPath = canvas.clipPath
      if (clipPath) {
        const frameLeft = clipPath.left || 175.5
        const frameTop = clipPath.top || -286.5
        const frameWidth = clipPath.width || 900
        const frameHeight = clipPath.height || 1200
        return { frameLeft, frameTop, frameRight: frameLeft + frameWidth, frameBottom: frameTop + frameHeight }
      }

      const objects = canvas.getObjects?.() || []
      const clipObj = objects.find((o: CanvasObject) => o.name === 'clip' || o.id === 'clip')
      if (!clipObj) return null

      const frameLeft = clipObj.left || 175.5
      const frameTop = clipObj.top || -286.5
      const frameWidth = (clipObj.width || 900) * (clipObj.scaleX || 1)
      const frameHeight = (clipObj.height || 1200) * (clipObj.scaleY || 1)
      return { frameLeft, frameTop, frameRight: frameLeft + frameWidth, frameBottom: frameTop + frameHeight }
    }

    const constrainObject = (obj: CanvasObject) => {
      if (!obj || obj.name === 'clip' || obj.id === 'clip') return

      try {
        const bounds = getFrameBounds()
        if (!bounds) return

        const { frameLeft, frameTop, frameRight, frameBottom } = bounds
        const boundingRect = obj.getBoundingRect()

        let deltaX = 0
        let deltaY = 0

        if (boundingRect.left < frameLeft) {
          deltaX = frameLeft - boundingRect.left
        } else if (boundingRect.left + boundingRect.width > frameRight) {
          deltaX = frameRight - (boundingRect.left + boundingRect.width)
        }

        if (boundingRect.top < frameTop) {
          deltaY = frameTop - boundingRect.top
        } else if (boundingRect.top + boundingRect.height > frameBottom) {
          deltaY = frameBottom - (boundingRect.top + boundingRect.height)
        }

        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          const currentLeft = (obj.left || 0) as number
          const currentTop = (obj.top || 0) as number
          obj.set({ left: currentLeft + deltaX, top: currentTop + deltaY })
          obj.setCoords()
          canvas.requestRenderAll?.()
        }
      } catch (err) {
        ignoreError(err, 'canvas not ready for constrain pass')
      }
    }

    const setupClipping = () => {
      try {
        const objects = canvas.getObjects?.() || []
        const clipObj = objects.find(
          (obj: CanvasObject) =>
            obj.id === 'clip' ||
            obj.name === 'clip' ||
            obj.type === 'Frame' ||
            (obj.type === 'Rect' && (obj.fill === '#ffffff' || obj.fill === 'white') && (obj.width || 0) >= 400),
        )
        if (!clipObj) return

        const w = (clipObj.width || 0) * (clipObj.scaleX || 1)
        const h = (clipObj.height || 0) * (clipObj.scaleY || 1)
        let l = clipObj.left || 0
        let t = clipObj.top || 0
        if (clipObj.originX === 'center') l -= w / 2
        if (clipObj.originY === 'center') t -= h / 2

        // Reuse the existing clip rect and bail when the frame geometry is
        // unchanged. setupClipping runs on frequent canvas events; without this
        // guard it allocated a new fabric.Rect and forced a render every time.
        // (The after:render binding that turned this into a permanent ~60fps
        // render loop has also been removed below.)
        const existing = (canvas as any).clipPath as fabric.Rect | undefined
        if (
          existing &&
          Math.abs((existing.left || 0) - l) < 0.5 &&
          Math.abs((existing.top || 0) - t) < 0.5 &&
          Math.abs((existing.width || 0) - w) < 0.5 &&
          Math.abs((existing.height || 0) - h) < 0.5
        ) {
          return
        }

        if (existing && typeof existing.set === 'function') {
          existing.set({ left: l, top: t, width: w, height: h })
          existing.setCoords?.()
        } else {
          ;(canvas as any).clipPath = new fabric.Rect({
            left: l,
            top: t,
            width: w,
            height: h,
            absolutePositioned: true,
            selectable: false,
            evented: false,
            fill: 'transparent',
          })
        }
        ;(canvas as any).controlsAboveOverlay = true
        canvas.requestRenderAll?.()
      } catch (err) {
        log.warn('editor', 'frame clipping setup failed', err)
      }
    }

    const onMoving = () => {
      const activeObj = canvas.getActiveObject?.()
      if (activeObj) constrainObject(activeObj as CanvasObject)
      setupClipping()
    }

    canvas.on?.('object:moving', onMoving)
    canvas.on?.('object:modified', setupClipping)
    canvas.on?.('object:scaling', setupClipping)
    canvas.on?.('object:added', setupClipping)
    canvas.on?.('object:removed', setupClipping)

    setupClipping()

    return () => {
      canvas.off?.('object:moving', onMoving)
      canvas.off?.('object:modified', setupClipping)
      canvas.off?.('object:scaling', setupClipping)
      canvas.off?.('object:added', setupClipping)
      canvas.off?.('object:removed', setupClipping)
    }
  }, [editor])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        fontFamily: "'Inter', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <ToasterContainer placement={PLACEMENT.bottomRight} autoHideDuration={4500} />
      <div style={{ position: 'relative', zIndex: 100 }}>
        <SaveManagerContext.Provider value={saveManager}>
          <Navbar />
        </SaveManagerContext.Provider>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ErrorBoundary fallback={<div style={{ padding: 20, color: '#ef4444' }}>Panel failed to load</div>}>
          <Panels />
        </ErrorBoundary>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <ErrorBoundary fallback={<div style={{ padding: 10, color: '#ef4444' }}>Toolbar error</div>}>
            <Toolbox />
          </ErrorBoundary>
          <div
            style={{
              flex: 1,
              display: 'flex',
              backgroundColor: '#f1f2f6',
              backgroundImage: isWhiteboard ? 'radial-gradient(#b3bcc9 2.2px, transparent 2.2px)' : undefined,
              backgroundSize: isWhiteboard ? '26px 26px' : undefined,
              position: 'relative',
              overflow: 'hidden',
              paddingBottom: shouldShowTimeline ? '300px' : '0',
            }}
            className="canvas-container"
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {isWhiteboard && <WhiteboardToolbar editor={editor} />}
            {loadError ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: '#ef4444',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p>{loadError}</p>
                <button
                  onClick={() => setLoadError(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <Editor config={editorConfig} />
            )}
            <AnimationDriver />
            <VideoCanvasPlayer />
            <ErrorBoundary fallback={null}>
              <VideoTimeline />
            </ErrorBoundary>
          </div>
          <ErrorBoundary fallback={null}>
            <PagesBar
              pages={pages}
              activePage={activePage}
              onSelect={goToPage}
              onAdd={addPage}
              onAddTyped={addPageOfType}
              onDuplicate={duplicatePage}
              onDelete={deletePage}
            />
          </ErrorBoundary>
          <Footer />
        </div>
      </div>
      <ContextMenu />
      <InsufficientCreditsModal
        isOpen={showUpgradeModal}
        onClose={dismissUpgradeModal}
        balance={upgradeModalData?.balance || 0}
        cost={upgradeModalData?.cost || 0}
      />
    </div>
  )
}

export default App
