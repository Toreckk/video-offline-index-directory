import { useEffect, useMemo, useState } from 'react'
import { useMediaStore } from '../../explorer/store/mediaStore'
import { createMediaUrl } from '../../library/services/mediaFileSource'

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
  } | null>(null)

  useEffect(() => {
    let active = true
    const revokeUrls: (() => void)[] = []

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
          console.error(`Could not prepare ${asset.name} for playback`, error)
          return null
        }
      }),
    ).then((entries) => {
      if (!active) return
      setUrlResource({
        key: warmKey,
        urlsById: Object.fromEntries(entries.filter((entry) => entry !== null)),
      })
    })

    return () => {
      active = false
      for (const revoke of revokeUrls) revoke()
    }
  }, [warmKey, warmedIds])

  return selectedAssetId && urlResource?.key === warmKey
    ? urlResource.urlsById[selectedAssetId] ?? null
    : null
}
