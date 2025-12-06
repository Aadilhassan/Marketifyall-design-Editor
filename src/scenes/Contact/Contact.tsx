import React, { useState } from 'react'
import { styled } from 'baseui'
import Navigation from '@components/Navigation'

const Container = styled('div', {
  minHeight: '100vh',
  background: '#F5F3EF',
  fontFamily: "'Inter', 'Poppins', sans-serif",
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

const Section = styled('section', {
  padding: '80px 60px',
  maxWidth: '1200px',
  margin: '0 auto',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const Grid = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '60px',
  '@media (max-width: 968px)': {
    gridTemplateColumns: '1fr',
  },
})

const ContactInfo = styled('div', {
  background: '#ffffff',
  padding: '40px',
  border: '2px solid #1a1a1a',
  boxShadow: '8px 8px 0px #1a1a1a',
})

const InfoTitle = styled('h2', {
  fontSize: '32px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '24px',
  fontFamily: "'Georgia', serif",
})

const InfoItem = styled('div', {
  marginBottom: '32px',
})

const InfoLabel = styled('h3', {
  fontSize: '16px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Courier New', monospace",
})

const InfoText = styled('p', {
  fontSize: '18px',
  color: '#4a4a4a',
  lineHeight: 1.6,
  fontFamily: "'Georgia', serif",
})

const Link = styled('a', {
  color: '#FF6B5B',
  textDecoration: 'none',
  fontWeight: 600,
  ':hover': {
    textDecoration: 'underline',
  },
})

const ContactForm = styled('form', {
  background: '#ffffff',
  padding: '40px',
  border: '2px solid #1a1a1a',
  boxShadow: '8px 8px 0px #1a1a1a',
})

const FormTitle = styled('h2', {
  fontSize: '32px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '24px',
  fontFamily: "'Georgia', serif",
})

const FormGroup = styled('div', {
  marginBottom: '24px',
})

const Label = styled('label', {
  display: 'block',
  fontSize: '14px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Courier New', monospace",
})

const Input = styled('input', {
  width: '100%',
  padding: '14px 16px',
  fontSize: '16px',
  border: '2px solid #1a1a1a',
  borderRadius: '0',
  fontFamily: "'Inter', sans-serif",
  ':focus': {
    outline: 'none',
    boxShadow: '4px 4px 0px #FF6B5B',
  },
})

const TextArea = styled('textarea', {
  width: '100%',
  padding: '14px 16px',
  fontSize: '16px',
  border: '2px solid #1a1a1a',
  borderRadius: '0',
  fontFamily: "'Inter', sans-serif",
  minHeight: '150px',
  resize: 'vertical',
  ':focus': {
    outline: 'none',
    boxShadow: '4px 4px 0px #FF6B5B',
  },
})

const SubmitButton = styled('button', {
  width: '100%',
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
  textTransform: 'uppercase',
  letterSpacing: '1px',
  ':hover': {
    transform: 'translate(-2px, -2px)',
    boxShadow: '6px 6px 0px #1a1a1a',
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
})

const SuccessMessage = styled('div', {
  background: '#2ECC71',
  color: '#ffffff',
  padding: '16px',
  marginBottom: '24px',
  border: '2px solid #1a1a1a',
  fontFamily: "'Courier New', monospace",
  fontWeight: 600,
})

const CompanySection = styled('section', {
  background: '#ffffff',
  padding: '80px 60px',
  textAlign: 'center',
  '@media (max-width: 768px)': {
    padding: '40px 24px',
  },
})

const CompanyGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '40px',
  maxWidth: '1200px',
  margin: '40px auto 0',
  '@media (max-width: 968px)': {
    gridTemplateColumns: '1fr',
  },
})

const CompanyCard = styled('div', {
  padding: '40px 32px',
  background: '#F5F3EF',
  border: '2px solid #1a1a1a',
  transition: 'all 0.3s',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '8px 8px 0px #1a1a1a',
  },
})

