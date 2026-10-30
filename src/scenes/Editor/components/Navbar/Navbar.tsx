import { styled } from 'baseui'
import { useEditor } from '@nkyo/scenify-sdk'
import { useEffect, useState } from 'react'
import { StatefulPopover, PLACEMENT } from 'baseui/popover'
import { useHistory, useParams } from 'react-router-dom'
import useAppContext from '@/hooks/useAppContext'
import { PanelType } from '@/constants/app-options'
import { useEmbedMode } from '@/contexts/EmbedContext'
import { useCredits } from '@/contexts/CreditsContext'
import { fail, ignoreError } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { APP_URL } from '@/lib/supabase'
import { resolveEditorSession, demoBlocked, isDemoRequest } from '@/lib/workspaceContext'
import {
  saveDesignProject,
  uploadPreview,
  isUuid,
  wasLoadedFromServer,
  setServerBaseline,
  getServerBaseline,
  contentHashOf,
} from '@/services/designProjects'
import { useSaveManager } from '@/contexts/SaveManagerContext'
import SaveStatusChip from '@/components/SaveStatusChip'
import Resize from './components/Resize'
import PreviewTemplate from './components/PreviewTemplate'
import History from './components/History'
import ExportModal from './components/ExportModal'
import Present from './components/Present'
import { color, font, shadow } from '@/theme/tokens'
import useBreakpoint from '@/hooks/useBreakpoint'
import BottomSheet, { sheetRowStyle } from '@/scenes/Editor/mobile/BottomSheet'

