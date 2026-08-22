import { describe, expect, it } from 'vitest'
import type { AnnotationData } from '../../annotations/model/annotationTypes'
import type { SmartCollection } from '../../collections/model/collectionTypes'
import {
  createLibraryMetadataExport,
  mergeLibraryMetadata,
  parseLibraryMetadataExport,
  replaceLibraryId,
} from './libraryMetadataTransfer'

const annotations: AnnotationData = {
  tagsById: {
    holiday: { id: 'holiday', name: 'Holiday', color: '#A78BFA', createdAt: 1 },
  },
  orderedTagIds: ['holiday'],
  annotationsByMediaId: {
    'old-library/Trips/clip.mp4': {
      favorite: true,
      tagIds: ['holiday'],
      updatedAt: 10,
    },
  },
  tagImplications: {},
}

const collection: SmartCollection = {
  id: 'collection-holiday',
  name: 'Holiday videos',
  createdAt: 1,
  updatedAt: 1,
  rules: {
    root: {
      id: 'root',
      kind: 'group',
      operator: 'and',
      negated: false,
      children: [{ id: 'rule', kind: 'tag', tagId: 'holiday', negated: false }],
    },
  },
}

describe('library metadata transfer', () => {
  it('round-trips portable metadata and remaps media to the selected library', () => {
    const exported = createLibraryMetadataExport({
      libraryId: 'old-library',
      libraryName: 'Videos',
      annotations,
      favoriteTagIds: ['holiday'],
      collectionsById: { [collection.id]: collection },
      orderedCollectionIds: [collection.id],
      playback: {
        recordsByMediaId: {
          'old-library/Trips/clip.mp4': {
            positionSeconds: 12,
            durationSeconds: 60,
            watched: false,
            lastPlayedAt: 5,
            playCount: 1,
          },
        },
      },
    })
    const imported = parseLibraryMetadataExport(JSON.parse(JSON.stringify(exported)))
    const merged = mergeLibraryMetadata({
      libraryId: 'new-library',
      annotations: { tagsById: {}, orderedTagIds: [], annotationsByMediaId: {}, tagImplications: {} },
      favoriteTagIds: [],
      collectionsById: {},
      orderedCollectionIds: [],
      playback: { recordsByMediaId: {} },
    }, imported)

    expect(merged.annotations.annotationsByMediaId['new-library/Trips/clip.mp4']?.favorite).toBe(true)
    expect(merged.playback.recordsByMediaId['new-library/Trips/clip.mp4']?.positionSeconds).toBe(12)
    expect(merged.collectionsById['collection-holiday']?.rules.root.children[0]).toMatchObject({ kind: 'tag', tagId: 'holiday' })
    expect(merged.favoriteTagIds).toEqual(['holiday'])
  })

  it('preserves the relative path while replacing only the library segment', () => {
    expect(replaceLibraryId('old/Folder%20A/video.mp4', 'new id')).toBe('new%20id/Folder%20A/video.mp4')
  })

  it('round-trips the target 5,000-video and 300-tag metadata fixture', () => {
    const tagsById = Object.fromEntries(Array.from({ length: 300 }, (_, index) => {
      const id = `tag-${index}`
      return [id, { id, name: `Tag ${index}`, color: '#A78BFA' as const, createdAt: index }]
    }))
    const orderedTagIds = Object.keys(tagsById)
    const annotationsByMediaId = Object.fromEntries(Array.from({ length: 5_000 }, (_, index) => [
      `source/Folder/video-${index}.mp4`,
      { favorite: index % 25 === 0, tagIds: [`tag-${index % 300}`], updatedAt: index },
    ]))
    const fixture: AnnotationData = {
      tagsById,
      orderedTagIds,
      annotationsByMediaId,
      tagImplications: {},
    }

    const exported = createLibraryMetadataExport({
      libraryId: 'source',
      libraryName: 'Large library',
      annotations: fixture,
      favoriteTagIds: orderedTagIds.slice(0, 12),
      collectionsById: {},
      orderedCollectionIds: [],
      playback: { recordsByMediaId: {} },
    })
    const imported = parseLibraryMetadataExport(JSON.parse(JSON.stringify(exported)))
    const merged = mergeLibraryMetadata({
      libraryId: 'target',
      annotations: { tagsById: {}, orderedTagIds: [], annotationsByMediaId: {}, tagImplications: {} },
      favoriteTagIds: [],
      collectionsById: {},
      orderedCollectionIds: [],
      playback: { recordsByMediaId: {} },
    }, imported)

    expect(merged.annotations.orderedTagIds).toHaveLength(300)
    expect(Object.keys(merged.annotations.annotationsByMediaId)).toHaveLength(5_000)
    expect(merged.annotations.annotationsByMediaId['target/Folder/video-4999.mp4']?.tagIds).toHaveLength(1)
  })
})
