import React, { useState } from 'react'
import { styled } from 'baseui'
import Navigation from '@components/Navigation'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

// ============================================================================
// SVG ICON COMPONENTS
// ============================================================================

const IconTarget = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)

const IconPalette = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="7" r="2" fill="currentColor" />
    <circle cx="17" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="17" r="2" fill="currentColor" />
    <circle cx="7" cy="12" r="2" fill="currentColor" />
  </svg>
)

const IconZap = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconLock = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconRocket = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
  </svg>
)

const IconBook = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const IconCode = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

const IconGithub = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

const IconMonitor = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const IconSignal = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

const IconShoppingCart = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)

const IconTrendingUp = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

const IconMail = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 5L2 7" />
  </svg>
)

const IconSmartphone = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)

const IconUsers = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconFileText = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="13" x2="8" y2="13" />
    <line x1="12" y1="17" x2="8" y2="17" />
  </svg>
)

const IconLightbulb = (props?: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled('div', {
  minHeight: '100vh',
  background: '#F8FAFC',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
})

const HeroSection = styled('section', {
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  padding: '120px 60px 80px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  '@media (max-width: 768px)': {
    padding: '80px 24px 60px',
  },
})

const HeroPattern = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255,255,255,0.08) 2px, transparent 0)',
  backgroundSize: '50px 50px',
})

const HeroContent = styled('div', {
  position: 'relative',
  zIndex: 1,
})

const VersionBadge = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  padding: '8px 16px',
  borderRadius: '24px',
  marginBottom: '24px',
})

const VersionText = styled('span', {
  color: '#10B981',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: "'Fira Code', monospace",
})

const Title = styled('h1', {
  fontSize: '56px',
  fontWeight: 800,
  color: '#ffffff',
  marginBottom: '24px',
  letterSpacing: '-2px',
  '@media (max-width: 768px)': {
    fontSize: '36px',
    letterSpacing: '-1px',
  },
})

const GradientSpan = styled('span', {
  background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 50%, #8B5CF6 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
})

const Subtitle = styled('p', {
  fontSize: '20px',
  color: 'rgba(255, 255, 255, 0.7)',
  maxWidth: '700px',
  margin: '0 auto 40px',
  lineHeight: 1.7,
})

const QuickNav = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap',
})

const QuickNavLink = styled('a', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  transition: 'all 0.2s',
  cursor: 'pointer',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.2)',
    transform: 'translateY(-2px)',
  },
})

const MainContent = styled('div', {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '60px 24px',
})

const Section = styled('section', {
  marginBottom: '64px',
})

const SectionTitle = styled('h2', {
  fontSize: '28px',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '2px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const SectionIcon = styled('span', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  borderRadius: '8px',
  fontSize: '18px',
})

const SubTitle = styled('h3', {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '12px',
  marginTop: '32px',
})

const Text = styled('p', {
  fontSize: '16px',
  color: '#475569',
  lineHeight: 1.8,
  marginBottom: '20px',
})

const CodeBlockContainer = styled('div', {
  marginBottom: '24px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
})

const CodeBlockHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#1e293b',
  padding: '12px 16px',
})

const CodeBlockInfo = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
})

const WindowDots = styled('div', {
  display: 'flex',
  gap: '6px',
})

const WindowDot = styled('div', ({ $color }: { $color: string }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: $color,
}))

const FileName = styled('span', {
  color: '#94a3b8',
  fontSize: '13px',
  fontFamily: "'Fira Code', monospace",
})

const LanguageBadge = styled('span', {
  color: '#64748b',
  fontSize: '11px',
  fontFamily: "'Fira Code', monospace",
  textTransform: 'uppercase',
  background: '#334155',
  padding: '4px 8px',
  borderRadius: '4px',
  letterSpacing: '0.5px',
})

const CopyButton = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: '#334155',
  border: 'none',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: '#475569',
  },
})

const CopyButtonSuccess = styled('button', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: '#10B981',
  border: 'none',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
})

