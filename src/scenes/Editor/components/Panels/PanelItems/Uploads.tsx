import { useRef, useState, useCallback, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import DropZone from '@components/Dropzone'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { log } from '@/lib/logger'
import { supabase, APP_URL } from '@/lib/supabase'
import { resolveEditorSession, demoBlocked, isDemoRequest, EditorSession } from '@/lib/workspaceContext'
import { uploadMediaFile } from '@/services/designProjects'

// ─── Local uploads storage ───────────────────────────────────

interface LocalUpload {
  id: string
  name: string
  url: string // data URL
  timestamp: number
}

const STORAGE_KEY = 'mfa-local-uploads'
const MAX_UPLOADS = 50

function loadLocalUploads(): LocalUpload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalUploads(uploads: LocalUpload[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads.slice(0, MAX_UPLOADS)))
  } catch {
    // storage full — drop oldest
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads.slice(0, 10)))
    } catch (err) { log.warn('uploads', 'could not persist uploads — storage full even after trim', err) }
  }
}

// ─── Workspace media (Media Manager) ─────────────────────────

interface MediaFile {
  id: string
  file_name: string
  file_type: string | null
  public_url: string
  thumbnail_url: string | null
}

const sectionHeaderStyle: React.CSSProperties = {
  padding: '0 2rem 0.5rem',
  fontSize: '12px',
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.5rem',
  padding: '0 2rem 2rem',
  gridTemplateColumns: '1fr 1fr',
}

const mediaNoteStyle: React.CSSProperties = {
  padding: '0 2rem 2rem',
  fontSize: '12px',
  color: '#999',
}

// ─── Component ───────────────────────────────────────────────

