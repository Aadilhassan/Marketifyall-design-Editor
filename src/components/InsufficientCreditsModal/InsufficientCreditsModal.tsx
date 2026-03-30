import React, { useState } from 'react'
import { styled } from 'baseui'
import { marketifyallApi } from '@/services/marketifyall-api'

// ─── Props ──────────────────────────────────────────────────

interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  cost: number
}

// ─── Styled Components ──────────────────────────────────────

const Overlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
})

const ModalCard = styled('div', {
  background: '#ffffff',
  borderRadius: '16px',
  width: '640px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

const ModalHeader = styled('div', {
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
})

const HeaderLeft = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
})

const IconWrapper = styled('div', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #5A3FFF 0%, #7C5CFF 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontSize: '16px',
})

const ModalTitle = styled('h2', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#1f2937',
  margin: 0,
})

const CloseButton = styled('button', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#6b7280',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3f4f6',
    color: '#374151',
  },
})

const ModalBody = styled('div', {
  padding: '24px',
  flex: 1,
  overflowY: 'auto',
})

const Message = styled('p', {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 24px 0',
  lineHeight: '1.5',
})

const SectionTitle = styled('h3', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
})

const CardsGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px',
  marginBottom: '24px',
})

const PlanCard = styled('div', ({ $disabled }: { $disabled?: boolean }) => ({
  padding: '20px 16px',
  borderRadius: '12px',
  border: '2px solid #e5e7eb',
  background: $disabled ? '#f9fafb' : '#ffffff',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '8px',
  position: 'relative' as const,
  opacity: $disabled ? 0.6 : 1,
  transition: 'all 0.2s',
  ...(!$disabled
    ? {
        ':hover': {
          borderColor: '#5A3FFF',
          boxShadow: '0 4px 12px rgba(90, 63, 255, 0.1)',
        },
      }
    : {}),
}))

const Badge = styled('span', ({ $variant }: { $variant: 'recommended' | 'coming-soon' }) => ({
  position: 'absolute' as const,
  top: '-10px',
  right: '-10px',
  padding: '2px 10px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  ...(
    $variant === 'recommended'
      ? { background: '#5A3FFF', color: '#ffffff' }
      : { background: '#e5e7eb', color: '#6b7280' }
  ),
}))

const PlanName = styled('span', {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1f2937',
})

const PlanPrice = styled('span', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1f2937',
})

const PlanPeriod = styled('span', {
  fontSize: '13px',
  color: '#9ca3af',
  fontWeight: 400,
})

const PlanCredits = styled('span', {
  fontSize: '13px',
  color: '#6b7280',
  textAlign: 'center' as const,
})

const PlanButton = styled('button', ({ $disabled }: { $disabled?: boolean }) => ({
  marginTop: '8px',
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: $disabled
    ? '#e5e7eb'
    : 'linear-gradient(135deg, #5A3FFF 0%, #7C5CFF 100%)',
  color: $disabled ? '#9ca3af' : '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: $disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  width: '100%',
  ...(!$disabled
    ? {
        ':hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(90, 63, 255, 0.4)',
        },
      }
    : {}),
}))

const ModalFooter = styled('div', {
  padding: '16px 24px',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center' as const,
})

const FooterText = styled('p', {
  fontSize: '12px',
  color: '#9ca3af',
  margin: 0,
  lineHeight: '1.5',
})

// ─── Component ──────────────────────────────────────────────

