import { useState } from 'react'
import { FolderCog, RotateCcw, SlidersHorizontal, Tags } from 'lucide-react'
import { useSettingsStore } from '../features/settings/store/settingsStore'
import { ExperienceSettingsPanel } from '../features/settings/components/ExperienceSettingsPanel'
import { LibrarySettingsPanel } from '../features/settings/components/LibrarySettingsPanel'
import { TagSettingsPanel } from '../features/settings/components/TagSettingsPanel'

type SettingsTab = 'experience' | 'library' | 'tags'

const SETTINGS_TABS = [
  { id: 'experience', label: 'Experience', description: 'Playback and interface', icon: SlidersHorizontal },
  { id: 'library', label: 'Library', description: 'Scanning and cache', icon: FolderCog },
  { id: 'tags', label: 'Tags', description: 'Catalog and backup', icon: Tags },
] as const

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('experience')
  const resetSettings = useSettingsStore((state) => state.resetSettings)
  const contentWidth = activeTab === 'tags' ? 'max-w-6xl' : 'max-w-4xl'

  return (
    <div className="min-h-screen w-full bg-surface-dim px-10 py-12">
      <header className="mx-auto flex max-w-6xl items-end justify-between gap-6 border-b border-white/6 pb-8">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-primary-fixed-dim">Preferences</p><h2 className="mt-3 text-4xl font-black">Settings</h2><p className="mt-3 text-on-secondary">Persisted locally in this browser. No account required.</p></div>
        {activeTab === 'experience' && <button type="button" onClick={resetSettings} className="flex items-center gap-2 border border-white/8 px-4 py-2.5 text-sm font-bold text-on-secondary hover:text-white"><RotateCcw size={16} />Reset defaults</button>}
      </header>

      <nav className="mx-auto mt-6 grid max-w-6xl gap-2 sm:grid-cols-3" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 border px-4 py-3 text-left transition ${selected ? 'border-primary/50 bg-primary/15 text-white' : 'border-white/8 bg-surface-container text-on-secondary hover:text-white'}`} aria-pressed={selected}>
            <Icon size={18} className={selected ? 'text-primary-fixed-dim' : ''} /><span><span className="block text-sm font-black">{tab.label}</span><span className="mt-0.5 block text-xs text-on-secondary">{tab.description}</span></span>
          </button>
        })}
      </nav>

      <main className={`mx-auto mt-7 ${contentWidth}`}>
        {activeTab === 'experience' && <ExperienceSettingsPanel />}
        {activeTab === 'library' && <LibrarySettingsPanel />}
        {activeTab === 'tags' && <TagSettingsPanel />}
      </main>
    </div>
  )
}
