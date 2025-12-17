/**
 * Helper function to add objects to the canvas using FabricJS directly.
 * This bypasses the Scenify SDK's editor.add() which doesn't properly 
 * initialize object content.
 */
export const addObjectToCanvas = (editor: any, options: any, width?: number, canvas?: any) => {
    if (!editor) {
        console.error('addObjectToCanvas: Editor is not provided')
        return false
    }

    try {
        const objectOptions = { ...options }
        if (width && !objectOptions.width) {
            objectOptions.width = width
        }

        // @ts-ignore - Access fabric from window
        const fabric = (window as any).fabric

        // Get canvas from parameter, or try to access it from editor
        const targetCanvas = canvas || editor.canvas?.canvas || editor.canvas

        // If we have FabricJS and canvas, try to create objects directly
        if (fabric && targetCanvas && typeof targetCanvas.add === 'function') {
            const type = objectOptions.type || objectOptions.metadata?.type

            // Get frame dimensions for positioning
            const clipPath = targetCanvas.clipPath
            const frameWidth = clipPath?.width || 900
            const frameHeight = clipPath?.height || 1200
            const frameLeft = clipPath?.left || 175.5
            const frameTop = clipPath?.top || -286.5

            // Calculate centered position
            const objWidth = objectOptions.width || 200
            const objHeight = objectOptions.height || 200
            const centerLeft = frameLeft + (frameWidth - objWidth) / 2
            const centerTop = frameTop + (frameHeight - objHeight) / 2

            let fabricObject: any = null

            // Handle text types
            if (type === 'StaticText' || type === 'DynamicText' || type === 'textbox' || type === 'text') {
                const text = objectOptions.metadata?.text || objectOptions.text || 'Sample Text'
                fabricObject = new fabric.Textbox(text, {
                    left: objectOptions.left ?? centerLeft,
                    top: objectOptions.top ?? centerTop,
                    width: objectOptions.width || 320,
                    fontSize: objectOptions.metadata?.fontSize || objectOptions.fontSize || 32,
                    fontFamily: objectOptions.metadata?.fontFamily || objectOptions.fontFamily || 'Arial',
                    fontWeight: objectOptions.metadata?.fontWeight || objectOptions.fontWeight || 400,
                    fill: objectOptions.metadata?.fill || objectOptions.fill || '#000000',
                    textAlign: objectOptions.metadata?.textAlign || objectOptions.textAlign || 'center',
                    selectable: true,
                    hasControls: true,
                    editable: true,
                    opacity: objectOptions.opacity ?? 1,
                })
            }
            // Handle rectangle/shape
            else if (type === 'StaticRect' || type === 'rect' || type === 'Rect') {
                fabricObject = new fabric.Rect({
                    left: objectOptions.left ?? centerLeft,
                    top: objectOptions.top ?? centerTop,
                    width: objectOptions.width || 200,
                    height: objectOptions.height || 200,
                    fill: objectOptions.metadata?.fill || objectOptions.fill || '#5A3FFF',
                    stroke: objectOptions.stroke || null,
                    strokeWidth: objectOptions.strokeWidth || 0,
                    rx: objectOptions.rx || 0,
                    ry: objectOptions.ry || 0,
                    selectable: true,
                    hasControls: true,
                    opacity: objectOptions.opacity ?? 1,
                })
            }
            // Handle circle
            else if (type === 'StaticCircle' || type === 'circle' || type === 'Circle') {
                fabricObject = new fabric.Circle({
                    left: objectOptions.left ?? centerLeft,
                    top: objectOptions.top ?? centerTop,
                    radius: objectOptions.radius || 100,
                    fill: objectOptions.metadata?.fill || objectOptions.fill || '#5A3FFF',
                    stroke: objectOptions.stroke || null,
                    strokeWidth: objectOptions.strokeWidth || 0,
                    selectable: true,
                    hasControls: true,
                    opacity: objectOptions.opacity ?? 1,
                })
            }
            // Handle triangle
            else if (type === 'StaticTriangle' || type === 'triangle' || type === 'Triangle') {
                fabricObject = new fabric.Triangle({
                    left: objectOptions.left ?? centerLeft,
                    top: objectOptions.top ?? centerTop,
                    width: objectOptions.width || 200,
                    height: objectOptions.height || 200,
                    fill: objectOptions.metadata?.fill || objectOptions.fill || '#5A3FFF',
                    stroke: objectOptions.stroke || null,
                    strokeWidth: objectOptions.strokeWidth || 0,
                    selectable: true,
                    hasControls: true,
                    opacity: objectOptions.opacity ?? 1,
                })
            }
            // Handle path/SVG
            else if (type === 'StaticPath' || type === 'path' || type === 'Path') {
                const pathData = objectOptions.metadata?.path || objectOptions.path || objectOptions.d
                if (pathData) {
                    fabricObject = new fabric.Path(pathData, {
                        left: objectOptions.left ?? centerLeft,
                        top: objectOptions.top ?? centerTop,
                        fill: objectOptions.metadata?.fill || objectOptions.fill || '#5A3FFF',
                        stroke: objectOptions.stroke || null,
                        strokeWidth: objectOptions.strokeWidth || 0,
                        scaleX: objectOptions.scaleX || 1,
                        scaleY: objectOptions.scaleY || 1,
                        selectable: true,
                        hasControls: true,
                        opacity: objectOptions.opacity ?? 1,
                    })
                }
            }
            // Handle SVG/Vector
            else if (type === 'StaticVector' || type === 'group') {
                const svgString = objectOptions.metadata?.svg || objectOptions.svg
                if (svgString) {
                    fabric.loadSVGFromString(svgString, (objects: any[], options: any) => {
                        const group = fabric.util.groupSVGElements(objects, options)
                        group.set({
                            left: objectOptions.left ?? centerLeft,
                            top: objectOptions.top ?? centerTop,
                            scaleX: objectOptions.scaleX || 0.5,
                            scaleY: objectOptions.scaleY || 0.5,
                            selectable: true,
                            hasControls: true,
                        })
                        targetCanvas.add(group)
                        targetCanvas.setActiveObject(group)
                        targetCanvas.requestRenderAll()
                    })
                    return true
                }
            }

            // If we created a fabric object, add it to canvas
            if (fabricObject) {
                targetCanvas.add(fabricObject)
                targetCanvas.setActiveObject(fabricObject)
                targetCanvas.requestRenderAll()
                console.log('✅ Object added via FabricJS:', type)
                return true
            }
        }

        // Fallback: use editor.add() for unsupported types
        console.log('Using editor.add() fallback for type:', objectOptions.type)
        editor.add(objectOptions)

        // Force canvas re-render
        setTimeout(() => {
            try {
                const targetCanvas = canvas || editor.canvas?.canvas || editor.canvas
                if (targetCanvas && typeof targetCanvas.requestRenderAll === 'function') {
                    targetCanvas.requestRenderAll()
                }
            } catch (e) {
                console.warn('Could not force canvas re-render:', e)
            }
        }, 50)

        return true
    } catch (error) {
        console.error('addObjectToCanvas: Error adding object to canvas:', error)
        return false
    }
}

