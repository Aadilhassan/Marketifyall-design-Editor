import { useContext } from 'react'
import { VideoContext } from '@/contexts/VideoContext'

const useVideoContext = () => useContext(VideoContext)

export default useVideoContext
