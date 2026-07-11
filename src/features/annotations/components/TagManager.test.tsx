/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TagManager } from './TagManager'
import { useAnnotationStore } from '../store/annotationStore'
import type { TagDefinition } from '../model/annotationTypes'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))
afterEach(cleanup)

describe('TagManager', () => {
  beforeEach(() => {
    const tags = Array.from({ length: 61 }, (_, index): TagDefinition => ({ id: `tag-${index + 1}`, name: `Tag ${String(index + 1).padStart(3, '0')}`, color: '#A78BFA', createdAt: index }))
    useAnnotationStore.setState({ tagsById: Object.fromEntries(tags.map((tag) => [tag.id, tag])), orderedTagIds: tags.map((tag) => tag.id), annotationsByMediaId: {}, favoriteTagIds: [] })
  })

  it('bounds the catalog and supports inline rename', () => {
    render(<TagManager />)
    expect(screen.queryByText('Tag 061')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load 11 more tags' }))
    expect(screen.getByText('Tag 061')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rename Tag 001' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename Tag 001' }), { target: { value: 'Archive era' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save name for Tag 001' }))
    expect(useAnnotationStore.getState().tagsById['tag-1']?.name).toBe('Archive era')
  })
})
