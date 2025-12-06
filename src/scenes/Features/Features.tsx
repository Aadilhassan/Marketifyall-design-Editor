import React from 'react'
import { useHistory } from 'react-router-dom'
import { styled } from 'baseui'
import Navigation from '@components/Navigation'

const Container = styled('div', {
  minHeight: '100vh',
  background: '#F5F3EF',
  fontFamily: "'Inter', 'Poppins', sans-serif",
})

const HeroSection = styled('section', {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '120px 60px 80px',
  textAlign: 'center',
  '@media (max-width: 768px)': {
    padding: '60px 24px 40px',
  },
})

const Title = styled('h1', {
  fontSize: '56px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '24px',
  letterSpacing: '-2px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '36px',
  },
})

const Subtitle = styled('p', {
  fontSize: '20px',
  color: 'rgba(255, 255, 255, 0.9)',
  maxWidth: '700px',
  margin: '0 auto 40px',
  lineHeight: 1.6,
  fontFamily: "'Georgia', serif",
})

const CTAButton = styled('button', {
  padding: '18px 40px',
  borderRadius: '4px',
  border: '2px solid #ffffff',
  background: '#ffffff',
  color: '#667eea',
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

const Section = styled('section', {
  padding: '80px 60px',
  maxWidth: '1200px',
  margin: '0 auto',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const SectionAlt = styled('section', {
  background: '#ffffff',
  padding: '80px 60px',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const SectionTitle = styled('h2', {
  fontSize: '40px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '28px',
  },
})

const SectionSubtitle = styled('p', {
  fontSize: '18px',
  color: '#6b7280',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '0 auto 60px',
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
  background: '#ffffff',
  border: '2px solid #1a1a1a',
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

const ComparisonSection = styled('section', {
  background: '#1a1a1a',
  padding: '80px 60px',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const ComparisonTitle = styled('h2', {
  fontSize: '40px',
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: '60px',
  textAlign: 'center',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '28px',
  },
})

const ComparisonTable = styled('div', {
  maxWidth: '900px',
  margin: '0 auto',
  background: '#ffffff',
  border: '2px solid #ffffff',
})

const TableRow = styled('div', ({ $isHeader }: { $isHeader?: boolean }) => ({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  borderBottom: '2px solid #e5e7eb',
  background: $isHeader ? '#F5F3EF' : '#ffffff',
}))

const TableCell = styled('div', ({ $isHeader }: { $isHeader?: boolean }) => ({
  padding: '20px 24px',
  fontSize: $isHeader ? '14px' : '15px',
  fontWeight: $isHeader ? 700 : 400,
  color: '#1a1a1a',
  borderRight: '2px solid #e5e7eb',
  fontFamily: $isHeader ? "'Courier New', monospace" : "'Inter', sans-serif",
  letterSpacing: $isHeader ? '1px' : 'normal',
  textTransform: $isHeader ? 'uppercase' : 'none',
  ':last-child': {
    borderRight: 'none',
  },
}))

const CheckMark = styled('span', {
  color: '#2ECC71',
  fontSize: '20px',
  fontWeight: 700,
})

const CrossMark = styled('span', {
  color: '#FF6B5B',
  fontSize: '20px',
  fontWeight: 700,
})

const CORE_FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'AI Design Generation',
    description: 'GPT-4 and Claude powered design generation. Describe your vision and let AI create it for you.',
    bg: '#8B7BF7',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    title: 'Pexels Integration',
    description: 'Direct access to millions of high-quality stock photos from Pexels, completely free to use.',
    bg: '#2ECC71',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    ),
    title: '1000+ Google Fonts',
    description: 'Complete Google Fonts library with instant previews and advanced typography controls.',
    bg: '#FFD93D',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: 'Professional Templates',
    description: 'Hundreds of pre-designed templates for social media, marketing, presentations, and more.',
    bg: '#FF6B5B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: 'Icons & Elements',
    description: 'Thousands of design elements, shapes, icons, and illustrations to enhance your designs.',
    bg: '#FF7B7B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Video Editor',
    description: 'Timeline-based video editor with multi-track support. Export to MP4, WebM, and GIF.',
    bg: '#667eea',
  },
]

const ADVANCED_FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Multiple Export Formats',
    description: 'Export designs as PNG, JPG, PDF, SVG. Videos as MP4, WebM, GIF with custom quality settings.',
    bg: '#1a1a1a',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    title: 'Layer Management',
    description: 'Advanced layer controls with grouping, locking, blending modes, and opacity controls.',
    bg: '#8B7BF7',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    title: 'Background Removal',
    description: 'AI-powered background removal tool to create transparent backgrounds in seconds.',
    bg: '#2ECC71',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
      </svg>
    ),
    title: 'Smart Alignment',
    description: 'Intelligent guides and snap-to-grid functionality for pixel-perfect designs.',
    bg: '#FFD93D',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Cloud Storage',
    description: 'Auto-save your designs to the cloud. Access your work from anywhere, anytime.',
    bg: '#FF6B5B',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time. See changes as they happen.',
    bg: '#FF7B7B',
  },
]

function Features() {
  const history = useHistory()

  return (
    <Container>
      <Navigation />
      <HeroSection>
        <Title>Powerful Features, Zero Restrictions</Title>
        <Subtitle>
          Everything you need to create professional designs — from AI-powered generation to advanced editing tools. 
          100% free, 100% open-source.
        </Subtitle>
        <CTAButton onClick={() => history.push('/design')}>
          Start Creating Now
        </CTAButton>
      </HeroSection>

      <Section>
        <SectionTitle>Core Features</SectionTitle>
        <SectionSubtitle>
          Essential tools that make design accessible to everyone, from beginners to professionals.
        </SectionSubtitle>
        <FeaturesGrid>
          {CORE_FEATURES.map((feature, index) => (
            <FeatureCard key={index}>
              <FeatureIcon $bg={feature.bg}>
                {feature.icon}
              </FeatureIcon>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureCard>
          ))}
        </FeaturesGrid>
      </Section>

      <SectionAlt>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SectionTitle>Advanced Capabilities</SectionTitle>
          <SectionSubtitle>
            Professional-grade features for power users who demand more from their design tools.
          </SectionSubtitle>
          <FeaturesGrid>
            {ADVANCED_FEATURES.map((feature, index) => (
              <FeatureCard key={index}>
                <FeatureIcon $bg={feature.bg}>
                  {feature.icon}
                </FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </div>
      </SectionAlt>

      <ComparisonSection>
        <ComparisonTitle>Design Editor vs. Canva</ComparisonTitle>
        <ComparisonTable>
          <TableRow $isHeader>
            <TableCell $isHeader>Feature</TableCell>
            <TableCell $isHeader>Design Editor</TableCell>
            <TableCell $isHeader>Canva</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Pricing</TableCell>
            <TableCell><CheckMark>✓</CheckMark> 100% Free</TableCell>
            <TableCell><CrossMark>✗</CrossMark> $12.99/mo</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Open Source</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Yes</TableCell>
            <TableCell><CrossMark>✗</CrossMark> No</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AI Design Generation</TableCell>
            <TableCell><CheckMark>✓</CheckMark> GPT-4 & Claude</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Magic Design</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Stock Photos</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Pexels (Free)</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Limited Free</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Video Editor</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Timeline Editor</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Pro Only</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Export Without Watermark</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Always</TableCell>
            <TableCell><CrossMark>✗</CrossMark> Pro Only</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Custom Dimensions</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Unlimited</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Yes</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Background Removal</TableCell>
            <TableCell><CheckMark>✓</CheckMark> AI-Powered</TableCell>
            <TableCell><CrossMark>✗</CrossMark> Pro Only</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Storage</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Unlimited Cloud</TableCell>
            <TableCell><CrossMark>✗</CrossMark> 5GB Free</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Team Collaboration</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Real-time</TableCell>
            <TableCell><CheckMark>✓</CheckMark> Yes</TableCell>
          </TableRow>
        </ComparisonTable>
      </ComparisonSection>

      <Section style={{ textAlign: 'center', paddingTop: '100px', paddingBottom: '100px' }}>
        <SectionTitle style={{ marginBottom: '24px' }}>Ready to Experience the Difference?</SectionTitle>
        <SectionSubtitle style={{ marginBottom: '40px' }}>
          Join thousands of creators who've switched to Design Editor for true creative freedom.
        </SectionSubtitle>
        <CTAButton
          onClick={() => history.push('/design')}
          style={{
            background: '#FF6B5B',
            color: '#ffffff',
            border: '2px solid #1a1a1a',
            boxShadow: '4px 4px 0px #1a1a1a',
          }}
        >
          Start Designing for Free
        </CTAButton>
      </Section>
    </Container>
  )
}

export default Features
