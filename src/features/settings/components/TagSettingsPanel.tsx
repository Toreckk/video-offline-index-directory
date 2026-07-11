import { TagManager } from '../../annotations/components/TagManager'
import { AnnotationTransferPanel } from '../../annotations/components/AnnotationTransferPanel'
import { SettingsGroup } from './SettingsPrimitives'
import { TagMergePanel } from '../../annotations/components/TagMergePanel'
import { TagRelationsPanel } from '../../annotations/components/TagRelationsPanel'

export function TagSettingsPanel() {
  return <div className="space-y-7">
    <SettingsGroup title="Tag catalog" description="Create, rename, search, sort, favorite, recolor, and safely remove reusable tags."><TagManager /></SettingsGroup>
    <SettingsGroup title="Migrate or combine tags" description="Move every assignment into an existing or new tag, with optional cleanup of the old tag."><TagMergePanel /></SettingsGroup>
    <SettingsGroup title="Linked tags" description="Define simple additive implications such as year:1991 adding year:1900s and year:1000s."><TagRelationsPanel /></SettingsGroup>
    <SettingsGroup title="Backup & transfer" description="Move favorites and tag assignments between browser profiles without replacing existing data."><AnnotationTransferPanel /></SettingsGroup>
  </div>
}
