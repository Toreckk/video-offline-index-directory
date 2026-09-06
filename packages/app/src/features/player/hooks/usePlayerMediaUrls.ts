import { useEffect, useMemo, useState } from 'react'
import { useMediaStore } from '../../media/store/mediaStore'
import { createMediaUrl } from '../../media/services/mediaFileSource'

export function usePlayerMediaUrls(
  selectedAssetId: string | null,
  queueIds: string[],
) {
  const warmedIds = useMemo(() => {
    if (!selectedAssetId || queueIds.length === 0) return []
    const currentIndex = queueIds.indexOf(selectedAssetId)
    if (currentIndex < 0) return [selectedAssetId]
    const previous = queueIds[(currentIndex - 1 + queueIds.length) % queueIds.length]
    const next = queueIds[(currentIndex + 1) % queueIds.length]
    return [...new Set([selectedAssetId, previous, next].filter(Boolean))] as string[]
  }, [queueIds, selectedAssetId])
  const warmKey = warmedIds.join('\u0000')
  const [urlResource, setUrlResource] = useState<{
    key: string
    urlsById: Record<string, string>
    failedIds: string[]
  } | null>(null)

  useEffect(() => {
    let active = true
    const revokeUrls: (() => void)[] = []
    const failedIds: string[] = []

    void Promise.all(
      warmedIds.map(async (id) => {
        const asset = useMediaStore.getState().assetsById[id]
        if (!asset) return null
        try {
          const resource = await createMediaUrl(asset.source)
          if (!active) {
            resource.revoke()
            return null
          }
          revokeUrls.push(resource.revoke)
          return [id, resource.url] as const
        } catch (error) {
          failedIds.push(id)
          console.error(`Could not prepare ${asset.name} for playback`, error)
          return null
        }
      }),
    ).then((entries) => {
      if (!active) return
      setUrlResource({
        key: warmKey,
        urlsById: Object.fromEntries(entries.filter((entry) => entry !== null)),
        failedIds,
      })
    })

    return () => {
      active = false
      for (const revoke of revokeUrls) revoke()
    }
  }, [warmKey, warmedIds])

  const current = selectedAssetId && urlResource?.key === warmKey ? urlResource : null
  return {
    src: selectedAssetId ? current?.urlsById[selectedAssetId] ?? null : null,
    error: selectedAssetId && current?.failedIds.includes(selectedAssetId)
      ? 'This video is unavailable. Reconnect its folder or rescan, then open it again.' : null,
  }
}
