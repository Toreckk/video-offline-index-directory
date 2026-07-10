import { describe, expect, it, vi } from 'vitest'
import { mergeAnnotationExport, parseAnnotationExport, type AnnotationExport } from './annotationTransfer'

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
}))

describe('annotation transfer', () => {
  it('merges tags by case-insensitive name and unions video annotations', () => {
    const imported: AnnotationExport = {
      schemaVersion: 1,
      exportedAt: new Date(0).toISOString(),
      tags: [{ id: 'remote', name: 'CHRISTMAS', color: '#FB7185', createdAt: 2 }],
      annotations: [{ mediaId: 'video', favorite: false, tagIds: ['remote'], updatedAt: 20 }],
    }
    const result = mergeAnnotationExport({
      tagsById: { local: { id: 'local', name: 'Christmas', color: '#A78BFA', createdAt: 1 } },
      orderedTagIds: ['local'],
      annotationsByMediaId: { video: { favorite: true, tagIds: [], updatedAt: 10 } },
    }, imported)

    expect(result.orderedTagIds).toEqual(['local'])
    expect(result.annotationsByMediaId.video).toEqual({ favorite: true, tagIds: ['local'], updatedAt: 20 })
  })

  it('rejects malformed backups before mutating state', () => {
    expect(() => parseAnnotationExport({ schemaVersion: 99, tags: [], annotations: [] })).toThrow('supported')
  })
})
