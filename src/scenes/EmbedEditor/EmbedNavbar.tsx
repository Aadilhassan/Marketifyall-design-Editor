import { styled } from 'baseui'
import { useState, useEffect } from 'react'
import { useEditor } from '@nkyo/scenify-sdk'
import useAppContext from '@/hooks/useAppContext'
import { useEmbedMode } from '@/contexts/EmbedContext'
import { useCredits } from '@/contexts/CreditsContext'

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
  const { sendImageToParent, notifyCancel } = useEmbedMode()
  const { balance } = useCredits()
  const [name, setName] = useState('Untitled design')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (currentTemplate) {
      setName(currentTemplate.name)
    }
  }, [currentTemplate])

  const handleDone = async () => {
    if (!editor) return

    setIsExporting(true)
    try {
      const dataUrl = await (editor as any).toPNG({})

      sendImageToParent(dataUrl, {
        name: name,
        width: (editor as any).frame?.width,
        height: (editor as any).frame?.height,
      })
    } catch (error) {
      // silently handled
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
