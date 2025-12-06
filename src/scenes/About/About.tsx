import React from 'react'
import { styled } from 'baseui'
import Navigation from '@components/Navigation'

const Container = styled('div', {
  minHeight: '100vh',
  background: '#F5F3EF',
  fontFamily: "'Inter', 'Poppins', sans-serif",
})

const Section = styled('section', {
  padding: '80px 60px',
  maxWidth: '1200px',
  margin: '0 auto',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const HeroSection = styled('section', {
  background: '#1a1a1a',
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
  color: 'rgba(255, 255, 255, 0.8)',
  maxWidth: '700px',
  margin: '0 auto',
  lineHeight: 1.6,
  fontFamily: "'Georgia', serif",
})

const SectionTitle = styled('h2', {
  fontSize: '40px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '24px',
  letterSpacing: '-1px',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '28px',
  },
})

const Text = styled('p', {
  fontSize: '17px',
  color: '#4a4a4a',
  lineHeight: 1.8,
  marginBottom: '24px',
  fontFamily: "'Georgia', serif",
})

const HighlightBox = styled('div', {
  background: '#FF6B5B',
  padding: '40px',
  borderRadius: '0',
  border: '2px solid #1a1a1a',
  boxShadow: '8px 8px 0px #1a1a1a',
  marginTop: '40px',
})

const HighlightText = styled('p', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#ffffff',
  textAlign: 'center',
  fontFamily: "'Georgia', serif",
  '@media (max-width: 768px)': {
    fontSize: '18px',
  },
})

const Grid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '40px',
  marginTop: '60px',
  '@media (max-width: 968px)': {
    gridTemplateColumns: '1fr',
  },
})

const Card = styled('div', {
  background: '#ffffff',
  padding: '40px 32px',
  border: '2px solid #1a1a1a',
  transition: 'all 0.3s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '8px 8px 0px #1a1a1a',
  },
})

const CardTitle = styled('h3', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '16px',
  fontFamily: "'Georgia', serif",
})

const CardText = styled('p', {
  fontSize: '16px',
  color: '#4a4a4a',
  lineHeight: 1.7,
})

const LinkButton = styled('a', {
  display: 'inline-block',
  padding: '16px 32px',
  borderRadius: '4px',
  border: '2px solid #1a1a1a',
  background: '#FF6B5B',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  boxShadow: '4px 4px 0px #1a1a1a',
  marginRight: '16px',
  ':hover': {
    transform: 'translate(-2px, -2px)',
    boxShadow: '6px 6px 0px #1a1a1a',
  },
})

const TeamSection = styled('section', {
  background: '#ffffff',
  padding: '80px 60px',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

function About() {
  return (
    <Container>
      <Navigation />
      <HeroSection>
        <Title>About Design Editor by Marketifyall</Title>
        <Subtitle>
          An open-source Canva alternative built for creators who need professional design tools without the limitations.
        </Subtitle>
      </HeroSection>

      <Section>
        <SectionTitle>Our Mission</SectionTitle>
        <Text>
          We believe that professional design tools should be accessible to everyone. That's why we created 
          Design Editor by Marketifyall — a <strong>free, open-source design platform</strong> that combines 
          the simplicity of Canva with advanced AI-powered features to help you create stunning visuals faster.
        </Text>
        <Text>
          Unlike other design tools, we're committed to transparency and community-driven development. Our code 
          is open-source, our roadmap is public, and we actively listen to feedback from designers, marketers, 
          and creators like you.
        </Text>
        <HighlightBox>
          <HighlightText>
            "A true Canva alternative with batteries included — AI design assistance, stock photos, 
            professional templates, and complete creative freedom."
          </HighlightText>
        </HighlightBox>
      </Section>

      <TeamSection>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SectionTitle>Powered by QuickShift Labs</SectionTitle>
          <Text>
            Design Editor is proudly developed by <strong>QuickShift Labs</strong>, a technology company 
            focused on building tools that accelerate creative workflows and empower businesses to grow faster.
          </Text>
          <Text>
            As part of the <strong>Marketifyall</strong> ecosystem, Design Editor integrates seamlessly with 
            our suite of marketing and creative tools — helping you design, create, and market all in one place.
          </Text>
          <div style={{ marginTop: '40px' }}>
            <LinkButton href="http://quickshiftlabs.com/" target="_blank" rel="noopener noreferrer">
              Visit QuickShift Labs
            </LinkButton>
            <LinkButton href="https://marketifyall.com/" target="_blank" rel="noopener noreferrer">
              Explore Marketifyall
            </LinkButton>
          </div>
        </div>
      </TeamSection>

      <Section>
        <SectionTitle>What Makes Us Different</SectionTitle>
        <Grid>
          <Card>
            <CardTitle>🌟 Open Source</CardTitle>
            <CardText>
              Our code is transparent and community-driven. Fork it, contribute to it, or customize it 
              for your own needs. True creative freedom starts with open access.
            </CardText>
          </Card>
          <Card>
            <CardTitle>🤖 AI-Powered</CardTitle>
            <CardText>
              Built-in AI design assistance with GPT-4 and Claude integration. Generate designs from 
              text prompts, get smart suggestions, and automate repetitive tasks.
            </CardText>
          </Card>
          <Card>
            <CardTitle>🚀 Batteries Included</CardTitle>
            <CardText>
              Everything you need out of the box: stock photos from Pexels, 1000+ Google Fonts, 
              professional templates, design elements, and export options.
            </CardText>
          </Card>
          <Card>
            <CardTitle>💰 100% Free</CardTitle>
            <CardText>
              No hidden fees, no premium tiers, no feature restrictions. All features are free 
              forever, with no credit card required.
            </CardText>
          </Card>
          <Card>
            <CardTitle>🎨 Professional Tools</CardTitle>
            <CardText>
              Advanced layer management, precise alignment controls, custom dimensions, and 
              export options for PNG, JPG, PDF, and video formats.
            </CardText>
          </Card>
          <Card>
            <CardTitle>⚡ Built for Speed</CardTitle>
            <CardText>
              Lightning-fast performance, instant font previews, real-time collaboration, 
              and cloud storage for your designs.
            </CardText>
          </Card>
        </Grid>
      </Section>

      <Section style={{ background: '#ffffff' }}>
        <SectionTitle>Built for Creators, By Creators</SectionTitle>
        <Text>
          We understand the frustration of design tools that limit your creativity with paywalls and 
          feature restrictions. That's why we built Design Editor to be different:
        </Text>
        <Text>
          ✓ No watermarks on exports<br />
          ✓ No design limits or restrictions<br />
          ✓ No forced branding<br />
          ✓ No credit card required<br />
          ✓ No "premium" features locked away
        </Text>
        <Text>
          Whether you're a freelance designer, a small business owner, a marketing professional, 
          or a content creator — you deserve tools that work for you, not against you.
        </Text>
        <HighlightBox style={{ marginTop: '40px' }}>
          <HighlightText>
            Join our open-source community on GitHub and help shape the future of design tools.
          </HighlightText>
        </HighlightBox>
      </Section>
    </Container>
  )
}

export default About
