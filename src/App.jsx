import { useState } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import Explorer from './views/Explorer'

const VIEWS = {
  explorer: Explorer,
}

export default function App() {
  const [activeView, setActiveView] = useState('explorer')

  const ActiveViewComponent = VIEWS[activeView]

  return (
    <div className="flex min-h-screen bg-surface-dim">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <main className="ml-[var(--spacing-sidebar)] flex min-h-screen flex-1">
        {ActiveViewComponent && <ActiveViewComponent />}
      </main>
    </div>
  )
}
