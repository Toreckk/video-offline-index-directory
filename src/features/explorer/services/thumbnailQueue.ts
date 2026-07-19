type QueuePriority = 'visible' | 'normal' | 'deferred'

type ThumbnailJob = {
  id: string
  priority: QueuePriority
  priorityRank?: number
  sequence?: number
  run: () => Promise<void>
}

export class ThumbnailQueue {
  private jobs: ThumbnailJob[] = []
  private running = false
  private paused = false
  private visibleRanks = new Map<string, number>()
  private idleResolvers = new Set<() => void>()
  private nextSequence = 0

  enqueue(job: ThumbnailJob) {
    if (this.jobs.some((queuedJob) => queuedJob.id === job.id)) return false
    this.jobs.push({
      ...job,
      priority: job.priority === 'deferred'
        ? 'deferred'
        : this.visibleRanks.has(job.id) ? 'visible' : job.priority,
      priorityRank: this.visibleRanks.get(job.id) ?? job.priorityRank,
      sequence: this.nextSequence,
    })
    this.nextSequence += 1
    this.sortJobs()
    void this.drain()
    return true
  }

  prioritize(id: string, rank = 0) {
    this.visibleRanks.set(id, rank)
    const job = this.jobs.find((queuedJob) => queuedJob.id === id)
    if (!job || job.priority === 'deferred') return
    job.priority = 'visible'
    job.priorityRank = rank
    this.sortJobs()
  }

  deprioritize(id: string) {
    this.visibleRanks.delete(id)
    const job = this.jobs.find((queuedJob) => queuedJob.id === id)
    if (!job || job.priority === 'deferred') return
    job.priority = 'normal'
    job.priorityRank = undefined
    this.sortJobs()
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!paused) void this.drain()
  }

  clearPending() {
    this.jobs = []
    this.visibleRanks.clear()
    this.nextSequence = 0
  }

  waitForIdle() {
    if (!this.running) return Promise.resolve()
    return new Promise<void>((resolve) => this.idleResolvers.add(resolve))
  }

  private sortJobs() {
    this.jobs.sort((left, right) => {
      if (left.priority === 'visible' && right.priority === 'visible') {
        return (
          (left.priorityRank ?? 0) - (right.priorityRank ?? 0) ||
          (left.sequence ?? 0) - (right.sequence ?? 0)
        )
      }
      if (left.priority === right.priority) {
        return (left.sequence ?? 0) - (right.sequence ?? 0)
      }
      return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    })
  }

  private async drain() {
    if (this.running || this.paused) return
    this.running = true

    try {
      while (!this.paused) {
        const job = this.jobs.shift()
        if (!job) break

        try {
          await job.run()
        } catch (error) {
          console.error(`Thumbnail job failed for ${job.id}`, error)
        }

        await pauseForPaint()
      }
    } finally {
      this.running = false
      for (const resolve of this.idleResolvers) resolve()
      this.idleResolvers.clear()
    }
  }
}

function pauseForPaint() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export const thumbnailQueue = new ThumbnailQueue()

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  visible: 0,
  normal: 1,
  deferred: 2,
}
