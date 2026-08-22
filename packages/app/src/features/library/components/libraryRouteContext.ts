import { createContext, useContext } from 'react'

export type LibraryRouteContextValue = {
  openRouteDialog: () => void
  startCurrentLibraryScan: () => Promise<void>
  reconnectAndScan: () => Promise<boolean>
  cancelScan: () => void
}

export const LibraryRouteContext =
  createContext<LibraryRouteContextValue | null>(null)

export function useLibraryRoute() {
  const context = useContext(LibraryRouteContext)
  if (!context) {
    throw new Error('useLibraryRoute must be used within LibraryRouteProvider.')
  }
  return context
}
