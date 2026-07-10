import { describe, expect, it } from 'vitest'
import { ThumbnailQueue } from './thumbnailQueue'

describe('ThumbnailQueue', () => {
  it('processes visible jobs in grid order before normal jobs', async () => {
    const queue = new ThumbnailQueue()
    const completed: string[] = []
    queue.setPaused(true)
    for (const id of ['discovered-first', 'top', 'second']) {
      queue.enqueue({
        id,
        priority: 'normal',
        run: async () => {
          completed.push(id)
        },
      })
    }
    queue.prioritize('second', 1)
    queue.prioritize('top', 0)

    queue.setPaused(false)
    await queue.waitForIdle()

    expect(completed).toEqual(['top', 'second', 'discovered-first'])
  })

  it('returns off-screen work to normal priority', async () => {
    const queue = new ThumbnailQueue()
    const completed: string[] = []
    queue.setPaused(true)
    for (const id of ['normal-first', 'leaving-view']) {
      queue.enqueue({
        id,
        priority: 'normal',
        run: async () => {
          completed.push(id)
        },
      })
    }
    queue.prioritize('leaving-view', 0)
    queue.deprioritize('leaving-view')

    queue.setPaused(false)
    await queue.waitForIdle()

    expect(completed).toEqual(['normal-first', 'leaving-view'])
  })
})
