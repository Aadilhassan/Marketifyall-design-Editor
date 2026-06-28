import './polyfills'
import ReactDOM from 'react-dom'
import reportWebVitals from './reportWebVitals'
import Providers from './Providers'
import Routes from './Routes'
import Container from './Container'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.render(
  <ErrorBoundary>
    <Providers>
      <Container>
        <Routes />
      </Container>
    </Providers>
  </ErrorBoundary>,
  document.getElementById('root')
)

reportWebVitals()

// Register the service worker for offline support + PWA installability.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* ignore registration failures (e.g. unsupported context) */
    })
  })
}
