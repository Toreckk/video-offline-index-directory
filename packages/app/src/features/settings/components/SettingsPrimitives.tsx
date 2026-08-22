import type { ReactNode } from 'react'

export function SettingsGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden border border-white/7 bg-surface-container">
      <header className="border-b border-white/6 px-6 py-5">
        <h3 className="text-lg font-black">{title}</h3>
        <p className="mt-1 text-sm text-on-secondary">{description}</p>
      </header>
      <div className="divide-y divide-white/5">{children}</div>
    </section>
  )
}

export function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-8 px-5 py-5">
      <span><span className="block font-bold">{label}</span><span className="mt-1 block text-sm leading-6 text-on-secondary">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-primary" />
    </label>
  )
}

export function SelectRow({ label, description, value, onChange, options }: { label: string; description: string; value: string; onChange: (value: string) => void; options: [value: string, label: string][] }) {
  return (
    <label className="flex items-center justify-between gap-8 px-5 py-5">
      <span><span className="block font-bold">{label}</span><span className="mt-1 block text-sm leading-6 text-on-secondary">{description}</span></span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="themed-select min-w-40 shrink-0 border border-white/8 px-3 py-2.5 text-sm outline-none">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}
