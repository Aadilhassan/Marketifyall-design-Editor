import React, { createContext, useCallback, useMemo, useState } from 'react'

export type TimelineLayer = {
  id: string
  name: string
  type: 'video' | 'text' | 'image' | 'shape' | 'audio'
  start: number
  duration: number
  color: string
  metadata?: any
}

export type VideoClip = {
  id: string
  name: string
  src: string
  duration: number
  start: number
  end: number
  poster?: string
}

type VideoContextValue = {
  clips: VideoClip[]
  layers: TimelineLayer[]
  activeClipId: string | null
  isTimelineOpen: boolean
  setTimelineOpen: (open: boolean) => void
  addClip: (clip: VideoClip) => void
  removeClip: (id: string) => void
  setActiveClip: (id: string | null) => void
  updateClip: (id: string, patch: Partial<VideoClip>) => void
  addLayer: (layer: TimelineLayer) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<TimelineLayer>) => void
}

export const VideoContext = createContext<VideoContextValue>({
  clips: [],
  layers: [],
  activeClipId: null,
  isTimelineOpen: false,
  setTimelineOpen: () => {},
  addClip: () => {},
  removeClip: () => {},
  setActiveClip: () => {},
  updateClip: () => {},
  addLayer: () => {},
  removeLayer: () => {},
  updateLayer: () => {},
})

export const VideoProvider: React.FC = ({ children }) => {
  const [clips, setClips] = useState<VideoClip[]>([])
  const [layers, setLayers] = useState<TimelineLayer[]>([])
  const [activeClipId, setActiveClipId] = useState<string | null>(null)
  const [isTimelineOpen, setTimelineOpen] = useState(false)

  const addClip = useCallback((clip: VideoClip) => {
    setClips(prev => [...prev, clip])
    setActiveClipId(clip.id)
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id))
    setActiveClipId(prev => (prev === id ? null : prev))
  }, [])

  const updateClip = useCallback((id: string, patch: Partial<VideoClip>) => {
    setClips(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const addLayer = useCallback((layer: TimelineLayer) => {
    setLayers(prev => [...prev, layer])
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id))
  }, [])

  const updateLayer = useCallback((id: string, patch: Partial<TimelineLayer>) => {
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }, [])

  const value = useMemo(
    () => ({
      clips,
      layers,
      activeClipId,
      isTimelineOpen,
      setTimelineOpen,
      addClip,
      removeClip,
      setActiveClip: setActiveClipId,
      updateClip,
      addLayer,
      removeLayer,
      updateLayer,
    }),
    [clips, layers, activeClipId, isTimelineOpen, addClip, removeClip, updateClip, addLayer, removeLayer, updateLayer]
  )

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}
