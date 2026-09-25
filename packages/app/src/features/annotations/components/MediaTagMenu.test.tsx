/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaTagMenu } from './MediaTagMenu'
import { useAnnotationStore, type TagDefinition } from '../store/annotationStore'
import { useModalFocus } from '../../../shared/useModalFocus'

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => undefined), del: vi.fn(async () => undefined) }))

afterEach(cleanup)

function ModalTagMenu({ close }: { close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, true, close)
  return <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}><MediaTagMenu mediaId="video-one" /></div>
}

describe('MediaTagMenu', () => {
  beforeEach(() => {
    const tags = Array.from({ length: 7 }, (_, index): TagDefinition => ({ id: `tag-${index}`, name: index === 6 ? 'Seven' : `Tag ${index + 1}`, color: '#A78BFA', createdAt: index }))
    useAnnotationStore.setState({ tagsById: Object.fromEntries(tags.map((tag) => [tag.id, tag])), orderedTagIds: tags.map((tag) => tag.id), annotationsByMediaId: {}, favoriteTagIds: [], bulkTagId: null, bulkSelectedMediaIds: [] })
  })

  it('keeps search and creation inputs focusable inside a modal and dismisses the menu first', () => {
    const close = vi.fn()
    render(<ModalTagMenu close={close} />)
    const trigger = screen.getByRole('button', { name: 'Manage video tags' })
    fireEvent.click(trigger)
    const search = screen.getByPlaceholderText('Search tags')
    search.focus()
    expect(search).toHaveFocus()
    fireEvent.change(search, { target: { value: 'Seven' } })
    expect(search).toHaveValue('Seven')
    const create = screen.getByPlaceholderText('e.g. year:2025')
    create.focus()
    expect(create).toHaveFocus()
    fireEvent.change(create, { target: { value: 'New tag' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create and add tag' }))
    const assigned = useAnnotationStore.getState().annotationsByMediaId['video-one']?.tagIds ?? []
    expect(assigned.map((id) => useAnnotationStore.getState().tagsById[id]?.name)).toEqual(['New tag'])
    fireEvent.keyDown(create, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('Search tags')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(close).toHaveBeenCalledOnce()
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

  it('quick-create reuses an existing tag and assigns it', () => {
    const existing = useAnnotationStore.getState().createTag('Archive')
    render(<MediaTagMenu mediaId="video-one" />)
    fireEvent.click(screen.getByRole('button', { name: 'Manage video tags' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. year:2025'), { target: { value: ' archive ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create and add tag' }))
    expect(useAnnotationStore.getState().orderedTagIds.filter((id) => useAnnotationStore.getState().tagsById[id]?.name.toLocaleLowerCase() === 'archive')).toEqual([existing.id])
    expect(useAnnotationStore.getState().annotationsByMediaId['video-one']?.tagIds).toEqual([existing.id])
  })
})
