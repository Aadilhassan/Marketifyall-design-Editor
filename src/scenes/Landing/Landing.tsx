import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { styled } from 'baseui'

// Styled Components
const Container = styled('div', {
  minHeight: '100vh',
  background: '#F5F3EF',
  fontFamily: "'Inter', 'Poppins', sans-serif",
  overflowX: 'hidden',
})

const Nav = styled('nav', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 60px',
  maxWidth: '1400px',
  margin: '0 auto',
  gap: '40px',
  '@media (max-width: 768px)': {
    padding: '16px 24px',
    gap: '20px',
  },
})

const Logo = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
})

const LogoIcon = styled('div', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #ec7855ff 0%, #aaa55cff 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
})

const NavLinks = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  flex: 1,
  justifyContent: 'center',
  '@media (max-width: 968px)': {
    display: 'none',
  },
})

const NavLink = styled('a', {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'color 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    color: '#FF6B5B',
  },
})

const NavButton = styled('button', {
  padding: '12px 24px',
  borderRadius: '4px',
  border: '2px solid #1a1a1a',
  background: 'transparent',
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    background: '#1a1a1a',
    color: '#ffffff',
  },
})

const HeroSection = styled('section', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '60px',
  padding: '80px 60px 120px',
  maxWidth: '1400px',
  margin: '0 auto',
  alignItems: 'center',
  '@media (max-width: 968px)': {
    gridTemplateColumns: '1fr',
    padding: '40px 24px 80px',
  },
})

const HeroContent = styled('div', {
  maxWidth: '600px',
})

const HeroTitle = styled('h1', {
  fontSize: '56px',
  fontWeight: 700,
  color: '#1a1a1a',
  lineHeight: 1.15,
  marginBottom: '32px',
  letterSpacing: '-2px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '36px',
  },
})

const Divider = styled('div', {
  width: '100%',
  height: '1px',
  background: '#1a1a1a',
  margin: '32px 0',
})

const HeroSubtitle = styled('p', {
  fontSize: '18px',
  color: '#4a4a4a',
  lineHeight: 1.7,
  marginBottom: '40px',
  fontFamily: "'Georgia', serif",
})

const HighlightText = styled('span', {
  fontWeight: 700,
  color: '#1a1a1a',
})

const CTAButtons = styled('div', {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  marginTop: '32px',
})

const PrimaryButton = styled('button', {
  padding: '16px 32px',
  borderRadius: '4px',
  border: 'none',
  background: '#FF6B5B',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  boxShadow: '4px 4px 0px #1a1a1a',
  ':hover': {
    transform: 'translate(-2px, -2px)',
    boxShadow: '6px 6px 0px #1a1a1a',
  },
})

const SecondaryButton = styled('button', {
  padding: '16px 32px',
  borderRadius: '4px',
  border: '2px solid #1a1a1a',
  background: 'transparent',
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    background: '#1a1a1a',
    color: '#ffffff',
  },
})

const HeroGraphic = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  '@media (max-width: 968px)': {
    display: 'none',
  },
})

const GraphicContainer = styled('div', {
  position: 'relative',
  width: '400px',
  height: '500px',
})

