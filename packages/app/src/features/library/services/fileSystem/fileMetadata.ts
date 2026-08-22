import type { VideoFileMetadata } from './apiTypes'
import { openMediaFile, type MediaFileSource } from '../mediaFileSource'

export async function getFileMetadata(
  source: MediaFileSource,
): Promise<VideoFileMetadata> {
  const file = await openMediaFile(source)
  return {
    size: file.size,
    lastModified: file.lastModified,
  }
}
