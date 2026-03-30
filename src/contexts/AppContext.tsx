import { PanelType } from '@/constants/app-options'
import { SubMenuType } from '@/constants/editor'
import React, { createContext, useState, FC } from 'react'

interface TemplateObject {
  type: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

interface Template {
  id?: string
  name?: string
  preview?: string
  width?: number
  height?: number
  objects?: TemplateObject[]
  background?: { type: string; value: string }
  frame?: { width: number; height: number }
  version?: string
  clipPath?: Record<string, unknown>
  description?: string
  category?: string
  tags?: string[]
  [key: string]: unknown
}

interface UploadItem {
  id: string
  contentType: string
  folder: string
  name: string
  type: string
  url: string
}

interface ShapeItem {
  id?: string
  name?: string
  [key: string]: unknown
}

interface IAppContext {
  isMobile: boolean | undefined
  setIsMobile: React.Dispatch<React.SetStateAction<boolean | undefined>>
  templates: Template[]
  setTemplates: (templates: Template[]) => void
  uploads: UploadItem[]
  setUploads: (uploads: UploadItem[]) => void
  shapes: ShapeItem[]
  setShapes: (shapes: ShapeItem[]) => void
  activePanel: PanelType
  setActivePanel: (option: PanelType) => void
  activeSubMenu: SubMenuType | null
  setActiveSubMenu: (option: SubMenuType) => void
  currentTemplate: Template | null
  setCurrentTemplate: React.Dispatch<React.SetStateAction<Template | null>>
}

export const AppContext = createContext<IAppContext>({
  isMobile: false,
  setIsMobile: () => {},
  templates: [],
  setTemplates: () => {},
  uploads: [],
  setUploads: () => {},
  shapes: [],
  setShapes: () => {},
  activePanel: PanelType.TEMPLATES,
  setActivePanel: () => {},
  activeSubMenu: null,
  setActiveSubMenu: () => {},
  currentTemplate: null,
  setCurrentTemplate: () => {},
})

export const AppProvider: FC = ({ children }) => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)
  const [templates, setTemplates] = useState<Template[]>([])
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [shapes, setShapes] = useState<ShapeItem[]>([])
  const [activePanel, setActivePanel] = useState<PanelType>(PanelType.TEMPLATES)
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType | null>(null)
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const context = {
    isMobile,
    setIsMobile,
    templates,
    setTemplates,
    activePanel,
    setActivePanel,
    shapes,
    setShapes,
    activeSubMenu,
    setActiveSubMenu,
    uploads,
    setUploads,
    currentTemplate,
    setCurrentTemplate,
  }
  return <AppContext.Provider value={context}>{children}</AppContext.Provider>
}
