import { useState } from 'react'
import { APP_VIEWS, DEFAULT_VIEW_ID } from './app/views'
import Sidebar from './components/sidebar/Sidebar'

export default function App() {
  const [activeView, setActiveView] = useState(DEFAULT_VIEW_ID)

  const activeViewConfig =
    APP_VIEWS.find((view) => view.id === activeView) ?? APP_VIEWS[0]
  const ActiveViewComponent = activeViewConfig.component

  return (
    <div className="flex min-h-screen bg-surface-dim">
      <Sidebar
        activeView={activeView}
        navItems={APP_VIEWS}
        onNavigate={setActiveView}
      />

      <main className="ml-[var(--spacing-sidebar)] flex min-h-screen flex-1">
        <ActiveViewComponent />
      </main>
    </div>
  )
}
