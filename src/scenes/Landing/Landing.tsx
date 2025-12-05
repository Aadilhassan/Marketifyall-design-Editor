import React from 'react'
import { useHistory } from 'react-router-dom'
import { styled } from 'baseui'

// Styled Components
const Container = styled('div', {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontFamily: "'Inter', 'Poppins', sans-serif",
  overflowX: 'hidden',
})

const Nav = styled('nav', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '20px 60px',
  maxWidth: '1400px',
  margin: '0 auto',
  '@media (max-width: 768px)': {
    padding: '16px 24px',
  },
})

const Logo = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
})

const LogoIcon = styled('div', {
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const NavLinks = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  '@media (max-width: 768px)': {
    display: 'none',
  },
})

const NavButton = styled('button', {
  padding: '10px 24px',
  borderRadius: '8px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  background: 'transparent',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
})

const Hero = styled('section', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '80px 24px 120px',
  maxWidth: '1000px',
  margin: '0 auto',
})

const Badge = styled('div', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  borderRadius: '100px',
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  marginBottom: '24px',
})

const HeroTitle = styled('h1', {
  fontSize: '64px',
  fontWeight: 800,
  color: '#ffffff',
  lineHeight: 1.1,
  marginBottom: '24px',
  letterSpacing: '-2px',
  '@media (max-width: 768px)': {
    fontSize: '40px',
  },
})

const HeroSubtitle = styled('p', {
  fontSize: '20px',
  color: 'rgba(255, 255, 255, 0.85)',
  lineHeight: 1.6,
  maxWidth: '600px',
  marginBottom: '40px',
})

const CTAButtons = styled('div', {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  justifyContent: 'center',
})

const PrimaryButton = styled('button', {
  padding: '16px 32px',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  color: '#667eea',
  fontSize: '17px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
  },
})

const SecondaryButton = styled('button', {
  padding: '16px 32px',
  borderRadius: '12px',
  border: '2px solid rgba(255, 255, 255, 0.4)',
  background: 'transparent',
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
})

const PreviewSection = styled('div', {
  maxWidth: '1200px',
  margin: '-60px auto 0',
  padding: '0 24px',
  position: 'relative',
  zIndex: 10,
})

const PreviewCard = styled('div', {
  background: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  overflow: 'hidden',
  border: '1px solid rgba(0, 0, 0, 0.05)',
})

const PreviewHeader = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '16px 20px',
  background: '#f8f9fa',
  borderBottom: '1px solid #e9ecef',
})

const PreviewDot = styled('div', ({ $color }: { $color: string }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: $color,
}))

const PreviewContent = styled('div', {
  display: 'flex',
  height: '500px',
  '@media (max-width: 768px)': {
    height: '300px',
  },
})

const PreviewSidebar = styled('div', {
  width: '80px',
  background: '#f8f9fa',
  borderRight: '1px solid #e9ecef',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 0',
  gap: '8px',
})

const SidebarIcon = styled('div', ({ $active }: { $active?: boolean }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: $active ? '#667eea' : 'transparent',
  color: $active ? '#ffffff' : '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
}))

const PreviewCanvas = styled('div', {
  flex: 1,
  background: '#f1f3f4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
})

const CanvasFrame = styled('div', {
  width: '400px',
  height: '400px',
  background: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
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
  fontSize: '32px',
  fontWeight: 700,
  color: '#1a1a1a',
  '@media (max-width: 768px)': {
    fontSize: '18px',
  },
})

const CanvasSubtext = styled('div', {
  fontSize: '14px',
  color: '#6b7280',
})

const FeaturesSection = styled('section', {
  background: '#ffffff',
  padding: '120px 24px',
})

const FeaturesContainer = styled('div', {
  maxWidth: '1200px',
  margin: '0 auto',
})

const SectionTitle = styled('h2', {
  fontSize: '48px',
  fontWeight: 800,
  color: '#1a1a1a',
  textAlign: 'center',
  marginBottom: '16px',
  letterSpacing: '-1px',
})

const SectionSubtitle = styled('p', {
  fontSize: '18px',
  color: '#6b7280',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '0 auto 64px',
})

const FeaturesGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '32px',
  '@media (max-width: 968px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 640px)': {
    gridTemplateColumns: '1fr',
  },
})

const FeatureCard = styled('div', {
  padding: '32px',
  borderRadius: '16px',
  background: '#f8f9fa',
  transition: 'all 0.3s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.08)',
  },
})

