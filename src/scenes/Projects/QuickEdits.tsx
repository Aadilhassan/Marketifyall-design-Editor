/**
 * Adobe Express-style "Quick edits": illustrated cards that open the editor
 * straight on one tool. The art is CSS/SVG plus crops of template previews, so
 * it stays on-brand and needs no extra assets.
 */

export interface QuickEdit {
  id: string
  label: string
  badge?: string
  w?: number
  h?: number
  panel?: string
  starter?: string
  kind?: string
  /** editor query params beyond panel/starter (e.g. app=charts) */
  extra?: Record<string, string>
  /** pick a photo first; the design is sized to it */
  upload?: boolean
  tool?: 'remove-bg' | 'magic-eraser'
}

export const QUICK_EDITS: QuickEdit[] = [
  { id: 'remove-bg', label: 'Remove background', badge: 'On-device', upload: true, tool: 'remove-bg' },
  { id: 'eraser', label: 'Magic Eraser', badge: 'On-device', upload: true, tool: 'magic-eraser' },
  { id: 'qr', label: 'Generate QR code', w: 1080, h: 1080, panel: 'Apps', extra: { app: 'qr' } },
  { id: 'chart', label: 'Make a chart', w: 1920, h: 1080, panel: 'Apps', extra: { app: 'charts' } },
  { id: 'reel', label: 'Edit a reel', w: 1080, h: 1920, panel: 'Video' },
  { id: 'slides', label: 'Make a presentation', w: 1920, h: 1080, panel: 'Templates' },
  { id: 'text', label: 'Styled text', w: 1080, h: 1080, panel: 'Text' },
  { id: 'board', label: 'Whiteboard', w: 2560, h: 1440, panel: 'Elements', starter: 'whiteboard', kind: 'whiteboard' },
]

/** Template previews used as photo material, by template name. */
export const ART_PHOTOS = {
  portrait: 'Elegant Wedding — Instagram Post',
  scene: 'Tropical Getaway — Instagram Post',
  reelA: 'Concert Poster — Instagram Post',
  reelB: 'Mountain Adventure — Instagram Post',
  reelC: 'Summer Sale — Instagram Post',
  slideA: 'Quarterly Review — LinkedIn Post',
  slideB: 'Cyber Security — Twitter Post',
}
export type ArtPhotos = Partial<Record<keyof typeof ART_PHOTOS, string>>

const QR = [
  '1111111010101111111',
  '1000001001101000001',
  '1011101011001011101',
  '1011101000101011101',
  '1011101011101011101',
  '1000001010001000001',
  '1111111010101111111',
  '0000000011100000000',
  '1101011100110110010',
  '0110100111011001101',
  '1011011010110111010',
  '0000000010011010011',
  '1111111011010110110',
  '1000001001101101001',
  '1011101011011011110',
  '1011101010110100101',
  '1011101001101101110',
  '1000001011010010011',
  '1111111010111011101',
]

function QrArt() {
  return (
    <svg viewBox="-2 -2 23 23" className="qe-qr" aria-hidden="true">
      <rect x="-2" y="-2" width="23" height="23" rx="2" fill="#fff" />
      {QR.flatMap((row, y) => row.split('').map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="#181410" /> : null)))}
      <rect x="7.5" y="7.5" width="4" height="4" rx=".8" fill="#d8401c" />
    </svg>
  )
}

function ChartArt() {
  const bars = [38, 62, 48, 84, 70]
  return (
    <svg viewBox="0 0 120 84" className="qe-chart" aria-hidden="true">
      <rect width="120" height="84" rx="6" fill="#fff" />
      {[20, 40, 60].map(y => (
        <line key={y} x1="12" x2="110" y1={y} y2={y} stroke="#ebe4d4" strokeWidth="1" />
      ))}
      {bars.map((h, i) => (
        <rect key={i} x={16 + i * 19} y={74 - h * 0.7} width="12" height={h * 0.7} rx="2" fill={i === 3 ? '#d8401c' : '#181410'} opacity={i === 3 ? 1 : 0.85} />
      ))}
      <polyline points="22,46 41,30 60,38 79,14 98,22" fill="none" stroke="#d8401c" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  )
}

