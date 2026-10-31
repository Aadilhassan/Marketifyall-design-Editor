import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import {
  Home,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Search,
  X,
  Square,
  Smartphone,
  Presentation as PresentationIcon,
  Video as VideoIcon,
  Youtube,
  FileImage,
  FileText,
  PenTool,
  Upload as UploadIcon,
  Ruler,
  LayoutGrid,
  List,
  MoreHorizontal,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  HardDrive,
} from 'lucide-react'
import { Project, listProjects, createProject, deleteProject, duplicateProject, patchProject } from '@/utils/projectStore'
import api from '@services/api'
import { supabase } from '@/lib/supabase'
import { log, ignoreError } from '@/lib/logger'
import CreateModal from './CreateModal'
import { QUICK_EDITS, QuickEdit, QuickEditArt, ART_PHOTOS, ArtPhotos } from './QuickEdits'
import '../../styles/editorial.css'
import '../../styles/dashboard.css'

type View = 'home' | 'projects' | 'templates' | 'search'
type Sort = 'edited' | 'created' | 'name'

interface Shortcut {
  id: string
  label: string
  Icon: React.ComponentType<any>
  w?: number
  h?: number
  panel?: string // open the editor focused on this tool panel
  starter?: string // pre-populate the canvas with tailored starter content
  kind?: string // design type persisted on the project (e.g. 'whiteboard')
  modal?: boolean // open the full format picker instead of creating directly
  upload?: boolean // pick an image and start a design with it
}

// Each shortcut creates a correctly-sized design focused on the relevant tool,
// runs the image-upload flow, or opens the full format picker.
const SHORTCUTS: Shortcut[] = [
  { id: 'social', label: 'Social post', Icon: Square, w: 1080, h: 1080, panel: 'Templates' },
  { id: 'story', label: 'Story', Icon: Smartphone, w: 1080, h: 1920, panel: 'Templates' },
  { id: 'presentation', label: 'Presentation', Icon: PresentationIcon, w: 1920, h: 1080, panel: 'Templates' },
  { id: 'video', label: 'Video', Icon: VideoIcon, w: 1920, h: 1080, panel: 'Video' },
  { id: 'thumb', label: 'Thumbnail', Icon: Youtube, w: 1280, h: 720, panel: 'Templates' },
  { id: 'poster', label: 'Poster', Icon: FileImage, w: 2480, h: 3508, panel: 'Templates' },
  { id: 'doc', label: 'Doc', Icon: FileText, w: 1240, h: 1754, panel: 'Text', starter: 'doc' },
  { id: 'whiteboard', label: 'Whiteboard', Icon: PenTool, w: 2560, h: 1440, panel: 'Elements', starter: 'whiteboard', kind: 'whiteboard' },
  { id: 'upload', label: 'Upload', Icon: UploadIcon, upload: true },
  { id: 'custom', label: 'Custom size', Icon: Ruler, modal: true },
]

interface TemplateItem {
  id: string
  name: string
  preview: string
  category?: string
  width: number
  height: number
}

interface CreateOptions {
  panel?: string
  starter?: string
  kind?: string
  template?: string
  tool?: string
  extra?: Record<string, string>
}

