export type TopicScopeItem = {
  id?: string | number
  topic?: string
  title?: string
  category?: string
  description?: string
  source_section?: string
  macrocategory?: string
  module_id?: string | null
  module_name?: string | null
  module_order_index?: number | null
  organization_mode?: string | null
  category_order_index?: number | null
  topic_order_index?: number | null
}

export function getTopicDisplayName(
  topic: string | TopicScopeItem | null | undefined
) {
  if (typeof topic === "string") return topic
  return topic?.topic || topic?.title || ""
}

export function getTopicModuleLabel(
  topic: string | TopicScopeItem | null | undefined
) {
  if (!topic || typeof topic === "string") return ""
  return topic.module_name || ""
}

export function getTopicScopeKey(
  topic: string | TopicScopeItem
) {
  if (typeof topic === "string") return `name:${topic}`
  if (topic?.id) return `id:${topic.id}`
  const moduleKey = topic?.module_id || "legacy"
  return `module:${moduleKey}:name:${topic?.topic || topic?.title || ""}`
}

export function resolveCategoryTopicObjects(
  category: string,
  topics: TopicScopeItem[] = [],
  moduleId?: string | null
) {
  const resolved = topics.filter(
    topic => (
      (topic.category || "General") === category
      && (
        moduleId === undefined
        || (topic.module_id || null) === moduleId
      )
    )
  )

  const unique = new Map<string, TopicScopeItem>()

  for (const topic of resolved) {
    unique.set(getTopicScopeKey(topic), topic)
  }

  return Array.from(unique.values())
}

export function extractTopicIds(
  topics: Array<string | TopicScopeItem> = []
) {
  return topics
    .map(topic =>
      typeof topic === "object" && topic?.id
        ? String(topic.id)
        : null
    )
    .filter((id): id is string => Boolean(id))
}

export function extractTopicNames(
  topics: Array<string | TopicScopeItem> = []
) {
  return topics
    .map(topic =>
      getTopicDisplayName(topic) || null
    )
    .filter((name): name is string => Boolean(name))
}

export function logCategoryScope(
  category: string,
  topics: TopicScopeItem[]
) {
  console.log("CATEGORY SELECTED:", category)
  console.log("RESOLVED TOPIC COUNT:", topics.length)
  console.log(
    "RESOLVED TOPIC IDS COUNT:",
    extractTopicIds(topics).length
  )
}

export function normalizeTopic(topic:any){

  if(typeof topic === "string"){
    return topic.trim().toLowerCase()
  }

  if(topic?.topic){
    return topic.topic.trim().toLowerCase()
  }

  return "general"
}