const CodeContent = styled('pre', {
  background: '#0f172a',
  color: '#e2e8f0',
  padding: '20px',
  margin: 0,
  overflow: 'auto',
  fontSize: '14px',
  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
  lineHeight: 1.7,
  maxHeight: '500px',
  '& code': {
    background: 'transparent',
    padding: 0,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
  },
})

const InlineCode = styled('code', {
  background: '#e2e8f0',
  color: '#0f172a',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: "'Fira Code', monospace",
  fontWeight: 500,
})

const Table = styled('table', {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '24px',
  background: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
})

const Th = styled('th', {
  padding: '14px 18px',
  textAlign: 'left',
  background: '#f8fafc',
  color: '#475569',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '2px solid #e2e8f0',
})

const Td = styled('td', {
  padding: '14px 18px',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '14px',
  color: '#475569',
  verticalAlign: 'top',
})

const AlertBox = styled('div', ({ $type }: { $type: 'info' | 'warning' | 'success' | 'tip' }) => {
  const styles = {
    info: { bg: '#eff6ff', border: '#3b82f6' },
    warning: { bg: '#fffbeb', border: '#f59e0b' },
    success: { bg: '#f0fdf4', border: '#22c55e' },
    tip: { bg: '#faf5ff', border: '#a855f7' },
  }
  const s = styles[$type]
  return {
    display: 'flex',
    gap: '16px',
    background: s.bg,
    borderLeft: `4px solid ${s.border}`,
    padding: '16px 20px',
    borderRadius: '0 12px 12px 0',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.7,
  }
})

const AlertIcon = styled('div', {
  fontSize: '20px',
  flexShrink: 0,
})

const FeatureGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
  marginTop: '24px',
  '@media (max-width: 900px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
  },
})

const FeatureCard = styled('div', {
  background: '#ffffff',
  padding: '24px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: '#10B981',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
    transform: 'translateY(-2px)',
  },
})

const FeatureIcon = styled('div', {
  width: '44px',
  height: '44px',
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '14px',
  fontSize: '22px',
})

const FeatureTitle = styled('h3', {
  fontSize: '16px',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '8px',
})

const FeatureText = styled('p', {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: 1.6,
  margin: 0,
})

const DemoContainer = styled('div', {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
})

const DemoPreview = styled('div', {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  height: '650px',
  background: '#f8fafc',
  marginBottom: '16px',
  overflow: 'hidden',
})

const DemoLabel = styled('p', {
  fontSize: '13px',
  color: '#64748b',
  marginBottom: '8px',
  fontWeight: 500,
})

const UseCaseSection = styled('section', {
  background: '#0f172a',
  margin: '0px',
  maxWidth: '100vw',
  padding: '80px 24px',
  marginBottom: '64px',
})

const UseCaseContainer = styled('div', {
  maxWidth: '900px',
  margin: '0 auto',
})

const UseCaseTitle = styled('h2', {
  fontSize: '28px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '32px',
  textAlign: 'center',
})

const UseCaseGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
  '@media (max-width: 900px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
  },
})

const UseCaseCard = styled('div', {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: '24px',
  borderRadius: '12px',
  transition: 'all 0.2s',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateY(-2px)',
  },
})

const UseCaseIcon = styled('div', {
  fontSize: '28px',
  marginBottom: '12px',
})

const UseCaseCardTitle = styled('h3', {
  fontSize: '16px',
  fontWeight: 600,
  color: '#ffffff',
  marginBottom: '8px',
})

const UseCaseCardText = styled('p', {
  fontSize: '14px',
  color: '#94a3b8',
  lineHeight: 1.6,
  margin: 0,
})

const CTASection = styled('section', {
  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  margin: '0px',
  padding: '80px 24px',
  textAlign: 'center',
  maxWidth: '100vw',
})

const CTATitle = styled('h2', {
  fontSize: '32px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '16px',
})

const CTAText = styled('p', {
  fontSize: '18px',
  color: 'rgba(255, 255, 255, 0.9)',
  maxWidth: '600px',
  margin: '0 auto 32px',
  lineHeight: 1.7,
})