const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  isOpen,
  onClose,
  balance,
  cost,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubscription = async (plan: 'creator' | 'pro') => {
    try {
      setLoadingAction(`sub-${plan}`)
      const { checkout_url } = await marketifyallApi.createSubscriptionCheckout(plan)
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to create subscription checkout:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleTopup = async (pack: 'starter' | 'growth' | 'power') => {
    try {
      setLoadingAction(`topup-${pack}`)
      const { checkout_url } = await marketifyallApi.createTopupCheckout(pack)
      window.location.href = checkout_url
    } catch (err) {
      console.error('Failed to create topup checkout:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalCard>
        {/* Header */}
        <ModalHeader>
          <HeaderLeft>
            <IconWrapper>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8.8 1.6L3.2 9.6H7.2L6.4 14.4L12.8 6.4H8.8L8.8 1.6Z"
                  fill="currentColor"
                />
              </svg>
            </IconWrapper>
            <ModalTitle>Need More Credits</ModalTitle>
          </HeaderLeft>
          <CloseButton onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </CloseButton>
        </ModalHeader>

        {/* Body */}
        <ModalBody>
          <Message>
            This action requires <strong>{cost}</strong> credits, but you only have{' '}
            <strong>{balance}</strong>.
          </Message>

          {/* Subscription Plans */}
          <SectionTitle>Subscribe for Monthly Credits</SectionTitle>
          <CardsGrid>
            {/* Creator */}
            <PlanCard $disabled={false}>
              <PlanName>Creator</PlanName>
              <PlanPrice>
                $9<PlanPeriod>/mo</PlanPeriod>
              </PlanPrice>
              <PlanCredits>500 credits/month</PlanCredits>
              <PlanButton
                $disabled={false}
                onClick={() => handleSubscription('creator')}
                disabled={loadingAction === 'sub-creator'}
              >
                {loadingAction === 'sub-creator' ? 'Loading...' : 'Subscribe'}
              </PlanButton>
            </PlanCard>

            {/* Pro */}
            <PlanCard $disabled={false}>
              <Badge $variant="recommended">Recommended</Badge>
              <PlanName>Pro</PlanName>
              <PlanPrice>
                $29<PlanPeriod>/mo</PlanPeriod>
              </PlanPrice>
              <PlanCredits>2,000 credits/month</PlanCredits>
              <PlanButton
                $disabled={false}
                onClick={() => handleSubscription('pro')}
                disabled={loadingAction === 'sub-pro'}
              >
                {loadingAction === 'sub-pro' ? 'Loading...' : 'Subscribe'}
              </PlanButton>
            </PlanCard>

            {/* Team */}
            <PlanCard $disabled={true}>
              <Badge $variant="coming-soon">Coming Soon</Badge>
              <PlanName>Team</PlanName>
              <PlanPrice>--</PlanPrice>
              <PlanCredits>Team credits, shared billing</PlanCredits>
              <PlanButton $disabled={true} disabled>
                Coming Soon
              </PlanButton>
            </PlanCard>
          </CardsGrid>

          {/* Top-up Packs */}
          <SectionTitle>Or Buy Credit Packs</SectionTitle>
          <CardsGrid>
            {/* Starter */}
            <PlanCard $disabled={false}>
              <PlanName>Starter</PlanName>
              <PlanPrice>$5</PlanPrice>
              <PlanCredits>100 credits, never expire</PlanCredits>
              <PlanButton
                $disabled={false}
                onClick={() => handleTopup('starter')}
                disabled={loadingAction === 'topup-starter'}
              >
                {loadingAction === 'topup-starter' ? 'Loading...' : 'Buy Now'}
              </PlanButton>
            </PlanCard>

            {/* Growth */}
            <PlanCard $disabled={false}>
              <PlanName>Growth</PlanName>
              <PlanPrice>$15</PlanPrice>
              <PlanCredits>500 credits, never expire</PlanCredits>
              <PlanButton
                $disabled={false}
                onClick={() => handleTopup('growth')}
                disabled={loadingAction === 'topup-growth'}
              >
                {loadingAction === 'topup-growth' ? 'Loading...' : 'Buy Now'}
              </PlanButton>
            </PlanCard>

            {/* Power */}
            <PlanCard $disabled={false}>
              <PlanName>Power</PlanName>
              <PlanPrice>$40</PlanPrice>
              <PlanCredits>2,000 credits, never expire</PlanCredits>
              <PlanButton
                $disabled={false}
                onClick={() => handleTopup('power')}
                disabled={loadingAction === 'topup-power'}
              >
                {loadingAction === 'topup-power' ? 'Loading...' : 'Buy Now'}
              </PlanButton>
            </PlanCard>
          </CardsGrid>
        </ModalBody>

        {/* Footer */}
        <ModalFooter>
          <FooterText>
            Credits are used for AI features only. All other editor features are free forever.
          </FooterText>
        </ModalFooter>
      </ModalCard>
    </Overlay>
  )
}

export default InsufficientCreditsModal
