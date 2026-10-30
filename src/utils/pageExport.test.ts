jest.mock('jspdf', () => ({
  __esModule: true,
  jsPDF: jest.fn(),
}))

import { jsPDF } from 'jspdf'
import {
  parsePageRange,
  supportsMultiPage,
  supportsTransparency,
  pageFileName,
  readExportPrefs,
  writeExportPrefs,
  EXPORT_PREFS_KEY,
  createPagedPdf,
} from './pageExport'

describe('parsePageRange', () => {
  it('parses single pages and ranges into sorted 0-based indices', () => {
    expect(parsePageRange('1-3, 5', 5)).toEqual({ ok: true, pages: [0, 1, 2, 4] })
  })

  it('de-duplicates overlaps and normalises reversed ranges', () => {
    expect(parsePageRange('4-2, 3, 2', 5)).toEqual({ ok: true, pages: [1, 2, 3] })
  })

  it('accepts en-dashes, semicolons and stray separators', () => {
    expect(parsePageRange(' 1 – 2 ; 4 ,', 4)).toEqual({ ok: true, pages: [0, 1, 3] })
  })

  it('rejects empty input', () => {
    expect(parsePageRange('  ', 3).ok).toBe(false)
    expect(parsePageRange(',,', 3).ok).toBe(false)
  })

  it('rejects page 0 and pages beyond the design', () => {
    expect(parsePageRange('0-2', 3)).toEqual({ ok: false, pages: [], error: 'Page numbers start at 1' })
    const r = parsePageRange('2-7', 3)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Page 7 doesn't exist \(this design has 3 pages\)/)
  })

  it('rejects junk tokens', () => {
    const r = parsePageRange('1, abc', 3)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/"abc"/)
    expect(parsePageRange('1-2-3', 3).ok).toBe(false)
    expect(parsePageRange('-2', 3).ok).toBe(false)
  })
})

describe('format capabilities', () => {
  it('multi-page only for raster + pdf', () => {
    expect(['png', 'jpg', 'webp', 'pdf'].every(supportsMultiPage)).toBe(true)
    expect(['svg', 'json', 'mp4', 'webm', 'gif'].some(supportsMultiPage)).toBe(false)
  })

  it('transparency only for png + webp', () => {
    expect(supportsTransparency('png')).toBe(true)
    expect(supportsTransparency('webp')).toBe(true)
    expect(supportsTransparency('jpg')).toBe(false)
    expect(supportsTransparency('pdf')).toBe(false)
  })
})

describe('pageFileName', () => {
  it('uses 1-based page numbers', () => {
    expect(pageFileName('Poster', 0, 'png')).toBe('Poster-p1.png')
    expect(pageFileName('', 2, 'jpg')).toBe('design-p3.jpg')
  })
})

describe('export prefs', () => {
  const mem = () => {
    const store: Record<string, string> = {}
    return {
      store,
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v
      },
    }
  }

  it('round-trips valid prefs', () => {
    const s = mem()
    expect(writeExportPrefs({ format: 'webp', size: '2x', transparent: true }, s)).toBe(true)
    expect(JSON.parse(s.store[EXPORT_PREFS_KEY])).toEqual({ format: 'webp', size: '2x', transparent: true })
    expect(readExportPrefs(s)).toEqual({ format: 'webp', size: '2x', transparent: true })
  })

  it('drops malformed fields and corrupt JSON', () => {
    const s = mem()
    s.store[EXPORT_PREFS_KEY] = JSON.stringify({ format: 3, size: '9x', transparent: 'yes' })
    expect(readExportPrefs(s)).toEqual({})
    s.store[EXPORT_PREFS_KEY] = '{oops'
    expect(readExportPrefs(s)).toEqual({})
    expect(readExportPrefs(null)).toEqual({})
  })

  it('reports a failed write instead of throwing', () => {
    const s = {
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(writeExportPrefs({ size: '1x' }, s)).toBe(false)
  })
})

describe('createPagedPdf', () => {
  let ctor: jest.Mock
  let addPage: jest.Mock
  let addImage: jest.Mock
  let save: jest.Mock

  beforeEach(() => {
    addPage = jest.fn()
    addImage = jest.fn()
    save = jest.fn()
    ctor = jsPDF as unknown as jest.Mock
    ctor.mockReset()
    ctor.mockImplementation(function (this: any) {
      this.addPage = addPage
      this.addImage = addImage
      this.save = save
    })
  })

  it('sizes every page to its own dimensions', async () => {
    const pdf = await createPagedPdf()
    await pdf.addPage('a', 200, 100)
    await pdf.addPage('b', 50, 300)
    pdf.save('d.pdf')
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(ctor).toHaveBeenCalledWith({ orientation: 'landscape', unit: 'px', format: [200, 100] })
    expect(addPage).toHaveBeenCalledWith([50, 300], 'portrait')
    expect(addImage).toHaveBeenNthCalledWith(1, 'a', 'PNG', 0, 0, 200, 100)
    expect(addImage).toHaveBeenNthCalledWith(2, 'b', 'PNG', 0, 0, 50, 300)
    expect(save).toHaveBeenCalledWith('d.pdf')
  })

  it('refuses to save an empty document', async () => {
    const pdf = await createPagedPdf()
    expect(() => pdf.save('x.pdf')).toThrow('No pages were rendered')
  })
})
