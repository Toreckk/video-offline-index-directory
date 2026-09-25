import type { NativeCatalog } from '@void/core'
import { commitCatalogReconciliation } from '../../../shared/persistence/userDataCoordinator'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { usePlaybackStore } from '../../playback/store/playbackStore'
import type { MediaIdMigration } from './reconcileMediaAssets'
import { getVoidPlatform } from '@void/core'

/** Keep collisions as orphaned records for explicit recovery; never guess ownership. */
export function moveOwnedRecords(records: Record<string, string>, moves: readonly MediaIdMigration[]) {
  const result = { ...records }
  const annotations = records['void-annotations-store'] ? JSON.parse(records['void-annotations-store']) : null
  const playback = records['void-playback-store'] ? JSON.parse(records['void-playback-store']) : null
  const annotationMap = annotations?.state.annotationsByMediaId ?? {}
  const playbackMap = playback?.state.recordsByMediaId ?? {}
  for (const { fromId, toId } of moves) {
    if (Object.hasOwn(annotationMap, toId) || Object.hasOwn(playbackMap, toId)) continue
    for (const map of [annotationMap, playbackMap]) {
      if (!Object.hasOwn(map, fromId)) continue
      map[toId] = map[fromId]
      delete map[fromId]
    }
  }
  if (annotations) result['void-annotations-store'] = JSON.stringify(annotations)
  if (playback) result['void-playback-store'] = JSON.stringify(playback)
  return { records: result, annotationMap, playbackMap }
}

export async function commitReconciliation(catalog: NativeCatalog, moves: readonly MediaIdMigration[], publish: () => void) {
  if (!moves.length) {
    await getVoidPlatform().saveCatalog?.(catalog)
    publish()
    return
  }
  await commitCatalogReconciliation(catalog, (records) => {
    const next = moveOwnedRecords(records, moves)
    return { records: next.records, publish: () => {
      useAnnotationStore.setState({ annotationsByMediaId: next.annotationMap })
      usePlaybackStore.setState({ recordsByMediaId: next.playbackMap })
      publish()
    } }
  })
}
