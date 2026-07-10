import { createContext, useContext } from 'react'
import type { SaveManager } from '@/utils/saveManager'

export const SaveManagerContext = createContext<SaveManager | null>(null)
export const useSaveManager = () => useContext(SaveManagerContext)
