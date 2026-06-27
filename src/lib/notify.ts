import { toaster } from 'baseui/toast'

export type NotifyKind = 'info' | 'positive' | 'negative' | 'warning'

/**
 * Single entry point for user-facing notifications.
 * Requires <ToasterContainer/> mounted once in the tree (see Editor.tsx).
 */
export function notify(message: string, kind: NotifyKind = 'info') {
  switch (kind) {
    case 'positive':
      return toaster.positive(message, {})
    case 'negative':
      return toaster.negative(message, {})
    case 'warning':
      return toaster.warning(message, {})
    case 'info':
    default:
      return toaster.info(message, {})
  }
}
