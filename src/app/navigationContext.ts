import { createContext, useContext } from 'react'
import type { ViewId } from './views'

export type AppNavigation = {
  activeView: ViewId
  navigate: (view: ViewId) => void
}

export const AppNavigationContext = createContext<AppNavigation | null>(null)

export function useAppNavigation() {
  const context = useContext(AppNavigationContext)
  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider.')
  }
  return context
}