const Container = styled('div', {
  height: '56px',
  background: color.paper,
  display: 'flex',
  padding: '0 14px 0 0',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${color.line2}`,
  fontFamily: font.sans,
})

const LeftSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '100%',
})

const Logo = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  height: '100%',
  width: '76px',
  justifyContent: 'center',
  background: color.ink,
  border: 'none',
  padding: 0,
  marginRight: '8px',
  ':hover': {
    background: color.accent,
  },
})

const LogoIcon = styled('div', {
  fontFamily: font.serif,
  fontWeight: 800,
  fontSize: '24px',
  lineHeight: 1,
  color: color.paper,
  fontStyle: 'italic',
})

const LogoText = styled('span', {
  fontFamily: font.serif,
  fontSize: '17px',
  fontWeight: 600,
  color: color.ink,
  letterSpacing: '-0.01em',
  marginRight: '6px',
  whiteSpace: 'nowrap',
})

const Divider = styled('div', {
  width: '1px',
  height: '22px',
  background: color.line2,
  margin: '0 4px',
})

const CenterSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const NameInput = styled('input', {
  border: '1px solid transparent',
  background: 'transparent',
  fontFamily: font.sans,
  fontSize: '14px',
  fontWeight: 500,
  color: color.ink,
  padding: '7px 12px',
  borderRadius: '6px',
  outline: 'none',
  minWidth: '220px',
  textAlign: 'center',
  transitionProperty: 'background, border-color',
  transitionDuration: '0.15s',
  ':hover': {
    borderColor: color.line2,
  },
  ':focus': {
    background: color.white,
    borderColor: color.ink,
  },
})

const RightSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const IconButton = styled('button', {
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: color.ink2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  ':hover': {
    background: color.hover,
    color: color.ink,
  },
})

const SecondaryButton = styled('button', {
  height: '36px',
  padding: '0 14px',
  borderRadius: '6px',
  border: `1px solid ${color.line2}`,
  background: color.white,
  color: color.ink,
  fontFamily: font.sans,
  fontSize: '13.5px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  transitionProperty: 'background, border-color',
  transitionDuration: '0.15s',
  ':hover': {
    borderColor: color.ink,
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'default',
  },
})

const CreditBadge = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  height: '30px',
  padding: '0 10px',
  borderRadius: '999px',
  border: `1px solid ${color.line2}`,
  background: 'transparent',
  color: color.ink2,
  fontFamily: font.mono,
  fontSize: '11.5px',
  cursor: 'pointer',
  ':hover': {
    borderColor: color.accent,
    color: color.accent,
  },
})

const PrimaryButton = styled('button', {
  height: '36px',
  padding: '0 16px',
  borderRadius: '6px',
  border: 'none',
  background: color.accent,
  color: color.accentInk,
  fontFamily: font.sans,
  fontSize: '13.5px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  boxShadow: shadow.hard,
  transitionProperty: 'transform, box-shadow, background',
  transitionDuration: '0.12s',
  ':hover': {
    background: color.accentHover,
    transform: 'translate(-1px, -1px)',
    boxShadow: '4px 4px 0 #181410',
  },
  ':active': {
    transform: 'translate(2px, 2px)',
    boxShadow: '0 0 0 #181410',
  },
})

const DoneButton = styled('button', {
  height: '38px',
  padding: '0 22px',
  borderRadius: '6px',
  border: 'none',
  background: color.accent,
  color: color.accentInk,
  fontFamily: font.sans,
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: shadow.hard,
  ':hover': {
    background: color.accentHover,
  },
  ':disabled': {
    opacity: 0.7,
    cursor: 'default',
  },
})

const CancelButton = styled('button', {
  height: '38px',
  padding: '0 18px',
  borderRadius: '6px',
  border: `1px solid ${color.line2}`,
  background: color.white,
  color: color.ink2,
  fontFamily: font.sans,
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  ':hover': {
    borderColor: color.ink,
    color: color.ink,
  },
})

/** Copy the editor URL; true on success (failures are reported to the user). */
async function copyEditorLink(): Promise<boolean> {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch (err) {
    // Clipboard API refused (permissions / insecure context): legacy fallback.
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (!ok) throw err
      return true
    } catch (fallbackErr) {
      fail('navbar', 'Could not copy the link — copy it from the address bar instead', fallbackErr)
      return false
    }
  }
}

function useCopiedFlag() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  const copyLink = async () => {
    if (await copyEditorLink()) setCopied(true)
  }
  return { copied, copyLink }
}

/** Share popover: copy the editor link. No backend sharing model yet. */
function ShareButton() {
  const { copied, copyLink } = useCopiedFlag()

  return (
    <StatefulPopover
      placement={PLACEMENT.bottomRight}
      overrides={{ Body: { style: { zIndex: 1000, backgroundColor: 'transparent', boxShadow: 'none' } }, Inner: { style: { backgroundColor: 'transparent' } } }}
      content={() => (
        <div
          style={{
            width: 320,
            marginTop: 6,
            padding: 16,
            background: color.white,
            border: `1px solid ${color.line2}`,
            borderRadius: 10,
            boxShadow: shadow.pop,
            fontFamily: font.sans,
            color: color.ink,
          }}
        >
          <div style={{ fontFamily: font.serif, fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Share this design</div>
          <div style={{ fontSize: 12.5, color: color.muted, lineHeight: 1.45, marginBottom: 12 }}>
            Anyone in your workspace with this link can edit.
          </div>
          <SecondaryButton onClick={copyLink} style={{ width: '100%', justifyContent: 'center' }} aria-live="polite">
            {copied ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copy link
              </>
            )}
          </SecondaryButton>
          <div
            aria-disabled="true"
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${color.line}`,
              fontSize: 12.5,
              color: color.faint,
              display: 'flex',
              justifyContent: 'space-between',
              cursor: 'not-allowed',
            }}
          >
            <span>Public view-only link</span>
            <span>Coming soon</span>
          </div>
        </div>
      )}
    >
      <SecondaryButton aria-label="Share">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </SecondaryButton>
    </StatefulPopover>
  )
}

