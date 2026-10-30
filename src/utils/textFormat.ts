/**
 * Text list and letter-case helpers. fabric.Textbox has no native lists or
 * text-transform, so both are applied to the text content itself; the
 * as-typed text is kept in metadata so UPPERCASE can be switched off again.
 */

export type ListMode = 'none' | 'bullet' | 'number'

const LIST_PREFIX = /^(•\s|\d+\.\s)/

export function detectList(text: string): ListMode {
  const lines = text.split('\n').filter(l => l.trim())
  if (!lines.length) return 'none'
  if (lines.every(l => l.startsWith('• '))) return 'bullet'
  if (lines.every(l => /^\d+\.\s/.test(l))) return 'number'
  return 'none'
}

export function applyList(text: string, mode: ListMode): string {
  let n = 0
  return text
    .split('\n')
    .map(line => {
      const bare = line.replace(LIST_PREFIX, '')
      if (mode === 'none' || !bare.trim()) return bare
      n += 1
      return mode === 'bullet' ? `• ${bare}` : `${n}. ${bare}`
    })
    .join('\n')
}

export const nextListMode = (mode: ListMode): ListMode => (mode === 'none' ? 'bullet' : mode === 'bullet' ? 'number' : 'none')

/**
 * Toggle UPPERCASE. Returns the new text and the original to remember (null
 * when turning it off). If the text was edited while uppercased, the original
 * casing can't be recovered, so the edited text is kept as-is.
 */
export function toggleUpper(text: string, original: string | null | undefined): { text: string; original: string | null } {
  if (original != null) {
    return { text: text === original.toUpperCase() ? original : text, original: null }
  }
  return { text: text.toUpperCase(), original: text }
}