/**
 * Helper to add a shape to the canvas
 */
export const addShapeToCanvas = (canvas: any, shapeType: string, options: any = {}) => {
    // @ts-ignore
    const fabric = (window as any).fabric

    if (!fabric || !canvas) {
        console.error('FabricJS or canvas not available')
        return false
    }

    try {
        // Get frame dimensions for positioning
        const clipPath = canvas.clipPath
        const frameWidth = clipPath?.width || 900
        const frameHeight = clipPath?.height || 1200
        const frameLeft = clipPath?.left || 175.5
        const frameTop = clipPath?.top || -286.5

        const size = options.size || 150
        const centerLeft = frameLeft + (frameWidth - size) / 2
        const centerTop = frameTop + (frameHeight - size) / 2

        let shape: any = null

        switch (shapeType.toLowerCase()) {
            case 'rect':
            case 'rectangle':
            case 'square':
                shape = new fabric.Rect({
                    left: centerLeft,
                    top: centerTop,
                    width: size,
                    height: size,
                    fill: options.fill || '#5A3FFF',
                    rx: options.rx || 0,
                    ry: options.ry || 0,
                    selectable: true,
                    hasControls: true,
                })
                break

            case 'circle':
                shape = new fabric.Circle({
                    left: centerLeft,
                    top: centerTop,
                    radius: size / 2,
                    fill: options.fill || '#5A3FFF',
                    selectable: true,
                    hasControls: true,
                })
                break

            case 'triangle':
                shape = new fabric.Triangle({
                    left: centerLeft,
                    top: centerTop,
                    width: size,
                    height: size,
                    fill: options.fill || '#5A3FFF',
                    selectable: true,
                    hasControls: true,
                })
                break

            case 'ellipse':
                shape = new fabric.Ellipse({
                    left: centerLeft,
                    top: centerTop,
                    rx: size / 2,
                    ry: size / 3,
                    fill: options.fill || '#5A3FFF',
                    selectable: true,
                    hasControls: true,
                })
                break

            case 'line':
                shape = new fabric.Line([0, 0, size, 0], {
                    left: centerLeft,
                    top: centerTop,
                    stroke: options.stroke || '#000000',
                    strokeWidth: options.strokeWidth || 3,
                    selectable: true,
                    hasControls: true,
                })
                break

            default:
                console.warn('Unknown shape type:', shapeType)
                return false
        }

        if (shape) {
            canvas.add(shape)
            canvas.setActiveObject(shape)
            canvas.requestRenderAll()
            console.log('✅ Shape added:', shapeType)
            return true
        }

        return false
    } catch (error) {
        console.error('Error adding shape:', error)
        return false
    }
}

/**
 * Helper to add text to the canvas
 */
export const addTextToCanvas = (canvas: any, text: string, options: any = {}) => {
    // @ts-ignore
    const fabric = (window as any).fabric

    if (!fabric || !canvas) {
        console.error('FabricJS or canvas not available')
        return false
    }

    try {
        // Get frame dimensions for positioning
        const clipPath = canvas.clipPath
        const frameWidth = clipPath?.width || 900
        const frameHeight = clipPath?.height || 1200
        const frameLeft = clipPath?.left || 175.5
        const frameTop = clipPath?.top || -286.5

        const width = options.width || 320
        const centerLeft = frameLeft + (frameWidth - width) / 2
        const centerTop = frameTop + frameHeight / 2 - 50

        const textbox = new fabric.Textbox(text, {
            left: options.left ?? centerLeft,
            top: options.top ?? centerTop,
            width: width,
            fontSize: options.fontSize || 32,
            fontFamily: options.fontFamily || 'Arial',
            fontWeight: options.fontWeight || 400,
            fill: options.fill || '#000000',
            textAlign: options.textAlign || 'center',
            selectable: true,
            hasControls: true,
            editable: true,
        })

        canvas.add(textbox)
        canvas.setActiveObject(textbox)
        canvas.requestRenderAll()
        console.log('✅ Text added:', text.substring(0, 20))
        return true
    } catch (error) {
        console.error('Error adding text:', error)
        return false
    }
}
