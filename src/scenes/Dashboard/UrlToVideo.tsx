import React, { useState } from 'react'
import axios from 'axios'

const SAMPLE_PROPERTY = `$399,900
1901 Mallard Dr, London, KY 40741
5 beds | 3 baths | 2,502 sqft
Single Family Residence | Built in 1992 | 0.78 Acres

Don't miss the opportunity to own this beautiful and spacious home located in one of London's most well-established subdivisions. Featuring 5 generously sized bedrooms, including a large master suite, and a main floor room that could easily serve as a home office. The formal living and dining rooms are perfect for entertaining, while the cozy family room with a gas fireplace provides a warm, inviting space to relax. Step outside onto the large back deck and enjoy your morning coffee overlooking the beautiful corner lot.`

const SAMPLE_IMAGES = `https://photos.zillowstatic.com/fp/2f7d66486bcf501a33cf412e622d1715-cc_ft_768.webp
https://photos.zillowstatic.com/fp/1dac84d9c16ab8c5c051328e9d90e95d-cc_ft_768.webp
https://photos.zillowstatic.com/fp/d9c5e5a14a4da03c1f865920bdfb3b8e-cc_ft_768.webp`

type VideoFormat = 'landscape' | 'portrait' | 'square'

interface CaptionStyle {
    fontSize: 'small' | 'medium' | 'large'
    textColor: string
    bgColor: string
    bgOpacity: number
    position: 'top' | 'center' | 'bottom'
}

const FORMAT_INFO: Record<VideoFormat, { label: string; dims: string; icon: string }> = {
    landscape: { label: 'YouTube', dims: '1280×720', icon: '📺' },
    portrait: { label: 'Reels/TikTok', dims: '1080×1920', icon: '📱' },
    square: { label: 'Instagram', dims: '1080×1080', icon: '⬜' }
}

const FONT_SIZES = { small: 24, medium: 36, large: 48 }
const COLORS = ['#FFFFFF', '#FFFF00', '#00FF00', '#FF6B6B', '#00D4FF']

