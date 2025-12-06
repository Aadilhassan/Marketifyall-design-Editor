import { FC } from 'react'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { PersistGate } from 'redux-persist/integration/react'
import { LightTheme, BaseProvider } from 'baseui'
import { EditorProvider } from '@nkyo/scenify-sdk'
import { AppProvider } from './contexts/AppContext'
import { VideoProvider } from './contexts/VideoContext'
import { EmbedProvider } from './contexts/EmbedContext'
import store, { persistor } from '@store/store'
import { Provider } from 'react-redux'

const engine = new Styletron()

const Providers: FC = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <StyletronProvider value={engine}>
          <EditorProvider>
            <BaseProvider theme={LightTheme}>
              <EmbedProvider>
                <VideoProvider>
                  <AppProvider>{children}</AppProvider>
                </VideoProvider>
              </EmbedProvider>
            </BaseProvider>
          </EditorProvider>
        </StyletronProvider>
      </PersistGate>
    </Provider>
  )
}

export default Providers
