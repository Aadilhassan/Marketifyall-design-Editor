/**
 * Framework-free autosave engine. Owns change-detection (content hash, not
 * byte-length), a saved|dirty|saving|error state machine, debounced+capped
 * scheduling, exponential-backoff retry, unload protection, and a per-project
 * localStorage recovery snapshot. All editor-specific serialization is injected
 * (see SaveManagerDeps.serialize), so this module imports no React/fabric and is
 * fully unit-testable.
 */

/** 32-bit FNV-1a hash → 8-char hex. Detects content changes the old
 *  `JSON.stringify(objs).length` signature missed (same length, different bytes). */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
