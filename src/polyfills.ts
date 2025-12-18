// Comprehensive polyfills for the browser environment
// This file must be imported at the very top of the entry point (index.tsx)
import { fabric } from 'fabric'

// 1. Process polyfill
// Some libraries expect 'process' to be a global variable, not just on window.
if (typeof (window as any).process === 'undefined' || !(window as any).process.env) {
    const processPolyfill = {
        env: { NODE_ENV: 'development' },
        versions: {},
        nextTick: (cb: any) => setTimeout(cb, 0),
        browser: true,
    };
    ; (window as any).process = processPolyfill;
    ; (globalThis as any).process = processPolyfill;
} else {
    // Ensure basic properties exist if process is partially defined
    const proc = (window as any).process
    proc.env = proc.env || { NODE_ENV: 'development' }
    proc.versions = proc.versions || {}
    proc.nextTick = proc.nextTick || ((cb: any) => setTimeout(cb, 0))
    if (!(globalThis as any).process) (globalThis as any).process = proc
}

// 2. Fabric.js Global Fix
// Extremely aggressive patching to prevent "null context" crashes during exports/rendering.

const applyFabricPatch = (f: any) => {
    if (!f || f.__patched_for_null_ctx_v4) return

    // Patch the event firing mechanism to catch ALL handler crashes
    const patchObservable = (target: any) => {
        if (!target || !target.fire || target.__fire_patched) return
        const originalFire = target.fire
        target.fire = function (eventName: string, options: any) {
            try {
                return originalFire.call(this, eventName, options)
            } catch (e: any) {
                // If it's a null context error or a "save" error in a handler, silently swallow it.
                // This targets GuidelinesHandler and other SDK-level alignment tools.
                const msg = e?.message || String(e)
                if (msg.includes('null') || msg.includes('save') || msg.includes('clearRect')) {
                    return this
                }
                console.error('Fabric handler crash caught:', eventName, e)
                return this
            }
        }
        target.__fire_patched = true
    }

    const patchKlass = (klass: any) => {
        if (!klass || !klass.prototype) return

        // Patch renderAll - BROAD CATCH
        if (!klass.prototype.__originalRenderAll) {
            const originalRenderAll = klass.prototype.renderAll
            klass.prototype.__originalRenderAll = originalRenderAll
            klass.prototype.renderAll = function () {
                try {
                    return originalRenderAll.call(this)
                } catch (e) {
                    // If renderAll fails for any reason during an automated process, we suppress it.
                    // This keeps the export loop running.
                    return this
                }
            }
        }

        // Patch toDataURL - BROAD CATCH
        if (!klass.prototype.__originalToDataURL) {
            const originalToDataURL = klass.prototype.toDataURL
            klass.prototype.__originalToDataURL = originalToDataURL
            klass.prototype.toDataURL = function (options: any) {
                try {
                    return originalToDataURL.call(this, options)
                } catch (e) {
                    console.error('Fabric toDataURL internal crash caught:', e)
                    // Return a transparent 1x1 pixel base64 fallback
                    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                }
            }
        }

        // Patch renderTopLayer
        if (!klass.prototype.__originalRenderTopLayer) {
            const originalRenderTopLayer = klass.prototype.renderTopLayer
            klass.prototype.__originalRenderTopLayer = originalRenderTopLayer
            klass.prototype.renderTopLayer = function (ctx: CanvasRenderingContext2D) {
                if (!ctx || !this.contextTop) return this
                try {
                    return originalRenderTopLayer.call(this, ctx)
                } catch (e) {
                    return this
                }
            }
        }

        // Apply fire patch to prototypes
        patchObservable(klass.prototype)
    }

    if (f.Canvas) patchKlass(f.Canvas)
    if (f.StaticCanvas) patchKlass(f.StaticCanvas)
    if (f.Observable) patchObservable(f.Observable)

    f.__patched_for_null_ctx_v4 = true
}

// Immediate application
applyFabricPatch(fabric)
if ((window as any).fabric) applyFabricPatch((window as any).fabric)

// Periodic check for 30s
let checks = 0
const interval = setInterval(() => {
    if ((window as any).fabric) applyFabricPatch((window as any).fabric)
    checks++
    if (checks > 30) clearInterval(interval)
}, 1000)

export { }
