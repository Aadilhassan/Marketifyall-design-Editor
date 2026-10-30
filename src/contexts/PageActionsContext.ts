import { createContext, useContext } from 'react'
import type { DesignSnapshot } from '@/utils/versions'
import type { DesignComment } from '@/utils/comments'

export interface PageActions {
  pageCount: number
  activePage: number
  goToPage: (index: number) => void
  /** Duplicate the current page into a new page of `size`, re-flowing content. */
  copyAndResize: (size: { width: number; height: number }) => void
  /**
   * Load each page in `indices` (0-based) onto the canvas in turn and call
   * `render` once it has settled; resolves with the results in order. Always
   * returns to the page that was active before, even if a render fails or a
   * page times out. `position` is the 0-based position within `indices`.
   */
  renderPages: <T>(indices: number[], render: (index: number, position: number) => Promise<T> | T) => Promise<T[]>
  /** Deep copy of every page (live canvas captured first); null while a page is still loading. */
  snapshot: () => DesignSnapshot | null
  /** Replace all pages with `s`, load its active page, persist and mark the save manager dirty. */
  restoreSnapshot: (s: DesignSnapshot) => void
  /** Comments of page `pageIndex` (stored in its json.metadata.comments). */
  getComments: (pageIndex: number) => DesignComment[]
  /** Replace the comments of page `pageIndex` and persist. */
  setComments: (pageIndex: number, comments: DesignComment[]) => void
}

export const PageActionsContext = createContext<PageActions | null>(null)

export const usePageActions = () => useContext(PageActionsContext)
