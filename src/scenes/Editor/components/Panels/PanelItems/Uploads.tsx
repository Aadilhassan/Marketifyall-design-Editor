import { useRef, useState, useCallback, useEffect } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import DropZone from '@components/Dropzone'
import { addObjectToCanvas } from '@/utils/editorHelpers'
import { log } from '@/lib/logger'

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

// ─── Component ───────────────────────────────────────────────

function Uploads() {
  const [uploads, setUploads] = useState<LocalUpload[]>(() => loadLocalUploads())
  const [isProcessing, setIsProcessing] = useState(false)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  // Persist uploads when they change
  useEffect(() => {
    saveLocalUploads(uploads)
  }, [uploads])

  const processFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setIsProcessing(true)

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
      setIsProcessing(false)
    }
    reader.onerror = () => setIsProcessing(false)
    reader.readAsDataURL(file)
  }, [])

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
            <div
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '0 2rem 2rem',
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              {isProcessing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '1',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  color: '#999',
                  fontSize: '12px',
                }}>
                  Processing...
                </div>
              )}

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
