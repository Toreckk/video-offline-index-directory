import { create } from 'zustand'
import type { SupportedVideoExtension } from '../../library/services/fileSystem'
import type { MediaFileSource } from '../../library/services/mediaFileSource'

export type ThumbnailStatus = 'idle' | 'queued' | 'ready' | 'error'

export type MediaAsset = {
  id: string
  libraryId: string
  rootName: string
  name: string
  extension: SupportedVideoExtension
  pathParts: string[]
  source: MediaFileSource
  size: number
  lastModified: number
  thumbnailStatus: ThumbnailStatus
  thumbnailBlobKey?: string
  duration?: number
  width?: number
  height?: number
}

type MediaState = {
  assetsById: Record<string, MediaAsset>
  orderedIds: string[]
  searchQuery: string
  folderFilter: string | null
  activePreviewId: string | null
}

type MediaActions = {
  clearAssets: () => void
  addAssets: (assets: MediaAsset[]) => void
  retainAssets: (ids: readonly string[]) => void
  updateAsset: (id: string, patch: Partial<MediaAsset>) => void
  setSearchQuery: (query: string) => void
  setFolderFilter: (folder: string | null) => void
  setActivePreviewId: (id: string | null) => void
}

export const useMediaStore = create<MediaState & MediaActions>((set) => ({
  assetsById: {},
  orderedIds: [],
  searchQuery: '',
  folderFilter: null,
  activePreviewId: null,

  clearAssets: () =>
    set({
      assetsById: {},
      orderedIds: [],
      folderFilter: null,
      activePreviewId: null,
    }),
  addAssets: (assets) =>
    set((state) => {
      const assetsById = { ...state.assetsById }
      const orderedIds = [...state.orderedIds]

      for (const asset of assets) {
        const existing = assetsById[asset.id]
        if (!existing) orderedIds.push(asset.id)
        assetsById[asset.id] = {
          ...asset,
          duration: asset.duration ?? existing?.duration,
          width: asset.width ?? existing?.width,
          height: asset.height ?? existing?.height,
          thumbnailBlobKey: asset.thumbnailBlobKey ?? existing?.thumbnailBlobKey,
          thumbnailStatus:
            asset.thumbnailStatus === 'idle' && existing?.thumbnailStatus === 'ready'
              ? 'ready'
              : asset.thumbnailStatus,
        }
      }

      return { assetsById, orderedIds }
    }),
  retainAssets: (ids) =>
    set((state) => {
      const retained = new Set(ids)
      const orderedIds = state.orderedIds.filter((id) => retained.has(id))
      const assetsById = Object.fromEntries(orderedIds.flatMap((id) => state.assetsById[id] ? [[id, state.assetsById[id]]] : []))
      return { orderedIds, assetsById }
    }),
  updateAsset: (id, patch) =>
    set((state) => {
      const asset = state.assetsById[id]
      if (!asset) return state

      return {
        assetsById: {
          ...state.assetsById,
          [id]: { ...asset, ...patch },
        },
      }
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFolderFilter: (folderFilter) => set({ folderFilter }),
  setActivePreviewId: (activePreviewId) => set({ activePreviewId }),
}))

export function getMediaAssets(state: MediaState) {
  return state.orderedIds.flatMap((id) => {
    const asset = state.assetsById[id]
    return asset ? [asset] : []
  })
}
