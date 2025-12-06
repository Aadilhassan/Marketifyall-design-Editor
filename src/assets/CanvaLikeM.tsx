import React from 'react'

interface CanvaLikeMProps {
  size?: number
  className?: string
}

const CanvaLikeM: React.FC<CanvaLikeMProps> = ({ size = 64, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="mGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="1" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="white" stroke="url(#mGradient)" strokeWidth="2" filter="url(#shadow)" />

      {/* Letter M */}
      <g filter="url(#shadow)">
        {/* Left vertical line */}
        <rect x="16" y="18" width="4" height="28" fill="url(#mGradient)" rx="2" />

        {/* Middle peak */}
        <path d="M 20 18 L 32 28 L 44 18" stroke="url(#mGradient)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Right vertical line */}
        <rect x="44" y="18" width="4" height="28" fill="url(#mGradient)" rx="2" />
      </g>

      {/* Optional: Decorative dots for Canva-like feel */}
      <circle cx="10" cy="10" r="1.5" fill="#7C3AED" opacity="0.3" />
      <circle cx="54" cy="10" r="1.5" fill="#EC4899" opacity="0.3" />
      <circle cx="10" cy="54" r="1.5" fill="#EC4899" opacity="0.3" />
      <circle cx="54" cy="54" r="1.5" fill="#7C3AED" opacity="0.3" />
    </svg>
  )
}

export default CanvaLikeM
