import type { MediaAsset } from '../../explorer/store/mediaStore'
import { openMediaFile } from './mediaFileSource'

const SAMPLE_BYTES = 256 * 1024
const HASH_CONCURRENCY = 2

export type DuplicateScanResult = {
  highConfidenceGroups: MediaAsset[][]
  nameCollisionGroups: MediaAsset[][]
  filesHashed: number
}

export async function detectDuplicateMedia(
  assets: readonly MediaAsset[],
  options: {
    signal?: AbortSignal
    onProgress?: (processed: number, total: number) => void
    fingerprintAsset?: (asset: MediaAsset) => Promise<string>
  } = {},
): Promise<DuplicateScanResult> {
  const sizeGroups = groupBy(assets, (asset) => String(asset.size))
  const candidates = [...sizeGroups.values()].filter((group) => group.length > 1).flat()
  const fingerprints = new Map<string, MediaAsset[]>()
  const fingerprintAsset = options.fingerprintAsset ?? createSampledFingerprint
  let nextIndex = 0
  let processed = 0

  const worker = async () => {
    while (nextIndex < candidates.length) {
      throwIfAborted(options.signal)
      const asset = candidates[nextIndex]
      nextIndex += 1
      if (!asset) continue
      const fingerprint = await fingerprintAsset(asset)
      const key = `${asset.size}:${fingerprint}`
      fingerprints.set(key, [...(fingerprints.get(key) ?? []), asset])
      processed += 1
      options.onProgress?.(processed, candidates.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(HASH_CONCURRENCY, candidates.length) }, worker))
  throwIfAborted(options.signal)

  return {
    highConfidenceGroups: [...fingerprints.values()].filter((group) => group.length > 1),
    nameCollisionGroups: [...groupBy(assets, (asset) => asset.name.trim().toLocaleLowerCase()).values()]
      .filter((group) => group.length > 1),
    filesHashed: candidates.length,
  }
}

export async function createSampledFingerprint(asset: MediaAsset) {
  const file = await openMediaFile(asset.source)
  const sampleLength = Math.min(SAMPLE_BYTES, file.size)
  const offsets = [...new Set([
    0,
    Math.max(0, Math.floor((file.size - sampleLength) / 2)),
    Math.max(0, file.size - sampleLength),
  ])]
  const chunks = await Promise.all(offsets.map((offset) => file.slice(offset, offset + sampleLength).arrayBuffer()))
  const header = new TextEncoder().encode(`${file.size}:${offsets.join(',')}:`)
  const totalLength = header.byteLength + chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const sampledBytes = new Uint8Array(totalLength)
  sampledBytes.set(header)
  let writeOffset = header.byteLength
  for (const chunk of chunks) {
    sampledBytes.set(new Uint8Array(chunk), writeOffset)
    writeOffset += chunk.byteLength
  }
  const digest = await crypto.subtle.digest('SHA-256', sampledBytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function groupBy<Key>(assets: readonly MediaAsset[], selectKey: (asset: MediaAsset) => Key) {
  const groups = new Map<Key, MediaAsset[]>()
  for (const asset of assets) {
    const key = selectKey(asset)
    groups.set(key, [...(groups.get(key) ?? []), asset])
  }
  return groups
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DOMException('Duplicate scan aborted.', 'AbortError')
}
