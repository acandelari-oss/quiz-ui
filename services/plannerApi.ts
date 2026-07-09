export type PlannerSelectedTopicResponse = {
  id: string
  title: string
  order?: number | null
}

export type PlannerAllocationResponse = {
  category: string
  selected_topics: PlannerSelectedTopicResponse[]
  estimated_duration_minutes: number
}

export type PlannerActivityResponse = {
  id: string
  type: "FLASHCARDS" | "QUIZ"
  configuration: {
    category?: string | null
    selected_topics?: PlannerSelectedTopicResponse[]
    estimated_duration_minutes?: number | null
    difficulty?: string | null
    question_style?: string | null
    num_questions?: number | null
    num_cards?: number | null
  }
  execution: {
    status: string
    started_at?: string | null
    completed_at?: string | null
    actual_duration?: number | null
  }
  result?: unknown | null
}

export type PlannerDailyPlanResponse = {
  id: string
  date: string
  day_name: string
  status: string
  objective: string
  briefing: string
  planned_allocations: PlannerAllocationResponse[]
  activities: PlannerActivityResponse[]
  summary?: {
    session_data?: Record<string, unknown>
    professor_debrief?: string
    homework_recommendations?: Array<{
      text: string
      rationale?: string
      related_categories?: string[]
      estimated_effort?: number | null
    }>
    active_recall_offer?: {
      conversation_id: string
      context: string
    } | null
    office_hours_offer?: {
      conversation_id: string
      context: string
    } | null
  } | null
}

export type PlannerWeekResponse = {
  id: string
  start_date: string
  end_date: string
  study_language?: string | null
  status: string
  weekly_briefing: string
  weekly_statistics: {
    sessions_completed?: number
    quiz_accuracy?: number | null
    flashcard_completion?: number | null
    study_time?: number | null
    metadata?: Record<string, unknown>
  }
  daily_plans: PlannerDailyPlanResponse[]
  weekly_review?: string | null
  next_week_options?: unknown | null
}

export type PlannerStateResponse = {
  state: "NEW_PROJECT" | "READY_FOR_FIRST_PLAN" | "ACTIVE_WEEK" | "WEEK_COMPLETED"
  learning_coverage: {
    covered_topics: number
    total_topics: number
    ratio: number
  }
  week?: PlannerWeekResponse | null
}

export type PlannerGenerationConfiguration = {
  survey: Record<string, "confident" | "practice" | "unsure"> | null
  study_language?: "English" | "Italian"
  preferences: {
    studyDurationMinutes: 30 | 45 | 60
    questionPaceSeconds: 30 | 60 | 90 | 120
    questionStyle: "exam" | "balanced" | "reasoning"
  }
}

export async function fetchPlannerWeek(projectId: string): Promise<PlannerStateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL")
  }

  if (!projectId) {
    throw new Error("Create or load a project before using Study Planner.")
  }

  const response = await fetch(`${apiUrl}/projects/${projectId}/planner/week`)

  if (!response.ok) {
    throw new Error(`Planner week request failed: ${response.status}`)
  }

  return response.json()
}

export async function generatePlannerWeek(
  projectId: string,
  configuration: PlannerGenerationConfiguration
): Promise<PlannerStateResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL")
  }

  if (!projectId) {
    throw new Error("Create or load a project before using Study Planner.")
  }

  const response = await fetch(`${apiUrl}/projects/${projectId}/planner/week/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(configuration)
  })

  if (!response.ok) {
    throw new Error(`Planner week generation failed: ${response.status}`)
  }

  return response.json()
}
