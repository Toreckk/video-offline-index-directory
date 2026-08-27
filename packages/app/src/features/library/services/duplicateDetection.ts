import { getVoidPlatform } from '@void/core'
import type { MediaAsset } from '../../media/store/mediaStore'
import { openMediaFile } from '../../media/services/mediaFileSource'

const SAMPLE_BYTES = 256 * 1024
const HASH_CONCURRENCY = 2
const NATURAL_NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export type DuplicateClassification = 'exact' | 'probable'

export type DuplicateGroupResult = {
  assets: MediaAsset[]
  classification: DuplicateClassification
  evidence: string[]
  completeHash?: string
}

export type DuplicateScanResult = {
  exactGroups: DuplicateGroupResult[]
  probableGroups: DuplicateGroupResult[]
  filesHashed: number
  fingerprintKind: 'sampled' | 'complete'
}

export async function detectDuplicateMedia(
  assets: readonly MediaAsset[],
  options: {
    signal?: AbortSignal
    onProgress?: (processed: number, total: number) => void
    fingerprintAsset?: (asset: MediaAsset) => Promise<string>
    fingerprintKind?: 'sampled' | 'complete'
  } = {},
): Promise<DuplicateScanResult> {
  const sizeGroups = groupBy(assets, (asset) => String(asset.size))
  const candidates = [...sizeGroups.values()].filter((group) => group.length > 1).flat()
  const fingerprints = new Map<string, { fingerprint: string; assets: MediaAsset[] }>()
  const canUseCompleteHashes =
    options.fingerprintKind === 'complete' || (
      options.fingerprintAsset === undefined &&
      candidates.length > 0 &&
      candidates.every((asset) => asset.source.kind === 'desktop-path') &&
      Boolean(getVoidPlatform().hashFile)
    )
  const fingerprintKind = canUseCompleteHashes ? 'complete' : 'sampled'
  const fingerprintAsset = options.fingerprintAsset ?? createPlatformFingerprint
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
      const existing = fingerprints.get(key)
      fingerprints.set(key, {
        fingerprint,
        assets: [...(existing?.assets ?? []), asset],
      })
      processed += 1
      options.onProgress?.(processed, candidates.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(HASH_CONCURRENCY, candidates.length) }, worker))
  throwIfAborted(options.signal)

  const contentGroups = [...fingerprints.values()]
    .filter((group) => group.assets.length > 1)
    .map<DuplicateGroupResult>((group) => ({
      assets: sortDuplicateGroup(group.assets),
      classification: fingerprintKind === 'complete' ? 'exact' : 'probable',
      evidence: [
        fingerprintKind === 'complete'
          ? 'Complete SHA-256 matches byte for byte'
          : 'Beginning, middle, and end samples match',
        ...describeSharedEvidence(group.assets),
      ],
      ...(fingerprintKind === 'complete' ? { completeHash: group.fingerprint } : {}),
    }))

  const exactGroups = sortDuplicateGroups(
    contentGroups.filter((group) => group.classification === 'exact'),
  )
  const exactKeys = new Set(exactGroups.map((group) => groupKey(group.assets)))
  const probableByKey = new Map<string, DuplicateGroupResult>()
  for (const group of contentGroups.filter((item) => item.classification === 'probable')) {
    probableByKey.set(groupKey(group.assets), group)
  }
  for (const family of groupFilenameFamilies(assets)) {
    const key = groupKey(family)
    if (exactKeys.has(key) || probableByKey.has(key)) continue
    probableByKey.set(key, {
      assets: sortDuplicateGroup(family),
      classification: 'probable',
      evidence: ['Normalized filename family matches', ...describeSharedEvidence(family)],
    })
  }

  return {
    exactGroups,
    probableGroups: sortDuplicateGroups([...probableByKey.values()]),
    filesHashed: candidates.length,
    fingerprintKind,
  }
}

