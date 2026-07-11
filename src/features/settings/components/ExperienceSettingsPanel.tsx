import { Database } from 'lucide-react'
import { useSettingsStore, type PreviewDelay, type SortOrder, type TileDensity } from '../store/settingsStore'
import { SelectRow, SettingsGroup, ToggleRow } from './SettingsPrimitives'

export function ExperienceSettingsPanel() {
  const settings = useSettingsStore()
  return <div className="space-y-7">
    <SettingsGroup title="Playback" description="Preview behavior in Explorer.">
      <ToggleRow label="Autoplay hover previews" description="Play silent sampled snippets while a tile is hovered or focused." checked={settings.autoplayHoverPreview} onChange={(value) => settings.updateSetting('autoplayHoverPreview', value)} />
      <SelectRow label="Preview delay" description="Wait before allocating a video decoder for a tile." value={String(settings.previewDelayMs)} onChange={(value) => settings.updateSetting('previewDelayMs', Number(value) as PreviewDelay)} options={[["150", "150 ms"], ["250", "250 ms"], ["500", "500 ms"]]} />
    </SettingsGroup>
    <SettingsGroup title="Interface" description="Gallery density and motion.">
      <ToggleRow label="Show filenames" description="Overlay filenames and file size on gallery tiles." checked={settings.showFilenames} onChange={(value) => settings.updateSetting('showFilenames', value)} />
      <ToggleRow label="Reduce motion" description="Disable nonessential transitions and animations." checked={settings.reduceMotion} onChange={(value) => settings.updateSetting('reduceMotion', value)} />
      <SelectRow label="Tile density" description="Choose the minimum width of media tiles." value={settings.tileDensity} onChange={(value) => settings.updateSetting('tileDensity', value as TileDensity)} options={[["compact", "Compact"], ["comfortable", "Comfortable"], ["large", "Large"]]} />
    </SettingsGroup>
    <SettingsGroup title="General" description="Startup and default ordering.">
      <ToggleRow label="Restore last library" description="Revalidate the saved folder handle when VOID starts." checked={settings.restoreLastLibrary} onChange={(value) => settings.updateSetting('restoreLastLibrary', value)} />
      <SelectRow label="Default sort order" description="Applied immediately to the Explorer queue." value={settings.defaultSortOrder} onChange={(value) => settings.updateSetting('defaultSortOrder', value as SortOrder)} options={[["modified-date", "Recently modified"], ["name", "Filename"], ["size", "File size"]]} />
      <div className="flex items-center gap-4 px-5 py-5 text-sm text-on-secondary"><Database size={18} className="text-primary-fixed-dim" />Settings and library metadata stay in browser storage.</div>
    </SettingsGroup>
  </div>
}
