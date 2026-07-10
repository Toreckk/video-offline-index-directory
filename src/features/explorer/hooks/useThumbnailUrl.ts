import { useEffect, useState } from 'react'
import { getCachedThumbnail } from '../services/thumbnailCache'

export function useThumbnailUrl(
  thumbnailBlobKey: string | undefined,
  thumbnailStatus: 'idle' | 'queued' | 'ready' | 'error',
) {
  const [thumbnailResource, setThumbnailResource] = useState<{
    key: string
    url: string
  } | null>(null)

  useEffect(() => {
    if (!thumbnailBlobKey || thumbnailStatus !== 'ready') return

    let active = true
    let objectUrl: string | null = null
    void getCachedThumbnail(thumbnailBlobKey).then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setThumbnailResource({ key: thumbnailBlobKey, url: objectUrl })
    })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [thumbnailBlobKey, thumbnailStatus])

  if (
    thumbnailStatus !== 'ready' ||
    !thumbnailResource ||
    thumbnailResource.key !== thumbnailBlobKey
  ) {
    return null
  }

  return thumbnailResource.url
}