const FeatureIcon = styled('div', ({ $bg }: { $bg: string }) => ({
  width: '56px',
  height: '56px',
  borderRadius: '14px',
  background: $bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
  color: '#ffffff',
}))

const FeatureTitle = styled('h3', {
  fontSize: '20px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '12px',
})

const FeatureDescription = styled('p', {
  fontSize: '15px',
  color: '#6b7280',
  lineHeight: 1.6,
})

const Footer = styled('footer', {
  background: '#1a1a1a',
  padding: '60px 24px',
  color: '#ffffff',
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
  ':hover': {
    color: '#ffffff',
  },
})

const FEATURES = [
  {
    icon: '✨',
    title: 'AI-Powered Design',
    description: 'Let AI create stunning designs for you. Just describe what you want and watch the magic happen.',
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: '🎨',
    title: 'Professional Templates',
    description: 'Start with beautiful templates for social media, presentations, marketing materials, and more.',
    bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: '🖼️',
    title: 'Million+ Stock Photos',
    description: 'Access a vast library of high-quality stock photos from Pexels, completely free to use.',
    bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    icon: '✏️',
    title: 'Advanced Text Editor',
    description: 'Beautiful typography with 1000+ Google Fonts. Create stunning text effects and styles.',
    bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    icon: '🔷',
    title: 'Shapes & Elements',
    description: 'Thousands of shapes, icons, and design elements to make your creations stand out.',
    bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    icon: '☁️',
    title: 'Cloud Storage',
    description: 'Your designs are automatically saved. Access them from anywhere, anytime.',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
]

function Landing() {
  const history = useHistory()

  const handleStartDesigning = () => {
    history.push('/design')
  }

  return (
    <Container>
      {/* Navigation */}
      <Nav>
        <Logo>
          <LogoIcon>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </LogoIcon>
          Marketifyall
        </Logo>
        <NavLinks>
          <NavButton onClick={handleStartDesigning}>Sign In</NavButton>
        </NavLinks>
      </Nav>

      {/* Hero Section */}
      <Hero>
        <Badge>
          <span>🚀</span>
          <span>Powered by AI</span>
        </Badge>
        <HeroTitle>
          Design anything.<br />
          Publish everywhere.
        </HeroTitle>
        <HeroSubtitle>
          Design Editor by Marketifyall — Create stunning graphics, presentations, and social media content in minutes. 
          No design skills needed — our AI does the heavy lifting.
        </HeroSubtitle>
        <CTAButtons>
          <PrimaryButton onClick={handleStartDesigning}>
            Start Designing — It's Free
          </PrimaryButton>
          <SecondaryButton>
            Watch Demo
          </SecondaryButton>
        </CTAButtons>
      </Hero>

      {/* Preview Section */}
      <PreviewSection>
        <PreviewCard>
          <PreviewHeader>
            <PreviewDot $color="#ff5f57" />
            <PreviewDot $color="#febc2e" />
            <PreviewDot $color="#28c840" />
          </PreviewHeader>
          <PreviewContent>
            <PreviewSidebar>
              <SidebarIcon $active>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </SidebarIcon>
              <SidebarIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                </svg>
              </SidebarIcon>
              <SidebarIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </SidebarIcon>
              <SidebarIcon>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </PreviewSection>

      {/* Features Section */}
      <FeaturesSection>
        <FeaturesContainer>
          <SectionTitle>Everything you need to create</SectionTitle>
          <SectionSubtitle>
            Powerful features that make design accessible to everyone, from beginners to professionals.
          </SectionSubtitle>
          <FeaturesGrid>
            {FEATURES.map((feature, index) => (
              <FeatureCard key={index}>
                <FeatureIcon $bg={feature.bg}>
                  <span style={{ fontSize: '24px' }}>{feature.icon}</span>
                </FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </FeaturesContainer>
      </FeaturesSection>

      {/* Footer */}
      <Footer>
        <FooterContent>
          <Logo style={{ color: '#ffffff' }}>
            <LogoIcon style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </LogoIcon>
            Marketifyall
          </Logo>
          <FooterText>© 2025-2026 Design Editor by Marketifyall. All rights reserved.</FooterText>
          <FooterLinks>
            <FooterLink href="#">Privacy</FooterLink>
            <FooterLink href="#">Terms</FooterLink>
            <FooterLink href="#">Contact</FooterLink>
          </FooterLinks>
        </FooterContent>
      </Footer>
    </Container>
  )
}

export default Landing