const CompanyTitle = styled('h3', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1a1a1a',
  marginBottom: '16px',
  fontFamily: "'Georgia', serif",
})

const CompanyText = styled('p', {
  fontSize: '16px',
  color: '#4a4a4a',
  marginBottom: '20px',
  lineHeight: 1.7,
})

const CompanyLink = styled('a', {
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: '4px',
  border: '2px solid #1a1a1a',
  background: 'transparent',
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Courier New', monospace",
  ':hover': {
    background: '#1a1a1a',
    color: '#ffffff',
  },
})

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000)
    }, 1000)
  }

  return (
    <Container>
      <Navigation />
      <HeroSection>
        <Title>Get in Touch</Title>
        <Subtitle>
          Have questions, feedback, or want to contribute to our open-source project? We'd love to hear from you.
        </Subtitle>
      </HeroSection>

      <Section>
        <Grid>
          <ContactInfo>
            <InfoTitle>Contact Information</InfoTitle>
            
            <InfoItem>
              <InfoLabel>General Inquiries</InfoLabel>
              <InfoText>
                <Link href="mailto:support@marketifyall.com">support@marketifyall.com</Link>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Technical Support</InfoLabel>
              <InfoText>
                For technical issues or bug reports, please open an issue on our{' '}
                <Link href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noopener noreferrer">
                  GitHub repository
                </Link>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Contributing</InfoLabel>
              <InfoText>
                Want to contribute code, designs, or ideas? Check out our{' '}
                <Link href="https://github.com/Aadilhassan/Marketifyall-design-Editor" target="_blank" rel="noopener noreferrer">
                  contribution guidelines
                </Link>
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Community</InfoLabel>
              <InfoText>
                Join our Discord community to connect with other designers and developers building with Design Editor.
              </InfoText>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Social Media</InfoLabel>
              <InfoText>
                Follow us on Twitter{' '}
                <Link href="https://twitter.com/marketifyall" target="_blank" rel="noopener noreferrer">
                  @marketifyall
                </Link>{' '}
                for updates and announcements.
              </InfoText>
            </InfoItem>
          </ContactInfo>

          <ContactForm onSubmit={handleSubmit}>
            <FormTitle>Send us a Message</FormTitle>
            
            {isSubmitted && (
              <SuccessMessage>
                ✓ Thank you! Your message has been sent successfully.
              </SuccessMessage>
            )}

            <FormGroup>
              <Label htmlFor="name">Your Name *</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="message">Message *</Label>
              <TextArea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </FormGroup>

            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </SubmitButton>
          </ContactForm>
        </Grid>
      </Section>

      <CompanySection>
        <InfoTitle>Our Ecosystem</InfoTitle>
        <CompanyGrid>
          <CompanyCard>
            <CompanyTitle>QuickShift Labs</CompanyTitle>
            <CompanyText>
              The technology company behind Design Editor and Marketifyall. Building tools that accelerate creative workflows.
            </CompanyText>
            <CompanyLink href="http://quickshiftlabs.com/" target="_blank" rel="noopener noreferrer">
              Visit Website
            </CompanyLink>
          </CompanyCard>

          <CompanyCard>
            <CompanyTitle>Marketifyall</CompanyTitle>
            <CompanyText>
              Complete marketing toolkit for businesses. Design Editor is part of the Marketifyall suite of creative tools.
            </CompanyText>
            <CompanyLink href="https://marketifyall.com/" target="_blank" rel="noopener noreferrer">
              Explore Platform
            </CompanyLink>
          </CompanyCard>

          <CompanyCard>
            <CompanyTitle>Design Editor</CompanyTitle>
            <CompanyText>
              Open-source design tool you're currently exploring. Free forever, built by the community, for the community.
            </CompanyText>
            <CompanyLink href="https://design.marketifyall.com/" target="_blank" rel="noopener noreferrer">
              Start Designing
            </CompanyLink>
          </CompanyCard>
        </CompanyGrid>
      </CompanySection>
    </Container>
  )
}

export default Contact
