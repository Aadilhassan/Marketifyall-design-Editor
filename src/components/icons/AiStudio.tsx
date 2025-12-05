function AiStudio({ size }: { size: number }) {
  return (
    <svg height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v12"></path>
      <path d="M6 12h12"></path>
      <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
    </svg>
  )
}

export default AiStudio
