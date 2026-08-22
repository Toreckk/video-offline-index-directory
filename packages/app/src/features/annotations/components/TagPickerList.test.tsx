/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TagPickerList } from './TagPickerList'
import type { TagDefinition } from '../model/annotationTypes'

afterEach(cleanup)

describe('TagPickerList', () => {
  it('bounds initial rendering but keeps the complete catalog reachable', () => {
    const tags = Array.from({ length: 61 }, (_, index): TagDefinition => ({ id: `tag-${index}`, name: `Tag ${index + 1}`, color: '#A78BFA', createdAt: index }))
    render(<TagPickerList sections={[{ id: 'all', label: 'All tags', tags }]} selectedTagIds={[]} favoriteTagIds={[]} usageCounts={{}} onToggle={() => undefined} onToggleFavorite={() => undefined} />)

    expect(screen.queryByText('Tag 61')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more' }))
    expect(screen.getByText('Tag 61')).toBeInTheDocument()
  })

  it('keeps assigned tags reachable without letting them dominate quick add', () => {
    const tags: TagDefinition[] = [{ id: 'assigned', name: 'Assigned tag', color: '#A78BFA', createdAt: 1 }]
    render(<TagPickerList sections={[{ id: 'assigned', label: 'Assigned', tags }]} selectedTagIds={['assigned']} favoriteTagIds={[]} usageCounts={{}} onToggle={() => undefined} onToggleFavorite={() => undefined} initiallyCollapsedSectionIds={['assigned']} />)
    expect(screen.queryByText('Assigned tag')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Assigned (1) Show' }))
    expect(screen.getByText('Assigned tag')).toBeInTheDocument()
  })
})
