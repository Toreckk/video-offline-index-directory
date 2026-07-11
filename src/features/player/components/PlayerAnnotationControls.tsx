import { Heart } from 'lucide-react'
import { useAnnotationStore } from '../../annotations/store/annotationStore'
import { MediaTagMenu } from '../../annotations/components/MediaTagMenu'
import { TooltipIconButton } from '../../../components/controls/TooltipIconButton'

export function PlayerAnnotationControls({ mediaId }: { mediaId: string }) {
  const annotation = useAnnotationStore(
    (state) => state.annotationsByMediaId[mediaId],
  )
  const toggleFavorite = useAnnotationStore((state) => state.toggleFavorite)
  const isFavorite = annotation?.favorite ?? false

  return (
    <>
      <TooltipIconButton
        label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        onClick={() => toggleFavorite(mediaId)}
        className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
          isFavorite
            ? 'border-rose-300/40 bg-rose-500/25 text-rose-200'
            : 'border-white/10 bg-black/55 text-white hover:bg-black/80'
        }`}
        aria-pressed={isFavorite}
      >
        <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
      </TooltipIconButton>

      <MediaTagMenu mediaId={mediaId} />
    </>
  )
}
