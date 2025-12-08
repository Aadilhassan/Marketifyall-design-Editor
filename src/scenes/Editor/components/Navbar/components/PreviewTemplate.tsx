import { Button, KIND } from 'baseui/button'
import { Modal, ModalBody, SIZE } from 'baseui/modal'
import { useEffect, useState } from 'react'
import { ThemeProvider, LightTheme } from 'baseui'
import { flatten, uniq } from 'lodash'
import { useEditor } from '@nkyo/scenify-sdk'
import { FormControl } from 'baseui/form-control'
import { Input } from 'baseui/input'

function PreviewTemplate() {
  const [isOpen, setIsOpen] = useState(false)
  const editor = useEditor()
  const [options, setOptions] = useState<any>({})
  const [previewImage, setPreviewImage] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (isOpen && editor) {
      // Use editor.exportToJSON() instead of canvas.toJSON()
      const template = editor.exportToJSON();

      // Store a copy of the template state for restoration
      if (template && template.objects) {
        try {
          localStorage.setItem('canva_clone_temp_state', JSON.stringify(template));
        } catch (err) {
          console.error('Failed to save template state:', err);
        }
      }

      const keys = template.objects.map(object => {
        return object.metadata && object.metadata.keys ? object.metadata.keys : []
      })

      const params: Record<string, string> = {}
      const uniqElements = uniq(flatten(keys))
      uniqElements.forEach(key => {
        params[key] = ''
      })

      setOptions(params)
      if (uniqElements.length === 0) {
        handleBuildImage()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editor])

  // Separate useEffect for state restoration to avoid race conditions
  useEffect(() => {
    if (!isOpen && editor) {
      // Only attempt restoration when closing the modal
      try {
        const savedState = localStorage.getItem('canva_clone_temp_state');
        if (savedState) {
          const template = JSON.parse(savedState);
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            try {
              editor.importFromJSON(template);
            } catch (err) {
              console.error('Error importing template:', err);
            }
          });
        }
      } catch (err) {
        console.error('Failed to restore canvas state:', err);
      }
    }
  }, [isOpen, editor]);

  const handleBuildImage = async () => {
    if (!editor) return;

    try {
      setIsProcessing(true);
      // @ts-ignore
      const image = await editor.toPNG(options);
      setPreviewImage(image);
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  const close = () => {
    setIsOpen(false);
    setPreviewImage(null);
    setOptions({});

    // No need to save here as we've already saved in the useEffect
    // Set a small delay before allowing new interactions to prevent race conditions
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
  }

  const handleDownloadImage = () => {
    if (editor) {
      if (previewImage) {
        const a = document.createElement('a')
        a.href = previewImage
        a.download = 'drawing.png'
        a.click()
      }
    }
  }

  // Function to recover canvas state in case of problems
  const handleRecoverCanvas = () => {
    if (!editor) return;

    try {
      setIsProcessing(true);
      const savedState = localStorage.getItem('canva_clone_temp_state') ||
        localStorage.getItem('canva_clone_autosave');

      if (savedState) {
        const template = JSON.parse(savedState);
        editor.importFromJSON(template);
        alert('Canvas state has been recovered!');
      } else {
        alert('No saved state found to recover.');
      }
    } catch (err) {
      console.error('Recovery failed:', err);
      alert('Failed to recover canvas state.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Button
          kind={KIND.tertiary}
          onClick={() => setIsOpen(true)}
          disabled={isProcessing}
          overrides={{
            BaseButton: {
              style: {
                height: '38px',
                borderRadius: '10px',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '0',
                paddingBottom: '0',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '14px',
                border: '1px solid #000000',
                lineHeight: '1',
                ':hover': { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff' },
              },
            },
          }}>
          Preview
        </Button>

        {/* Emergency recovery button */}
        <Button
          kind={KIND.tertiary}
          onClick={handleRecoverCanvas}
          disabled={isProcessing}
          overrides={{
            BaseButton: {
              style: {
                height: '38px',
                borderRadius: '10px',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '0',
                paddingBottom: '0',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 500,
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                lineHeight: '1',
                ':hover': { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' },
              },
            },
          }}>
          Recover Canvas
        </Button>
      </div>

      <ThemeProvider theme={LightTheme}>
        <Modal
          unstable_ModalBackdropScroll={true}
          overrides={{
            Dialog: {
              style: {
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                width: 'auto',
                maxWidth: '95vw',
              },
            },
            Close: {
              style: { display: 'none' },
            },
          }}
          onClose={close}
          isOpen={isOpen}
          size={SIZE.auto}
        >
          <ModalBody style={{ margin: 0, padding: 0 }}>
            {previewImage ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#ffffff',
                  minWidth: '600px',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1e293b',
                        letterSpacing: '-0.025em',
                      }}
                    >
                      Preview Design
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                      Review your design before downloading
                    </p>
                  </div>
                  <Button
                    onClick={close}
                    kind={KIND.tertiary}
                    size="compact"
                    shape="circle"
                    overrides={{
                      BaseButton: {
                        style: {
                          color: '#94a3b8',
                          ':hover': { color: '#ef4444', backgroundColor: '#fee2e2' },
                        },
                      },
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </Button>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: '2rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#f8fafc',
                    // Checkered background pattern for transparency
                    backgroundImage:
                      'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    minHeight: '400px',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      borderRadius: '4px', // Subtle radius for the canvas itself
                      overflow: 'hidden',
                      lineHeight: 0,
                      border: '1px solid rgba(0,0,0,0.05)',
                      background: 'white',
                    }}
                  >
                    <img
                      style={{
                        maxWidth: '85vw',
                        maxHeight: '65vh',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                      src={previewImage}
                      alt="preview"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    background: '#ffffff',
                  }}
                >
                  <Button
                    onClick={close}
                    kind={KIND.tertiary}
                    disabled={isProcessing}
                    overrides={{
                      BaseButton: {
                        style: {
                          borderRadius: '12px',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          backgroundColor: '#ffffff',
                          color: '#334155',
                          fontWeight: 500,
                          border: '1px solid #e2e8f0',
                          ':hover': { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#0f172a' },
                        },
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleDownloadImage()}
                    disabled={isProcessing}
                    overrides={{
                      BaseButton: {
                        style: {
                          borderRadius: '12px',
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: '1px solid #0f172a',
                          paddingLeft: '20px',
                          paddingRight: '20px',
                          transition: 'all 0.2s',
                          ':hover': {
                            backgroundColor: '#1e293b',
                            borderColor: '#1e293b',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          },
                        },
                      },
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download Image
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2.5rem', width: '500px', maxWidth: '100%' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      color: '#64748b',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>
                    Generate Preview
                  </h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                    Enter values for your dynamic fields below to generate a high-fidelity preview of your design.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {Object.keys(options).map(option => (
                    <FormControl
                      key={option}
                      label={() => (
                        <span
                          style={{
                            fontWeight: 500,
                            color: '#334155',
                            fontSize: '14px',
                            marginBottom: '4px',
                            display: 'block',
                          }}
                        >
                          {option}
                        </span>
                      )}
                    >
                      <Input
                        value={options[option]}
                        onChange={(e: any) => setOptions({ ...options, [option]: e.target.value })}
                        disabled={isProcessing}
                        placeholder={`Value for ${option}`}
                        clearOnEscape
                        overrides={{
                          Root: {
                            style: {
                              borderRadius: '8px',
                              backgroundColor: '#f8fafc',
                            },
                          },
                          InputContainer: {
                            style: { backgroundColor: 'transparent' },
                          },
                        }}
                      />
                    </FormControl>
                  ))}

                  <div style={{ marginTop: '1rem' }}>
                    <Button
                      onClick={() => handleBuildImage()}
                      disabled={isProcessing}
                      overrides={{
                        BaseButton: {
                          style: {
                            borderRadius: '8px',
                            width: '100%',
                            height: '48px',
                            background: '#0f172a',
                            fontWeight: 600,
                            ':hover': { background: '#1e293b' },
                          },
                        },
                      }}
                    >
                      {isProcessing ? 'Generating Preview...' : 'Generate Preview'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
        </Modal>
      </ThemeProvider>
    </>
  )
}

export default PreviewTemplate
