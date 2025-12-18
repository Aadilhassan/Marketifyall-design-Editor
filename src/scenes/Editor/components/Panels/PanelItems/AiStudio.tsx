import { useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Select } from 'baseui/select'
import { styled } from 'baseui'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { addObjectToCanvas } from '@/utils/editorHelpers'

const Container = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#ffffff',
})

const ScrollableContent = styled('div', {
  flex: 1,
  overflow: 'auto',
  paddingBottom: '80px', // Add padding to prevent content from being hidden behind the fixed button group
})

const FormSection = styled('div', {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '28px',
})

const SectionContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
})

const Label = styled('label', {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1a1a',
  marginBottom: '0px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const TextAreaContainer = styled('div', {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
})

const TextArea = styled('textarea', {
  width: '100%',
  padding: '14px 90px 14px 14px',
  backgroundColor: '#f8f8f8',
  border: '1px solid #e8e8e8',
  borderRadius: '8px',
  color: '#1a1a1a',
  fontSize: '13px',
  fontFamily: 'Poppins, sans-serif',
  lineHeight: '1.6',
  minHeight: '140px',
  resize: 'vertical',
  boxSizing: 'border-box',
  transition: 'all 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#5A3FFF',
    backgroundColor: '#fff',
    boxShadow: '0 0 0 3px rgba(90, 63, 255, 0.1)',
  },
  '::placeholder': {
    color: '#b0b0b0',
  },
})

const ImproveButton = styled('button', {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  background: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid #e0e0e0',
  color: '#666',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  padding: '4px 10px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  ':hover': {
    background: 'rgba(90, 63, 255, 0.05)',
    color: '#5A3FFF',
    borderColor: '#5A3FFF',
    boxShadow: '0 0 0 1px #5A3FFF',
  },
})

const ControlsContainer = styled('div', {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-end',
})

const SelectContainer = styled('div', {
  flex: 1,
})

const GenerateButtonStyled = styled('button', {
  minWidth: '110px',
  minHeight: '46px',
  padding: '10px 20px',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Poppins, sans-serif',
  ':hover': {
    backgroundColor: '#333',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  ':active': {
    transform: 'translateY(0)',
  },
  ':disabled': {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    transform: 'none',
  },
})

const PreviewContainer = styled('div', {
  backgroundColor: '#f8f8f8',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '280px',
  color: '#b0b0b0',
  fontSize: '14px',
  border: '1.5px dashed #e0e0e0',
  overflow: 'hidden',
  transition: 'all 0.2s ease',
})

const ButtonGroup = styled('div', {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  padding: '16px 24px',
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#ffffff',
  zIndex: 10,
  boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
})

const DiscardButtonStyled = styled('button', {
  padding: '10px 24px',
  backgroundColor: '#FF4D8D',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Poppins, sans-serif',
  minWidth: '100px',
  textAlign: 'center',
  ':hover': {
    backgroundColor: '#e6447d',
    transform: 'translateY(-1px)',
  },
  ':active': {
    transform: 'translateY(0)',
  },
})

const SaveButtonStyled = styled('button', {
  padding: '10px 24px',
  backgroundColor: '#6B7280',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Poppins, sans-serif',
  minWidth: '100px',
  textAlign: 'center',
  ':hover': {
    backgroundColor: '#4B5563',
    transform: 'translateY(-1px)',
  },
  ':active': {
    transform: 'translateY(0)',
  },
})

const imageSizes = [
  { label: 'Square (1024x1024)', id: '1024x1024' },
  { label: 'Portrait (768x1024)', id: '768x1024' },
  { label: 'Landscape (1024x768)', id: '1024x768' },
  { label: 'Small Square (512x512)', id: '512x512' },
]

function AiStudio() {
  const [description, setDescription] = useState('')
  const [selectedSize, setSelectedSize] = useState([imageSizes[0]])
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  const handleGenerate = async () => {
    if (!description.trim()) {
      alert('Please describe the image you want to generate')
      return
    }

    setIsLoading(true)
    try {
      // TODO: Replace with actual AI image generation API call
      // This is a placeholder for the API integration
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: description,
          size: selectedSize[0].id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedImage(data.imageUrl)
      } else {
        alert('Failed to generate image. Please try again.')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error generating image. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImprove = async () => {
    if (!description.trim()) {
      alert('Please enter a description first')
      return
    }
    // TODO: Implement improve functionality with AI enhancement
    alert('Improve feature coming soon!')
  }

  const handleSave = () => {
    if (generatedImage) {
      addObjectToCanvas(editor, {
        type: 'StaticImage',
        metadata: {
          src: generatedImage,
        },
      }, 400, canvas)
      setGeneratedImage(null)
      setDescription('')
    }
  }

  const handleDiscard = () => {
    setGeneratedImage(null)
  }

  return (
    <Container>
      <Scrollbars style={{ flex: 1 }}>
        <ScrollableContent>
          <FormSection>
            <SectionContainer>
              <Label>Generated image preview</Label>
              <PreviewContainer>
                {generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  'Generated image preview'
                )}
              </PreviewContainer>
            </SectionContainer>

            <SectionContainer>
              <Label htmlFor="description">Describe the image</Label>
              <TextAreaContainer>
                <TextArea
                  id="description"
                  placeholder="e.g., Minimal flat illustration of a rocket launching, pastel colors"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <ImproveButton onClick={handleImprove} title="Improve description">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
                  </svg>
                  Improve
                </ImproveButton>
              </TextAreaContainer>
            </SectionContainer>

            <SectionContainer>
              <Label>Image size</Label>
              <ControlsContainer>
                <SelectContainer>
                  <Select
                    options={imageSizes}
                    value={selectedSize}
                    onChange={(params: any) => setSelectedSize(params.value)}
                    clearable={false}
                    searchable={false}
                    overrides={{
                      Root: {
                        style: {
                          fontSize: '13px',
                        },
                      },
                      ControlContainer: {
                        style: {
                          borderRadius: '8px',
                          borderColor: '#e8e8e8',
                          backgroundColor: '#f8f8f8',
                          ':hover': {
                            borderColor: '#3a345fff',
                          },
                        },
                      },
                      SelectArrow: {
                        style: {
                          marginRight: '8px',
                        },
                      },
                    }}
                  />
                </SelectContainer>
                <GenerateButtonStyled
                  onClick={handleGenerate}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate'}
                </GenerateButtonStyled>
              </ControlsContainer>
            </SectionContainer>
          </FormSection>
        </ScrollableContent>
      </Scrollbars>

      {generatedImage && (
        <ButtonGroup>
          <DiscardButtonStyled onClick={handleDiscard}>
            Discard
          </DiscardButtonStyled>
          <SaveButtonStyled onClick={handleSave}>
            Save
          </SaveButtonStyled>
        </ButtonGroup>
      )}
    </Container>
  )
}

export default AiStudio
