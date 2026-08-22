import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type MouseEventHandler,
} from 'react'
import type { MediaAsset } from '../store/mediaStore'
import { useMediaStore } from '../store/mediaStore'
import { useSettingsStore } from '../../settings/store/settingsStore'
import { getSnippetPoints } from '../services/previewSchedule'
import { createMediaUrl } from '../../library/services/mediaFileSource'

const SNIPPET_LENGTH_MS = 1_700

export function useHoverPreview(asset: MediaAsset) {
  const autoplay = useSettingsStore((state) => state.autoplayHoverPreview)
  const previewDelayMs = useSettingsStore((state) => state.previewDelayMs)
  const activePreviewId = useMediaStore((state) => state.activePreviewId)
  const setActivePreviewId = useMediaStore(
    (state) => state.setActivePreviewId,
  )
  const [previewResource, setPreviewResource] = useState<{
    assetId: string
    url: string
  } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const activationTimerRef = useRef<number | null>(null)
  const snippetTimerRef = useRef<number | null>(null)
  const isActive = autoplay && activePreviewId === asset.id

  const clearActivationTimer = useCallback(() => {
    if (activationTimerRef.current !== null) {
      window.clearTimeout(activationTimerRef.current)
      activationTimerRef.current = null
    }
  }, [])

  const scheduleActivation = useCallback(() => {
    if (!autoplay) return
    clearActivationTimer()
    setPreviewResource(null)
    activationTimerRef.current = window.setTimeout(() => {
      setActivePreviewId(asset.id)
    }, previewDelayMs)
  }, [asset.id, autoplay, clearActivationTimer, previewDelayMs, setActivePreviewId])

  const stopPreview = useCallback(() => {
    clearActivationTimer()
    if (useMediaStore.getState().activePreviewId === asset.id) {
      setActivePreviewId(null)
    }
  }, [asset.id, clearActivationTimer, setActivePreviewId])

  useEffect(() => {
    if (!isActive) return

    let revokeUrl: (() => void) | null = null
    let cancelled = false
    void createMediaUrl(asset.source)
      .then((resource) => {
        if (cancelled) {
          resource.revoke()
          return
        }
        revokeUrl = resource.revoke
        setPreviewResource({ assetId: asset.id, url: resource.url })
      })
      .catch((error) => {
        console.error(`Could not load preview for ${asset.name}`, error)
        if (useMediaStore.getState().activePreviewId === asset.id) {
          useMediaStore.getState().setActivePreviewId(null)
        }
      })

    return () => {
      cancelled = true
      revokeUrl?.()
    }
  }, [asset.id, asset.name, asset.source, isActive])

  const objectUrl =
    isActive && previewResource?.assetId === asset.id
      ? previewResource.url
      : null

  useEffect(() => {
    const video = videoRef.current
    if (!isActive || !objectUrl || !video) return

    let pointIndex = 0
    let stopped = false

    const clearSnippetTimer = () => {
      if (snippetTimerRef.current !== null) {
        window.clearTimeout(snippetTimerRef.current)
        snippetTimerRef.current = null
      }
    }
    const playPoint = () => {
      if (stopped) return
      const points = getSnippetPoints(video.duration)
      video.currentTime = points[pointIndex % points.length] ?? 0
      void video.play().catch(() => undefined)
      pointIndex += 1
      clearSnippetTimer()
      snippetTimerRef.current = window.setTimeout(playPoint, SNIPPET_LENGTH_MS)
    }
    const handleMetadata = () => playPoint()

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) playPoint()
    else video.addEventListener('loadedmetadata', handleMetadata, { once: true })

    return () => {
      stopped = true
      clearSnippetTimer()
      video.removeEventListener('loadedmetadata', handleMetadata)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [isActive, objectUrl])

  useEffect(
    () => () => {
      clearActivationTimer()
      if (useMediaStore.getState().activePreviewId === asset.id) {
        useMediaStore.getState().setActivePreviewId(null)
      }
    },
    [asset.id, clearActivationTimer],
  )

  const onMouseEnter: MouseEventHandler = scheduleActivation
  const onMouseLeave: MouseEventHandler = stopPreview
  const onFocus: FocusEventHandler = scheduleActivation
  const onBlur: FocusEventHandler = stopPreview

  return {
    isPreviewing: isActive && objectUrl !== null,
    objectUrl,
    videoRef,
    previewHandlers: { onMouseEnter, onMouseLeave, onFocus, onBlur },
  }
}
