import './polyfills'
import { installGlobalErrorHandlers } from './lib/globalErrors'
import ReactDOM from 'react-dom'
import reportWebVitals from './reportWebVitals'
import Providers from './Providers'
import Routes from './Routes'
import Container from './Container'
import ErrorBoundary from './components/ErrorBoundary'

installGlobalErrorHandlers()

const app = (
  <ErrorBoundary>
    <Providers>
      <Container>
        <Routes />
      </Container>
    </Providers>
  </ErrorBoundary>
)

// Hydrate when the page was pre-rendered (react-snap); otherwise render fresh.
const rootElement = document.getElementById('root')
if (rootElement && rootElement.hasChildNodes()) {
  ReactDOM.hydrate(app, rootElement)
} else {
  ReactDOM.render(app, rootElement)
}

reportWebVitals()

// Register the service worker for offline support + PWA installability.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* ignore registration failures (e.g. unsupported context) */
    })
  })
}
