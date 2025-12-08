import ReactDOM from 'react-dom'
import reportWebVitals from './reportWebVitals'
import Providers from './Providers'
import Routes from './Routes'
import Container from './Container'
import ErrorBoundary from './components/ErrorBoundary'

// Polyfill process for browser environment
if (typeof (window as any).process === 'undefined') {
  ; (window as any).process = { env: {} }
}

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
