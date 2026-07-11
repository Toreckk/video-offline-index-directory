/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaTagMenu } from './MediaTagMenu'
import { useAnnotationStore, type TagDefinition } from '../store/annotationStore'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))

afterEach(cleanup)

describe('MediaTagMenu', () => {
  beforeEach(() => {
    const tags = Array.from({ length: 7 }, (_, index): TagDefinition => ({ id: `tag-${index}`, name: index === 6 ? 'Seven' : `Tag ${index + 1}`, color: '#A78BFA', createdAt: index }))
    useAnnotationStore.setState({ tagsById: Object.fromEntries(tags.map((tag) => [tag.id, tag])), orderedTagIds: tags.map((tag) => tag.id), annotationsByMediaId: {}, favoriteTagIds: [], bulkTagId: null, bulkSelectedMediaIds: [] })
  })

  it('searches a large tag collection and assigns from the portaled menu', () => {
    render(<MediaTagMenu mediaId="video-one" />)
    fireEvent.click(screen.getByRole('button', { name: 'Manage video tags' }))
    fireEvent.change(screen.getByPlaceholderText('Search tags'), { target: { value: 'seven' } })
    const label = screen.getByText('Seven')
    const addButton = label.closest('button')
    expect(addButton).not.toBeNull()
    fireEvent.click(addButton!)
    expect(useAnnotationStore.getState().annotationsByMediaId['video-one']?.tagIds).toEqual(['tag-6'])
  })
})
