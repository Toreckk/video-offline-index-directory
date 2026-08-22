import { TAG_COLOR_OPTIONS, type TagColor } from '../model/annotationTypes'

export function TagColorSelect({ value, onChange, allowAutomatic = false, ariaLabel, className = '' }: {
  value: TagColor | 'auto'
  onChange: (value: TagColor | 'auto') => void
  allowAutomatic?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as TagColor | 'auto')} className={`themed-select outline-none ${className}`} aria-label={ariaLabel}>
      {allowAutomatic && <option value="auto">Automatic</option>}
      {TAG_COLOR_OPTIONS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
    </select>
  )
}
