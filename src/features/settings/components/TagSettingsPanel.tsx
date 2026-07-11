import { TagManager } from '../../annotations/components/TagManager'
import { AnnotationTransferPanel } from '../../annotations/components/AnnotationTransferPanel'
import { SettingsGroup } from './SettingsPrimitives'

export function TagSettingsPanel() {
  return <div className="space-y-7">
    <SettingsGroup title="Tag catalog" description="Create, rename, search, sort, favorite, recolor, and safely remove reusable tags."><TagManager /></SettingsGroup>
    <SettingsGroup title="Backup & transfer" description="Move favorites and tag assignments between browser profiles without replacing existing data."><AnnotationTransferPanel /></SettingsGroup>
  </div>
}
