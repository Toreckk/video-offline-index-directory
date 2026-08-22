export type PlaybackRecord = {
  positionSeconds: number
  durationSeconds: number
  watched: boolean
  lastPlayedAt: number
  completedAt?: number
  playCount: number
}

export type PlaybackData = {
  recordsByMediaId: Record<string, PlaybackRecord>
}
