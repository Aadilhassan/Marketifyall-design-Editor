import React, { useState } from 'react'
import { styled } from 'baseui'
import { marketifyallApi } from '@/services/marketifyall-api'
import { fail } from '@/lib/logger'

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
  borderBottom: '1px solid #e6e0d2',
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
  background: 'linear-gradient(135deg, #d8401c 0%, #7C5CFF 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontSize: '16px',
})

const ModalTitle = styled('h2', {
  fontSize: '18px',
  fontWeight: 600,
  color: '#181410',
  margin: 0,
})

const CloseButton = styled('button', {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#736d5c',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  ':hover': {
    background: '#f3efe4',
    color: '#3a352b',
  },
})

const ModalBody = styled('div', {
  padding: '24px',
  flex: 1,
  overflowY: 'auto',
})

const Message = styled('p', {
  fontSize: '14px',
  color: '#736d5c',
  margin: '0 0 24px 0',
  lineHeight: '1.5',
})

const SectionTitle = styled('h3', {
  fontSize: '14px',
  fontWeight: 600,
  color: '#3a352b',
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
  border: '2px solid #e6e0d2',
  background: $disabled ? '#fbf9f4' : '#ffffff',
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
          borderColor: '#d8401c',
          boxShadow: '0 4px 12px rgba(216, 64, 28, 0.1)',
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
      ? { background: '#d8401c', color: '#ffffff' }
      : { background: '#e6e0d2', color: '#736d5c' }
  ),
}))

const PlanName = styled('span', {
  fontSize: '15px',
  fontWeight: 600,
  color: '#181410',
})

const PlanPrice = styled('span', {
  fontSize: '24px',
  fontWeight: 700,
  color: '#181410',
})

const PlanPeriod = styled('span', {
  fontSize: '13px',
  color: '#a39d8c',
  fontWeight: 400,
})

const PlanCredits = styled('span', {
  fontSize: '13px',
  color: '#736d5c',
  textAlign: 'center' as const,
})

const PlanButton = styled('button', ({ $disabled }: { $disabled?: boolean }) => ({
  marginTop: '8px',
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: $disabled
    ? '#e6e0d2'
    : 'linear-gradient(135deg, #d8401c 0%, #7C5CFF 100%)',
  color: $disabled ? '#a39d8c' : '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: $disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s',
  width: '100%',
  ...(!$disabled
    ? {
        ':hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(216, 64, 28, 0.4)',
        },
      }
    : {}),
}))

const ModalFooter = styled('div', {
  padding: '16px 24px',
  borderTop: '1px solid #e6e0d2',
  textAlign: 'center' as const,
})

const FooterText = styled('p', {
  fontSize: '12px',
  color: '#a39d8c',
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
      fail('credits', 'Could not open the checkout page', err)
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
      fail('credits', 'Could not open the checkout page', err)
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