const GraphicShape1 = styled('div', {
  position: 'absolute',
  top: '0',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '200px',
  height: '200px',
  borderRadius: '0 0 100px 100px',
  background: '#FF7B7B',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const GraphicShape2 = styled('div', {
  position: 'absolute',
  top: '0',
  right: '20px',
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  background: '#8B7BF7',
})

const GraphicStripes = styled('div', {
  position: 'absolute',
  top: '180px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '120px',
  height: '200px',
  display: 'flex',
  gap: '8px',
})

const Stripe = styled('div', {
  width: '16px',
  height: '100%',
  background: '#1a1a1a',
})

const GraphicCheckerboard = styled('div', {
  position: 'absolute',
  top: '200px',
  right: '0',
  width: '150px',
  height: '150px',
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gridTemplateRows: 'repeat(5, 1fr)',
})

const CheckerCell = styled('div', ({ $filled }: { $filled: boolean }) => ({
  background: $filled ? '#2ECC71' : '#F5F3EF',
}))

const GraphicSunburst = styled('div', {
  position: 'absolute',
  bottom: '0',
  right: '40px',
  width: '120px',
  height: '120px',
  background: '#FFD93D',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
})

const StarShape = styled('div', {
  position: 'absolute',
  top: '80px',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#1a1a1a',
})

const FeaturesSection = styled('section', {
  background: '#ffffff',
  padding: '120px 60px',
  '@media (max-width: 768px)': {
    padding: '60px 24px',
  },
})

const DetailedFeatureSection = styled('section', {
  background: '#F5F3EF',
  padding: '100px 60px',
  '@media (max-width: 768px)': {
    padding: '60px 24px',
  },
})

const FeatureRow = styled('div', ({ $reverse }: { $reverse?: boolean }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '80px',
  maxWidth: '1200px',
  margin: '0 auto 100px',
  alignItems: 'center',
  direction: $reverse ? 'rtl' : 'ltr',
  '@media (max-width: 968px)': {
    gridTemplateColumns: '1fr',
    gap: '40px',
    direction: 'ltr',
  },
}))

const FeatureRowContent = styled('div', {
  direction: 'ltr',
})

const FeatureRowTitle = styled('h3', {
  fontSize: '36px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '20px',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '28px',
  },
})

const FeatureRowDescription = styled('p', {
  fontSize: '17px',
  color: '#4a4a4a',
  lineHeight: 1.8,
  marginBottom: '24px',
  fontFamily: "'Georgia', serif",
})

const FeatureList = styled('ul', {
  listStyle: 'none',
  padding: 0,
  margin: 0,
})

const FeatureListItem = styled('li', {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  marginBottom: '16px',
  fontSize: '15px',
  color: '#4a4a4a',
  lineHeight: 1.6,
})

const CheckIcon = styled('div', {
  width: '24px',
  height: '24px',
  background: '#2ECC71',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: '2px',
})

const FeatureRowImage = styled('div', ({ $bg }: { $bg: string }) => ({
  direction: 'ltr',
  background: $bg,
  borderRadius: '0',
  border: '2px solid #1a1a1a',
  boxShadow: '8px 8px 0px #1a1a1a',
  height: '400px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  '@media (max-width: 768px)': {
    height: '280px',
  },
}))

const FeatureImageContent = styled('div', {
  padding: '40px',
  textAlign: 'center',
  color: '#ffffff',
})

const StatsSection = styled('section', {
  background: '#1a1a1a',
  padding: '80px 60px',
  '@media (max-width: 768px)': {
    padding: '60px 24px',
  },
})

const StatsContainer = styled('div', {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '40px',
  '@media (max-width: 968px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 480px)': {
    gridTemplateColumns: '1fr',
  },
})

const StatItem = styled('div', {
  textAlign: 'center',
})

const StatNumber = styled('div', {
  fontSize: '56px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '8px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '40px',
  },
})

const StatLabel = styled('div', {
  fontSize: '14px',
  color: 'rgba(255, 255, 255, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Courier New', monospace",
})

const CTASection = styled('section', {
  background: '#FF6B5B',
  padding: '100px 60px',
  textAlign: 'center',
  '@media (max-width: 768px)': {
    padding: '60px 24px',
  },
})

const CTATitle = styled('h2', {
  fontSize: '48px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '20px',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '32px',
  },
})

const CTASubtitle = styled('p', {
  fontSize: '18px',
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '40px',
  maxWidth: '600px',
  margin: '0 auto 40px',
  fontFamily: "'Georgia', serif",
})

const CTAButtonWhite = styled('button', {
  padding: '18px 40px',
  borderRadius: '4px',
  border: '2px solid #ffffff',
  background: '#ffffff',
  color: '#FF6B5B',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    background: 'transparent',
    color: '#ffffff',
  },
})

