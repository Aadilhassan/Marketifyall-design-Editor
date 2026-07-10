import { styled } from 'baseui'
import { useState, useEffect } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import useAppContext from '@/hooks/useAppContext'
import { useEmbedMode } from '@/contexts/EmbedContext'
import { useCredits } from '@/contexts/CreditsContext'
import { fail, ignoreError } from '@/lib/logger'
import { APP_URL } from '@/lib/supabase'
import { resolveEditorSession } from '@/lib/workspaceContext'
import { saveDesignProject, uploadPreview } from '@/services/designProjects'

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

const CenterSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const RightSection = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
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

const CreditBadge = styled('div', {
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

function EmbedNavbar() {
  const editor = useEditor()
  const { currentTemplate } = useAppContext()
  const { notifySaved, notifyCancel } = useEmbedMode()
  const { balance } = useCredits()
  const [name, setName] = useState('Untitled design')
  const [isExporting, setIsExporting] = useState(false)
  // Set after the first successful insert so repeated saves update in place
  // (the /embed route has no design id in the URL).
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (currentTemplate) {
      setName(currentTemplate.name)
    }
  }, [currentTemplate])

  // Persist the design to the app's design_projects table, then notify the
  // parent frame (`mfa:saved`) so it can navigate back to the project grid.
  const handleDone = async () => {
    if (!editor) return

    setIsExporting(true)
    try {
      const session = await resolveEditorSession()
      if (!session) return // resolveEditorSession is redirecting to login
      // NOTE(Task 8): demo-mode guard goes here (session.isDemo → demo prompt).
      if (!session.workspaceId) {
        fail('embed', 'Could not save — no workspace found for your account')
        return
      }

      // Same scenify export the IndexedDB autosave uses (Editor.tsx buildSerialize).
      const designJson = (editor as any).exportToJSON?.()
      if (!designJson) {
        fail('embed', 'Could not save the design')
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

      const savedId = await saveDesignProject({
        id: savedProjectId,
        workspaceId: session.workspaceId,
        userId: session.userId,
        name,
        designJson,
        previewUrl,
      })
      if (!savedId) {
        fail('embed', 'Could not save the design')
        return
      }
      setSavedProjectId(savedId)
      notifySaved(savedId)
    } catch (error) {
      fail('embed', 'Could not save the design', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCancel = () => {
    notifyCancel()
  }

  return (
    <Container>
      <LeftSection>
        <NameInput
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Untitled design"
        />
      </LeftSection>

      <CenterSection>
        {balance && (
          <CreditBadge>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {balance.total} credits
          </CreditBadge>
        )}
      </CenterSection>

      <RightSection>
        <CancelButton onClick={handleCancel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Cancel
        </CancelButton>
        <DoneButton onClick={handleDone} disabled={isExporting}>
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

export default EmbedNavbar
