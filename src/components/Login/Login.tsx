import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from 'baseui/input'
import { Button, KIND } from 'baseui/button'
import { FormControl } from 'baseui/form-control'
import { styled } from 'baseui'
import { Card } from 'baseui/card'
import { H1, H2 } from 'baseui/typography'
import { toaster } from 'baseui/toast'

const Container = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: '#d8401c',
  fontFamily: 'Poppins',
  width: '100%',
})

const LoginCard = styled(Card, {
  width: '400px',
  padding: '2rem',
})

const LogoContainer = styled('div', {
  textAlign: 'center',
  marginBottom: '2rem',
})

const FormContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
})

const SwitchText = styled('div', {
  textAlign: 'center',
  marginTop: '1rem',
  cursor: 'pointer',
  color: '#d8401c',
})

interface LoginProps {
  onSuccess?: () => void
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { signIn, signUp, loading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          toaster.negative(error.message, {})
        } else {
          toaster.positive('Signed in successfully!', {})
          onSuccess?.()
        }
      } else {
        const { error } = await signUp(email, password, name)
        if (error) {
          toaster.negative(error.message, {})
        } else {
          toaster.positive('Account created successfully! Please check your email to confirm.', {})
          setIsLogin(true)
        }
      }
    } catch (error) {
      toaster.negative('An unexpected error occurred', {})
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  if (loading) {
    return (
      <Container>
        <LoginCard>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <H2>Loading...</H2>
          </div>
        </LoginCard>
      </Container>
    )
  }

  return (
    <Container>
      <LoginCard>
        <LogoContainer>
          <H1 
            overrides={{
              Block: {
                style: { color: '#d8401c', margin: 0 }
              }
            }}
          >
            Marketifyall
          </H1>
          <H2 
            overrides={{
              Block: {
                style: { color: '#666', margin: '0.5rem 0', fontWeight: 400 }
              }
            }}
          >
            Design Editor
          </H2>
        </LogoContainer>

        <form onSubmit={handleSubmit}>
          <FormContainer>
            {!isLogin && (
              <FormControl label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </FormControl>
            )}

            <FormControl label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                placeholder="Enter your email"
                required
              />
            </FormControl>

            <FormControl label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder="Enter your password"
                required
              />
            </FormControl>

            <Button
              type="submit"
              kind={KIND.primary}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              overrides={{
                BaseButton: {
                  style: {
                    width: '100%',
                    marginTop: '1rem',
                  },
                },
              }}
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </FormContainer>
        </form>

        <SwitchText onClick={switchMode}>
          {isLogin
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </SwitchText>
      </LoginCard>
    </Container>
  )
}

export default Login
