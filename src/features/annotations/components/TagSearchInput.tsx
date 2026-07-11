import { Search, X } from 'lucide-react'

export function TagSearchInput({ value, onChange, autoFocus = false }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex items-center gap-2 border border-white/10 bg-surface-dim px-3 py-2">
      <Search size={14} className="shrink-0 text-on-secondary" />
      <input autoFocus={autoFocus} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search tags" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-secondary/50" />
      {value && <button type="button" onClick={() => onChange('')} className="text-on-secondary hover:text-white" aria-label="Clear tag search"><X size={14} /></button>}
    </label>
  )
}
