import type { TopicRelationshipEdge } from "../services/topicRelationships"

export type RelationshipClassification =
  | "core"
  | "conceptual"
  | "contextual"
  | "borderline_core"
  | "borderline_conceptual"
  | "borderline_contextual"
  | "unclassified"

export type RelationshipClassificationThresholds = {
  coreMinSemantic: number
  coreMinJaccard: number
  conceptualMinSemantic: number
  contextualMinSemantic: number
  contextualMaxSemantic: number
  contextualMinJaccard: number
  toleranceBuffer: number
}

export const DEFAULT_RELATIONSHIP_CLASSIFICATION_THRESHOLDS: RelationshipClassificationThresholds = {
  coreMinSemantic: 0.65,
  coreMinJaccard: 0.15,
  conceptualMinSemantic: 0.72,
  contextualMinSemantic: 0.45,
  contextualMaxSemantic: 0.65,
  contextualMinJaccard: 0.15,
  toleranceBuffer: 0.03
}

export function classifyRelationship(
  edge: Pick<TopicRelationshipEdge, "semantic_similarity" | "chunk_jaccard">,
  thresholds: RelationshipClassificationThresholds
): RelationshipClassification {
  const semantic = edge.semantic_similarity ?? Number.NEGATIVE_INFINITY
  const jaccard = edge.chunk_jaccard ?? 0
  const tolerance = Math.max(0, thresholds.toleranceBuffer)

  if (
    semantic >= thresholds.coreMinSemantic
    && jaccard >= thresholds.coreMinJaccard
  ) {
    return "core"
  }

  if (
    semantic >= thresholds.conceptualMinSemantic
    && jaccard < thresholds.coreMinJaccard
  ) {
    return "conceptual"
  }

  if (
    semantic >= thresholds.contextualMinSemantic
    && semantic < thresholds.contextualMaxSemantic
    && jaccard >= thresholds.contextualMinJaccard
  ) {
    return "contextual"
  }

  const missesCoreSemanticOnly =
    semantic >= thresholds.coreMinSemantic - tolerance
    && semantic < thresholds.coreMinSemantic
    && jaccard >= thresholds.coreMinJaccard
  const missesCoreJaccardOnly =
    semantic >= thresholds.coreMinSemantic
    && jaccard >= thresholds.coreMinJaccard - tolerance
    && jaccard < thresholds.coreMinJaccard

  if (missesCoreSemanticOnly || missesCoreJaccardOnly) {
    return "borderline_core"
  }

  if (
    semantic >= thresholds.conceptualMinSemantic - tolerance
    && semantic < thresholds.conceptualMinSemantic
    && jaccard < thresholds.coreMinJaccard
  ) {
    return "borderline_conceptual"
  }

  const withinContextualSemanticTolerance =
    semantic >= thresholds.contextualMinSemantic
    && semantic < thresholds.contextualMaxSemantic
  const withinContextualJaccardTolerance =
    jaccard >= thresholds.contextualMinJaccard - tolerance
    && jaccard < thresholds.contextualMinJaccard

  if (withinContextualSemanticTolerance && withinContextualJaccardTolerance) {
    return "borderline_contextual"
  }

  return "unclassified"
}

export function relationshipClassificationLabel(
  classification: RelationshipClassification
) {
  switch (classification) {
    case "core":
      return "CORE"
    case "conceptual":
      return "CONCEPTUAL"
    case "contextual":
      return "CONTEXTUAL"
    case "borderline_core":
      return "BORDERLINE CORE"
    case "borderline_conceptual":
      return "BORDERLINE CONCEPTUAL"
    case "borderline_contextual":
      return "BORDERLINE CONTEXTUAL"
    case "unclassified":
    default:
      return "UNCLASSIFIED"
  }
}
