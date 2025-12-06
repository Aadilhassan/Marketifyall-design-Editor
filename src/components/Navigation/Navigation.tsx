import React from 'react'
import { useHistory } from 'react-router-dom'
import { styled } from 'baseui'

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
  cursor: 'pointer',
})

const LogoIcon = styled('div', {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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

interface NavigationProps {
  transparent?: boolean
}

function Navigation({ transparent = false }: NavigationProps) {
  const history = useHistory()

  return (
    <Nav style={{ background: transparent ? 'transparent' : '#F5F3EF' }}>
      <Logo onClick={() => history.push('/')}>
        <LogoIcon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </LogoIcon>
        Marketifyall
      </Logo>
      <NavLinks>
        <NavLink onClick={() => history.push('/')}>Home</NavLink>
        <NavLink onClick={() => history.push('/features')}>Features</NavLink>
        <NavLink onClick={() => history.push('/developers')}>Developers</NavLink>
        <NavLink onClick={() => history.push('/about')}>About</NavLink>
        <NavLink onClick={() => history.push('/contact')}>Contact</NavLink>
      </NavLinks>
      <NavButton onClick={() => history.push('/design')}>Start Designing</NavButton>
    </Nav>
  )
}

export default Navigation
