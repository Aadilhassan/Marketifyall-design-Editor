import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorIcon = (
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )

      const refreshIcon = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      )

      const reloadIcon = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      )

      const homeIcon = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconContainer}>{errorIcon}</div>

            <h1 style={styles.title}>Oops! Something went wrong</h1>

            <p style={styles.description}>
              We're sorry, but something unexpected happened. Don't worry, your work might still be
              saved. Please try one of the options below.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.errorDetails}>
                <summary style={styles.errorSummary}>Error Details (Development Only)</summary>
                <pre style={styles.errorCode}>
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <React.Fragment>
                      {'\n\n'}
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </React.Fragment>
                  )}
                </pre>
              </details>
            )}

            <div style={styles.buttonContainer}>
              <button style={styles.primaryButton} onClick={this.handleTryAgain}>
                {refreshIcon}
                Try Again
              </button>

              <button style={styles.secondaryButton} onClick={this.handleReload}>
                {reloadIcon}
                Reload Page
              </button>

              <button style={styles.tertiaryButton} onClick={this.handleGoHome}>
                {homeIcon}
                Go to Homepage
              </button>
            </div>

            <p style={styles.supportText}>
              If this problem persists, please{' '}
              <a
                href="https://github.com/Aadilhassan/Marketifyall-design-Editor/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                report an issue on GitHub
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  content: {
    maxWidth: '500px',
    textAlign: 'center' as const,
    background: '#ffffff',
    borderRadius: '16px',
    padding: '48px 40px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  errorDetails: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left' as const,
  },
  errorSummary: {
    cursor: 'pointer',
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: '12px',
  },
  errorCode: {
    fontSize: '12px',
    color: '#7f1d1d',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    margin: '12px 0 0 0',
    maxHeight: '200px',
    overflow: 'auto',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tertiaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  supportText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  link: {
    color: '#7C3AED',
    textDecoration: 'none',
    fontWeight: 500,
  },
}

export default ErrorBoundary
