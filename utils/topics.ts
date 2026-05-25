export function extractTopicIds(topics:any[] = []) {
  return topics.map((t:any) => t.id)
}

export function extractTopicNames(topics:any[] = []) {
  return topics.map((t:any) =>
    typeof t === "string"
      ? t
      : t.topic
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