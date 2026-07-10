import { create } from 'zustand'

type PlayerState = {
  selectedAssetId: string | null
  queueIds: string[]
}

type PlayerActions = {
  openPlayer: (assetId: string, queueIds: string[]) => void
  closePlayer: () => void
  selectNext: () => void
  selectPrevious: () => void
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  selectedAssetId: null,
  queueIds: [],
  openPlayer: (selectedAssetId, queueIds) =>
    set({ selectedAssetId, queueIds: [...queueIds] }),
  closePlayer: () => set({ selectedAssetId: null }),
  selectNext: () => selectOffset(1, get, set),
  selectPrevious: () => selectOffset(-1, get, set),
}))

function selectOffset(
  offset: number,
  get: () => PlayerState & PlayerActions,
  set: (state: Partial<PlayerState>) => void,
) {
  const { selectedAssetId, queueIds } = get()
  if (!selectedAssetId || queueIds.length < 2) return
  const currentIndex = queueIds.indexOf(selectedAssetId)
  if (currentIndex < 0) return
  const nextIndex = (currentIndex + offset + queueIds.length) % queueIds.length
  set({ selectedAssetId: queueIds[nextIndex] ?? selectedAssetId })
}
