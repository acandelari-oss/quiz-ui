export type PlannerUiState =
  | "NEW_PROJECT"
  | "READY_FOR_FIRST_PLAN"
  | "ACTIVE_WEEK"
  | "WEEK_COMPLETED"

export type PlannerDayStatus =
  | "completed"
  | "today"
  | "remaining"

export type PlannerDay = {
  day: string
  date: string
  sessionIndex: number
  status: PlannerDayStatus
  title: string
  categories: string[]
  durationMinutes: number
}

export type PlannerDebrief = {
  day: string
  professorDebrief: string
  sessionData: {
    flashcards: number
    quiz: number
    accuracy: string
    time: string
    focus: string
  }
}

export type PlannerHomework = {
  day: string
  suggestion: string
}

export type PlannerStatistic = {
  label: string
  value: string
  detail: string
}

export type PlannerActivity = {
  id: string
  type: "flashcards" | "quiz" | string
  title: string
  configuration: {
    category: string
    count: number
    selectedTopics: Array<{
      id?: string | number
      topic?: string
      title?: string
      category?: string
      order?: number | null
    }>
    numCards?: number
    numQuestions?: number
    difficulty?: string
    style?: string
    questionStyle?: string
  }
  mockInstructions: string
}

export type PlannerDailyPlan = {
  day: string
  date: string
  sessionIndex: number
  studyPlanModuleCount?: number
  planType?: string
  objective: string
  briefing: string
  activities: PlannerActivity[]
  summary: {
    sessionData: {
      flashcards: number
      quiz: number
      accuracy: string
      time: string
      focus: string
    }
    professorDebrief?: string
    homeworkRecommendations: string[]
    activeRecall?: {
      title: string
      message: string
    }
    officeHours?: {
      title: string
      message: string
    }
  }
}

export type PlannerSessionResults = {
  flashcardsReviewed: number
  quizzesCompleted: number
  quizQuestions: number
  quizCorrect: number
  activityResults?: Array<Record<string, unknown>>
  startedAtMs?: number | null
  completedAtMs?: number | null
}

export type PlannerCompletedSessionResults = Record<number, PlannerSessionResults>

export type PlannerActivityDebriefs = Record<string, string>

export type PlannerModuleDebriefs = Record<number, string>

export type PlannerModuleHomework = Record<number, string>

export type PlannerProfessorConversationMessage = {
  role: "student" | "professor"
  content: string
}

export type PlannerMockData = {
  state: PlannerUiState
  planType?: string
  weekLabel: string
  todaySessionCompleted: boolean
  onboarding: {
    title: string
    message: string
  }
  preferences: {
    briefing: string
    studyDuration: string
    visibleModules: string
    preferredExamStyle: string
  }
  calendar: PlannerDay[]
  weeklyBriefing: {
    studyLanguage?: string | null
    selectedCategoriesReason: string
    objective: string
    lowerPriorityCategories: string
  }
  statistics: PlannerStatistic[]
  debriefs: PlannerDebrief[]
  homework: PlannerHomework[]
  dailyPlans: PlannerDailyPlan[]
  todayPlan: PlannerDailyPlan
  weeklyReview: {
    title: string
    message: string
  }
}