const FeaturesContainer = styled('div', {
  maxWidth: '1200px',
  margin: '0 auto',
})

const SectionHeader = styled('div', {
  textAlign: 'center',
  marginBottom: '80px',
})

const SectionTitle = styled('h2', {
  fontSize: '48px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '16px',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '32px',
  },
})

const SectionSubtitle = styled('p', {
  fontSize: '18px',
  color: '#6b7280',
  maxWidth: '600px',
  margin: '0 auto',
  fontFamily: "'Georgia', serif",
})

const FeaturesGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '40px',
  '@media (max-width: 968px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 640px)': {
    gridTemplateColumns: '1fr',
  },
})

const FeatureCard = styled('div', {
  padding: '40px 32px',
  background: '#F5F3EF',
  border: '1px solid #e5e5e5',
  transition: 'all 0.3s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '8px 8px 0px #1a1a1a',
  },
})

const FeatureIcon = styled('div', ({ $bg }: { $bg: string }) => ({
  width: '56px',
  height: '56px',
  background: $bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '24px',
  color: '#ffffff',
}))

const FeatureTitle = styled('h3', {
  fontSize: '20px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '12px',
  fontFamily: "'Georgia', serif",
})

const FeatureDescription = styled('p', {
  fontSize: '15px',
  color: '#6b7280',
  lineHeight: 1.7,
})

const PreviewSection = styled('section', {
  background: '#F5F3EF',
  padding: '80px 60px',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const PreviewContainer = styled('div', {
  maxWidth: '1200px',
  margin: '0 auto',
})

const PreviewCard = styled('div', {
  background: '#ffffff',
  border: '2px solid #1a1a1a',
  boxShadow: '8px 8px 0px #1a1a1a',
  overflow: 'hidden',
})

const PreviewHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px 20px',
  background: '#F5F3EF',
  borderBottom: '2px solid #1a1a1a',
})

const PreviewDot = styled('div', ({ $color }: { $color: string }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: $color,
  border: '1px solid #1a1a1a',
}))

const PreviewContent = styled('div', {
  display: 'flex',
  height: '450px',
  '@media (max-width: 768px)': {
    height: '300px',
  },
})

const PreviewSidebar = styled('div', {
  width: '70px',
  background: '#F5F3EF',
  borderRight: '2px solid #1a1a1a',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 0',
  gap: '8px',
})

const SidebarIcon = styled('div', ({ $active }: { $active?: boolean }) => ({
  width: '44px',
  height: '44px',
  background: $active ? '#FF6B5B' : 'transparent',
  border: $active ? '2px solid #1a1a1a' : '2px solid transparent',
  color: $active ? '#ffffff' : '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
}))

const PreviewCanvas = styled('div', {
  flex: 1,
  background: '#e5e5e5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const CanvasFrame = styled('div', {
  width: '350px',
  height: '350px',
  background: '#ffffff',
  border: '2px solid #1a1a1a',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  '@media (max-width: 768px)': {
    width: '200px',
    height: '200px',
  },
})

const CanvasText = styled('div', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1a1a1a',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '16px',
  },
})

const CanvasSubtext = styled('div', {
  fontSize: '14px',
  color: '#6b7280',
  fontFamily: "'Courier New', monospace",
})

