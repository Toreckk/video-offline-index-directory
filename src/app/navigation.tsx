import { useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_VIEW_ID, type ViewId } from './views'
import { AppNavigationContext } from './navigationContext'

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [activeView, navigate] = useState<ViewId>(DEFAULT_VIEW_ID)
  const value = useMemo(() => ({ activeView, navigate }), [activeView])

  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  )
}
