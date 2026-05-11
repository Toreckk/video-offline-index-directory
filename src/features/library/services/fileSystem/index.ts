// Browser-native file system adapter for library selection and scanning.
// UI should call this module instead of using File System Access APIs directly.
// This service returns handles and lightweight metadata only; object URLs belong
// in preview/player layers.
export * from './apiTypes'
export * from './errors'
export * from './permissions'
export * from './picker'
export * from './videoExtensions'
export * from './walkDirectory'