const Footer = styled('footer', {
  background: '#1a1a1a',
  padding: '60px 60px',
  color: '#ffffff',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const FooterContent = styled('div', {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '24px',
})

const FooterText = styled('p', {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '14px',
  fontFamily: "'Courier New', monospace",
})

const FooterLinks = styled('div', {
  display: 'flex',
  gap: '24px',
})

const FooterLink = styled('a', {
  color: 'rgba(255, 255, 255, 0.6)',
  textDecoration: 'none',
  fontSize: '14px',
  transition: 'color 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    color: '#ffffff',
  },
})

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'AI-Powered Design',
    description: 'Let AI create stunning designs for you. Just describe what you want and watch the magic happen.',
    bg: '#8B7BF7',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: 'Professional Templates',
    description: 'Start with beautiful templates for social media, presentations, marketing materials, and more.',
    bg: '#FF6B5B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    title: 'Stock Photo Library',
    description: 'Access a vast library of high-quality stock photos from Pexels, completely free to use.',
    bg: '#2ECC71',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    ),
    title: 'Advanced Typography',
    description: 'Beautiful typography with 1000+ Google Fonts. Create stunning text effects and styles.',
    bg: '#FFD93D',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Shapes and Elements',
    description: 'Thousands of shapes, icons, and design elements to make your creations stand out.',
    bg: '#FF7B7B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Export Anywhere',
    description: 'Download your designs in multiple formats. PNG, JPG, PDF ready for any platform.',
    bg: '#1a1a1a',
  },
]