function NavbarEditor() {
  const editor = useEditor()
  const history = useHistory()
  const { currentTemplate, setActivePanel } = useAppContext()
  const { config, notifyCancel } = useEmbedMode()
  const { balance } = useCredits()
  const saveManager = useSaveManager()
  const { id: routeId } = useParams<{ id?: string }>()
  const [name, setName] = useState('Untitled design')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // Set after the first successful insert so repeated saves update in place.
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)
  const bp = useBreakpoint()
  const [moreOpen, setMoreOpen] = useState(false)
  const { copied, copyLink } = useCopiedFlag()

  const handleGoHome = () => {
    history.push('/dashboard')
  }

  useEffect(() => {
    if (currentTemplate) {
      setName(currentTemplate.name)
    }
  }, [currentTemplate])

  // Persist the design to the app's design_projects table (Done in embed mode,
  // Save in standalone mode). Updates in place when the design came from the
  // server (UUID route id) or was already saved once this session.
  const handleSaveDesign = async () => {
    if (!editor) return

    // Demo visitors have no session: prompt sign-up rather than letting the
    // session lookup redirect them to login (and away from their work).
    if (isDemoRequest()) {
      demoBlocked(true)
      return
    }
    setIsExporting(true)
    try {
      const session = await resolveEditorSession()
      if (!session) return // resolveEditorSession is redirecting to login
      if (demoBlocked(session.isDemo)) return
      if (!session.workspaceId) {
        fail('navbar', 'Could not save — no workspace found for your account')
        return
      }

      // Same scenify export the IndexedDB autosave uses (Editor.tsx buildSerialize).
      const designJson = (editor as any).exportToJSON?.()
      if (!designJson) {
        fail('navbar', 'Could not save your design — please try again')
        return
      }

      // Preview is best-effort: the save proceeds without it on failure.
      let previewUrl: string | null = null
      try {
        const dataUrl = await (editor as any).toPNG({})
        previewUrl = await uploadPreview(APP_URL, session.workspaceId, dataUrl, name)
      } catch (err) {
        ignoreError(err, 'design preview upload is best-effort')
      }

      // Only UPDATE a row this session actually saw: either we inserted it
      // (savedProjectId) or the load path fetched it from the server
      // (wasLoadedFromServer). A UUID route whose load failed or found no row
      // must INSERT a new copy instead of overwriting an unconfirmed id.
      const projectId =
        savedProjectId ?? (routeId && isUuid(routeId) && wasLoadedFromServer(routeId) ? routeId : null)
      const savedId = await saveDesignProject({
        id: projectId,
        workspaceId: session.workspaceId,
        userId: session.userId,
        name,
        designJson,
        previewUrl,
      })
      if (!savedId) {
        fail('navbar', 'Could not save your design — please try again')
        return
      }
      setSavedProjectId(savedId)
      // What the server now holds — the Back button's unsaved-changes check
      // compares against this.
      setServerBaseline(savedId, contentHashOf(designJson))

      notify('Design saved', 'positive')
      // Move a fresh design onto its server id, keeping the query string —
      // embed=true/demo=true/workspace_id all live there.
      if (routeId !== savedId) {
        history.replace(`/design/${savedId}/edit${window.location.search}`)
      }
    } catch (error) {
      fail('navbar', 'Could not save your design — please try again', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Back to the dashboard grid (embed mode). Warns when the canvas has
  // changed since the last save; demo sessions skip the warning since they
  // can't save anyway.
  const handleEmbedBack = () => {
    if (!isDemoRequest()) {
      let dirty = false
      try {
        const exported = (editor as any)?.exportToJSON?.()
        if (exported) {
          const id = savedProjectId ?? (routeId && isUuid(routeId) ? routeId : null)
          const baseline = id ? getServerBaseline(id) : null
          dirty =
            baseline !== null
              ? contentHashOf(exported) !== baseline
              : (exported.objects?.length ?? 0) > 0
        }
      } catch (err) {
        ignoreError(err, 'unsaved-changes check is best-effort')
      }
      if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
        return
      }
    }
    notifyCancel()
  }

  // Phone: one 48 px row — back, title, undo/redo, the primary action, and a
  // "⋯" sheet with everything else (Share, Save, Present, Resize).
  if (bp === 'phone') {
    const embed = config.isEmbedMode
    return (
      <Container className="mfa-phone-topbar" style={{ height: 48, padding: '0 4px 0 0', gap: 2 }}>
        {embed ? (
          <IconButton onClick={handleEmbedBack} aria-label="Back" style={{ width: 44, height: 44, marginLeft: 2 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </IconButton>
        ) : (
          <Logo onClick={handleGoHome} aria-label="Back to projects" style={{ width: 48, marginRight: 2, flex: 'none' }}>
            <LogoIcon style={{ fontSize: 22 }}>M</LogoIcon>
          </Logo>
        )}
        <NameInput
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Untitled design"
          aria-label="Design title"
          style={{ minWidth: 0, flex: '1 1 auto', width: '100%', textAlign: 'left', padding: '7px 6px', textOverflow: 'ellipsis' }}
        />
        <History />
        {embed ? (
          <DoneButton onClick={handleSaveDesign} disabled={isExporting} style={{ height: 40, padding: '0 14px', flex: 'none' }}>
            {isExporting ? 'Saving…' : 'Save'}
          </DoneButton>
        ) : (
          <PrimaryButton
            onClick={() => setIsExportModalOpen(true)}
            aria-label="Download"
            style={{ width: 44, height: 40, padding: 0, justifyContent: 'center', boxShadow: 'none', flex: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </PrimaryButton>
        )}
        <IconButton
          onClick={() => setMoreOpen(true)}
          aria-label="More actions"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          style={{ width: 44, height: 44, flex: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </IconButton>

        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={name || 'Untitled design'} variant="menu">
          {!embed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${color.line}` }}>
              <SaveStatusChip manager={saveManager} />
              {balance && (
                <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: 12, color: color.ink2 }}>{balance.total} credits</span>
              )}
            </div>
          )}
          {!embed && (
            <button type="button" style={sheetRowStyle} onClick={handleSaveDesign} disabled={isExporting}>
              {isExporting ? 'Saving…' : 'Save'}
            </button>
          )}
          <button type="button" style={sheetRowStyle} onClick={copyLink} aria-live="polite">
            {copied ? 'Link copied' : 'Share — copy link'}
          </button>
          {/* Present / Resize render their own triggers; their overlays live
              inside this sheet, so it stays open while they're in use. */}
          <div className="mfa-sheet-tools" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 14px' }}>
            {!embed && <Present />}
            <Resize />
          </div>
        </BottomSheet>

        {!embed && (
          <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} designName={name} />
        )}
      </Container>
    )
  }

  // Embed mode: an editor navbar, not an export dialog — Back returns to the
  // dashboard grid (with an unsaved-changes warning), Save persists and stays
  // in the editor.
  if (config.isEmbedMode) {
    return (
      <Container style={{ paddingLeft: '14px' }}>
        <LeftSection>
          <CancelButton onClick={handleEmbedBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </CancelButton>
          <Divider />
          {config.showBranding && (
            <>
              <LogoText>Marketifyall</LogoText>
              <Divider />
            </>
          )}
          <Resize />
          <History />
        </LeftSection>

        <CenterSection>
          <NameInput
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="Untitled design"
          />
        </CenterSection>

        <RightSection>
          <DoneButton onClick={handleSaveDesign} disabled={isExporting}>
            {isExporting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Save
              </>
            )}
          </DoneButton>
        </RightSection>
      </Container>
    )
  }

  // Normal navbar for standalone mode
  return (
    <Container>
      <LeftSection className="mfa-nav-left">
        <Logo onClick={handleGoHome} aria-label="Back to projects" title="Back to projects">
          <LogoIcon>M</LogoIcon>
        </Logo>
        <LogoText className="mfa-nav-wordmark">Marketifyall</LogoText>
        <Divider />
        <Resize />
        <History />
        <SaveStatusChip manager={saveManager} />
      </LeftSection>

      <CenterSection>
        <NameInput
          className="mfa-nav-name"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Untitled design"
        />
      </CenterSection>

      <RightSection className="mfa-nav-actions">
        {balance && (
          <CreditBadge title={`Subscription: ${balance.subscription_credits} | Top-up: ${balance.topup_credits} | Plan: ${balance.plan}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {balance.total} credits
          </CreditBadge>
        )}
        {/* AI Studio temporarily hidden
        <PrimaryButton onClick={() => setActivePanel(PanelType.AI_STUDIO)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          AI Studio
        </PrimaryButton>
        */}
        <IconButton
          onClick={() => window.open('https://discord.gg/mzqYc69hxP', '_blank', 'noopener,noreferrer')}
          aria-label="Join the Discord community"
          title="Join the Discord community"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.349-1.22.645-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </IconButton>
        <ShareButton />
        <SecondaryButton onClick={handleSaveDesign} disabled={isExporting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {isExporting ? 'Saving…' : 'Save'}
        </SecondaryButton>
        <Present />
        <PreviewTemplate />
        <PrimaryButton className="mfa-nav-primary" onClick={() => setIsExportModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </PrimaryButton>
        {/* <PrimaryButton>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </PrimaryButton> */}
      </RightSection>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        designName={name}
      />
    </Container>
  )
}

export default NavbarEditor
