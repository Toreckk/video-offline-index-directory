import { useEffect } from 'react'
import { useMediaStore } from '../../media/store/mediaStore'
import { thumbnailQueue } from '../../media/services/thumbnailQueue'
import { usePlayerStore } from '../../player/store/playerStore'
import { useSettingsStore } from '../../settings/store/settingsStore'

export function BackgroundWorkCoordinator() {
  const activePreviewId = useMediaStore((state) => state.activePreviewId)
  const selectedAssetId = usePlayerStore((state) => state.selectedAssetId)
  const thumbnailPriority = useSettingsStore((state) => state.thumbnailPriority)
  const reduceMotion = useSettingsStore((state) => state.reduceMotion)

  useEffect(() => {
    thumbnailQueue.setPaused(
      thumbnailPriority === 'paused' ||
        activePreviewId !== null ||
        selectedAssetId !== null,
    )
  }, [activePreviewId, selectedAssetId, thumbnailPriority])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    return () => document.documentElement.classList.remove('reduce-motion')
  }, [reduceMotion])

  return null
}
