import { useEffect, useState } from 'react'
import { getCachedThumbnail } from '../../media/services/thumbnailCache'
import { acquireThumbnailResource } from '../../media/services/thumbnailResourceCache'

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
    const lease = acquireThumbnailResource(thumbnailBlobKey, getCachedThumbnail)
    void lease.url.then((url) => {
      if (!active || !url) return
      setThumbnailResource({ key: thumbnailBlobKey, url })
    })

    return () => {
      active = false
      lease.release()
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
