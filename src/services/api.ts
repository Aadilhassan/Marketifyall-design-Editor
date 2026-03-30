import { IElement, IFontFamily, IUpload } from '@/interfaces/editor'
import { designService } from './designService'

interface TemplateData {
  id?: string | number
  name?: string
  description?: string
  preview?: string
  objects?: Record<string, unknown>[]
  background?: { type: string; value: string }
  frame?: { width: number; height: number }
  category?: string
  tags?: string[]
  status?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

class ApiService {
  private async getCurrentWorkspaceId(): Promise<string> {
    return 'default-workspace'
  }

  // UPLOADS - Now using Supabase storage
  async getSignedURLForUpload(_props: { name: string }): Promise<{ url: string }> {
    return { url: '/api/upload-placeholder' }
  }

  async updateUploadFile(_props: { name: string }): Promise<{ success: boolean }> {
    return { success: true }
  }

  async getUploads(): Promise<IUpload[]> {
    return []
  }

  async deleteUpload(id: string) {
    await designService.deleteAsset(id)
    return { success: true }
  }

  // TEMPLATES - Now using Supabase database
  async createTemplate(props: Partial<TemplateData>): Promise<TemplateData> {
    const workspaceId = await this.getCurrentWorkspaceId()
    const template = await designService.createTemplate({
      workspace_id: workspaceId,
      name: props.name || 'Untitled Template',
      description: props.description,
      thumbnail_url: props.preview || '',
      canvas_data: {
        objects: props.objects || [],
        background: props.background || { type: 'color', value: '#ffffff' },
        frame: props.frame || { width: 800, height: 600 },
      },
      frame: props.frame || { width: 800, height: 600 },
      category: props.category,
      tags: props.tags || [],
      is_public: false,
      is_premium: false,
      created_by: 'anonymous',
    })
    return template as unknown as TemplateData
  }

  async downloadTemplate(props: Partial<TemplateData>): Promise<{ source: string }> {
    return { source: JSON.stringify(props) }
  }

  async getTemplates(): Promise<TemplateData[]> {
    const dbTemplates = [] as TemplateData[]

    if (dbTemplates.length > 0) {
      return dbTemplates.map(template => ({
        id: template.id,
        name: template.name,
        preview: (template as Record<string, unknown>).thumbnail_url as string,
        width: template.frame?.width || 800,
        height: template.frame?.height || 600,
        objects: ((template as Record<string, unknown>).canvas_data as Record<string, unknown>)?.objects as Record<string, unknown>[] || [],
        background: ((template as Record<string, unknown>).canvas_data as Record<string, unknown>)?.background as { type: string; value: string } || { type: 'color', value: '#ffffff' },
        frame: template.frame || { width: 800, height: 600 },
      }))
    }

    // Fallback to local JSON file
    const response = await fetch('/data/template.json')
    const { data } = await response.json()

    const transformedTemplates = data.map((template: Record<string, unknown>) => {
      const fabricData = JSON.parse(template.json as string)
      return {
        id: template.id || template.name,
        name: template.name,
        preview: template.thumbnailUrl,
        category: template.category,
        width: template.width,
        height: template.height,
        objects: fabricData.objects || [],
        background: fabricData.background || { type: 'color', value: '#ffffff' },
        frame: {
          width: template.width,
          height: template.height,
        },
        version: fabricData.version,
        clipPath: fabricData.clipPath,
      }
    })

    return transformedTemplates
  }

  async getTemplateById(id: string): Promise<TemplateData> {
    const template = await designService.getTemplate(id)
    if (!template) throw new Error('Template not found')

    return {
      id: template.id,
      name: template.name,
      preview: template.thumbnail_url,
      width: template.frame?.width || 800,
      height: template.frame?.height || 600,
      objects: template.canvas_data?.objects || [],
      background: template.canvas_data?.background || { type: 'color', value: '#ffffff' },
      frame: template.frame || { width: 800, height: 600 },
      ...template.canvas_data?.version && { version: template.canvas_data.version },
      ...template.canvas_data?.clipPath && { clipPath: template.canvas_data.clipPath },
    }
  }

  async updateTemplate(id: string | number, props: Partial<TemplateData>): Promise<TemplateData> {
    const updates: Record<string, unknown> = {}

    if (props.name) updates.name = props.name
    if (props.description) updates.description = props.description
    if (props.preview) updates.thumbnail_url = props.preview
    if (props.category) updates.category = props.category
    if (props.tags) updates.tags = props.tags

    if (props.objects || props.background || props.frame) {
      updates.canvas_data = {
        objects: props.objects || [],
        background: props.background || { type: 'color', value: '#ffffff' },
        frame: props.frame || { width: 800, height: 600 },
      }
    }

    if (props.frame) updates.frame = props.frame

    const updatedTemplate = await designService.updateTemplate(id.toString(), updates)

    return {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      preview: updatedTemplate.thumbnail_url,
      width: updatedTemplate.frame?.width || 800,
      height: updatedTemplate.frame?.height || 600,
      objects: updatedTemplate.canvas_data?.objects || [],
      background: updatedTemplate.canvas_data?.background || { type: 'color', value: '#ffffff' },
      frame: updatedTemplate.frame || { width: 800, height: 600 },
    }
  }

