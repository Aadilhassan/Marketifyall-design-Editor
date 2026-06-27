/** @jest-environment node */
// Note: mockImplementation must be set in beforeEach, not inside the jest.mock() factory,
// because the factory's implementation does not survive into test execution in this Jest/CRA
// version. Variables are set via `this` (constructor-style) because Jest ignores the return
// value of mockImplementation when invoked with `new`.
jest.mock('jspdf', () => ({
  __esModule: true,
  jsPDF: jest.fn(),
}))

import { exportCanvasToPdf } from './pdfExport'
import { jsPDF } from 'jspdf'

describe('exportCanvasToPdf', () => {
  let mockAddImage: jest.Mock
  let mockSave: jest.Mock

  beforeEach(() => {
    mockAddImage = jest.fn()
    mockSave = jest.fn()
    ;(jsPDF as unknown as jest.Mock).mockImplementation(function (this: any) {
      this.addImage = mockAddImage
      this.save = mockSave
    })
  })

  it('creates a landscape page when wider than tall and saves with the filename', async () => {
    await exportCanvasToPdf({ dataUrl: 'data:image/png;base64,AAA', widthPx: 200, heightPx: 100, filename: 'd.pdf' })
    expect(jsPDF).toHaveBeenCalledWith({ orientation: 'landscape', unit: 'px', format: [200, 100] })
    expect(mockAddImage).toHaveBeenCalledWith('data:image/png;base64,AAA', 'PNG', 0, 0, 200, 100)
    expect(mockSave).toHaveBeenCalledWith('d.pdf')
  })

  it('creates a portrait page when taller than wide', async () => {
    await exportCanvasToPdf({ dataUrl: 'data:image/png;base64,BBB', widthPx: 100, heightPx: 200, filename: 'p.pdf' })
    expect(jsPDF).toHaveBeenCalledWith({ orientation: 'portrait', unit: 'px', format: [100, 200] })
  })
})