function Uploads() {
  const [uploads, setUploads] = useState<LocalUpload[]>(() => loadLocalUploads())
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [mediaError, setMediaError] = useState(false)
  // Distinguishes "fetch hasn't run yet" from "fetched, genuinely empty".
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [session, setSession] = useState<EditorSession | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  // Persist uploads when they change
  useEffect(() => {
    saveLocalUploads(uploads)
  }, [uploads])

  // media_files RLS is per-user, so this lists the signed-in user's media.
  const refreshMedia = useCallback(async () => {
    const { data, error } = await supabase
      .from('media_files')
      .select('id, file_name, file_type, public_url, thumbnail_url')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      log.warn('uploads', 'could not load workspace media', error)
      setMediaError(true)
    } else {
      setMediaError(false)
      setMediaFiles((data as MediaFile[] | null) ?? [])
    }
    setMediaLoaded(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // The editor only renders signed-in (resolveEditorSession redirects otherwise).
      const s = await resolveEditorSession()
      if (cancelled || !s) return
      setSession(s)
      await refreshMedia()
    })()
    return () => { cancelled = true }
  }, [refreshMedia])

  // Existing local-only flow: FileReader data URL into localStorage.
  const storeLocally = useCallback((file: File) => new Promise<void>(resolve => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const newUpload: LocalUpload = {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        url: dataUrl,
        timestamp: Date.now(),
      }
      setUploads(prev => [newUpload, ...prev])
      resolve()
    }
    reader.onerror = () => resolve()
    reader.readAsDataURL(file)
  }), [])

  const processFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    // Demo uploads must not hit the media API — prompt sign-up instead.
    // Synchronous URL check: the async session may still be resolving, and a
    // session-based check would silently no-op the demo gate during that window.
    if (demoBlocked(isDemoRequest())) return
    setIsProcessing(true)
    try {
      // Upload through the app so the file lands in workspace media…
      if (session?.workspaceId) {
        const url = await uploadMediaFile(APP_URL, session.workspaceId, file)
        if (url) {
          await refreshMedia()
          return
        }
      }
      // …falling back to the local-only copy when the upload fails (offline-friendly).
      await storeLocally(file)
    } finally {
      setIsProcessing(false)
    }
  }, [session, refreshMedia, storeLocally])

  const handleDropFiles = useCallback((files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      processFile(files[i])
    }
  }, [processFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleDropFiles(e.target.files)
    // Reset so same file can be selected again
    e.target.value = ''
  }

  const addImageToCanvas = useCallback((url: string) => {
    if (!url || !editor) return
    addObjectToCanvas(editor, {
      type: 'StaticImage',
      metadata: { src: url },
    }, 400, canvas)
  }, [editor, canvas])

  const handleDragStart = useCallback((e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('image-url', url)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id))
  }, [])

  // The Uploads panel places images only (video needs the timeline flow in
  // StockVideos/Video panels), so video media gets a copy-URL affordance.
  const handleCopyUrl = useCallback(async (media: MediaFile) => {
    try {
      await navigator.clipboard.writeText(media.public_url)
      setCopiedId(media.id)
      setTimeout(() => setCopiedId(prev => (prev === media.id ? null : prev)), 1500)
    } catch (err) {
      log.warn('uploads', 'could not copy media URL to clipboard', err)
    }
  }, [])

  const imageMedia = mediaFiles.filter(m => (m.file_type ?? '').startsWith('image/'))
  const videoMedia = mediaFiles.filter(m => (m.file_type ?? '').startsWith('video/'))

  return (
    <DropZone handleDropFiles={handleDropFiles}>
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column', width: '100%' }}>
        <div style={{ padding: '2rem 2rem', display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              paddingLeft: '1rem',
              fontSize: '1rem',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.045)',
              cursor: 'pointer',
              height: '50px',
              width: '100%',
              borderRadius: '8px',
            }}
            onClick={() => inputFileRef.current?.click()}
          >
            Upload file
          </div>
          <input
            onChange={handleFileInput}
            type="file"
            accept="image/*"
            multiple
            ref={inputFileRef}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Scrollbars>
            {isProcessing && (
              <div style={{
                margin: '0 2rem 1rem',
                padding: '0.75rem',
                textAlign: 'center',
                background: '#f5f5f5',
                borderRadius: '8px',
                color: '#999',
                fontSize: '12px',
              }}>
                Uploading...
              </div>
            )}

            {mediaLoaded && (
              <>
                <div style={sectionHeaderStyle}>Your media</div>
                {mediaError ? (
                  <div style={{ ...mediaNoteStyle, color: '#b91c1c' }}>
                    Couldn't load your media — please try again.
                  </div>
                ) : imageMedia.length === 0 && videoMedia.length === 0 ? (
                  <div style={mediaNoteStyle}>No media in your workspace yet.</div>
                ) : (
                <div style={gridStyle}>
                  {imageMedia.map(media => (
                    <div
                      key={media.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #eee',
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, media.public_url)}
                      onClick={() => addImageToCanvas(media.public_url)}
                      title={media.file_name}
                    >
                      <img
                        width="100%"
                        src={media.thumbnail_url || media.public_url}
                        alt={media.file_name}
                        style={{ display: 'block', pointerEvents: 'none' }}
                      />
                    </div>
                  ))}
                  {videoMedia.map(media => (
                    <div
                      key={media.id}
                      style={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #eee',
                        background: '#1a1a2a',
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                      }}
                      title={media.file_name}
                    >
                      {media.thumbnail_url && (
                        <img
                          src={media.thumbnail_url}
                          alt={media.file_name}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.55,
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <div style={{
                        position: 'relative',
                        color: '#fff',
                        fontSize: '11px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {media.file_name}
                      </div>
                      <button
                        onClick={() => handleCopyUrl(media)}
                        style={{
                          position: 'relative',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.9)',
                          color: '#333',
                          fontSize: '11px',
                          padding: '2px 8px',
                          cursor: 'pointer',
                        }}
                        title="Copy video URL"
                      >
                        {copiedId === media.id ? 'Copied' : 'Copy URL'}
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </>
            )}

            {uploads.length > 0 && <div style={sectionHeaderStyle}>This device</div>}
            <div style={gridStyle}>
              {uploads.map(upload => (
                <div
                  key={upload.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #eee',
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, upload.url)}
                  onClick={() => addImageToCanvas(upload.url)}
                  title={upload.name}
                >
                  <img
                    width="100%"
                    src={upload.url}
                    alt={upload.name}
                    style={{ display: 'block', pointerEvents: 'none' }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(upload.id) }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(0,0,0,0.5)',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.6,
                      lineHeight: 1,
                    }}
                    title="Remove"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </Scrollbars>
        </div>
      </div>
    </DropZone>
  )
}

export default Uploads
