import type { MediaAsset } from '../../explorer/store/mediaStore'
import { formatBytes, formatDuration, getDisplayPath } from '../../../utils/media'

export function PlayerOverlayMetadata({ asset }: { asset: MediaAsset }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-linear-to-b from-black/80 to-transparent p-6 pr-60">
      <h2 className="truncate text-xl font-black">{asset.name}</h2>
      <p className="mt-2 truncate text-xs text-white/65">
        {getDisplayPath(asset.pathParts, asset.name)} · {formatBytes(asset.size)} ·{' '}
        {formatDuration(asset.duration)}
      </p>
    </div>
  )
}
