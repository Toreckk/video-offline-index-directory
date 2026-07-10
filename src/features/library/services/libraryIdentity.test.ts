import { describe, expect, it } from 'vitest'
import { assertMatchingLibraryName, createLibraryId } from './libraryIdentity'

describe('library identity', () => {
  it('generates opaque ids independently of display names', () => {
    const first = createLibraryId()
    const second = createLibraryId()

    expect(first).toMatch(/^lib_/)
    expect(second).not.toBe(first)
  })

  it('prevents reconnecting a differently named root under an existing id', () => {
    expect(() => assertMatchingLibraryName('Holiday', 'Work')).toThrow(
      'Choose “Holiday”',
    )
    expect(() => assertMatchingLibraryName('Holiday', 'Holiday')).not.toThrow()
  })
})
