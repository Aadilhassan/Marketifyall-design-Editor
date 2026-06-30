import { FC, ReactNode } from 'react'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { PersistGate } from 'redux-persist/integration/react'
import { LightTheme, BaseProvider } from 'baseui'
import { EditorProvider } from '@nkyo/scenify-sdk'
import { AppProvider } from './contexts/AppContext'
import { VideoProvider } from './contexts/VideoContext'
import { EmbedProvider } from './contexts/EmbedContext'
import { CreditsProvider } from './contexts/CreditsContext'
import { AuthProvider } from './contexts/AuthContext'
import store, { persistor } from '@store/store'
import { Provider } from 'react-redux'

const engine = new Styletron()

// Compose providers to avoid deep nesting
function composeProviders(...providers: Array<FC<{ children?: ReactNode }>>) {
  return providers.reduceRight(
    (Acc, Cur) =>
      ({ children }: { children?: ReactNode }) =>
        (
          <Cur>
            <Acc>{children}</Acc>
          </Cur>
        ),
    ({ children }: { children?: ReactNode }) => <>{children}</>,
  )
}

const ReduxProvider: FC = ({ children }) => <Provider store={store}>{children}</Provider>
const PersistProvider: FC = ({ children }) => (
  <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
    {children}
  </PersistGate>
)
const StyleProvider: FC = ({ children }) => <StyletronProvider value={engine}>{children}</StyletronProvider>
// The editor canvas area sits in a `position: relative; z-index: 100` stacking
// context (Editor.tsx), so without an explicit layer z-index baseui popovers,
// dropdowns and modals render *behind* it. Lift the layer manager above the
// editor and app chrome (but below the full-screen drag overlay at 9999).
const ThemeProvider: FC = ({ children }) => (
  <BaseProvider theme={LightTheme} zIndex={4000}>
    {children}
  </BaseProvider>
)

const ComposedProviders = composeProviders(
  ReduxProvider,
  PersistProvider,
  StyleProvider,
  EditorProvider,
  ThemeProvider,
  EmbedProvider,
  AuthProvider,
  CreditsProvider,
  VideoProvider,
  AppProvider,
)

const Providers: FC = ({ children }) => <ComposedProviders>{children}</ComposedProviders>

export default Providers