  // CREATIONS - Now using Supabase database
  async createCreation(props: Partial<TemplateData>): Promise<TemplateData> {
    const workspaceId = await this.getCurrentWorkspaceId()
    const creation = await designService.createDesignProject({
      workspace_id: workspaceId,
      name: props.name || 'Untitled Design',
      description: props.description,
      canvas_data: {
        objects: props.objects || [],
        background: props.background || { type: 'color', value: '#ffffff' },
        frame: props.frame || { width: 800, height: 600 },
      },
      frame: props.frame || { width: 800, height: 600 },
      thumbnail_url: props.preview,
      status: 'draft',
      is_template: false,
      tags: props.tags || [],
      created_by: 'anonymous',
      last_modified_by: 'anonymous',
    })
    return creation as unknown as TemplateData
  }

  async getCreations(): Promise<TemplateData[]> {
    return []
  }

  async getCreationById(id: string): Promise<TemplateData> {
    const project = await designService.getDesignProject(id)
    if (!project) throw new Error('Design project not found')

    return {
      id: project.id,
      name: project.name,
      preview: project.thumbnail_url,
      width: project.frame?.width || 800,
      height: project.frame?.height || 600,
      objects: project.canvas_data?.objects || [],
      background: project.canvas_data?.background || { type: 'color', value: '#ffffff' },
      frame: project.frame || { width: 800, height: 600 },
      status: project.status,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }
  }

  async updateCreation(id: string, props: Partial<TemplateData>): Promise<TemplateData> {
    const updates: Record<string, unknown> = {}

    if (props.name) updates.name = props.name
    if (props.description) updates.description = props.description
    if (props.preview) updates.thumbnail_url = props.preview
    if (props.tags) updates.tags = props.tags

    if (props.objects || props.background || props.frame) {
      updates.canvas_data = {
        objects: props.objects || [],
        background: props.background || { type: 'color', value: '#ffffff' },
        frame: props.frame || { width: 800, height: 600 },
      }
    }

    if (props.frame) updates.frame = props.frame

    const updatedProject = await designService.updateDesignProject(id, updates)

    return {
      id: updatedProject.id,
      name: updatedProject.name,
      preview: updatedProject.thumbnail_url,
      width: updatedProject.frame?.width || 800,
      height: updatedProject.frame?.height || 600,
      objects: updatedProject.canvas_data?.objects || [],
      background: updatedProject.canvas_data?.background || { type: 'color', value: '#ffffff' },
      frame: updatedProject.frame || { width: 800, height: 600 },
      status: updatedProject.status,
      created_at: updatedProject.created_at,
      updated_at: updatedProject.updated_at,
    }
  }

  // ELEMENTS
  async getElements(): Promise<IElement[]> {
    return []
  }

  // FONTS
  async getFonts(): Promise<IFontFamily[]> {
    try {
      const response = await fetch('/data/fonts.json')

      if (!response.ok) {
        return this.getDefaultFonts()
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        return this.getDefaultFonts()
      }

      const json = await response.json()
      const { data } = json

      if (!data || !Array.isArray(data)) {
        return this.getDefaultFonts()
      }

      return data
    } catch {
      return this.getDefaultFonts()
    }
  }

  private getDefaultFonts(): IFontFamily[] {
    return [
      {
        id: 'arial',
        family: 'Arial',
        variants: ['300', 'regular', '700'],
        files: [],
        subsets: ['latin'],
        version: '1',
        lastModified: '2023-01-01',
        category: 'sans-serif',
        kind: 'webfonts#webfont',
      },
      {
        id: 'times-new-roman',
        family: 'Times New Roman',
        variants: ['regular', '500', '700'],
        files: [],
        subsets: ['latin'],
        version: '1',
        lastModified: '2023-01-01',
        category: 'serif',
        kind: 'webfonts#webfont',
      },
    ]
  }

  // IMAGES - Load from local JSON file with resource limits
  async getImages(): Promise<Record<string, unknown>[]> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch('/data/images.json', { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) return []

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) return []

      let json: Record<string, unknown>
      try {
        json = await response.json()
      } catch {
        return []
      }

      const { data } = json || {}
      if (!data || !Array.isArray(data)) return []

      const MAX_IMAGES = 100
      const limitedData = data.slice(0, MAX_IMAGES)

      return limitedData.map((image: Record<string, unknown>) => {
        const urls = image.urls as Record<string, string> | undefined
        const user = image.user as Record<string, string> | undefined
        return {
          id: image.id || `img-${Math.random().toString(36).substr(2, 9)}`,
          url: urls?.regular || image.url || image.src || '',
          src: urls?.regular || image.url || image.src || '',
          preview: urls?.small || urls?.thumb || image.preview || image.url || image.src || '',
          alt: image.alt_description || image.alt || '',
          description: image.description || '',
          user: user?.name || '',
          width: image.width || 800,
          height: image.height || 600,
        }
      })
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId)
      return []
    }
  }
}

const apiService = new ApiService()
export default apiService
