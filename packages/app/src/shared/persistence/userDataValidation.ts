export const STORE_VERSIONS: Record<string, number> = {
  'void-library-store': 2,
  'void-settings-store': 0,
  'void-annotations-store': 1,
  'void-collections-store': 2,
  'void-playback-store': 1,
}
export const MAX_BACKUP_BYTES = 16 * 1024 * 1024

export function parseBoundedJson(text: string): unknown {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('The backup exceeds the 16 MiB supported size.')
  const value: unknown = JSON.parse(text)
  validateJsonTree(value)
  return value
}

export function validateJsonTree(value: unknown) {
  const pending = [{ value, depth: 0 }]
  let count = 0
  while (pending.length) {
    const item = pending.pop()!
    if (++count > 500_000 || item.depth > 40) throw new Error('The backup exceeds the supported record count or nesting depth.')
    if (typeof item.value === 'number' && !Number.isFinite(item.value)) throw new Error('The backup contains an invalid number.')
    if (!item.value || typeof item.value !== 'object') continue
    for (const [key, child] of Object.entries(item.value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('The backup contains an unsafe record key.')
      pending.push({ value: child, depth: item.depth + 1 })
    }
  }
}

export function validateUserRecords(records: Record<string, string>) {
  if (Object.values(records).reduce((total, value) => total + new TextEncoder().encode(value).length, 0) > MAX_BACKUP_BYTES) throw new Error('User data exceeds the 16 MiB supported size.')
  for (const [name, value] of Object.entries(records)) {
    if (!Object.hasOwn(STORE_VERSIONS, name) || typeof value !== 'string') throw new Error('Unknown user-data record.')
    const record = parseBoundedJson(value)
    if (!isRecord(record) || !isRecord(record.state) || !Number.isInteger(record.version ?? 0) || Number(record.version ?? 0) > STORE_VERSIONS[name]! || Number(record.version ?? 0) < 0) {
      throw new Error(`Unsupported or damaged ${name} schema. Export recovery data and use a compatible VOID version.`)
    }
    if (['void-annotations-store', 'void-playback-store'].includes(name) && record.version !== STORE_VERSIONS[name]) throw new Error(`No migration is available for this ${name} version. Original data was retained.`)
    const state = record.state
    validateStateShape(name, state, Number(record.version ?? 0))
    for (const key of ['tagsById', 'annotationsByMediaId', 'tagImplications', 'collectionsById', 'recordsByMediaId', 'libraryRegistry']) {
      if (key in state && !isRecord(state[key])) throw new Error(`Damaged ${name}: ${key} must be a record map.`)
    }
    for (const key of ['orderedTagIds', 'favoriteTagIds', 'orderedCollectionIds', 'mediaIds']) {
      if (key in state && (!Array.isArray(state[key]) || !(state[key] as unknown[]).every((id) => typeof id === 'string'))) throw new Error(`Damaged ${name}: invalid ${key}.`)
    }
    for (const key of ['libraryId', 'directoryName', 'rootPath', 'sourceKind']) {
      if (key in state && state[key] !== null && typeof state[key] !== 'string') throw new Error(`Damaged library identity: ${key}.`)
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const fields: Record<string, string[]> = {
  'void-settings-store': ['autoplayHoverPreview', 'previewDelayMs', 'thumbnailPriority', 'showFilenames', 'reduceMotion', 'themedDesktopTitleBar', 'defaultSortOrder', 'restoreLastLibrary', 'scanSubfolders', 'tileDensity', 'defaultVolume', 'defaultPlaybackRate', 'libraryReadyNotificationSeconds', 'playbackOrder', 'repeatMode'],
  'void-library-store': ['libraryId', 'sourceKind', 'rootPath', 'directoryName', 'recentDirectories', 'libraryRegistry', 'permissionStatus', 'scanStatus', 'scanPhase', 'scanProgress', 'scanError', 'mediaIds', 'isBackgroundScanning'],
  'void-annotations-store': ['tagsById', 'orderedTagIds', 'annotationsByMediaId', 'tagImplications', 'favoriteTagIds'],
  'void-collections-store': ['collectionsById', 'orderedCollectionIds'],
  'void-playback-store': ['recordsByMediaId'],
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
function requireShape(valid: boolean, field: string): asserts valid { if (!valid) throw new Error(`Damaged user data: invalid ${field}. Original data was retained.`) }
function validateStateShape(name: string, state: Record<string, unknown>, version: number) {
  requireShape(Object.keys(state).every((key) => fields[name]?.includes(key)), `${name} field`)
  if (name === 'void-settings-store') {
    const enums: Record<string, unknown[]> = { previewDelayMs: [150, 250, 500], thumbnailPriority: ['visible-first', 'balanced', 'paused'], defaultSortOrder: ['modified-date', 'name', 'size', 'play-count'], tileDensity: ['compact', 'comfortable', 'large'], playbackOrder: ['displayed', 'shuffle', 'smart-shuffle'], repeatMode: ['off', 'all', 'one'] }
    for (const [key, value] of Object.entries(state)) {
      if (enums[key]) requireShape(enums[key].includes(value), key)
      else if (key === 'defaultVolume') requireShape(number(value) && Number(value) <= 1, key)
      else if (key === 'defaultPlaybackRate') requireShape(number(value) && Number(value) >= 0.25 && Number(value) <= 4, key)
      else if (key === 'libraryReadyNotificationSeconds') requireShape(number(value), key)
      else requireShape(typeof value === 'boolean', key)
    }
  }
  for (const key of ['tagsById', 'annotationsByMediaId', 'recordsByMediaId', 'collectionsById', 'libraryRegistry', 'tagImplications']) {
    if (!(key in state)) continue
    requireShape(isRecord(state[key]), key)
    for (const [id, entry] of Object.entries(state[key])) {
      if (key === 'tagImplications') { requireShape(strings(entry), key); continue }
      requireShape(isRecord(entry), key)
      if (key === 'tagsById') requireShape(entry.id === id && typeof entry.name === 'string' && typeof entry.color === 'string' && /^#[0-9a-f]{6}$/i.test(entry.color) && number(entry.createdAt) && (entry.lastUsedAt === undefined || number(entry.lastUsedAt)), key)
      if (key === 'annotationsByMediaId') requireShape(typeof entry.favorite === 'boolean' && strings(entry.tagIds) && number(entry.updatedAt), key)
      if (key === 'recordsByMediaId') requireShape(typeof entry.watched === 'boolean' && ['positionSeconds', 'durationSeconds', 'lastPlayedAt', 'playCount'].every((field) => number(entry[field])) && Number.isInteger(entry.playCount) && (entry.completedAt === undefined || number(entry.completedAt)), key)
      if (key === 'libraryRegistry') requireShape(typeof entry.name === 'string' && (entry.rootPath === undefined || typeof entry.rootPath === 'string'), key)
      if (key === 'collectionsById') {
        requireShape(entry.id === id && typeof entry.name === 'string' && number(entry.createdAt) && number(entry.updatedAt) && isRecord(entry.rules), key)
        if (version === 2 || 'root' in entry.rules) { requireShape(isRecord(entry.rules.root) && entry.rules.root.kind === 'group', 'collection root'); validateRule(entry.rules.root) }
        else {
          for (const field of ['allTagIds', 'anyTagIds', 'notTagIds']) requireShape(entry.rules[field] === undefined || strings(entry.rules[field]), field)
          requireShape(entry.rules.watched === undefined || ['any', 'watched', 'unwatched'].includes(String(entry.rules.watched)), 'watched rule')
        }
      }
    }
  }
  if ('recentDirectories' in state) {
    requireShape(Array.isArray(state.recentDirectories), 'recent directories')
    for (const entry of state.recentDirectories) requireShape(isRecord(entry) && typeof entry.name === 'string' && (entry.libraryId === undefined || typeof entry.libraryId === 'string') && (entry.rootPath === undefined || typeof entry.rootPath === 'string') && (entry.timestamp === undefined || number(entry.timestamp)), 'recent directory')
  }
  if (state.sourceKind !== undefined && state.sourceKind !== null) requireShape(['native-directory', 'persistent-handle', 'session-files'].includes(String(state.sourceKind)), 'library source kind')
}
function validateRule(rule: unknown): void {
  requireShape(isRecord(rule) && typeof rule.id === 'string', 'collection rule')
  if (rule.kind === 'group') {
    requireShape(['and', 'or'].includes(String(rule.operator)) && typeof rule.negated === 'boolean' && Array.isArray(rule.children), 'rule group')
    rule.children.forEach(validateRule)
  } else if (rule.kind === 'tag') requireShape(typeof rule.tagId === 'string' && typeof rule.negated === 'boolean', 'tag rule')
  else if (rule.kind === 'watched') requireShape(['watched', 'unwatched'].includes(String(rule.value)), 'watched rule')
  else {
    requireShape(rule.kind === 'duration' && isRecord(rule.range) && ['known', 'unknown'].includes(String(rule.range.mode)), 'duration rule')
    for (const field of ['minimumSeconds', 'maximumSeconds']) requireShape(rule.range[field] === undefined || number(rule.range[field]), 'duration boundary')
  }
}
