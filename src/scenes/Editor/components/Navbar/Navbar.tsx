import { styled } from 'baseui'
import { useEditor } from '@nkyo/scenify-sdk'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import useAppContext from '@/hooks/useAppContext'
import { useEmbedMode } from '@/contexts/EmbedContext'
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
  background: 'transparent',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3f4f6',
    color: '#374151',
  },
})

const SecondaryButton = styled('button', {
  padding: '8px 16px',
  borderRadius: '8px',
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

const PrimaryButton = styled('button', {
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s',
  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
  ':hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.4)',
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
  const { currentTemplate } = useAppContext()
  const { config, sendImageToParent, notifyCancel } = useEmbedMode()
  const [name, setName] = useState('Untitled design')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleGoHome = () => {
    history.push('/')
  }

  useEffect(() => {
    if (currentTemplate) {
      setName(currentTemplate.name)
    }
  }, [currentTemplate])

  // Handle "Done" button click in embed mode
  const handleEmbedDone = async () => {
    if (!editor) return

    setIsExporting(true)
    try {
      // Export canvas as data URL using the SDK's toPNG method
      // @ts-ignore - SDK method
      const dataUrl = await editor.toPNG({})
      
      // Send image to parent window
      sendImageToParent(dataUrl, {
        name: name,
        // @ts-ignore
        width: editor.frame?.width,
        // @ts-ignore
        height: editor.frame?.height,
      })
    } catch (error) {
      console.error('Failed to export image:', error)
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
          <DoneButton onClick={handleEmbedDone} disabled={isExporting}>
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
      </LeftSection>

      <CenterSection>
        <NameInput
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          placeholder="Untitled design"
        />
      </CenterSection>

      <RightSection>
        <IconButton title="Help">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </IconButton>
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