function Landing() {
  const history = useHistory()

  useEffect(() => {
    // Set page title and meta tags for SEO
    document.title = 'Design Editor by Marketifyall - Free Open-Source Canva Alternative with AI'
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', 'Free open-source design editor with AI-powered features. A true Canva alternative with stock photos, 1000+ fonts, video editing, and professional templates. No watermarks, no limits, 100% free forever. By QuickShift Labs & Marketifyall.')
    
    // Add keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]')
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta')
      metaKeywords.setAttribute('name', 'keywords')
      document.head.appendChild(metaKeywords)
    }
    metaKeywords.setAttribute('content', 'canva alternative, free design editor, open source design tool, graphic design software, AI design tool, online design editor, free canva, design editor, marketifyall, quickshift labs')
    
    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'Design Editor by Marketifyall - Free Open-Source Canva Alternative' },
      { property: 'og:description', content: 'Free open-source design editor with AI. Create stunning designs without limits.' },
      { property: 'og:url', content: 'https://design.marketifyall.com/' },
      { property: 'og:type', content: 'website' },
    ]
    
    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute('property', tag.property)
        document.head.appendChild(element)
      }
      element.setAttribute('content', tag.content)
    })
  }, [])

  const handleStartDesigning = () => {
    history.push('/design')
  }

  // Generate checkerboard pattern
  const checkerPattern = []
  for (let i = 0; i < 25; i++) {
    const row = Math.floor(i / 5)
    const col = i % 5
    checkerPattern.push((row + col) % 2 === 0)
  }

  return (
    <Container>
      {/* Navigation */}
      <Nav>
        <Logo style={{ cursor: 'pointer' }} onClick={() => history.push('/')}>
          <LogoIcon>
           M
          </LogoIcon>
          Design Editor
        </Logo>
        <NavLinks>
          <NavLink onClick={() => history.push('/')}>Home</NavLink>
          <NavLink onClick={() => history.push('/features')}>Features</NavLink>
          <NavLink onClick={() => history.push('/developers')}>Developers</NavLink>
          <NavLink onClick={() => history.push('/about')}>About</NavLink>
          <NavLink onClick={() => history.push('/contact')}>Contact</NavLink>
        </NavLinks>
        <NavButton onClick={handleStartDesigning}>Start Designing</NavButton>
      </Nav>

      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            Open-Source Design Editor — A Free Canva Alternative with AI
          </HeroTitle>
          <Divider />
          <HeroSubtitle>
            <HighlightText>Design Editor by Marketifyall</HighlightText> is a powerful, free, and open-source 
            graphic design tool with built-in AI assistance. Create stunning social media graphics, marketing materials, 
            and professional designs — no subscription, no watermarks, no restrictions. Built by <HighlightText>QuickShift Labs</HighlightText>.
          </HeroSubtitle>
          <Divider />
          <CTAButtons>
            <PrimaryButton onClick={handleStartDesigning}>
              Start Designing
            </PrimaryButton>
            <SecondaryButton onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See Features
            </SecondaryButton>
          </CTAButtons>
        </HeroContent>
        <HeroGraphic>
          <GraphicContainer>
            <GraphicShape2 />
            <GraphicShape1>
              <StarShape>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
                </svg>
              </StarShape>
            </GraphicShape1>
            <GraphicStripes>
              <Stripe />
              <Stripe />
              <Stripe />
              <Stripe />
              <Stripe />
            </GraphicStripes>
            <GraphicCheckerboard>
              {checkerPattern.map((filled, i) => (
                <CheckerCell key={i} $filled={filled} />
              ))}
            </GraphicCheckerboard>
            <GraphicSunburst>
              <svg width="80" height="80" viewBox="0 0 80 80">
                {[...Array(12)].map((_, i) => (
                  <path
                    key={i}
                    d={`M40,40 L${40 + 40 * Math.cos((i * 30 * Math.PI) / 180)},${40 + 40 * Math.sin((i * 30 * Math.PI) / 180)} L${40 + 40 * Math.cos(((i * 30 + 15) * Math.PI) / 180)},${40 + 40 * Math.sin(((i * 30 + 15) * Math.PI) / 180)} Z`}
                    fill={i % 2 === 0 ? '#FF6B5B' : '#FFD93D'}
                  />
                ))}
              </svg>
            </GraphicSunburst>
          </GraphicContainer>
        </HeroGraphic>
      </HeroSection>

      {/* Preview Section */}
      <PreviewSection>
        <PreviewContainer>
          <PreviewCard>
            <PreviewHeader>
              <PreviewDot $color="#ff5f57" />
              <PreviewDot $color="#febc2e" />
              <PreviewDot $color="#28c840" />
            </PreviewHeader>
            <PreviewContent>
              <PreviewSidebar>
                <SidebarIcon $active>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                </SidebarIcon>
                <SidebarIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                  </svg>
                </SidebarIcon>
                <SidebarIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </SidebarIcon>
                <SidebarIcon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </SidebarIcon>
              </PreviewSidebar>
              <PreviewCanvas>
                <CanvasFrame>
                  <CanvasText>Your Design Here</CanvasText>
                  <CanvasSubtext>Click "Start Designing" to begin</CanvasSubtext>
                </CanvasFrame>
              </PreviewCanvas>
            </PreviewContent>
          </PreviewCard>
        </PreviewContainer>
      </PreviewSection>

      {/* Features Section */}
      <FeaturesSection id="features">
        <FeaturesContainer>
          <SectionHeader>
            <SectionTitle>Everything you need to create</SectionTitle>
            <SectionSubtitle>
              Powerful features that make design accessible to everyone, from beginners to professionals.
            </SectionSubtitle>
          </SectionHeader>
          <FeaturesGrid>
            {FEATURES.map((feature, index) => (
              <FeatureCard key={index}>
                <FeatureIcon $bg={feature.bg}>
                  {feature.icon}
                </FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </FeaturesContainer>
      </FeaturesSection>

      {/* Detailed Features */}
      <DetailedFeatureSection>
        {/* AI Design Feature */}
        <FeatureRow>
          <FeatureRowContent>
            <FeatureRowTitle>AI-Powered Design Assistant</FeatureRowTitle>
            <FeatureRowDescription>
              Our intelligent AI understands your creative vision and helps bring it to life. 
              Simply describe what you want to create, and watch as the AI generates professional 
              designs tailored to your needs.
            </FeatureRowDescription>
            <FeatureList>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Natural language prompts - just describe your design idea
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Smart element placement and color suggestions
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Automatic layout optimization for any format
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Multiple AI models including GPT-4 and Claude
              </FeatureListItem>
            </FeatureList>
          </FeatureRowContent>
          <FeatureRowImage $bg="#8B7BF7">
            <FeatureImageContent>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                AI Design Engine
              </div>
            </FeatureImageContent>
          </FeatureRowImage>
        </FeatureRow>

        {/* Stock Photos Feature */}
        <FeatureRow $reverse>
          <FeatureRowContent>
            <FeatureRowTitle>Millions of Stock Photos</FeatureRowTitle>
            <FeatureRowDescription>
              Access an extensive library of high-quality, royalty-free images from Pexels. 
              Find the perfect photo for any project without leaving the editor.
            </FeatureRowDescription>
            <FeatureList>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Millions of free, high-resolution photos
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Smart search with keyword suggestions
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                No attribution required for commercial use
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Curated collections for trending topics
              </FeatureListItem>
            </FeatureList>
          </FeatureRowContent>
          <FeatureRowImage $bg="#2ECC71">
            <FeatureImageContent>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                Photo Library
              </div>
            </FeatureImageContent>
          </FeatureRowImage>
        </FeatureRow>

        {/* Typography Feature */}
        <FeatureRow>
          <FeatureRowContent>
            <FeatureRowTitle>Professional Typography</FeatureRowTitle>
            <FeatureRowDescription>
              Create stunning text designs with access to over 1,000 Google Fonts. 
              From elegant serifs to modern sans-serifs, find the perfect typeface for your brand.
            </FeatureRowDescription>
            <FeatureList>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                1000+ Google Fonts with instant preview
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Advanced text styling and effects
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Font pairing suggestions
              </FeatureListItem>
              <FeatureListItem>
                <CheckIcon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </CheckIcon>
                Custom spacing, shadows, and outlines
              </FeatureListItem>
            </FeatureList>
          </FeatureRowContent>
          <FeatureRowImage $bg="#FFD93D">
            <FeatureImageContent style={{ color: '#1a1a1a' }}>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
              <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                Typography Tools
              </div>
            </FeatureImageContent>
          </FeatureRowImage>
        </FeatureRow>
      </DetailedFeatureSection>

      {/* Stats Section */}
      <StatsSection>
        <StatsContainer>
          <StatItem>
            <StatNumber>100%</StatNumber>
            <StatLabel>Open Source</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>1M+</StatNumber>
            <StatLabel>Stock Photos</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>1000+</StatNumber>
            <StatLabel>Google Fonts</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>$0</StatNumber>
            <StatLabel>Forever Free</StatLabel>
          </StatItem>
        </StatsContainer>
      </StatsSection>

      {/* CTA Section */}
      <CTASection>
        <CTATitle>Ready to create without limits?</CTATitle>
        <CTASubtitle>
          Join the open-source community and experience true creative freedom. No credit card required, no watermarks, no restrictions.
        </CTASubtitle>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <CTAButtonWhite onClick={handleStartDesigning}>
            Start Designing Free
          </CTAButtonWhite>
          <CTAButtonWhite
            as="a"
            href="https://github.com/Aadilhassan/Marketifyall-design-Editor"
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: 'transparent', color: '#ffffff' }}
          >
            ⭐ Star on GitHub
          </CTAButtonWhite>
        </div>
      </CTASection>

      {/* Footer */}
      <Footer>
        <FooterContent>
          <div>
            <Logo style={{ color: '#ffffff', marginBottom: '12px' }}>
              <LogoIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </LogoIcon>
              Design Editor
            </Logo>
            <FooterText>
              Open-source by{' '}
              <FooterLink href="http://quickshiftlabs.com/" target="_blank" rel="noopener noreferrer">QuickShift Labs</FooterLink>
              {' '}& Part of{' '}
              <FooterLink href="https://marketifyall.com/" target="_blank" rel="noopener noreferrer">Marketifyall</FooterLink>
            </FooterText>
          </div>
          <FooterLinks>
            <FooterLink onClick={() => history.push('/features')}>Features</FooterLink>
            <FooterLink onClick={() => history.push('/developers')}>Developers</FooterLink>
            <FooterLink onClick={() => history.push('/about')}>About</FooterLink>
            <FooterLink onClick={() => history.push('/contact')}>Contact</FooterLink>
            <FooterLink href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noopener noreferrer">GitHub</FooterLink>
          </FooterLinks>
        </FooterContent>
      </Footer>
    </Container>
  )
}

export default Landing