function TextArt() {
  return (
    <svg viewBox="0 0 140 90" className="qe-text" aria-hidden="true">
      <defs>
        <path id="qe-arc" d="M18 70 Q70 8 122 70" />
      </defs>
      <text fontFamily="Fraunces, Georgia, serif" fontWeight="900" fontSize="19" fill="#181410" letterSpacing="1">
        <textPath href="#qe-arc" startOffset="50%" textAnchor="middle">
          CURVED TEXT
        </textPath>
      </text>
      <text x="70" y="80" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontWeight="900" fontSize="22" fill="#fff" stroke="#d8401c" strokeWidth="5" paintOrder="stroke">
        Outline
      </text>
    </svg>
  )
}

function BoardArt() {
  return (
    <svg viewBox="0 0 140 90" className="qe-board" aria-hidden="true">
      <defs>
        <pattern id="qe-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".9" fill="#c9c1ae" />
        </pattern>
      </defs>
      <rect width="140" height="90" rx="6" fill="#fff" />
      <rect width="140" height="90" rx="6" fill="url(#qe-dots)" />
      <rect x="14" y="14" width="34" height="28" rx="2" fill="#ffd66b" transform="rotate(-4 31 28)" />
      <rect x="54" y="20" width="34" height="28" rx="2" fill="#f7b3a0" transform="rotate(3 71 34)" />
      <path d="M20 66 C36 52 50 78 66 62 S96 50 112 66" fill="none" stroke="#d8401c" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 24 l16 12 -16 12" fill="none" stroke="#181410" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Photo({ src, pos = 'center', className = '' }: { src?: string; pos?: string; className?: string }) {
  return src ? <img src={src} alt="" loading="lazy" className={`qe-photo ${className}`} style={{ objectPosition: pos }} /> : <span className={`qe-photo qe-photo--empty ${className}`} />
}

export function QuickEditArt({ id, photos }: { id: string; photos: ArtPhotos }) {
  switch (id) {
    case 'remove-bg':
      return (
        <span className="qe-art qe-art--rbg">
          <Photo src={photos.portrait} pos="50% 70%" />
          <span className="qe-checker" />
          <span className="qe-cut" />
        </span>
      )
    case 'eraser':
      return (
        <span className="qe-art qe-art--eraser">
          <Photo src={photos.scene} pos="50% 85%" />
          <svg viewBox="0 0 100 70" className="qe-stroke" aria-hidden="true" preserveAspectRatio="none">
            <path d="M18 52 C30 36 44 58 58 40 S80 30 86 22" fill="none" stroke="#d8401c" strokeWidth="9" strokeLinecap="round" opacity=".55" />
          </svg>
          <span className="qe-brush" />
        </span>
      )
    case 'qr':
      return (
        <span className="qe-art qe-art--qr">
          <QrArt />
        </span>
      )
    case 'chart':
      return (
        <span className="qe-art qe-art--chart">
          <ChartArt />
        </span>
      )
    case 'reel':
      return (
        <span className="qe-art qe-art--reel">
          <span className="qe-phone">
            <Photo src={photos.reelB} pos="30% 60%" />
          </span>
          <span className="qe-track">
            <Photo src={photos.reelA} pos="70% 80%" />
            <Photo src={photos.reelB} pos="80% 90%" />
            <Photo src={photos.reelC} pos="50% 30%" />
          </span>
          <span className="qe-wave" />
        </span>
      )
    case 'slides':
      return (
        <span className="qe-art qe-art--slides">
          <Photo src={photos.slideB} className="qe-slide qe-slide--back" />
          <Photo src={photos.slideA} className="qe-slide" />
        </span>
      )
    case 'text':
      return (
        <span className="qe-art qe-art--text">
          <TextArt />
        </span>
      )
    default:
      return (
        <span className="qe-art qe-art--board">
          <BoardArt />
        </span>
      )
  }
}
