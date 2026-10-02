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
