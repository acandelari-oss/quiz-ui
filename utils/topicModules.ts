export type TopicModuleSection = {
  id: string
  name: string
  accepted: boolean
  ready: boolean
  failed: boolean
  topics: any[]
}

export function groupTopicsByModule(topics: any[], modules: any[], projectName: string, projectStudyMode: string): TopicModuleSection[] {
  const groups = new Map<string, TopicModuleSection>()
  for (const module of modules || []) {
    if (!module.id) continue
    groups.set(String(module.id), {
      id: String(module.id), name: module.name || projectName,
      accepted: Boolean(module.accepted_for_study || module.taxonomy_locked),
      ready: module.taxonomy_status === "ready",
      failed: module.taxonomy_status === "failed", topics: []
    })
  }
  for (const topic of topics || []) {
    const id = String(topic.module_id || "")
    if (!groups.has(id)) groups.set(id, {
      id, name: topic.module_name || projectName,
      accepted: id ? Boolean(topic.accepted_for_study || topic.taxonomy_locked) : projectStudyMode === "learning",
      ready: true, failed: false, topics: []
    })
    groups.get(id)!.topics.push(topic)
  }
  return [...groups.values()]
}


export type DocumentSection = { id: string; name: string; order: number; status: string | null; topics: any[] }
export function groupTopicsByDocument(topics: any[], documents: any[], moduleId: string): DocumentSection[] {
  const groups = new Map<string, DocumentSection>()
  for (const doc of documents || []) {
    if (String(doc.module_id || "") !== moduleId) continue
    groups.set(String(doc.id), { id: String(doc.id), name: doc.title, order: doc.document_order_index ?? Number.MAX_SAFE_INTEGER, status: doc.taxonomy_status, topics: [] })
  }
  for (const topic of topics || []) {
    const id = String(topic.document_id || "")
    if (!groups.has(id)) groups.set(id, { id, name: topic.document_name || "", order: topic.document_order_index ?? Number.MAX_SAFE_INTEGER, status: topic.document_taxonomy_status || null, topics: [] })
    groups.get(id)!.topics.push(topic)
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}
export function documentAggregate(groups: DocumentSection[]) {
  const statuses = groups.map(g => g.status).filter(Boolean)
  if (!statuses.length) return null
  if (statuses.some(s => s === "queued" || s === "building")) return "building"
  return statuses.includes("failed") ? "failed" : "ready"
}
