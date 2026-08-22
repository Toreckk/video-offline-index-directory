export function getSnippetPoints(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return [0]
  if (duration < 8) return [0]
  if (duration < 30) return [0.1, 0.45, 0.75].map((point) => point * duration)
  return [0.08, 0.25, 0.45, 0.65, 0.85].map(
    (point) => point * duration,
  )
}
