export type QueuePriority = 'visible' | 'normal' | 'deferred'

export type ThumbnailJob = {
  id: string
  priority: QueuePriority
  priorityRank?: number
  sequence?: number
  run: () => Promise<void>
}

export class ThumbnailQueue {
  private jobs: ThumbnailJob[] = []
  private queuedJobsById = new Map<string, ThumbnailJob>()
  private running = false
  private paused = false
  private visibleRanks = new Map<string, number>()
  private idleResolvers = new Set<() => void>()
  private nextSequence = 0
  private orderDirty = false
  private jobsSinceYield = 0

  enqueue(job: ThumbnailJob) {
    if (this.queuedJobsById.has(job.id)) return false
    const queuedJob: ThumbnailJob = {
      ...job,
      priority: job.priority === 'deferred'
        ? 'deferred'
        : this.visibleRanks.has(job.id) ? 'visible' : job.priority,
      priorityRank: this.visibleRanks.get(job.id) ?? job.priorityRank,
      sequence: this.nextSequence,
    }
    this.jobs.push(queuedJob)
    this.queuedJobsById.set(job.id, queuedJob)
    this.nextSequence += 1
    this.orderDirty = true
    void this.drain()
    return true
  }

  prioritize(id: string, rank = 0) {
    this.visibleRanks.set(id, rank)
    const job = this.queuedJobsById.get(id)
    if (!job || job.priority === 'deferred') return
    job.priority = 'visible'
    job.priorityRank = rank
    this.orderDirty = true
  }

  deprioritize(id: string) {
    this.visibleRanks.delete(id)
    const job = this.queuedJobsById.get(id)
    if (!job || job.priority === 'deferred') return
    job.priority = 'normal'
    job.priorityRank = undefined
    this.orderDirty = true
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!paused) void this.drain()
  }

  clearPending() {
    this.jobs = []
    this.queuedJobsById.clear()
    this.visibleRanks.clear()
    this.nextSequence = 0
    this.orderDirty = false
    this.jobsSinceYield = 0
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
    this.orderDirty = false
  }

  private takeNextJob() {
    if (this.orderDirty) this.sortJobs()
    const job = this.jobs.shift()
    if (job) this.queuedJobsById.delete(job.id)
    return job
  }

  private async drain() {
    if (this.running || this.paused) return
    this.running = true

    try {
      while (!this.paused) {
        const job = this.takeNextJob()
        if (!job) break

        try {
          await job.run()
        } catch (error) {
          console.error(`Thumbnail job failed for ${job.id}`, error)
        }

        this.jobsSinceYield += 1
        if (this.jobsSinceYield >= JOBS_PER_PAINT_YIELD) {
          this.jobsSinceYield = 0
          await pauseForPaint()
        }
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

const JOBS_PER_PAINT_YIELD = 4

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  visible: 0,
  normal: 1,
  deferred: 2,
}
