/** @vitest-environment jsdom */

import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TagDefinition } from '../../annotations/model/annotationTypes'
import type { SmartCollectionRules } from '../model/collectionTypes'
import { CollectionRuleEditor } from './CollectionRuleEditor'

afterEach(cleanup)

const tags: TagDefinition[] = ['A', 'B', 'C', 'E'].map((name) => ({
  id: name.toLowerCase(),
  name,
  color: '#A78BFA',
  createdAt: 1,
}))

describe('CollectionRuleEditor', () => {
  it('makes nested groups prominent and groups selected rules as Any by default', () => {
    render(<Harness />)

    expect(screen.getByRole('button', { name: 'Add nested group' })).toBeInTheDocument()
    expect(screen.queryByText('Logic preview')).not.toBeInTheDocument()

    screen.getAllByRole('checkbox', { name: 'Select tag rule' }).slice(0, 3).forEach((checkbox) => fireEvent.click(checkbox))
    fireEvent.click(screen.getByRole('button', { name: 'Group selected rules' }))

    expect(screen.getByText('Nested group matching')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Group match operator' })[1]).toHaveTextContent('Any rule')
  })
})

function Harness() {
  const [value, setValue] = useState<SmartCollectionRules>({
    root: {
      id: 'root',
      kind: 'group',
      operator: 'and',
      negated: false,
      children: [
        { id: 'a', kind: 'tag', tagId: 'a', negated: false },
        { id: 'b', kind: 'tag', tagId: 'b', negated: false },
        { id: 'c', kind: 'tag', tagId: 'c', negated: false },
        { id: 'e', kind: 'tag', tagId: 'e', negated: true },
      ],
    },
  })
  return <CollectionRuleEditor tags={tags} durationBounds={null} value={value} onChange={setValue} />
}