/** "Tropical Getaway — Instagram Story" and "— Facebook Post" are one family; keep the first. */
const onePerFamily = <T extends { name: string }>(list: T[]): T[] => {
  const seen = new Set<string>()
  return list.filter(t => {
    const family = t.name.split(' — ')[0]
    if (seen.has(family)) return false
    seen.add(family)
    return true
  })
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const timeAgo = (ts: number): string => {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return plural(Math.floor(s / 3600), 'hour') + ' ago'
  if (s < 86400 * 7) return plural(Math.floor(s / 86400), 'day') + ' ago'
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Projects() {
  const history = useHistory()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const view = (params.get('view') as View) || 'home'
  const query = params.get('q') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState(query)
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState<Sort>('edited')
  const [layout, setLayout] = useState<'grid' | 'list'>(() => (localStorage.getItem('mfa-dash-layout') as any) || 'grid')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const creatingRef = useRef(false)
  // Projects here live on this device, so signed-out visitors open them in demo
  // mode rather than being sent to log in.
  const signedInRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Quick edit waiting on the photo picker (remove background / Magic Eraser).
  const uploadToolRef = useRef<string | undefined>()

  const refresh = useCallback(() => {
    listProjects()
      .then(items => {
        setProjects(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    api
      .getTemplates()
      .then(list =>
        setTemplates(
          list
            .filter(t => t.preview)
            .map(t => ({
              id: String(t.id),
              name: t.name || 'Template',
              preview: t.preview as string,
              category: t.category,
              width: t.frame?.width || 1080,
              height: t.frame?.height || 1080,
            })),
        ),
      )
      .catch(err => log.warn('projects', 'templates failed to load', err))
  }, [refresh])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => (signedInRef.current = !!data.session))
      .catch(err => ignoreError(err, 'no auth backend — demo mode'))
  }, [])

  useEffect(() => setSearch(query), [query])
  useEffect(() => localStorage.setItem('mfa-dash-layout', layout), [layout])

  // Close the card menu on any outside click or Escape.
  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuId])

  const go = (next: View, q?: string) => {
    const p = new URLSearchParams()
    if (next !== 'home') p.set('view', next)
    if (q) p.set('q', q)
    history.push({ pathname: '/dashboard', search: p.toString() ? `?${p}` : '' })
    window.scrollTo(0, 0)
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (q) go('search', q)
  }

  const editorUrl = (id: string, q = new URLSearchParams()) => {
    if (!signedInRef.current) q.set('demo', 'true')
    return `/design/${id}/edit?${q}`
  }

  const openProject = (id: string) => history.push(editorUrl(id))

  const handleCreate = async (name: string, width: number, height: number, opts: CreateOptions = {}) => {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      const p = await createProject(name, { width, height }, opts.kind)
      const q = new URLSearchParams()
      if (opts.panel) q.set('panel', opts.panel)
      if (opts.starter) q.set('starter', opts.starter)
      if (opts.template) q.set('template', opts.template)
      if (opts.tool) q.set('tool', opts.tool)
      Object.entries(opts.extra || {}).forEach(([k, v]) => q.set(k, v))
      history.push(editorUrl(p.id, q))
    } catch {
      creatingRef.current = false
    }
  }

  const pickPhoto = (tool?: string) => {
    uploadToolRef.current = tool
    fileInputRef.current?.click()
  }

  const runShortcut = (s: Shortcut) => {
    if (s.upload) return pickPhoto()
    if (s.modal || !s.w || !s.h) return setShowCreate(true)
    handleCreate(s.label, s.w, s.h, { panel: s.panel, starter: s.starter, kind: s.kind })
  }

  const runQuickEdit = (q: QuickEdit) => {
    if (q.upload) return pickPhoto(q.tool)
    handleCreate(q.label, q.w || 1080, q.h || 1080, { panel: q.panel, starter: q.starter, kind: q.kind, extra: q.extra })
  }

  const pickTemplate = (t: TemplateItem) => handleCreate(t.name, t.width, t.height, { template: t.id })

  // Upload flow: pick an image, downscale it, hand it to the editor (via
  // sessionStorage) and open a new design sized to the image.
  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        const cap = 1600
        const scale = Math.min(1, cap / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
        const w = Math.max(1, Math.round((img.naturalWidth || 1080) * scale))
        const h = Math.max(1, Math.round((img.naturalHeight || 1080) * scale))
        let stored = dataUrl
        try {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h)
            // PNG keeps transparency; photos that would overflow sessionStorage
            // (~5 MB) go as high-quality JPEG instead.
            stored = c.toDataURL('image/png')
            if (stored.length > 4_000_000) stored = c.toDataURL('image/jpeg', 0.92)
          }
        } catch (err) {
          ignoreError(err, 'thumbnail regeneration — original kept')
        }
        try {
          sessionStorage.setItem('mfa:pendingUpload', stored)
        } catch (err) {
          log.warn('projects', 'thumbnail too large for sessionStorage — design still opens', err)
        }
        handleCreate(file.name.replace(/\.[^.]+$/, '') || 'Uploaded image', w, h, { tool: uploadToolRef.current })
      }
      img.onerror = () => handleCreate('Uploaded image', 1080, 1080)
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    await deleteProject(confirmDelete.id)
    setConfirmDelete(null)
    refresh()
  }

  const doDuplicate = async (id: string) => {
    await duplicateProject(id)
    refresh()
  }

  const startRename = (p: Project) => {
    setEditingId(p.id)
    setDraftName(p.name)
  }

  const commitRename = async (id: string) => {
    await patchProject(id, { name: draftName.trim() || 'Untitled design' })
    setEditingId(null)
    refresh()
  }

  const sorted = useMemo(() => {
    const list = [...projects]
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'created') list.sort((a, b) => b.createdAt - a.createdAt)
    else list.sort((a, b) => b.updatedAt - a.updatedAt)
    return list
  }, [projects, sort])

  const categories = useMemo(() => {
    const set = new Set<string>()
    templates.forEach(t => t.category && set.add(t.category))
    return ['All', ...Array.from(set).sort()]
  }, [templates])

  const artPhotos = useMemo(() => {
    const out: ArtPhotos = {}
    ;(Object.keys(ART_PHOTOS) as (keyof typeof ART_PHOTOS)[]).forEach(k => {
      const t = templates.find(x => x.name === ART_PHOTOS[k])
      if (t) out[k] = t.preview
    })
    return out
  }, [templates])

  const term = (view === 'search' ? query : '').toLowerCase()
  const matchingProjects = term ? sorted.filter(p => p.name.toLowerCase().includes(term)) : sorted
  const matchingTemplates = templates.filter(
    t =>
      (category === 'All' || t.category === category) &&
      (!term || t.name.toLowerCase().includes(term) || (t.category || '').toLowerCase().includes(term)),
  )

  const cardProps = {
    editingId,
    draftName,
    menuId,
    setDraftName,
    setEditingId,
    setMenuId,
    commitRename,
    onOpen: openProject,
    onRename: startRename,
    onDuplicate: doDuplicate,
    onDelete: setConfirmDelete,
  }

  const projectGrid = (list: Project[]) =>
    layout === 'list' && view !== 'home' ? (
      <div className="dash-list" role="list">
        <div className="dash-list-head" aria-hidden="true">
          <span>Name</span>
          <span>Size</span>
          <span>Edited</span>
          <span />
        </div>
        {list.map(p => (
          <DesignCard key={p.id} project={p} row {...cardProps} />
        ))}
      </div>
    ) : (
      <div className="dash-grid" role="list">
        {list.map(p => (
          <DesignCard key={p.id} project={p} {...cardProps} />
        ))}
      </div>
    )

  const templateGrid = (list: TemplateItem[], limit?: number) => (
    <div className={limit ? 'dash-tpl-row' : 'dash-tpl-masonry'}>
      {(limit ? list.slice(0, limit) : list).map(t => (
        <button key={t.id} className="dash-tpl" onClick={() => pickTemplate(t)} title={`Use “${t.name}”`}>
          <span className="dash-tpl-img" style={limit ? undefined : { aspectRatio: `${t.width} / ${t.height}` }}>
            <img src={t.preview} alt="" loading="lazy" />
            <span className="dash-tpl-use">Use template</span>
          </span>
          <span className="dash-tpl-name">{t.name}</span>
          <span className="dash-tpl-meta">
            {t.category ? `${t.category} · ` : ''}
            {t.width}×{t.height}
          </span>
        </button>
      ))}
    </div>
  )

  const chips = (
    <div className="dash-chips" role="tablist" aria-label="Template categories">
      {categories.map(c => (
        <button key={c} role="tab" aria-selected={category === c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>
          {c}
        </button>
      ))}
    </div>
  )

  const projectsToolbar = (
    <div className="dash-toolbar">
      <label className="dash-select">
        <span>Sort</span>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
          <option value="edited">Last edited</option>
          <option value="created">Date created</option>
          <option value="name">Name A–Z</option>
        </select>
      </label>
      <div className="dash-seg" role="group" aria-label="Layout">
        <button aria-pressed={layout === 'grid'} className={layout === 'grid' ? 'on' : ''} onClick={() => setLayout('grid')} title="Grid">
          <LayoutGrid size={16} />
        </button>
        <button aria-pressed={layout === 'list'} className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')} title="List">
          <List size={16} />
        </button>
      </div>
    </div>
  )

  const emptyProjects = (
    <div className="dash-empty">
      <div className="dash-empty-art" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>Your designs will show up here</h3>
      <p>Pick a size above or start from a template. Everything saves automatically as you work.</p>
      <button className="dash-btn" onClick={() => setShowCreate(true)}>
        <Plus size={16} /> Create a design
      </button>
    </div>
  )

  const NAV: [View, string, React.ComponentType<any>][] = [
    ['home', 'Home', Home],
    ['projects', 'Projects', FolderOpen],
    ['templates', 'Templates', LayoutTemplate],
  ]

  return (
    <div className="ed-page dash-root">
      {/* sidebar (desktop) / top bar (phone) */}
      <aside className="dash-side">
        <a
          className="dash-logo"
          href="/"
          onClick={e => {
            e.preventDefault()
            history.push('/')
          }}
        >
          Marketify<i>all</i>
        </a>
        <button className="dash-create" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> <span>Create a design</span>
        </button>
        <nav className="dash-nav" aria-label="Dashboard">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? 'on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="dash-side-foot">
          <HardDrive size={15} />
          <span>
            {plural(projects.length, 'design')} saved on this device
          </span>
        </div>
      </aside>

      <main className="dash-main">
        {view === 'home' && (
          <>
            <section className="dash-hero">
              <h1>
                What will you <em>design</em> today?
              </h1>
              <form className="dash-search" onSubmit={submitSearch} role="search">
                <Search size={19} aria-hidden="true" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search your designs and ${templates.length || ''} templates`}
                  aria-label="Search designs and templates"
                />
                {search && (
                  <button type="button" className="dash-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                    <X size={16} />
                  </button>
                )}
              </form>
              <div className="dash-shortcuts">
                {SHORTCUTS.map(s => (
                  <button key={s.id} className="dash-shortcut" onClick={() => runShortcut(s)} title={s.w ? `${s.label} · ${s.w}×${s.h}` : s.label}>
                    <span className="ic">
                      <s.Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="lb">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="dash-sec">
              <div className="dash-sec-head">
                <h2>Quick edits</h2>
                <span className="dash-count">One click to the right tool</span>
              </div>
              <ScrollRow>
                {QUICK_EDITS.map(q => (
                  <button key={q.id} className="qe-card" onClick={() => runQuickEdit(q)}>
                    <QuickEditArt id={q.id} photos={artPhotos} />
                    <span className="qe-label">
                      {q.label}
                      {q.badge && <span className="qe-badge">{q.badge}</span>}
                    </span>
                  </button>
                ))}
              </ScrollRow>
            </section>

            <section className="dash-sec">
              <div className="dash-sec-head">
                <h2>Recent designs</h2>
                {projects.length > 0 && (
                  <button className="dash-link" onClick={() => go('projects')}>
                    See all {projects.length}
                  </button>
                )}
              </div>
              {loading ? <div className="dash-skel" /> : projects.length ? projectGrid(sorted.slice(0, 8)) : emptyProjects}
            </section>

            <section className="dash-sec">
              <div className="dash-sec-head">
                <h2>Start from a template</h2>
                <button className="dash-link" onClick={() => go('templates')}>
                  Browse all
                </button>
              </div>
              {chips}
              {templateGrid(onePerFamily(matchingTemplates), 12)}
            </section>
          </>
        )}

        {view === 'projects' && (
          <section className="dash-sec dash-page">
            <div className="dash-page-head">
              <h1>Projects</h1>
              <span className="dash-count">{plural(projects.length, 'design')}</span>
              {projectsToolbar}
            </div>
            {loading ? <div className="dash-skel" /> : projects.length ? projectGrid(sorted) : emptyProjects}
          </section>
        )}

        {view === 'templates' && (
          <section className="dash-sec dash-page">
            <div className="dash-page-head">
              <h1>Templates</h1>
              <span className="dash-count">{plural(matchingTemplates.length, 'template')}</span>
            </div>
            {chips}
            {templateGrid(matchingTemplates)}
          </section>
        )}

        {view === 'search' && (
          <section className="dash-sec dash-page">
            <button className="dash-link dash-back" onClick={() => go('home')}>
              <ArrowLeft size={15} /> Home
            </button>
            <form className="dash-search dash-search--inline" onSubmit={submitSearch} role="search">
              <Search size={18} aria-hidden="true" />
              <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search designs and templates" autoFocus />
            </form>
            <div className="dash-sec-head">
              <h2>Your designs</h2>
              <span className="dash-count">{matchingProjects.length}</span>
            </div>
            {matchingProjects.length ? (
              projectGrid(matchingProjects)
            ) : (
              <p className="dash-none">No designs named “{query}”.</p>
            )}
            <div className="dash-sec-head" style={{ marginTop: 36 }}>
              <h2>Templates</h2>
              <span className="dash-count">{matchingTemplates.length}</span>
            </div>
            {matchingTemplates.length ? (
              templateGrid(matchingTemplates)
            ) : (
              <p className="dash-none">
                No templates match “{query}”. Try a category like Food, Business or Seasonal.
              </p>
            )}
          </section>
        )}
      </main>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onUploadFile} hidden />

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={(n, w, h) => handleCreate(n, w, h)} />}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${confirmDelete.name}”?`}
          body="It will be removed from this device. This can’t be undone."
          action="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  )
}

interface CardProps {
  project: Project
  row?: boolean
  editingId: string | null
  draftName: string
  menuId: string | null
  setDraftName: (v: string) => void
  setEditingId: (v: string | null) => void
  setMenuId: (v: string | null) => void
  commitRename: (id: string) => void
  onOpen: (id: string) => void
  onRename: (p: Project) => void
  onDuplicate: (id: string) => void
  onDelete: (p: Project) => void
}

function DesignCard({ project: p, row, editingId, draftName, menuId, setDraftName, setEditingId, setMenuId, commitRename, onOpen, onRename, onDuplicate, onDelete }: CardProps) {
  const size = p.frame ? `${p.frame.width}×${p.frame.height}` : ''
  const pages = p.pages?.length || 1
  const name =
    editingId === p.id ? (
      <input
        className="dash-rename"
        autoFocus
        value={draftName}
        onClick={e => e.stopPropagation()}
        onChange={e => setDraftName(e.target.value)}
        onBlur={() => commitRename(p.id)}
        onKeyDown={e => {
          if (e.key === 'Enter') commitRename(p.id)
          if (e.key === 'Escape') setEditingId(null)
        }}
        aria-label="Design name"
      />
    ) : (
      <span className="dash-card-name">{p.name}</span>
    )

  const menu = (
    <div className="dash-menu-wrap">
      <button
        className="dash-kebab"
        aria-label={`More actions for ${p.name}`}
        aria-haspopup="menu"
        aria-expanded={menuId === p.id}
        onClick={e => {
          e.stopPropagation()
          setMenuId(menuId === p.id ? null : p.id)
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {menuId === p.id && (
        <div className="dash-menu" role="menu" onClick={e => e.stopPropagation()}>
          {(
            [
              ['Open', () => onOpen(p.id)],
              ['Rename', () => onRename(p)],
              ['Make a copy', () => onDuplicate(p.id)],
              ['Delete', () => onDelete(p)],
            ] as [string, () => void][]
          ).map(([label, fn]) => (
            <button
              key={label}
              role="menuitem"
              className={label === 'Delete' ? 'danger' : ''}
              onClick={() => {
                setMenuId(null)
                fn()
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const thumb = p.thumbnail ? <img src={p.thumbnail} alt="" /> : <span className="dash-nothumb">No preview yet</span>

  if (row) {
    return (
      <div className="dash-row" role="listitem" onClick={() => editingId !== p.id && onOpen(p.id)}>
        <span className="dash-row-main">
          <span className="dash-row-thumb">{thumb}</span>
          {name}
        </span>
        <span className="dash-row-meta">{size}</span>
        <span className="dash-row-meta">{timeAgo(p.updatedAt)}</span>
        {menu}
      </div>
    )
  }

  return (
    <div className="dash-card" role="listitem">
      <div
        className="dash-card-thumb"
        onClick={() => onOpen(p.id)}
        onKeyDown={e => e.key === 'Enter' && onOpen(p.id)}
        role="button"
        tabIndex={0}
        aria-label={`Open ${p.name}`}
      >
        {thumb}
        {pages > 1 && <span className="dash-badge">{pages} pages</span>}
      </div>
      {menu}
      <div className="dash-card-body">
        {name}
        <span className="dash-card-meta">
          {size ? `${size} · ` : ''}Edited {timeAgo(p.updatedAt)}
        </span>
      </div>
    </div>
  )
}

/** Horizontal card row with prev/next buttons that show only when there's more to see. */
function ScrollRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update])
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="qe-wrap">
      <div className="qe-row" ref={ref} onScroll={update}>
        {children}
      </div>
      {edges.left && (
        <button className="qe-arrow qe-arrow--l" onClick={() => page(-1)} aria-label="Scroll left">
          <ChevronLeft size={20} />
        </button>
      )}
      {edges.right && (
        <button className="qe-arrow qe-arrow--r" onClick={() => page(1)} aria-label="Scroll right">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}

function ConfirmDialog({ title, body, action, onCancel, onConfirm }: { title: string; body: string; action: string; onCancel: () => void; onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="dash-scrim" onClick={onCancel}>
      <div className="dash-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dash-dialog-title" onClick={e => e.stopPropagation()}>
        <h3 id="dash-dialog-title">{title}</h3>
        <p>{body}</p>
        <div className="dash-dialog-acts">
          <button className="dash-btn dash-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} className="dash-btn dash-btn--danger" onClick={onConfirm}>
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Projects
