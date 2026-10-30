import { Briefcase, LayoutGrid, Layers, PenLine, MessageSquare, History } from 'lucide-react'

// Rail icons for the newer panels; lucide strokes match the existing glyph weight.
export const BrandKit = ({ size }: { size: number }) => <Briefcase size={size} strokeWidth={1.8} />
export const Apps = ({ size }: { size: number }) => <LayoutGrid size={size} strokeWidth={1.8} />
export const LayersIcon = ({ size }: { size: number }) => <Layers size={size} strokeWidth={1.8} />
export const DrawIcon = ({ size }: { size: number }) => <PenLine size={size} strokeWidth={1.8} />
export const CommentsIcon = ({ size }: { size: number }) => <MessageSquare size={size} strokeWidth={1.8} />
export const HistoryIcon = ({ size }: { size: number }) => <History size={size} strokeWidth={1.8} />
