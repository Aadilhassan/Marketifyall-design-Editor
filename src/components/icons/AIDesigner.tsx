function AIDesigner({ size = 24 }: { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="aiDesignerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
      <path 
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
        stroke="url(#aiDesignerGradient)" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="12" r="3" fill="url(#aiDesignerGradient)" opacity="0.3" />
      <circle cx="12" cy="12" r="1.5" fill="url(#aiDesignerGradient)" />
    </svg>
  )
}

export default AIDesigner