const UrlToVideo = () => {
    const [propertyText, setPropertyText] = useState<string>('')
    const [imageUrls, setImageUrls] = useState<string>('')
    const [format, setFormat] = useState<VideoFormat>('portrait')
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>({
        fontSize: 'medium',
        textColor: '#FFFFFF',
        bgColor: '#000000',
        bgOpacity: 0.7,
        position: 'bottom'
    })
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [progress, setProgress] = useState(0)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)

    const handleFillDemo = () => {
        setPropertyText(SAMPLE_PROPERTY)
        setImageUrls(SAMPLE_IMAGES)
    }

    const handleGenerate = async () => {
        try {
            if (!propertyText.trim()) return alert('Please enter property details')
            if (!imageUrls.trim()) return alert('Please enter at least one image URL')

            setLoading(true)
            setStatus('🔍 Analyzing images with AI Vision...')
            setProgress(0)
            setVideoUrl(null)

            const images = imageUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0)

            const response = await axios.post('http://localhost:3001/api/generate/manual', {
                propertyText,
                images,
                format,
                captionStyle: {
                    fontSize: FONT_SIZES[captionStyle.fontSize],
                    color: captionStyle.textColor,
                    bgColor: `${captionStyle.bgColor}@${captionStyle.bgOpacity}`,
                    position: captionStyle.position
                }
            })
            const id = response.data.id

            const interval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`http://localhost:3001/api/generate/${id}/status`)
                    const s = statusRes.data
                    setProgress(Math.round(s.progress))

                    if (s.progress < 25) setStatus('🔍 Analyzing images with AI Vision...')
                    else if (s.progress < 40) setStatus('✍️ Writing engaging script...')
                    else if (s.progress < 55) setStatus('🎙️ Generating voiceover...')
                    else if (s.progress < 60) setStatus('📝 Creating subtitles...')
                    else setStatus('🎬 Rendering video...')

                    if (s.status === 'done') {
                        clearInterval(interval)
                        setLoading(false)
                        setStatus('✅ Video ready!')
                        setVideoUrl(`http://localhost:3001/api/generate/${id}/download`)
                    } else if (s.status === 'error') {
                        clearInterval(interval)
                        setLoading(false)
                        setStatus(`❌ Error: ${s.error}`)
                    }
                } catch (err) { /* silently handled */ }
            }, 1000)

        } catch (err: any) {
            setLoading(false)
            setStatus('❌ Failed. Ensure backend is running.')
        }
    }

    // Caption Preview Component
    const CaptionPreview = () => {
        const positionStyle = {
            top: captionStyle.position === 'top' ? '10%' : captionStyle.position === 'center' ? '45%' : '80%'
        }
        return (
            <div style={{
                position: 'relative',
                width: '100%',
                height: '120px',
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px'
            }}>
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    ...positionStyle,
                    background: `${captionStyle.bgColor}${Math.round(captionStyle.bgOpacity * 255).toString(16).padStart(2, '0')}`,
                    color: captionStyle.textColor,
                    fontSize: `${FONT_SIZES[captionStyle.fontSize] / 2}px`,
                    fontWeight: 'bold',
                    padding: '6px 16px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                }}>
                    DREAM HOME AWAITS
                </div>
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', color: '#666', fontSize: '11px' }}>
                    Caption Preview
                </div>
            </div>
        )
    }

    return (
        <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#1a1a2e' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px', background: 'linear-gradient(135deg, #e00b20, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Real Estate Video AI 🏠✨
                </h1>
                <p style={{ color: '#666', fontSize: '0.95rem' }}>AI-powered videos with voiceover & captions</p>
            </div>

            {/* Format + Caption Style Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Format Selector */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.85rem' }}>🎬 Format</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(Object.keys(FORMAT_INFO) as VideoFormat[]).map(f => (
                            <button key={f} onClick={() => setFormat(f)} style={{
                                flex: 1, padding: '10px 6px', border: format === f ? '2px solid #e00b20' : '2px solid #e0e0e0',
                                borderRadius: '8px', background: format === f ? 'rgba(224,11,32,0.05)' : 'white', cursor: 'pointer'
                            }}>
                                <div style={{ fontSize: '18px' }}>{FORMAT_INFO[f].icon}</div>
                                <div style={{ fontSize: '11px', fontWeight: '500' }}>{FORMAT_INFO[f].label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Caption Style */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.85rem' }}>📝 Caption Style</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Font Size */}
                        {(['small', 'medium', 'large'] as const).map(size => (
                            <button key={size} onClick={() => setCaptionStyle(s => ({ ...s, fontSize: size }))} style={{
                                padding: '6px 10px', fontSize: '11px', fontWeight: captionStyle.fontSize === size ? '700' : '400',
                                border: captionStyle.fontSize === size ? '2px solid #e00b20' : '1px solid #ccc',
                                borderRadius: '4px', background: 'white', cursor: 'pointer', textTransform: 'capitalize'
                            }}>{size}</button>
                        ))}
                        {/* Colors */}
                        {COLORS.map(color => (
                            <button key={color} onClick={() => setCaptionStyle(s => ({ ...s, textColor: color }))} style={{
                                width: '24px', height: '24px', borderRadius: '50%', background: color, cursor: 'pointer',
                                border: captionStyle.textColor === color ? '3px solid #e00b20' : '2px solid #ccc'
                            }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Caption Preview */}
            <CaptionPreview />

            {/* Property Details */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>📋 Property Details</label>
                <textarea value={propertyText} onChange={e => setPropertyText(e.target.value)}
                    placeholder="Paste property info here..."
                    style={{ width: '100%', minHeight: '140px', padding: '12px', fontSize: '13px', border: '2px solid #e0e0e0', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }}
                />
            </div>

            {/* Image URLs */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>🖼️ Image URLs (one per line)</label>
                <textarea value={imageUrls} onChange={e => setImageUrls(e.target.value)}
                    placeholder="https://example.com/image1.jpg"
                    style={{ width: '100%', minHeight: '80px', padding: '12px', fontSize: '12px', border: '2px solid #e0e0e0', borderRadius: '8px', resize: 'vertical', fontFamily: 'monospace' }}
                />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={handleFillDemo} style={{ padding: '12px 20px', fontSize: '14px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>
                    📝 Demo
                </button>
                <button onClick={handleGenerate} disabled={loading} style={{
                    flex: 1, padding: '12px', fontSize: '15px', background: loading ? '#ccc' : 'linear-gradient(135deg, #e00b20, #ff4757)',
                    color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600'
                }}>
                    {loading ? '🔄 Generating...' : '🚀 Generate Video'}
                </button>
            </div>

            {/* Status + Progress */}
            {(status || loading) && (
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #e00b20', marginBottom: '20px' }}>
                    <div style={{ marginBottom: '10px', fontSize: '14px' }}>{status}</div>
                    <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #e00b20, #ff6b6b)', transition: 'width 0.3s' }} />
                    </div>
                </div>
            )}

            {/* Video Player */}
            {videoUrl && (
                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ marginBottom: '12px' }}>🎥 Your Video:</h3>
                    <video controls width="100%" src={videoUrl} autoPlay style={{ borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxHeight: format === 'portrait' ? '500px' : 'auto' }} />
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <a href={videoUrl} download style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: '500' }}>
                            ⬇️ Download
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UrlToVideo
