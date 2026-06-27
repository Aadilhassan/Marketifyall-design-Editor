/**
 * Helper function to add objects to the canvas using FabricJS directly.
 * This bypasses the Scenify SDK's editor.add() which doesn't properly 
 * initialize object content.
 */
import { selectObject } from './selectObject'

export const addObjectToCanvas = (editor: any, options: any, width?: number, canvas?: any) => {
    if (!editor) {
        return false
    }

    try {
        const objectOptions = { ...options }
        if (width && !objectOptions.width) {
            objectOptions.width = width
        }

        const fabric = (window as any).fabric

        // Get canvas from parameter, or try to access it from editor
        const targetCanvas = canvas || editor.canvas?.canvas || editor.canvas

        // If we have FabricJS and canvas, try to create objects directly
        if (fabric && targetCanvas && typeof targetCanvas.add === 'function') {
            const type = objectOptions.type || objectOptions.metadata?.type

            // Get frame dimensions for positioning
            const clipPath = targetCanvas.clipPath
            const frameWidth = (clipPath?.width || 900) * (clipPath?.scaleX || 1)
            const frameHeight = (clipPath?.height || 1200) * (clipPath?.scaleY || 1)

            // Get the actual bounding rect center of the clipPath
            let frameCenterX: number
            let frameCenterY: number
            if (clipPath) {
                const bound = clipPath.getBoundingRect ? clipPath.getBoundingRect() : null
                if (bound) {
                    frameCenterX = bound.left + bound.width / 2
                    frameCenterY = bound.top + bound.height / 2
                } else {
                    frameCenterX = (clipPath.left || 0) + frameWidth / 2
                    frameCenterY = (clipPath.top || 0) + frameHeight / 2
                }
            } else {
                frameCenterX = targetCanvas.getWidth() / 2
                frameCenterY = targetCanvas.getHeight() / 2
            }

            // Calculate centered position
            const objWidth = (objectOptions.width || 200) * (objectOptions.scaleX || 1)
            const objHeight = (objectOptions.height || 200) * (objectOptions.scaleY || 1)
            const centerLeft = frameCenterX - objWidth / 2
            const centerTop = frameCenterY - objHeight / 2

            let fabricObject: any = null

            // Handle text types
            if (type === 'StaticText' || type === 'DynamicText' || type === 'textbox' || type === 'text') {
                const text = objectOptions.metadata?.text || objectOptions.text || 'Sample Text'
                const fontSize = objectOptions.metadata?.fontSize || objectOptions.fontSize || 32
                const fontWeight = objectOptions.metadata?.fontWeight || objectOptions.fontWeight || 400
                const fontFamily = objectOptions.metadata?.fontFamily || objectOptions.fontFamily || 'Arial'
                const fill = objectOptions.metadata?.fill || objectOptions.fill || '#333333'

                // Use standard Textbox for reliability
                fabricObject = new fabric.Textbox(text, {
                    left: objectOptions.left ?? centerLeft,
                    top: objectOptions.top ?? centerTop,
                    width: objectOptions.width || 320,
                    fontSize: fontSize,
                    fontFamily: fontFamily,
                    fontWeight: fontWeight,
                    fill: fill,
                    textAlign: objectOptions.metadata?.textAlign || objectOptions.textAlign || 'center',
                    originX: 'left',
                    originY: 'top',
                    selectable: true,
                    hasControls: true,
                    editable: true,
                    opacity: objectOptions.opacity ?? 1,
                    metadata: {
                        ...(objectOptions.metadata || {}),
                        text: text,
                        fontSize: fontSize,
                        fontFamily: fontFamily,
                        fontWeight: fontWeight,
                        fill: fill,
                        type: 'StaticText' // Tell SDK it's a StaticText
                    }
                })

                if (fabricObject) {
                    fabricObject.setCoords()
                    targetCanvas.add(fabricObject)
                    selectObject(targetCanvas, fabricObject)
                    targetCanvas.bringToFront(fabricObject)

                    // Force render multiple times to ensure visibility
                    targetCanvas.requestRenderAll()
                    setTimeout(() => targetCanvas.requestRenderAll(), 50)
                    setTimeout(() => targetCanvas.requestRenderAll(), 200)

                    return true
                }
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
                        selectObject(targetCanvas, group)
                        targetCanvas.requestRenderAll()
                    })
                    return true
                }
            }
            // Handle Images robustly
            else if (type === 'StaticImage' || type === 'image') {
                const src = objectOptions.metadata?.src || objectOptions.src
                if (src) {
                    // Data URLs and blob URLs don't need CORS
                    const isLocalUrl = src.startsWith('data:') || src.startsWith('blob:')
                    const loadImage = (useCors: boolean) => {
                        const img = new Image()
                        if (useCors && !isLocalUrl) img.crossOrigin = 'anonymous'
                        img.onload = () => {
                            // Scale image to fit within 60% of frame
                            const maxW = frameWidth * 0.6
                            const maxH = frameHeight * 0.6
                            const imgW = img.naturalWidth || img.width
                            const imgH = img.naturalHeight || img.height
                            let scale = Math.min(maxW / imgW, maxH / imgH, 1)

                            // If explicit scale was provided, use it
                            if (objectOptions.scaleX && objectOptions.scaleY) {
                                scale = objectOptions.scaleX
                            }

                            const finalW = imgW * scale
                            const finalH = imgH * scale
                            const imgLeft = objectOptions.left ?? (frameCenterX - finalW / 2)
                            const imgTop = objectOptions.top ?? (frameCenterY - finalH / 2)

                            const fabricImage = new fabric.Image(img, {
                                left: imgLeft,
                                top: imgTop,
                                scaleX: scale,
                                scaleY: scale,
                                opacity: objectOptions.opacity ?? 1,
                                selectable: true,
                                hasControls: true,
                                hasBorders: true,
                                metadata: objectOptions.metadata || {}
                            })

                            if (objectOptions.metadata?.videoSrc) {
                                fabricImage.set('isVideo', true)
                            }

                            targetCanvas.add(fabricImage)
                            selectObject(targetCanvas, fabricImage)
                            targetCanvas.requestRenderAll()
                            setTimeout(() => targetCanvas.requestRenderAll(), 100)
                        }
                        img.onerror = () => {
                            if (useCors) {
                                // Retry without CORS — image won't be exportable but will be visible
                                loadImage(false)
                            } else {
                                // Last resort fallback
                                editor.add(objectOptions)
                            }
                        }
                        img.src = src
                    }
                    loadImage(true)
                    return true
                }
            }

            // If we created a fabric object, add it to canvas
            if (fabricObject) {
                // Set coordinates for correct hit testing and rendering
                if (typeof fabricObject.setCoords === 'function') {
                    fabricObject.setCoords()
                }

                targetCanvas.add(fabricObject)
                selectObject(targetCanvas, fabricObject)
                targetCanvas.requestRenderAll()
                return true
            }
        }

        // Fallback: use editor.add() for unsupported types
        editor.add(objectOptions)

        // Force canvas re-render
        setTimeout(() => {
            try {
                const targetCanvas = canvas || editor.canvas?.canvas || editor.canvas
                if (targetCanvas && typeof targetCanvas.requestRenderAll === 'function') {
                    targetCanvas.requestRenderAll()
                }
            } catch (e) {
                // silently handled
            }
        }, 50)

        return true
    } catch (error) {
        return false
    }
}

/**
 * Helper to add a shape to the canvas
 */
export const addShapeToCanvas = (canvas: any, shapeType: string, options: any = {}) => {
    const fabric = (window as any).fabric

    if (!fabric || !canvas) {
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
                return false
        }

        if (shape) {
            canvas.add(shape)
            selectObject(canvas, shape)
            canvas.requestRenderAll()
            return true
        }

        return false
    } catch (error) {
        return false
    }
}

/**
 * Helper to add text to the canvas
 */
export const addTextToCanvas = (canvas: any, text: string, options: any = {}) => {
    const fabric = (window as any).fabric

    if (!fabric || !canvas) {
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
        selectObject(canvas, textbox)
        canvas.requestRenderAll()
        return true
    } catch (error) {
        return false
    }
}
