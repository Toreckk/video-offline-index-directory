import type { MediaAnnotation } from '../../annotations/model/annotationTypes'
import type { PlaybackRecord } from '../../playback/model/playbackTypes'
import type { CollectionRuleNode, SmartCollectionRules } from '../model/collectionTypes'

type CollectionMatchContext = {
  tagIds: Set<string>
  watched: boolean
}

export function matchesCollectionRules(
  annotation: MediaAnnotation | undefined,
  playback: PlaybackRecord | undefined,
  rules: SmartCollectionRules,
) {
  return matchesNode(
    {
      tagIds: new Set(annotation?.tagIds ?? []),
      watched: playback?.watched === true,
    },
    rules.root,
  )
}

function matchesNode(context: CollectionMatchContext, node: CollectionRuleNode): boolean {
  if (node.kind === 'tag') {
    const hasTag = context.tagIds.has(node.tagId)
    return node.negated ? !hasTag : hasTag
  }

  if (node.kind === 'watched') {
    return node.value === 'watched' ? context.watched : !context.watched
  }

  if (node.children.length === 0) return !node.negated
  const matches = node.operator === 'and'
    ? node.children.every((child) => matchesNode(context, child))
    : node.children.some((child) => matchesNode(context, child))
  return node.negated ? !matches : matches
}
