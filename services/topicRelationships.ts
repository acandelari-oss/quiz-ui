import { supabase } from "../lib/supabase"

export type TopicRelationshipNode = {
  id: string
  topic: string
  category: string | null
  associated_chunk_count: number
  document_count: number
  section_count: number
  total_associated_text_length: number
}

export type TopicRelationshipEdge = {
  topic_a_id: string
  topic_b_id: string
  topic_a: string | null
  topic_b: string | null
  category_a: string | null
  category_b: string | null
  semantic_similarity: number | null
  shared_chunks: number
  chunks_a: number
  chunks_b: number
  chunk_jaccard: number
  shared_sections: number
  shared_documents: number
}

export type TopicRelationshipGraph = {
  project_id: string
  filters: {
    min_semantic_similarity: number
    min_shared_chunks: number
    top_k_per_topic: number
    focus_topic_id?: string | null
    focus_topic?: string | null
  }
  node_count: number
  edge_count: number
  candidate_pairs_evaluated: number
  isolated_node_count: number
  candidate_edge_count_before_top_k: number
  execution_time_ms: number
  nodes: TopicRelationshipNode[]
  edges: TopicRelationshipEdge[]
}

export type TopicRelationshipRequest = {
  minSemanticSimilarity: number
  minSharedChunks: number
  topKPerTopic: number
  focusTopicId?: string | null
}

export type TopicRelationshipExplanationEvidence = {
  chunk_id: string
  document?: string | null
  page?: number | null
  section?: string | null
  topic?: string | null
  evidence_type?: string | null
  preview: string
}

export type TopicRelationshipExplanation = {
  topic_a: {
    id: string
    topic: string
    category?: string | null
    description?: string | null
  }
  topic_b: {
    id: string
    topic: string
    category?: string | null
    description?: string | null
  }
  why_connected: string
  study_relevance: string
  evidence_summary: string
  evidence: TopicRelationshipExplanationEvidence[]
}

export const TOPIC_RELATIONSHIP_DEFAULT_FILTERS = {
  minSemanticSimilarity: 0.55,
  minSharedChunks: 1,
  topKPerTopic: 5
}

export async function fetchTopicRelationships(
  projectId: string,
  request: TopicRelationshipRequest
): Promise<TopicRelationshipGraph> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error("Missing authentication session")
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL")
  }

  const params = new URLSearchParams({
    min_semantic_similarity: String(request.minSemanticSimilarity),
    min_shared_chunks: String(request.minSharedChunks),
    top_k_per_topic: String(request.topKPerTopic)
  })

  if (request.focusTopicId) {
    params.set("focus_topic_id", request.focusTopicId)
  }

  const response = await fetch(
    `${apiUrl}/projects/${projectId}/topic-relationships?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      body || `Relationship request failed with status ${response.status}`
    )
  }

  return response.json()
}

export async function fetchTopicRelationshipExplanation(
  projectId: string,
  topicAId: string,
  topicBId: string,
  studyLanguage: "English" | "Italian" = "English"
): Promise<TopicRelationshipExplanation> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    throw new Error("Missing authentication session")
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL")
  }

  const response = await fetch(
    `${apiUrl}/projects/${projectId}/topic-relationships/explain`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topic_a_id: topicAId,
        topic_b_id: topicBId,
        study_language: studyLanguage
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      body || `Relationship explanation failed with status ${response.status}`
    )
  }

  return response.json()
}
