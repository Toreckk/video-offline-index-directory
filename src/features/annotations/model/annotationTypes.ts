export const MAX_TAG_NAME_LENGTH = 32

export const TAG_COLOR_OPTIONS = [
  { label: 'Violet', value: '#A78BFA' },
  { label: 'Rose', value: '#FB7185' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Lime', value: '#A3E635' },
  { label: 'Emerald', value: '#34D399' },
  { label: 'Teal', value: '#2DD4BF' },
  { label: 'Cyan', value: '#22D3EE' },
  { label: 'Sky', value: '#38BDF8' },
  { label: 'Blue', value: '#60A5FA' },
  { label: 'Indigo', value: '#818CF8' },
  { label: 'Purple', value: '#C084FC' },
  { label: 'Orange', value: '#FB923C' },
] as const

export type TagColor = (typeof TAG_COLOR_OPTIONS)[number]['value']

export type TagDefinition = {
  id: string
  name: string
  color: TagColor
  createdAt: number
  lastUsedAt?: number
}

export type MediaAnnotation = {
  favorite: boolean
  tagIds: string[]
  updatedAt: number
}

export type AnnotationData = {
  tagsById: Record<string, TagDefinition>
  orderedTagIds: string[]
  annotationsByMediaId: Record<string, MediaAnnotation>
  tagImplications?: Record<string, string[]>
}
