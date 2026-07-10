import { styled } from 'baseui'
import { useEditor } from '@nkyo/scenify-sdk'
import { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import useAppContext from '@/hooks/useAppContext'
import { PanelType } from '@/constants/app-options'
import { useEmbedMode } from '@/contexts/EmbedContext'
import { useCredits } from '@/contexts/CreditsContext'
import { fail, ignoreError } from '@/lib/logger'
import { notify } from '@/lib/notify'
import { APP_URL } from '@/lib/supabase'
import { resolveEditorSession, demoBlocked } from '@/lib/workspaceContext'
import { saveDesignProject, uploadPreview, isUuid } from '@/services/designProjects'
import { useSaveManager } from '@/contexts/SaveManagerContext'
import SaveStatusChip from '@/components/SaveStatusChip'
import Resize from './components/Resize'
import PreviewTemplate from './components/PreviewTemplate'
import History from './components/History'
import ExportModal from './components/ExportModal'

const Container = styled('div', {
  height: '64px',
  background: '#ffffff',
  display: 'flex',
  padding: '0 20px',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
})

const LeftSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
})

const Logo = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '8px',
  transition: 'background 0.2s',
  ':hover': {
    background: '#f3f4f6',
  },
})

const LogoIcon = styled('div', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
})

const LogoText = styled('span', {
  fontSize: '18px',
  fontWeight: 700,
  color: '#1f2937',
  letterSpacing: '-0.5px',
})

const Divider = styled('div', {
  width: '1px',
  height: '24px',
  background: '#e5e7eb',
})

const CenterSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const NameInput = styled('input', {
  border: 'none',
  background: 'transparent',
  fontSize: '15px',
  fontWeight: 500,
  color: '#374151',
  padding: '8px 12px',
  borderRadius: '6px',
  outline: 'none',
  minWidth: '200px',
  transition: 'background 0.2s',
  ':hover': {
    background: '#f3f4f6',
  },
  ':focus': {
    background: '#f3f4f6',
  },
})

const RightSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const IconButton = styled('button', {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  border: 'none',
  background: '#f3f4f6', // Light gray background by default
  color: '#374151',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#e5e7eb', // Slightly darker on hover
    color: '#111827',
  },
})

const SecondaryButton = styled('button', {
  padding: '8px 16px',
  borderRadius: '0',
  border: '1px solid #e5e7eb',
  background: '#ffffff',
  color: '#374151',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#d1d5db',
  },
})

const CreditBadge = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  borderRadius: '20px',
  border: '1px solid #e5e7eb',
  background: '#f9fafb',
  color: '#374151',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3f0ff',
    borderColor: '#5A3FFF',
    color: '#5A3FFF',
  },
})

const PrimaryButton = styled('button', {
  padding: '8px 20px',
  borderRadius: '0',
  border: 'none',
  background: '#5A3FFF',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s',
  ':hover': {
    background: '#4a32db',
  },
})

const DoneButton = styled('button', {
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  background: '#10B981',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s',
  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
  ':hover': {
    background: '#059669',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(16, 185, 129, 0.4)',
  },
})

const CancelButton = styled('button', {
  padding: '10px 20px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  background: '#ffffff',
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f9fafb',
    borderColor: '#d1d5db',
    color: '#374151',
  },
})

function NavbarEditor() {
  const editor = useEditor()
  const history = useHistory()
  const { currentTemplate, setActivePanel } = useAppContext()
  const { config, notifySaved, notifyCancel } = useEmbedMode()
  const { balance } = useCredits()
  const saveManager = useSaveManager()
  const { id: routeId } = useParams<{ id?: string }>()
  const [name, setName] = useState('Untitled design')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // Set after the first successful insert so repeated saves update in place.
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)

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

      const projectId = savedProjectId ?? (routeId && isUuid(routeId) ? routeId : null)
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

      if (config.isEmbedMode) {
        notifySaved(savedId)
      } else {
        notify('Design saved', 'positive')
        if (routeId !== savedId) history.push(`/design/${savedId}/edit`)
      }
    } catch (error) {
      fail('navbar', 'Could not save your design — please try again', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle cancel in embed mode
  const handleEmbedCancel = () => {
    notifyCancel()
  }

  // If in embed mode, show simplified navbar with Done button
  if (config.isEmbedMode) {
    return (
      <Container>
        <LeftSection>
          {config.showBranding && (
            <>
              <Logo style={{ cursor: 'default' }}>
                <LogoIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </LogoIcon>
                <LogoText>Marketifyall</LogoText>
              </Logo>
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
          <CancelButton onClick={handleEmbedCancel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Cancel
          </CancelButton>
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
                Done
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
      <LeftSection>
        <Logo onClick={handleGoHome}>
          <LogoIcon>
            M
          </LogoIcon>
          <LogoText>Design Editor</LogoText>
        </Logo>
        <Divider />
        <Resize />
        <History />
        <SaveStatusChip manager={saveManager} />
      </LeftSection>

      <CenterSection>
        <NameInput
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Untitled design"
        />
      </CenterSection>

      <RightSection>
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
        <PrimaryButton
          onClick={() => window.open('https://discord.gg/mzqYc69hxP', '_blank', 'noopener,noreferrer')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.598.349-1.22.645-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          Join Discord
        </PrimaryButton>
        <SecondaryButton onClick={handleSaveDesign} disabled={isExporting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {isExporting ? 'Saving…' : 'Save'}
        </SecondaryButton>
        <SecondaryButton onClick={() => setIsExportModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </SecondaryButton>
        <PreviewTemplate />
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
