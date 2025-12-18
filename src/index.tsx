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
