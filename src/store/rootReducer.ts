import { combineReducers } from '@reduxjs/toolkit'
import persistReducer from 'redux-persist/es/persistReducer'
import storage from 'redux-persist/lib/storage'
import { elementsReducer, ElementsState } from './slices/elements/reducer'
import { uploadsReducer } from './slices/uploads/reducer'
import { PersistConfig } from 'redux-persist/es/types'
import { fontsReducer } from './slices/fonts/reducer'
import { templatesReducer } from './slices/templates/reducer'
import { creationsReducer } from './slices/creations/reducer'
import { creditsReducer } from './slices/credits/reducer'
import createTransform from 'redux-persist/es/createTransform'

// Obfuscation transform to avoid plaintext storage
const obfuscateTransform = createTransform(
  // On save: encode
  (inboundState: unknown) => {
    try {
      return btoa(JSON.stringify(inboundState))
    } catch {
      return inboundState
    }
  },
  // On load: decode
  (outboundState: unknown) => {
    try {
      if (typeof outboundState === 'string') {
        return JSON.parse(atob(outboundState))
      }
      return outboundState
    } catch {
      return outboundState
    }
  },
)

const elementsPersistConfig: PersistConfig<ElementsState> = {
  key: 'elements',
  storage,
  transforms: [obfuscateTransform],
}

const rootReducer = combineReducers({
  editor: combineReducers({
    elements: persistReducer(elementsPersistConfig, elementsReducer),
    uploads: uploadsReducer,
    fonts: fontsReducer,
    templates: templatesReducer,
  }),
  creations: creationsReducer,
  credits: creditsReducer,
})

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer
