import { useState } from 'react'
import { Scrollbars } from 'react-custom-scrollbars'
import { Input } from 'baseui/input'
import Icons from '@components/icons'
import { useEditor, useEditorContext } from '@nkyo/scenify-sdk'
import { useSelector } from 'react-redux'
import { selectTemplates } from '@/store/slices/templates/selectors'

function Templates() {
  const templates = useSelector(selectTemplates)
  const [value, setValue] = useState('')
  const editor = useEditor()
  const { canvas } = useEditorContext() as any

  const handleLoadTemplate = async template => {
    console.log('LOAD TEMPLATE', template)
    try {
      // Extract font information from template objects
      const fonts = []
      if (template.objects && Array.isArray(template.objects)) {
        template.objects.forEach(object => {
          if (object.type === 'StaticText' || object.type === 'DynamicText' || object.type === 'textbox') {
            if (object.metadata?.fontFamily && object.metadata?.fontURL) {
              fonts.push({
                name: object.metadata.fontFamily,
                url: object.metadata.fontURL,
                options: { style: 'normal', weight: 400 },
              })
            }
          }
        })
      }
      
      const filteredFonts = fonts.filter(f => !!f.url)
      if (filteredFonts.length > 0) {
        await loadFonts(filteredFonts)
      }
      
      // Clear canvas first to ensure clean state
      editor.clear()
      editor.deselect()
      
      // Get Fabric.js canvas directly - we'll use Fabric.js loadFromJSON for standard Fabric objects
      // @ts-ignore
      const fabric = (window as any).fabric
      // @ts-ignore
      const fabricCanvas = (canvas as any) || editor?.canvas?.canvas || (editor?.canvas as any)
      
      if (!fabric || !fabricCanvas) {
        console.error('Fabric.js not available, falling back to scenify-sdk')
        // Fallback to scenify-sdk method
        const templateToImport = {
          version: template.version || '5.3.0',
          objects: template.objects || [],
          clipPath: template.clipPath || null,
          background: template.background || { type: 'color', value: '#ffffff' },
          frame: template.frame || {
            width: template.width || 900,
            height: template.height || 1200
          }
        }
        editor.importFromJSON(templateToImport)
        return
      }
      
      // Filter out the clip object from objects array (it's handled separately via clipPath)
      const filteredObjects = (template.objects || []).filter(obj => {
        return !(obj.name === 'clip' || obj.id === 'clip')
      })
      
      // Prepare Fabric.js JSON format
      const fabricJson = {
        version: template.version || '5.3.0',
        objects: filteredObjects
      }
      
      console.log('Loading template with Fabric.js loadFromJSON,', filteredObjects.length, 'objects')
      
      // Use Fabric.js loadFromJSON directly - this handles standard Fabric.js objects properly
      fabricCanvas.loadFromJSON(JSON.stringify(fabricJson), () => {
        console.log('Template loaded successfully via Fabric.js')
        
        // Set clipPath if available
        if (template.clipPath) {
          try {
            // Deserialize the clipPath object
            fabric.util.enlivenObjects([template.clipPath], (objects: any[]) => {
              if (objects && objects.length > 0) {
                fabricCanvas.clipPath = objects[0]
                fabricCanvas.renderAll()
              }
            })
          } catch (e) {
            console.warn('Could not set clipPath:', e)
          }
        }
        
        // Render the canvas
        fabricCanvas.renderAll()
        fabricCanvas.discardActiveObject()
        
        // Force a re-render to ensure everything is visible
        setTimeout(() => {
          fabricCanvas.renderAll()
        }, 100)
        
      }, (o: any, object: any) => {
        // Reviver function - called for each object during deserialization
        // Return the object as-is for Fabric.js to handle
        return object
      })
      
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }

  const loadFonts = fonts => {
    const promisesList = fonts.map(font => {
      // @ts-ignore
      return new FontFace(font.name, `url(${font.url})`, font.options).load().catch(err => err)
    })
    return new Promise((resolve, reject) => {
      Promise.all(promisesList)
        .then(res => {
          res.forEach(uniqueFont => {
            // @ts-ignore
            if (uniqueFont && uniqueFont.family) {
              // @ts-ignore
              document.fonts.add(uniqueFont)
              resolve(true)
            }
          })
        })
        .catch(err => reject(err))
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '2rem 2rem' }}>
        <Input
          startEnhancer={() => <Icons.Search size={18} />}
          value={value}
          onChange={e => setValue((e.target as any).value)}
          placeholder="Search templates"
          clearOnEscape
        />
      </div>
      <div style={{ flex: 1 }}>
        <Scrollbars>
          <div
            style={{ display: 'grid', gap: '0.5rem', padding: '0 2rem 2rem', gridTemplateColumns: '1fr 1fr' }}
          >
            {templates.map(template => (
              <div
                key={template.id}
                style={{
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.2)',
                  padding: '5px',
                }}
                onClick={() => handleLoadTemplate(template)}
              >
                <img width="100%" src={`${template.preview}?tr=w-320`} alt="preview" />
              </div>
            ))}
          </div>
        </Scrollbars>
      </div>
    </div>
  )
}

export default Templates
