export type TopicScopeItem = {
  id?: string | number
  topic?: string
  title?: string
  category?: string
}

export function getTopicScopeKey(
  topic: string | TopicScopeItem
) {
  if (typeof topic === "string") return `name:${topic}`
  if (topic?.id) return `id:${topic.id}`
  return `name:${topic?.topic || topic?.title || ""}`
}

export function resolveCategoryTopicObjects(
  category: string,
  topics: TopicScopeItem[] = []
) {
  const resolved = topics.filter(
    topic => (topic.category || "General") === category
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
      typeof topic === "string"
        ? topic
        : topic.topic || topic.title || null
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
