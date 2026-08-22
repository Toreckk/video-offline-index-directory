import { bench, describe } from 'vitest'
import type { MediaAnnotation } from '../packages/app/src/features/annotations/model/annotationTypes'
import { buildTagUsageCounts } from '../packages/app/src/features/annotations/services/tagCatalog'
import { matchesMediaFilters } from '../packages/app/src/features/explorer/services/mediaFilters'
import { sortMediaAssets } from '../packages/app/src/features/explorer/services/sortMediaAssets'
import { reconcileMediaAssets } from '../packages/app/src/features/media/services/reconcileMediaAssets'
import { ThumbnailQueue } from '../packages/app/src/features/media/services/thumbnailQueue'
import type { MediaAsset } from '../packages/app/src/features/media/store/mediaStore'

for (const librarySize of [2_500, 5_000]) {
  describe(`${librarySize.toLocaleString()} videos and 300 tags`, () => {
    const existing = createAssets(librarySize)
    const discovered = createReconciliationFixture(existing)
    const annotations = createAnnotations(existing)
    const ids = existing.map(({ id }) => id)

    bench('1% catalog reconciliation', () => {
      const result = reconcileMediaAssets(existing, discovered)
      if (result.assets.length !== librarySize) throw new Error('Unexpected fixture result.')
    }, { time: 1_000, warmupTime: 250 })

    bench('tag usage counts', () => {
      const result = buildTagUsageCounts(annotations, ids)
      if (Object.keys(result).length !== 300) throw new Error('Unexpected fixture result.')
    }, { time: 1_000, warmupTime: 250 })

    bench('filter and filename sort', () => {
      const visible = existing.filter((asset) => matchesMediaFilters(
        asset,
        annotations[asset.id],
        {
          searchQuery: 'clip',
          folderFilter: 'folder-10',
          favoritesOnly: false,
          untaggedOnly: false,
          selectedTagIds: ['tag-10'],
        },
      ))
      const result = sortMediaAssets(visible, 'name')
      if (result.length === 0) throw new Error('Unexpected fixture result.')
    }, { time: 1_000, warmupTime: 250 })

    bench('thumbnail queue scheduling', () => {
      const queue = new ThumbnailQueue()
      queue.setPaused(true)
      for (const asset of existing) {
        if (!queue.enqueue({ id: asset.id, priority: 'normal', run: async () => undefined })) {
          throw new Error('Unexpected duplicate fixture id.')
        }
      }
      queue.clearPending()
    }, { time: 1_000, warmupTime: 250 })
  })
}

function createAssets(count: number): MediaAsset[] {
  return Array.from({ length: count }, (_, index) => {
    const name = `clip-${String(index).padStart(5, '0')}.mp4`
    return {
      id: `library/folder-${index % 50}/${name}`,
      libraryId: 'library',
      rootName: 'Videos',
      name,
      extension: '.mp4',
      pathParts: [`folder-${index % 50}`],
      source: { kind: 'desktop-path', absolutePath: `C:\\Videos\\folder-${index % 50}\\${name}` },
      size: 1_000_000 + index,
      lastModified: 1_700_000_000_000 + index,
      thumbnailStatus: 'ready',
      thumbnailBlobKey: `void-thumbnail:v2:${index}`,
      duration: 30 + (index % 300),
      width: 1920,
      height: 1080,
    }
  })
}

function createReconciliationFixture(existing: readonly MediaAsset[]) {
  const churn = Math.floor(existing.length * 0.01)
  const retained = existing.slice(churn).map((asset, index) =>
    index < churn
      ? { ...asset, lastModified: asset.lastModified + 1, thumbnailStatus: 'idle' as const, thumbnailBlobKey: undefined }
      : { ...asset, thumbnailStatus: 'idle' as const, thumbnailBlobKey: undefined },
  )
  const additions = createAssets(churn).map((asset, index) => ({
    ...asset,
    id: `library/new/new-${index}.mp4`,
    name: `new-${index}.mp4`,
    pathParts: ['new'],
    source: { kind: 'desktop-path' as const, absolutePath: `C:\\Videos\\new\\new-${index}.mp4` },
    thumbnailStatus: 'idle' as const,
    thumbnailBlobKey: undefined,
    duration: undefined,
    width: undefined,
    height: undefined,
  }))
  return [...retained, ...additions]
}

function createAnnotations(assets: readonly MediaAsset[]) {
  return Object.fromEntries(assets.map((asset, index): [string, MediaAnnotation] => [
    asset.id,
    {
      favorite: index % 20 === 0,
      tagIds: Array.from({ length: 5 }, (_, offset) => `tag-${(index + offset * 17) % 300}`),
      updatedAt: 1_700_000_000_000 + index,
    },
  ]))
}
