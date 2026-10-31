import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { ToasterContainer, PLACEMENT } from 'baseui/toast'
import useAppContext from '@/hooks/useAppContext'
import { useLocation, useParams, useHistory } from 'react-router'
import { getElements } from '@store/slices/elements/actions'
import { getFonts } from '@store/slices/fonts/actions'
import { getTemplates } from '@store/slices/templates/actions'
import { useAppDispatch } from '@store/store'
import { useVideoProject } from '@/video/VideoProjectContext'
import { isEmptyProject, VideoProject } from '@/video/model'
import { relinkVideoObjects, videoProjectFromSave } from '@/video/legacy'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PagesBar from './components/PagesBar'
import WhiteboardToolbar from './components/WhiteboardToolbar'
import ContextMenu from './components/ContextMenu'
import VideoTimeline from './components/VideoTimeline'
import VideoEngine from '@/video/VideoEngine'
import Rulers from './components/Rulers'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal'
import { useCredits } from '@/contexts/CreditsContext'
import { SaveManagerContext } from '@/contexts/SaveManagerContext'
import Editor, { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { fabric } from 'fabric'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { addStarterContent, StarterKind } from '@/utils/starterContent'
import { applyTemplate } from '@/utils/applyTemplate'
import { isImageObject, removeImageBackground } from '@/utils/imageEdits'
import { showImageProcessingOverlay } from '@/utils/progressOverlay'
import { notify } from '@/lib/notify'
import { SubMenuType } from '@/constants/editor'
import api from '@services/api'
import { loadGoogleFont } from '@/utils/fontLoader'
import { applyWhiteboardBackground } from '@/utils/whiteboard'
import { getProject, patchProject, genProjectId } from '@/utils/projectStore'
import { fetchDesignProject, isUuid, markLoadedFromServer, setServerBaseline, contentHashOf } from '@/services/designProjects'
import { resolveEditorSession, isDemoRequest } from '@/lib/workspaceContext'
import { createSaveManager, readRecovery, clearRecovery } from '@/utils/saveManager'
import type { SaveManager } from '@/utils/saveManager'
import { log, ignoreError, fail } from '@/lib/logger'
import { color } from '@/theme/tokens'
import { resizeDesign } from '@/utils/magicResize'
import useCanvasEnhancements from '@/hooks/useCanvasEnhancements'
import { PageActionsContext } from '@/contexts/PageActionsContext'
import { startAutoVersions, versionProjectKey } from '@/utils/versions'
import type { DesignSnapshot } from '@/utils/versions'
import { commentsForPage, installCommentExport, withComments } from '@/utils/comments'
import type { DesignComment } from '@/utils/comments'
import useBreakpoint from '@/hooks/useBreakpoint'
import ResponsiveEditorLayout from './mobile/ResponsiveEditorLayout'
import '@/styles/editor-theme.css'

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
        // toCanvasElement crops in screen pixels and keeps the current zoom/pan,
        // so map the page's scene rect through the viewport transform first.
        const vp = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
        const zoom = vp[0] || 1
        const mult = Math.min(320, w) / (w * zoom)
        // Off-screen culling uses cached object coords, which go stale for
        // objects the SDK repositions on load — they'd vanish from the preview.
        const skip = canvas.skipOffscreen
        canvas.skipOffscreen = false
        let el: any
        try {
          el = canvas.toCanvasElement(mult, {
            left: vp[4] + clip.left * zoom,
            top: vp[5] + clip.top * zoom,
            width: w * zoom,
            height: h * zoom,
          })
        } finally {
          canvas.skipOffscreen = skip
        }
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
  const { setCurrentTemplate, setActivePanel, setActiveSubMenu } = useAppContext()
  const editor = useEditor() as unknown as EditorWithCanvas | null
  const location = useLocation()
  const { id: routeId } = useParams<{ id?: string }>()
  const history = useHistory()
  const frameReadyRef = useRef(true)
  const dispatch = useAppDispatch()
  const [hasInitialized, setHasInitialized] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isWhiteboard, setIsWhiteboard] = useState(false)
  const videoProject = useVideoProject()
  const { showUpgradeModal, upgradeModalData, dismissUpgradeModal } = useCredits()
  const phoneLayout = useBreakpoint() === 'phone'

  // One fit once a loaded design is in place; later size changes are handled
  // by useStageViewport (fit mode only).
  const fitDesignToView = useCallback(() => {
    try {
      ;(editor as any)?.zoomToFit?.()
    } catch (err) {
      log.warn('editor', 'zoom-to-fit failed', err)
    }
  }, [editor])

  // Always-fresh ref so the (effect-scoped) load/auto-save code reaches the
  // live video project without re-subscribing canvas listeners on every edit.
  const videoProjectRef = useRef(videoProject)
  videoProjectRef.current = videoProject

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
    (index: number, opts?: { frame?: { width: number; height: number }; starter?: string; afterLoad?: () => void }) => {
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
        if (opts?.afterLoad) {
          try {
            opts.afterLoad()
          } catch (err) {
            log.warn('editor', 'post-load page hook failed', err)
          }
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

  // Magic Resize "copy & resize": duplicate the active page, then re-flow it.
  const copyAndResize = useCallback(
    (size: { width: number; height: number }) => {
      captureCurrentPage()
      const index = activePageRef.current
      const src = pagesRef.current[index]
      const copy: PageEntry = {
        id: genProjectId(),
        json: src?.json ? JSON.parse(JSON.stringify(src.json)) : null,
      }
      const next = [...pagesRef.current]
      next.splice(index + 1, 0, copy)
      pagesRef.current = next
      loadPageContent(index + 1, { afterLoad: () => resizeDesign(editor, size, true) })
    },
    [editor, captureCurrentPage, loadPageContent]
  )

  // Export: load each requested page in turn, call `render` once it has settled,
  // and always return to the page the user was on (even on failure/timeout).
  const renderPages = useCallback(
    async <T,>(indices: number[], render: (index: number, position: number) => Promise<T> | T): Promise<T[]> => {
      if (indices.some(i => i < 0 || i >= pagesRef.current.length)) throw new Error('Page selection is out of range')
      const showPage = (index: number) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Page ${index + 1} took too long to load`)), 8000)
          loadPageContent(index, {
            afterLoad: () => {
              clearTimeout(timer)
              setTimeout(resolve, 150) // let images/fonts paint
            },
          })
        })
      const original = activePageRef.current
      captureCurrentPage()
      const results: T[] = []
      try {
        for (let pos = 0; pos < indices.length; pos++) {
          if (indices[pos] !== activePageRef.current) await showPage(indices[pos])
          results.push(await render(indices[pos], pos))
        }
        return results
      } finally {
        if (activePageRef.current !== original) {
          await showPage(original).catch(err => log.warn('export', 'could not return to the original page after export', err))
        }
      }
    },
    [captureCurrentPage, loadPageContent]
  )

  // Version history: deep-copied snapshot of every page (live canvas captured
  // first). Null while a page is still loading so a half-imported canvas is
  // never versioned.
  const snapshot = useCallback((): DesignSnapshot | null => {
    if (!frameReadyRef.current || !pagesRef.current.length) return null
    captureCurrentPage()
    return { pages: JSON.parse(JSON.stringify(pagesRef.current)), activePage: activePageRef.current }
  }, [captureCurrentPage])

  const restoreSnapshot = useCallback(
    (s: DesignSnapshot) => {
      if (!s?.pages?.length) return
      pagesRef.current = JSON.parse(JSON.stringify(s.pages))
      loadPageContent(Math.min(Math.max(0, s.activePage || 0), pagesRef.current.length - 1)) // also persists
      saveManagerRef.current?.markDirty()
    },
    [loadPageContent]
  )

  // Comments live in each page's json.metadata.comments (see utils/comments.ts).
  const getComments = useCallback((pageIndex: number): DesignComment[] => {
    const entry = pagesRef.current[pageIndex]
    if (!entry) return []
    return commentsForPage(entry.json?.metadata?.comments, entry.id, pagesRef.current.map(p => p.id))
  }, [])

  const setComments = useCallback(
    (pageIndex: number, comments: DesignComment[]) => {
      if (pageIndex === activePageRef.current && frameReadyRef.current) captureCurrentPage()
      const entry = pagesRef.current[pageIndex]
      if (!entry?.json) {
        log.warn('comments', `page ${pageIndex + 1} has no content yet — comment not stored`)
        return
      }
      const stamped = comments.map(c => (c.pageId === entry.id ? c : { ...c, pageId: entry.id }))
      pagesRef.current[pageIndex] = { ...entry, json: withComments(entry.json, stamped) }
      persistPages()
    },
    [captureCurrentPage, persistPages]
  )

  // scenify's exportToJSON rebuilds `metadata`, dropping comments; re-inject the
  // active page's so autosave, page switches and the server save keep them.
  useEffect(() => installCommentExport(editor, () => getComments(activePageRef.current)), [editor, getComments])
  // Auto versions every 10 min while the design changed.
  useEffect(() => startAutoVersions(versionProjectKey(routeId), snapshot), [routeId, snapshot])

  const pageActions = useMemo(
    () => ({ pageCount: pages.length, activePage, goToPage, copyAndResize, renderPages, snapshot, restoreSnapshot, getComments, setComments }),
    [pages.length, activePage, goToPage, copyAndResize, renderPages, snapshot, restoreSnapshot, getComments, setComments]
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


  const searchParams = new URLSearchParams(location.search)
  const imgUrl = searchParams.get('img_url')
  const prebuiltJsonUrl = searchParams.get('prebuilt_json_url')

  // A plain /design (no project id, no external content) gets a fresh project id
  // pushed into the URL so the work auto-saves and survives reloads. Keep the
  // query string: save-time code reads ?workspace_id/&embed/&demo from
  // window.location.search (resolveEditorSession), so dropping it here would
  // silently save fresh embed designs into the wrong workspace.
  useEffect(() => {
    if (!routeId && !prebuiltJsonUrl && !imgUrl) {
      history.replace(`/design/${genProjectId()}/edit${window.location.search}`)
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
    // Once the uploaded photo has loaded: centre it on the page (it was placed
    // before its height was known), select it, and run a dashboard quick edit
    // (?tool=) — background removal or Magic Eraser.
    const placeUpload = (cv: any, before: Set<any>, tool: string | null, tries = 0) => {
      const img = cv.getObjects().find((o: any) => !before.has(o) && isImageObject(o))
      if (!img) {
        if (tries < 60) setTimeout(() => placeUpload(cv, before, tool, tries + 1), 150)
        return
      }
      const page = cv.clipPath?.getBoundingRect?.(true, true)
      const box = img.getBoundingRect(true, true)
      if (page && box) {
        img.set({
          left: img.left + page.left + page.width / 2 - (box.left + box.width / 2),
          top: img.top + page.top + page.height / 2 - (box.top + box.height / 2),
        })
        img.setCoords()
      }
      cv.setActiveObject(img)
      cv.requestRenderAll()
      if (!tool) return
      if (tool === 'magic-eraser') {
        setActiveSubMenu(SubMenuType.MAGIC_ERASER)
        return
      }
      const overlay = showImageProcessingOverlay(cv, img, 'Removing background')
      removeImageBackground(cv, img, (ratio: number, stage: string) => overlay.update(ratio, stage))
        .then(() => notify('Background removed', 'positive'))
        .catch((e: any) => notify(e?.message ? `Background removal failed: ${e.message}` : 'Background removal failed', 'negative'))
        .finally(() => overlay.close())
    }
    if (pendingUpload) {
      const addWhenReady = (tries = 0) => {
        const cv = getFabricCanvas(editor)
        if (cv && cv.getObjects) {
          // The design was sized to the photo, so the photo fills the page.
          const frameW = (cv.clipPath?.width || 600) * (cv.clipPath?.scaleX || 1)
          const before = new Set(cv.getObjects())
          addObjectToCanvas(editor, { type: 'StaticImage', metadata: { src: pendingUpload } }, frameW, cv)
          const tool = searchParams.get('tool')
          placeUpload(cv, before, tool === 'remove-bg' || tool === 'magic-eraser' ? tool : null)
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

    // Template picked on the dashboard (?template=<id>). Applied once the frame
    // is sized; the param is then dropped so a reload keeps the user's edits.
    const templateId = searchParams.get('template')
    if (templateId) {
      api
        .getTemplates()
        .then(list => {
          const tpl = list.find(t => String(t.id) === templateId)
          if (!tpl) return
          const applyWhenReady = (tries = 0) => {
            const cv = getFabricCanvas(editor)
            if (frameReadyRef.current && cv && cv.clipPath) {
              applyTemplate(editor, tpl).catch(err => log.warn('templates', 'dashboard template failed to load', err))
              const params = new URLSearchParams(location.search)
              params.delete('template')
              const q = params.toString()
              history.replace({ pathname: location.pathname, search: q ? `?${q}` : '' })
            } else if (tries < 60) {
              setTimeout(() => applyWhenReady(tries + 1), 150)
            }
          }
          applyWhenReady()
        })
        .catch(err => log.warn('templates', 'template list failed to load', err))
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

  // The SDK hardcodes a cool-grey backdrop; swap in the warm brand one. Only the
  // SDK default is replaced so whiteboard's dot pattern is left alone.
  useCanvasEnhancements(editor)

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
      // Pause auto-save (frameReadyRef) until the frame is settled, so it can't
      // persist the editor's default 1280x720 frame before the chosen format is
      // applied. Authoritative load order: design_projects (server) →
      // IndexedDB (incl. recovery snapshot) → blank. IndexedDB autosave keeps
      // running for server-backed designs too (crash recovery).
      frameReadyRef.current = false

      // Server-backed design (UUID route ids come from the app's project grid).
      // Resolves true when handled (loaded or redirecting to login); false lets
      // the local IndexedDB restore below take over.
      const loadRemoteDesign = async (): Promise<boolean> => {
        const session = await resolveEditorSession()
        if (!session) return true // resolveEditorSession is redirecting to login
        const result = await fetchDesignProject(routeId)
        if (!result.ok) {
          // Transient fetch error: do NOT mark the id as loaded-from-server —
          // a later save must INSERT a copy rather than blindly UPDATE (and
          // possibly blank-overwrite) a row we never saw. Warn, then fall
          // through to the local IndexedDB restore.
          fail('editor', "Couldn't load this design — a new copy will be created if you save")
          return false
        }
        const record = result.record
        if (!record) return false // genuinely no row — local restore; save will INSERT
        // Confirmed to exist on the server: saves may UPDATE this id in place.
        markLoadedFromServer(routeId)
        const ed = editor as any
        // Seed the navbar name from the saved record (Navbar mirrors
        // currentTemplate.name into its name input).
        setCurrentTemplate(prev => ({ ...(prev ?? {}), name: record.name || 'Untitled design' }))
        const json: any = record.design_json ?? null
        // Defensively drop null/typeless objects (same guard as the local restore).
        if (json && Array.isArray(json.objects)) {
          json.objects = json.objects.filter((o: any) => o && o.type)
        }
        const initialPages: PageEntry[] = [{ id: genProjectId(), json }]
        pagesRef.current = initialPages
        activePageRef.current = 0
        setActivePage(0)
        setPages([...initialPages])
        // The server copy carries the video project inside its design JSON.
        videoProjectRef.current.restore(videoProjectFromSave(null, json))
        if (json && json.frame && typeof ed.importFromJSON === 'function') {
          // Same scenify import the local restore below uses — rebuilds frame,
          // clipping, zoom & animations.
          try {
            const r = ed.importFromJSON(json)
            const done = () => {
              frameReadyRef.current = true
              requestAnimationFrame(fitDesignToView)
              // Baseline for the navbar's unsaved-changes check, captured in
              // exportToJSON space (the import normalizes objects, so hashing
              // the raw record json would always read as "dirty").
              try {
                const exported = ed.exportToJSON?.()
                if (exported) setServerBaseline(routeId, contentHashOf(exported))
              } catch (err) {
                ignoreError(err, 'unsaved-changes baseline is best-effort')
              }
            }
            if (r && typeof r.then === 'function') r.then(done).catch(done)
            else setTimeout(done, 500)
          } catch {
            frameReadyRef.current = true
          }
        } else {
          frameReadyRef.current = true
        }
        return true
      }

      // Restore a saved design from local storage (IndexedDB).
      const restoreFromLocal = () => getProject(routeId)
        .then(project => {
          const ed = editor as any
          const restoreCanvas = getFabricCanvas(editor)
          // If a recovery snapshot (written on the last tab-close while dirty) is
          // newer than the persisted project, offer to restore it. Merge it OVER
          // the project so frame/kind (which the snapshot doesn't capture) come
          // from the saved project while the fresher content wins. Decline clears
          // the stale snapshot so it isn't re-offered.
          const snap = readRecovery(routeId)
          const projectUpdatedAt = (project as any)?.updatedAt || 0
          const useSnapshot =
            !!snap && snap.savedAt > projectUpdatedAt &&
            // eslint-disable-next-line no-restricted-globals
            window.confirm('You have unsaved changes from your last session. Restore them?')
          if (snap && !useSnapshot) clearRecovery(routeId)
          const source: any = useSnapshot ? { ...project, ...snap!.payload } : project
          // Apply the chosen format size with setSize() (resizes BOTH frame and
          // background — update() leaves the background, stacking a 2nd rect).
          // Only while the design is still blank, so real content / a user resize wins.
          const applyFormatIfBlank = () => {
            const frame = source?.frame
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

          // Video project: the v1 `video` record (else migrated from the old
          // clips/audioClips) is restored BEFORE the canvas import so media binds
          // as objects arrive; afterwards clips whose object lost its id in an
          // old save are re-attached by poster.
          const restoreVideoClips = () => {
            const api = videoProjectRef.current
            relinkVideoObjects(() => getFabricCanvas(editor), api.getProject, api.dispatchSilently)
          }

          // Initialise multi-page state. Legacy single-page projects (no `pages`)
          // are migrated to a single page wrapping their json.
          const initialPages: PageEntry[] =
            source?.pages && source.pages.length
              ? source.pages
              : [{ id: genProjectId(), json: source?.json ?? null, thumbnail: source?.thumbnail }]
          const initActive = Math.min(Math.max(0, source?.activePage ?? 0), initialPages.length - 1)
          pagesRef.current = initialPages
          activePageRef.current = initActive
          setActivePage(initActive)
          setPages([...initialPages])
          if (source?.kind === 'whiteboard') setIsWhiteboard(true)

          const json = initialPages[initActive]?.json
          // Defensively drop any null/undefined/typeless objects — a single bad
          // entry makes scenify's objectToFabric throw "reading 'type' of
          // undefined" and aborts the whole restore.
          if (json && Array.isArray(json.objects)) {
            json.objects = json.objects.filter((o: any) => o && o.type)
          }
          videoProjectRef.current.restore(videoProjectFromSave(source, json))
          if (json && json.frame && typeof ed.importFromJSON === 'function') {
            // scenify template format (new saves) — rebuilds frame, clip, zoom & animations.
            try {
              const r = ed.importFromJSON(json)
              const done = () => {
                frameReadyRef.current = true
                restoreVideoClips()
                // Re-fit after the design is in place (the SDK's own fit-on-load
                // runs before the layout settles, leaving it off-centre/clipped).
                requestAnimationFrame(fitDesignToView)
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

      if (isUuid(routeId)) {
        loadRemoteDesign()
          .then(handled => {
            if (!handled) restoreFromLocal()
          })
          .catch(err => {
            log.warn('editor', 'server design load failed — falling back to local restore', err)
            restoreFromLocal()
          })
      } else {
        // Redirect logged-out standalone visitors to login on load, not only
        // at save time (resolveEditorSession redirects internally). Fire-and-
        // forget so canvas init never blocks on it. Demo visits are
        // intentionally unauthenticated — don't kick them to login.
        if (!isDemoRequest()) {
          resolveEditorSession().catch(err => log.warn('editor', 'session resolve on load failed', err))
        }
        restoreFromLocal()
      }
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
      // Persist the video project (tracks/clips/assets, v1 schema) with the design;
      // it lives in React state, not on the canvas. Uploaded media are IndexedDB
      // asset references, so a reload gets them back.
      const project: VideoProject = videoProjectRef.current.getProject()
      const video = isEmptyProject(project) ? undefined : project
      // changeKey hashes CONTENT (objects JSON + project), not byte-length.
      const changeKey = JSON.stringify(objs) + '|' + (video ? JSON.stringify(video) : '')
      // Write the live canvas into the active page, then persist the whole
      // pages array so multi-page designs survive reloads.
      const thumb = cv ? makeThumbnail(cv) : undefined
      if (pagesRef.current.length === 0) pagesRef.current = [{ id: genProjectId(), json: null }]
      const idx = Math.min(activePageRef.current, pagesRef.current.length - 1)
      pagesRef.current[idx] = { ...pagesRef.current[idx], json, thumbnail: thumb }
      return {
        // clips/audioClips are cleared: older builds' format, superseded by `video`.
        payload: { pages: pagesRef.current, activePage: idx, json, video, clips: undefined, audioClips: undefined, thumbnail: thumb },
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

  // Timeline edits don't fire canvas events — tell the auto-save directly.
  useEffect(() => {
    saveManagerRef.current?.markDirty()
  }, [videoProject.project])

  // Constrain objects to stay within canvas bounds
  useEffect(() => {
    if (!editor) return

    // The fabric canvas itself — editor.canvas is the SDK's CanvasController
    // wrapper (no getObjects/on/clipPath), so clipping never attached to it.
    const canvas = getFabricCanvas(editor)
    if (!canvas) return

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

    // Objects may hang off the page (full-bleed photos etc.) — the frame clip
    // hides the overflow. Smart guides handle alignment instead of clamping.
    const onMoving = () => setupClipping()

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

  // Layout (desktop / tablet / phone) lives in ResponsiveEditorLayout; the
  // stage element itself is identical at every size.
  const stage = (
    <div
      style={{
        flex: 1,
        display: 'flex',
        backgroundColor: color.canvasBg,
        backgroundImage: isWhiteboard ? 'radial-gradient(#b3bcc9 2.2px, transparent 2.2px)' : undefined,
        backgroundSize: isWhiteboard ? '26px 26px' : undefined,
        position: 'relative',
        overflow: 'hidden',
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
              background: '#f3efe4',
              border: '1px solid #e6e0d2',
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
      <ErrorBoundary fallback={null}>
        <Rulers />
      </ErrorBoundary>
      <VideoEngine />
      <Footer />
    </div>
  )

  return (
    <PageActionsContext.Provider value={pageActions}>
      <ResponsiveEditorLayout
        before={<ToasterContainer placement={phoneLayout ? PLACEMENT.top : PLACEMENT.bottomRight} autoHideDuration={4500} />}
        topbar={
          <SaveManagerContext.Provider value={saveManager}>
            <Navbar />
          </SaveManagerContext.Provider>
        }
        stage={stage}
        timeline={
          <ErrorBoundary fallback={null}>
            <VideoTimeline />
          </ErrorBoundary>
        }
        pagesBar={
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
        }
        after={
          <>
            <ContextMenu />
            <InsufficientCreditsModal
              isOpen={showUpgradeModal}
              onClose={dismissUpgradeModal}
              balance={upgradeModalData?.balance || 0}
              cost={upgradeModalData?.cost || 0}
            />
          </>
        }
      />
    </PageActionsContext.Provider>
  )
}

export default App
