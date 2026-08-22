import type { VideoFileMetadata } from './apiTypes'
import { openMediaFile, type MediaFileSource } from '../../../media/services/mediaFileSource'

export async function getFileMetadata(
  source: MediaFileSource,
): Promise<VideoFileMetadata> {
  if (source.kind === 'desktop-path') {
    throw new Error('Desktop discovery must supply native file metadata.')
  }
  const file = await openMediaFile(source)
  return {
    size: file.size,
    lastModified: file.lastModified,
  }
}