const CTAButton = styled('a', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px 32px',
  background: '#ffffff',
  color: '#059669',
  borderRadius: '8px',
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: '16px',
  transition: 'all 0.2s',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
  },
})

// ============================================================================
// CODE BLOCK COMPONENT WITH COPY BUTTON
// ============================================================================

interface CodeBlockProps {
  code: string
  language?: string
  fileName?: string
}

function CodeBlockWithCopy({ code, language = 'html', fileName }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Map language names to highlighter language codes
  const languageMap: { [key: string]: string } = {
    'HTML': 'html',
    'TSX': 'typescript',
    'Vue': 'html',
    'JavaScript': 'javascript',
    'URL': 'plaintext',
  }

  const highlighterLanguage = languageMap[language] || language.toLowerCase()

  // Highlight the code
  let highlightedCode = code
  try {
    highlightedCode = hljs.highlight(code, { language: highlighterLanguage, ignoreIllegals: true }).value
  } catch (err) {
    console.warn('Syntax highlighting failed:', err)
  }

  return (
    <CodeBlockContainer>
      <CodeBlockHeader>
        <CodeBlockInfo>
          <WindowDots>
            <WindowDot $color="#ff5f57" />
            <WindowDot $color="#febc2e" />
            <WindowDot $color="#28c840" />
          </WindowDots>
          {fileName && <FileName>{fileName}</FileName>}
          <LanguageBadge>{language}</LanguageBadge>
        </CodeBlockInfo>
        {copied ? (
          <CopyButtonSuccess>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </CopyButtonSuccess>
        ) : (
          <CopyButton onClick={handleCopy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Code
          </CopyButton>
        )}
      </CodeBlockHeader>
      <CodeContent dangerouslySetInnerHTML={{ __html: highlightedCode }} />
    </CodeBlockContainer>
  )
}

// ============================================================================
// CODE EXAMPLES
// ============================================================================

const QUICK_START_CODE = `<!-- Add the iframe to your page -->
<iframe
  id="design-editor"
  src="https://design.marketifyall.com/embed?embed=true&callback=true"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>

<!-- Listen for design completion -->
<script>
window.addEventListener('message', function(event) {
  if (event.origin !== 'https://design.marketifyall.com') return;
  
  const { type, data } = event.data;
  
  if (type === 'marketifyall:design-complete') {
    console.log('Design completed!', data.image);
    // data.image contains the base64 PNG
  }
  
  if (type === 'marketifyall:cancelled') {
    console.log('User cancelled');
  }
});
</script>`

const EVENT_LISTENER_CODE = `window.addEventListener('message', function(event) {
  // Security: Always verify the origin
  if (event.origin !== 'https://design.marketifyall.com') return;
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'marketifyall:ready':
      console.log('Editor loaded and ready');
      console.log('Version:', data.version);
      console.log('Features:', data.features);
      break;
      
    case 'marketifyall:design-complete':
      // User clicked "Done" button
      const imageBase64 = data.image;    // Base64 data URL
      const format = data.format;         // 'png' or 'jpeg'
      const width = data.width;           // Image width in pixels
      const height = data.height;         // Image height in pixels
      
      // Display the image
      document.getElementById('preview').src = imageBase64;
      break;
      
    case 'marketifyall:cancelled':
      // User clicked "Cancel" button
      console.log('Editing cancelled by user');
      break;
  }
});`

const SEND_COMMANDS_CODE = `const iframe = document.getElementById('design-editor');
const editorOrigin = 'https://design.marketifyall.com';

// Load an image into the editor
iframe.contentWindow.postMessage({
  type: 'marketifyall:load-image',
  data: { 
    imageUrl: 'https://example.com/product-image.jpg' 
  }
}, editorOrigin);

// Programmatically trigger export
iframe.contentWindow.postMessage({
  type: 'marketifyall:export',
  data: {
    format: 'png',  // 'png' or 'jpeg'
    quality: 1.0    // 0.0 to 1.0 for jpeg
  }
}, editorOrigin);

// Set canvas size
iframe.contentWindow.postMessage({
  type: 'marketifyall:set-size',
  data: { 
    width: 1200, 
    height: 630 
  }
}, editorOrigin);`

const REACT_EXAMPLE_CODE = `import React, { useEffect, useRef, useState } from 'react';

interface DesignData {
  image: string;
  format: string;
  width: number;
  height: number;
}

interface DesignEditorProps {
  onComplete?: (image: string, data: DesignData) => void;
  onCancel?: () => void;
}

function DesignEditor({ onComplete, onCancel }: DesignEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://design.marketifyall.com') return;
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'marketifyall:ready':
          setIsReady(true);
          break;
        case 'marketifyall:design-complete':
          onComplete?.(data.image, data);
          break;
        case 'marketifyall:cancelled':
          onCancel?.();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete, onCancel]);

  const loadImage = (imageUrl: string) => {
    if (!isReady || !iframeRef.current) return;
    
    iframeRef.current.contentWindow?.postMessage({
      type: 'marketifyall:load-image',
      data: { imageUrl }
    }, 'https://design.marketifyall.com');
  };

  return (
    <iframe
      ref={iframeRef}
      src="https://design.marketifyall.com/embed?embed=true&callback=true"
      width="100%"
      height="600"
      frameBorder="0"
      allow="clipboard-write"
      title="Design Editor"
    />
  );
}

export default DesignEditor;`

const FULL_HTML_EXAMPLE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Designer - Powered by Marketifyall</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    
    .header { 
      text-align: center; 
      margin-bottom: 32px; 
      padding: 40px 0;
    }
    .header h1 { 
      font-size: 32px; 
      color: #1a1a1a; 
      margin-bottom: 8px; 
    }
    .header p { color: #666; font-size: 18px; }
    
    .editor-wrapper {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      background: white;
    }
    
    .result-section {
      margin-top: 32px;
      padding: 32px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      display: none;
    }
    .result-section.visible { display: block; }
    .result-section h2 { 
      margin-bottom: 20px; 
      color: #1a1a1a;
      font-size: 24px;
    }
    .result-section img { 
      max-width: 100%; 
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .actions { 
      margin-top: 20px; 
      display: flex; 
      gap: 12px; 
      flex-wrap: wrap;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary { 
      background: #10B981; 
      color: white; 
    }
    .btn-primary:hover { 
      background: #059669; 
      transform: translateY(-1px);
    }
    .btn-secondary { 
      background: #f1f5f9; 
      color: #374151; 
    }
    .btn-secondary:hover { 
      background: #e2e8f0; 
    }
    
    .status-bar {
      padding: 12px 20px;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #64748b;
    }
    .status-bar.ready { color: #10B981; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Product Designer</h1>
      <p>Create your custom design using our embedded editor</p>
    </div>

    <div class="editor-wrapper">
      <iframe
        id="design-editor"
        src="https://design.marketifyall.com/embed?embed=true&callback=true"
        width="100%"
        height="600"
        frameborder="0"
        allow="clipboard-write"
      ></iframe>
      <div class="status-bar" id="status-bar">
        ⏳ Loading editor...
      </div>
    </div>

    <div class="result-section" id="result-section">
      <h2>✅ Your Design is Ready!</h2>
      <img id="result-image" alt="Your completed design" />
      <div class="actions">
        <button class="btn btn-primary" onclick="downloadDesign()">
          ⬇️ Download PNG
        </button>
        <button class="btn btn-secondary" onclick="saveToAccount()">
          💾 Save to Account
        </button>
        <button class="btn btn-secondary" onclick="editAgain()">
          ✏️ Edit Again
        </button>
      </div>
    </div>
  </div>

  <script>
    let currentDesign = null;
    const statusBar = document.getElementById('status-bar');

    // Listen for messages from the editor
    window.addEventListener('message', function(event) {
      // Security: verify origin
      if (event.origin !== 'https://design.marketifyall.com') return;
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'marketifyall:ready':
          statusBar.textContent = '✅ Editor ready';
          statusBar.classList.add('ready');
          console.log('Editor loaded successfully');
          break;
          
        case 'marketifyall:design-complete':
          currentDesign = data;
          document.getElementById('result-image').src = data.image;
          document.getElementById('result-section').classList.add('visible');
          statusBar.textContent = \`✅ Design saved (\${data.width}×\${data.height}px)\`;
          break;
          
        case 'marketifyall:cancelled':
          statusBar.textContent = '❌ Editing cancelled';
          console.log('User cancelled editing');
          break;
      }
    });

    function downloadDesign() {
      if (!currentDesign) return;
      
      const link = document.createElement('a');
      link.download = 'my-design.png';
      link.href = currentDesign.image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    async function saveToAccount() {
      if (!currentDesign) return;
      
      try {
        // Convert base64 to blob
        const response = await fetch(currentDesign.image);
        const blob = await response.blob();
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('design', blob, 'design.png');
        formData.append('width', currentDesign.width);
        formData.append('height', currentDesign.height);
        
        // Upload to your server
        const result = await fetch('/api/designs/upload', {
          method: 'POST',
          body: formData
        });
        
        if (result.ok) {
          alert('✅ Design saved to your account!');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Failed to save:', error);
        alert('❌ Failed to save design. Please try again.');
      }
    }

    function editAgain() {
      document.getElementById('result-section').classList.remove('visible');
      currentDesign = null;
    }
  </script>
</body>
</html>`

const VUE_EXAMPLE_CODE = `<template>
  <div class="design-editor-wrapper">
    <iframe
      ref="editorIframe"
      :src="editorUrl"
      width="100%"
      height="600"
      frameborder="0"
      allow="clipboard-write"
      title="Design Editor"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  theme: { type: String, default: 'light' },
  branding: { type: Boolean, default: true }
});

const emit = defineEmits(['ready', 'complete', 'cancel']);

const editorIframe = ref(null);
const isReady = ref(false);

const editorUrl = computed(() => {
  const params = new URLSearchParams({
    embed: 'true',
    callback: 'true',
    theme: props.theme,
    branding: String(props.branding)
  });
  return \`https://design.marketifyall.com/embed?\${params}\`;
});

function handleMessage(event) {
  if (event.origin !== 'https://design.marketifyall.com') return;
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'marketifyall:ready':
      isReady.value = true;
      emit('ready', data);
      break;
    case 'marketifyall:design-complete':
      emit('complete', data);
      break;
    case 'marketifyall:cancelled':
      emit('cancel');
      break;
  }
}

function loadImage(imageUrl) {
  if (!isReady.value || !editorIframe.value) return;
  
  editorIframe.value.contentWindow.postMessage({
    type: 'marketifyall:load-image',
    data: { imageUrl }
  }, 'https://design.marketifyall.com');
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});

defineExpose({ loadImage, isReady });
</script>`

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function Embed() {
  const [demoUrl] = useState('https://design.marketifyall.com/embed?embed=true&callback=true')

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <Container>
      <Navigation />

      {/* Hero Section */}
      <HeroSection>
        <HeroPattern />
        <HeroContent>
          <VersionBadge>
            <span style={{ color: '#10B981' }}>●</span>
            <VersionText>v1.0.0 • Developer Documentation</VersionText>
          </VersionBadge>
          <Title>
            Embed <GradientSpan>Design Editor</GradientSpan>
          </Title>
          <Subtitle>
            Integrate our powerful design editor into your website or application.
            Give your users the power to create stunning designs without leaving your platform.
          </Subtitle>
          <QuickNav>
            <QuickNavLink onClick={() => scrollToSection('quick-start')}>
              <IconRocket style={{ width: '16px', height: '16px' }} />
              Quick Start
            </QuickNavLink>
            <QuickNavLink onClick={() => scrollToSection('api-reference')}>
              <IconBook style={{ width: '16px', height: '16px' }} />
              API Reference
            </QuickNavLink>
            <QuickNavLink onClick={() => scrollToSection('examples')}>
              <IconCode style={{ width: '16px', height: '16px' }} />
              Examples
            </QuickNavLink>
            <QuickNavLink href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank">
              <IconGithub style={{ width: '16px', height: '16px' }} />
              GitHub
            </QuickNavLink>
          </QuickNav>
        </HeroContent>
      </HeroSection>

      <MainContent>
        {/* Why Embed Section */}
        <Section>
          <SectionTitle>
            <SectionIcon>
              <IconTarget />
            </SectionIcon>
            Why Embed Marketifyall?
          </SectionTitle>
          <Text>
            Add professional design capabilities to your platform in minutes. Perfect for e-commerce,
            marketing platforms, print-on-demand services, and any application where users need to create graphics.
          </Text>
          <FeatureGrid>
            <FeatureCard>
              <FeatureIcon>
                <IconPalette />
              </FeatureIcon>
              <FeatureTitle>Full-Featured Editor</FeatureTitle>
              <FeatureText>
                Complete design editor with templates, 1000+ fonts, stock photos, shapes, and AI tools.
              </FeatureText>
            </FeatureCard>
            <FeatureCard>
              <FeatureIcon>
                <IconZap />
              </FeatureIcon>
              <FeatureTitle>5-Minute Integration</FeatureTitle>
              <FeatureText>
                Just add an iframe and listen for postMessage events. No complex setup required.
              </FeatureText>
            </FeatureCard>
            <FeatureCard>
              <FeatureIcon>
                <IconLock />
              </FeatureIcon>
              <FeatureTitle>Secure by Default</FeatureTitle>
              <FeatureText>
                Cross-origin messaging with configurable allowed origins for maximum security.
              </FeatureText>
            </FeatureCard>
          </FeatureGrid>
        </Section>

        {/* Quick Start Section */}
        <Section id="quick-start">
          <SectionTitle>
            <SectionIcon>
              <IconRocket />
            </SectionIcon>
            Quick Start
          </SectionTitle>
          <Text>
            Get the design editor running in your application with just a few lines of code.
            Copy the snippet below and customize as needed.
          </Text>

          <AlertBox $type="tip">
            <AlertIcon>
              <IconLightbulb />
            </AlertIcon>
            <div>
              <strong>Pro Tip:</strong> Always verify the <InlineCode>event.origin</InlineCode> in
              your message handler to ensure messages are from our editor and not malicious sources.
            </div>
          </AlertBox>

          <CodeBlockWithCopy
            code={QUICK_START_CODE}
            language="HTML"
            fileName="index.html"
          />
        </Section>

        {/* URL Parameters Section */}
        <Section id="api-reference">
          <SectionTitle>
            <SectionIcon>
              <IconZap />
            </SectionIcon>
            URL Parameters
          </SectionTitle>
          <Text>
            Customize the embed behavior by adding query parameters to the iframe URL:
          </Text>

          <Table>
            <thead>
              <tr>
                <Th>Parameter</Th>
                <Th>Type</Th>
                <Th>Default</Th>
                <Th>Description</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td><InlineCode>embed</InlineCode></Td>
                <Td>boolean</Td>
                <Td><InlineCode>false</InlineCode></Td>
                <Td>Enable embed mode. Auto-detected when loaded in iframe.</Td>
              </tr>
              <tr>
                <Td><InlineCode>callback</InlineCode></Td>
                <Td>boolean</Td>
                <Td><InlineCode>false</InlineCode></Td>
                <Td>Enable postMessage callbacks to parent window.</Td>
              </tr>
              <tr>
                <Td><InlineCode>origin</InlineCode></Td>
                <Td>string</Td>
                <Td><InlineCode>*</InlineCode></Td>
                <Td>Restrict callbacks to specific parent origin for security.</Td>
              </tr>
              <tr>
                <Td><InlineCode>branding</InlineCode></Td>
                <Td>boolean</Td>
                <Td><InlineCode>true</InlineCode></Td>
                <Td>Show or hide Marketifyall branding in embed.</Td>
              </tr>
              <tr>
                <Td><InlineCode>image</InlineCode></Td>
                <Td>string</Td>
                <Td><InlineCode>null</InlineCode></Td>
                <Td>URL-encoded image URL to pre-load for editing.</Td>
              </tr>
              <tr>
                <Td><InlineCode>theme</InlineCode></Td>
                <Td>string</Td>
                <Td><InlineCode>light</InlineCode></Td>
                <Td>Editor color theme: <InlineCode>light</InlineCode> or <InlineCode>dark</InlineCode></Td>
              </tr>
            </tbody>
          </Table>

          <AlertBox $type="info">
            <AlertIcon>ℹ️</AlertIcon>
            <div>
              <strong>Example URL:</strong><br />
              <InlineCode>https://design.marketifyall.com/embed?embed=true&callback=true&theme=dark</InlineCode>
            </div>
          </AlertBox>
        </Section>

        {/* Events Reference Section */}
        <Section>
          <SectionTitle>
            <SectionIcon>
              <IconSignal />
            </SectionIcon>
            Events Reference
          </SectionTitle>

          <SubTitle>Events from Editor → Parent Window</SubTitle>
          <Text>
            Listen for these events using <InlineCode>window.addEventListener('message', handler)</InlineCode>:
          </Text>

          <Table>
            <thead>
              <tr>
                <Th>Event Type</Th>
                <Th>Data Payload</Th>
                <Th>Description</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td><InlineCode>marketifyall:ready</InlineCode></Td>
                <Td><InlineCode>{`{ version, features }`}</InlineCode></Td>
                <Td>Editor has fully loaded and is ready to use.</Td>
              </tr>
              <tr>
                <Td><InlineCode>marketifyall:design-complete</InlineCode></Td>
                <Td><InlineCode>{`{ image, format, width, height }`}</InlineCode></Td>
                <Td>User clicked "Done" - contains base64 image data.</Td>
              </tr>
              <tr>
                <Td><InlineCode>marketifyall:cancelled</InlineCode></Td>
                <Td><InlineCode>null</InlineCode></Td>
                <Td>User clicked "Cancel" button.</Td>
              </tr>
            </tbody>
          </Table>

          <CodeBlockWithCopy
            code={EVENT_LISTENER_CODE}
            language="JavaScript"
            fileName="event-handler.js"
          />

          <SubTitle>Commands from Parent Window → Editor</SubTitle>
          <Text>
            Send commands to the editor using <InlineCode>iframe.contentWindow.postMessage()</InlineCode>:
          </Text>

          <Table>
            <thead>
              <tr>
                <Th>Command Type</Th>
                <Th>Data Payload</Th>
                <Th>Description</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td><InlineCode>marketifyall:load-image</InlineCode></Td>
                <Td><InlineCode>{`{ imageUrl }`}</InlineCode></Td>
                <Td>Load an image URL into the editor canvas.</Td>
              </tr>
              <tr>
                <Td><InlineCode>marketifyall:export</InlineCode></Td>
                <Td><InlineCode>{`{ format?, quality? }`}</InlineCode></Td>
                <Td>Programmatically trigger export.</Td>
              </tr>
              <tr>
                <Td><InlineCode>marketifyall:set-size</InlineCode></Td>
                <Td><InlineCode>{`{ width, height }`}</InlineCode></Td>
                <Td>Set the canvas dimensions in pixels.</Td>
              </tr>
            </tbody>
          </Table>

          <CodeBlockWithCopy
            code={SEND_COMMANDS_CODE}
            language="JavaScript"
            fileName="send-commands.js"
          />
        </Section>

        {/* Live Demo Section */}
        <Section>
          <SectionTitle>
            <SectionIcon>
              <IconMonitor />
            </SectionIcon>
            Live Demo
          </SectionTitle>
          <Text>
            Try the embedded editor right here. Click "Done" when finished to see the postMessage in action.
          </Text>
          <DemoContainer>
            <DemoPreview>
              <iframe
                src={demoUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Design Editor Embed Demo"
                style={{ border: 'none' }}
                allow="clipboard-write"
              />
            </DemoPreview>
            <DemoLabel>Embed URL:</DemoLabel>
            <CodeBlockWithCopy
              code={demoUrl}
              language="URL"
            />
          </DemoContainer>
        </Section>

        {/* Examples Section */}
        <Section id="examples">
          <SectionTitle>
            <SectionIcon>
              <IconCode />
            </SectionIcon>
            Framework Examples
          </SectionTitle>

          <SubTitle>React / TypeScript</SubTitle>
          <Text>
            A reusable React component with TypeScript types for the embedded editor:
          </Text>
          <CodeBlockWithCopy
            code={REACT_EXAMPLE_CODE}
            language="TSX"
            fileName="DesignEditor.tsx"
          />

          <SubTitle>Vue 3 (Composition API)</SubTitle>
          <Text>
            A Vue 3 component using the Composition API with full reactivity:
          </Text>
          <CodeBlockWithCopy
            code={VUE_EXAMPLE_CODE}
            language="Vue"
            fileName="DesignEditor.vue"
          />

          <SubTitle>Complete HTML Example</SubTitle>
          <Text>
            A production-ready HTML example with download and save functionality:
          </Text>
          <CodeBlockWithCopy
            code={FULL_HTML_EXAMPLE}
            language="HTML"
            fileName="product-designer.html"
          />
        </Section>
      </MainContent>

      {/* Use Cases Section */}
      <UseCaseSection>
        <UseCaseContainer>
          <UseCaseTitle>Perfect For These Use Cases</UseCaseTitle>
          <UseCaseGrid>
            <UseCaseCard>
              <UseCaseIcon>
                <IconShoppingCart style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>E-Commerce</UseCaseCardTitle>
              <UseCaseCardText>
                Let customers customize products with their own designs before purchase.
              </UseCaseCardText>
            </UseCaseCard>
            <UseCaseCard>
              <UseCaseIcon>
                <IconTrendingUp style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>Print on Demand</UseCaseCardTitle>
              <UseCaseCardText>
                Power your POD platform with professional design tools for merchandise.
              </UseCaseCardText>
            </UseCaseCard>
            <UseCaseCard>
              <UseCaseIcon>
                <IconMail style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>Email Marketing</UseCaseCardTitle>
              <UseCaseCardText>
                Enable users to create custom email headers and graphics.
              </UseCaseCardText>
            </UseCaseCard>
            <UseCaseCard>
              <UseCaseIcon>
                <IconSmartphone style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>Social Media Tools</UseCaseCardTitle>
              <UseCaseCardText>
                Add design creation to your social media management platform.
              </UseCaseCardText>
            </UseCaseCard>
            <UseCaseCard>
              <UseCaseIcon>
                <IconUsers style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>Education</UseCaseCardTitle>
              <UseCaseCardText>
                Let students create presentations and graphics within your LMS.
              </UseCaseCardText>
            </UseCaseCard>
            <UseCaseCard>
              <UseCaseIcon>
                <IconFileText style={{ width: '24px', height: '24px' }} />
              </UseCaseIcon>
              <UseCaseCardTitle>CMS & Blogging</UseCaseCardTitle>
              <UseCaseCardText>
                Enable content creators to design featured images in your CMS.
              </UseCaseCardText>
            </UseCaseCard>
          </UseCaseGrid>
        </UseCaseContainer>
      </UseCaseSection>

      {/* CTA Section */}
      <CTASection>
        <CTATitle>Ready to Integrate?</CTATitle>
        <CTAText>
          Start embedding the design editor in your application today.
          It's free, open-source, and takes just minutes to set up.
        </CTAText>
        <CTAButton
          href="https://github.com/Aadilhassan/Marketifyall-design-Editor"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconGithub style={{ width: '20px', height: '20px' }} />
          View on GitHub →
        </CTAButton>
      </CTASection>
    </Container>
  )
}

export default Embed