async function createPlatformFingerprint(asset: MediaAsset) {
  const platform = getVoidPlatform()
  if (asset.source.kind === 'desktop-path' && platform.hashFile) {
    return platform.hashFile(asset.source.absolutePath)
  }
  return createSampledFingerprint(asset)
}

export function compareDuplicateAssets(left: MediaAsset, right: MediaAsset) {
  const leftName = getDuplicateNameParts(left.name)
  const rightName = getDuplicateNameParts(right.name)
  return (
    NATURAL_NAME_COLLATOR.compare(leftName.baseName, rightName.baseName) ||
    leftName.copyNumber - rightName.copyNumber ||
    NATURAL_NAME_COLLATOR.compare(left.name, right.name) ||
    NATURAL_NAME_COLLATOR.compare(
      [...left.pathParts, left.name].join('/'),
      [...right.pathParts, right.name].join('/'),
    ) ||
    left.id.localeCompare(right.id)
  )
}

function sortDuplicateGroups(groups: DuplicateGroupResult[]) {
  return [...groups].sort((left, right) => compareDuplicateGroups(left.assets, right.assets))
}

function sortDuplicateGroup(group: readonly MediaAsset[]) {
  return [...group].sort(compareDuplicateAssets)
}

function compareDuplicateGroups(left: MediaAsset[], right: MediaAsset[]) {
  const leftFirst = left[0]
  const rightFirst = right[0]
  if (!leftFirst) return rightFirst ? 1 : 0
  if (!rightFirst) return -1
  return compareDuplicateAssets(leftFirst, rightFirst)
}

function getDuplicateNameParts(name: string) {
  const extensionStart = name.lastIndexOf('.')
  const extension = extensionStart > 0 ? name.slice(extensionStart) : ''
  const stem = extensionStart > 0 ? name.slice(0, extensionStart) : name
  const copySuffix = stem.match(/^(.*) \((\d+)\)$/)
  return {
    baseName: `${copySuffix?.[1] ?? stem}${extension}`,
    copyNumber: copySuffix ? Number(copySuffix[2]) : 0,
  }
}

function groupFilenameFamilies(assets: readonly MediaAsset[]) {
  return [...groupBy(
    assets,
    (asset) => getDuplicateNameParts(asset.name).baseName.trim().toLocaleLowerCase(),
  ).values()].filter((group) => group.length > 1)
}

function describeSharedEvidence(assets: readonly MediaAsset[]) {
  const evidence: string[] = []
  if (allEqual(assets.map((asset) => asset.size))) evidence.push('File size matches exactly')

  const durations = assets.map((asset) => asset.duration)
  if (durations.every(isFiniteNumber)) {
    const knownDurations = durations as number[]
    if (Math.max(...knownDurations) - Math.min(...knownDurations) <= 1) {
      evidence.push('Duration matches within 1 second')
    }
  }

  const dimensions = assets.map((asset) =>
    asset.width && asset.height ? `${asset.width} × ${asset.height}` : undefined,
  )
  if (dimensions.every((value): value is string => Boolean(value)) && allEqual(dimensions)) {
    evidence.push(`Dimensions match: ${dimensions[0]}`)
  }

  const videoCodecs = assets.map((asset) => asset.videoCodec)
  if (videoCodecs.every((value): value is string => Boolean(value)) && allEqual(videoCodecs)) {
    evidence.push(`Video codec matches: ${videoCodecs[0]}`)
  }
  const audioCodecs = assets.map((asset) => asset.audioCodec)
  if (audioCodecs.every((value): value is string => Boolean(value)) && allEqual(audioCodecs)) {
    evidence.push(`Audio codec matches: ${audioCodecs[0]}`)
  }
  return evidence
}

function allEqual<Value>(values: readonly Value[]) {
  return values.length > 0 && values.every((value) => value === values[0])
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
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

function groupKey(assets: readonly MediaAsset[]) {
  return assets.map((asset) => asset.id).sort().join('|')
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DOMException('Duplicate scan aborted.', 'AbortError')
}
