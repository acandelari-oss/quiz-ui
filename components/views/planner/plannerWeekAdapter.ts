import type {
  PlannerStateResponse,
  PlannerWeekResponse
} from "../../../services/plannerApi"
import type {
  PlannerActivity,
  PlannerDailyPlan,
  PlannerDay,
  PlannerMockData,
  PlannerUiState
} from "./PlannerTypes"

export function adaptPlannerStateToUi(response: PlannerStateResponse): PlannerMockData {
  if (response.state === "ACTIVE_WEEK" && response.week) {
    return adaptPlannerWeekToUi(response.week)
  }

  return buildStateOnlyPlannerData(response.state, response.learning_coverage)
}

export function adaptPlannerWeekToUi(week: PlannerWeekResponse): PlannerMockData {
  const planType = week.plan_type || "study_plan"
  const completedSessionIndexes = completedSessionIndexesFromWeek(week)
  const runtimeStatistics = runtimeStatisticsFromWeek(week)
  const calendar = buildCalendar(week, completedSessionIndexes)
  const dailyPlans = week.daily_plans.map((plan, index) =>
    buildDailyPlan(plan, index, planType, week.id)
  )
  const recommendedPlanIndex = recommendedModuleIndex(
    week.daily_plans.length,
    completedSessionIndexes
  )
  const completedPlanEntries = week.daily_plans
    .map((plan, index) => ({ plan, index }))
    .filter(entry => completedSessionIndexes.has(entry.index))

  return {
    weekId: week.id,
    state: "ACTIVE_WEEK",
    planType,
    weekLabel: formatWeekLabel(week.start_date, week.end_date),
    todaySessionCompleted: false,
    onboarding: {
      title: "Welcome to your Professor Planner",
      message:
        "Before preparing your first Study Plan, the Professor needs either a short survey or one observation period to understand your study rhythm."
    },
    preferences: {
      briefing:
        "You have enough learning history to generate a study plan. Choose the module settings and the Professor will prepare a focused sequence.",
      studyDuration: inferStudyDuration(week),
      visibleModules: `Up to ${inferMaxVisibleModules(week)} modules`,
      preferredExamStyle: inferPreferredExamStyle(week)
    },
    calendar,
    weeklyBriefing: {
      studyLanguage: week.study_language || null,
      selectedCategoriesReason: generatedProfessorText(week.weekly_briefing) || "",
      objective: inferWeeklyObjective(week),
      lowerPriorityCategories: inferAdditionalModulesMessage(week)
    },
    statistics: runtimeStatistics
      ? buildRuntimeStatistics(runtimeStatistics, planType)
      : [
      {
        label: "Quizzes completed",
        value: String(week.weekly_statistics?.sessions_completed ?? 0),
        detail: planType === "assessment"
          ? "No completed Assessment quiz yet"
          : "No completed Study Plan quiz yet"
      },
      {
        label: "Flashcards reviewed",
        value: formatOptionalPercent(week.weekly_statistics?.flashcard_completion),
        detail: planType === "assessment"
          ? "No completed Assessment flashcards yet"
          : "No completed Study Plan flashcards yet"
      },
      {
        label: planType === "assessment"
          ? "Assessment accuracy"
          : "Study Plan accuracy",
        value: formatOptionalPercent(week.weekly_statistics?.quiz_accuracy),
        detail: planType === "assessment"
          ? "No Assessment quiz result yet"
          : "No Study Plan quiz result yet"
      },
      {
        label: "Study time",
        value: formatStudyTime(week.weekly_statistics?.study_time),
        detail: planType === "assessment"
          ? "No completed Assessment module yet"
          : "No completed Study Plan module yet"
      }
    ],
    debriefs: completedPlanEntries
      .filter(entry => Boolean(generatedProfessorText(entry.plan.summary?.professor_debrief)))
      .map(entry => buildDebrief(entry.plan, entry.index)),
    homework: completedPlanEntries
      .flatMap(entry =>
        (entry.plan.summary?.homework_recommendations || [])
          .filter(recommendation => Boolean(generatedProfessorText(recommendation.text)))
          .map(recommendation => ({
            day: plannerModuleLabel(entry.index),
            suggestion: generatedProfessorText(recommendation.text) || ""
          }))
      ),
    dailyPlans,
    todayPlan: dailyPlans[recommendedPlanIndex] || dailyPlans[0] || emptyDailyPlan(),
    weeklyReview: {
      title: "Study Plan Review",
      message: generatedProfessorText(week.weekly_review) || ""
    }
  }
}

function buildStateOnlyPlannerData(
  state: PlannerUiState,
  learningCoverage: PlannerStateResponse["learning_coverage"]
): PlannerMockData {
  return {
    weekId: null,
    state,
    planType: "study_plan",
    weekLabel: "Study Planner",
    todaySessionCompleted: false,
    onboarding: {
      title: "Welcome to your Professor Planner",
      message:
        "Create or continue learning activity so the Professor can understand your study coverage before planning."
    },
    preferences: {
      briefing:
        "You have enough learning history to prepare a first Study Plan. Choose the planning settings to continue.",
      studyDuration: "Not configured yet",
      visibleModules: "Professor-selected",
      preferredExamStyle: "Not configured yet"
    },
    calendar: [],
    weeklyBriefing: {
      studyLanguage: null,
      selectedCategoriesReason: "No active study plan is available yet.",
      objective:
        `Learning coverage: ${learningCoverage.covered_topics}/${learningCoverage.total_topics} topics.`,
      lowerPriorityCategories:
        "The Professor will explain what comes next when a Study Plan is available."
    },
    statistics: [
      {
        label: "Learning coverage",
        value: formatOptionalPercent(learningCoverage.ratio),
        detail: `${learningCoverage.covered_topics}/${learningCoverage.total_topics} topics covered`
      }
    ],
    debriefs: [],
    homework: [],
    dailyPlans: [],
    todayPlan: emptyDailyPlan(),
    weeklyReview: {
      title: "Study Plan Review",
      message: ""
    }
  }
}

function emptyDailyPlan(): PlannerDailyPlan {
  return {
    day: "Module",
    date: "—",
    sessionIndex: 0,
    planType: "study_plan",
    objective: "",
    briefing: "",
    activities: [],
    summary: {
      sessionData: {
        flashcards: 0,
        quiz: 0,
        accuracy: "—",
        time: "—",
        focus: "—"
      },
      professorDebrief: "",
      homeworkRecommendations: [],
      activeRecall: undefined,
      officeHours: undefined
    }
  }
}

function buildCalendar(
  week: PlannerWeekResponse,
  completedSessionIndexes: Set<number>
): PlannerDay[] {
  const activeIndex = recommendedModuleIndex(
    week.daily_plans.length,
    completedSessionIndexes
  )

  return week.daily_plans.map((plan, index) => ({
    day: plannerModuleLabel(index),
    date: formatPlannerDate(plan.date),
    sessionIndex: index,
    status:
      completedSessionIndexes.has(index)
        ? "completed"
        : index === activeIndex
          ? "today"
          : "remaining",
    title: buildSessionTitle(plan),
    categories: unique(plan.planned_allocations.map(allocation => allocation.category)),
    durationMinutes: Math.round(
      plan.planned_allocations.reduce(
        (total, allocation) => total + allocation.estimated_duration_minutes,
        0
      )
    )
  }))
}

function completedSessionIndexesFromWeek(week: PlannerWeekResponse) {
  return new Set(
    week.daily_plans
      .map((plan, index) => ({ plan, index }))
      .filter(({ plan }) => isCompletedPlan(plan))
      .map(({ index }) => index)
  )
}

function isCompletedPlan(plan: PlannerWeekResponse["daily_plans"][number]) {
  if (String(plan.status || "").toUpperCase() === "COMPLETED") {
    return true
  }

  return (
    plan.activities.length > 0
    && plan.activities.every(activity =>
      String(activity.execution?.status || "").toUpperCase() === "COMPLETED"
    )
  )
}

function recommendedModuleIndex(
  moduleCount: number,
  completedSessionIndexes: Set<number>
) {
  if (moduleCount <= 0) {
    return 0
  }

  const nextIndex = Array.from({ length: moduleCount }, (_, index) => index)
    .find(index => !completedSessionIndexes.has(index))

  return nextIndex ?? moduleCount - 1
}

function buildDailyPlan(
  plan: PlannerWeekResponse["daily_plans"][number],
  index: number,
  planType = "study_plan",
  plannerWeekId?: string | null
): PlannerDailyPlan {
  return {
    plannerWeekId,
    day: plannerModuleLabel(index),
    date: formatPlannerDate(plan.date),
    sessionIndex: index,
    planType,
    objective: generatedProfessorText(plan.objective) || "",
    briefing: generatedProfessorText(plan.briefing) || "",
    activities: plan.activities.map(buildActivity),
    summary: {
      sessionData: buildSessionData(plan),
      professorDebrief: generatedProfessorText(plan.summary?.professor_debrief) || "",
      homeworkRecommendations:
        plan.summary?.homework_recommendations
          ?.map(item => item.text)
          .map(generatedProfessorText)
          .filter(hasText)
        || [],
      activeRecall: generatedProfessorText(plan.summary?.active_recall_offer?.context)
        ? {
            title: "Optional Active Recall",
            message: generatedProfessorText(plan.summary?.active_recall_offer?.context) || ""
          }
        : undefined,
      officeHours: generatedProfessorText(plan.summary?.office_hours_offer?.context)
        ? {
            title: "Ask the Professor",
            message: generatedProfessorText(plan.summary?.office_hours_offer?.context) || ""
          }
        : undefined
    }
  }
}

function buildActivity(activity: PlannerWeekResponse["daily_plans"][number]["activities"][number]): PlannerActivity {
  const isQuiz = activity.type === "QUIZ"
  const count = isQuiz
    ? activity.configuration.num_questions
    : activity.configuration.num_cards

  return {
    id: activity.id,
    type: isQuiz ? "quiz" : "flashcards",
    title: isQuiz ? "Quiz" : "Flashcards",
    configuration: {
      category: activity.configuration.category || "Study Plan category",
      selectedTopics: (activity.configuration.selected_topics || []).map(topic => ({
        id: topic.id,
        topic: topic.title,
        title: topic.title,
        category: activity.configuration.category || "Study Plan category",
        order: topic.order
      })),
      count: count || activity.configuration.selected_topics?.length || 0,
      numCards: activity.configuration.num_cards || undefined,
      numQuestions: activity.configuration.num_questions || undefined,
      estimatedDurationMinutes: activity.configuration.estimated_duration_minutes || null,
      secondsPerAnswer: inferSecondsPerAnswer(activity),
      difficulty: activity.configuration.difficulty || undefined,
      style: activity.configuration.question_style || undefined,
      questionStyle: activity.configuration.question_style || undefined
    },
    mockInstructions: isQuiz
      ? "Answer each question using the topics selected for this Study Plan."
      : "Review the cards for the topics selected for this Study Plan."
  }
}

function inferSecondsPerAnswer(
  activity: PlannerWeekResponse["daily_plans"][number]["activities"][number]
) {
  if (activity.type !== "QUIZ") {
    return null
  }

  const questionCount =
    activity.configuration.num_questions
    || activity.configuration.selected_topics?.length
    || 0
  const estimatedDurationMinutes = activity.configuration.estimated_duration_minutes || 0

  if (!questionCount || !estimatedDurationMinutes) {
    return null
  }

  return Math.round((estimatedDurationMinutes * 60) / questionCount)
}

function buildDebrief(plan: PlannerWeekResponse["daily_plans"][number], index: number) {
  return {
    day: plannerModuleLabel(index),
    professorDebrief: generatedProfessorText(plan.summary?.professor_debrief) || "",
    sessionData: buildSessionData(plan)
  }
}

function buildSessionData(plan: PlannerWeekResponse["daily_plans"][number]) {
  const persistedSessionData = plan.summary?.session_data || {}
  const flashcards = plan.activities
    .filter(activity => activity.type === "FLASHCARDS")
    .reduce((total, activity) => total + (activity.configuration.num_cards || 0), 0)
  const quiz = plan.activities
    .filter(activity => activity.type === "QUIZ")
    .reduce((total, activity) => total + (activity.configuration.num_questions || 0), 0)
  const time = Math.round(
    plan.planned_allocations.reduce(
      (total, allocation) => total + allocation.estimated_duration_minutes,
      0
    )
  )

  return {
    flashcards: persistedSessionData.flashcards ?? flashcards,
    quiz: persistedSessionData.quiz ?? quiz,
    accuracy: persistedSessionData.accuracy || "—",
    time: persistedSessionData.time || `${time} min`,
    focus: unique(plan.planned_allocations.map(allocation => allocation.category)).join(", ") || "Study Plan focus"
  }
}

function runtimeStatisticsFromWeek(week: PlannerWeekResponse) {
  const value = week.weekly_statistics?.metadata?.runtime_statistics

  if (!value || typeof value !== "object") {
    return null
  }

  const runtimeStatistics = value as Record<string, unknown>

  return {
    flashcardsReviewed: numberValue(runtimeStatistics.flashcards_reviewed),
    quizzesCompleted: numberValue(runtimeStatistics.quizzes_completed),
    quizQuestions: numberValue(runtimeStatistics.quiz_questions),
    quizCorrect: numberValue(runtimeStatistics.quiz_correct),
    studyTimeMinutes: numberValue(runtimeStatistics.study_time_minutes)
  }
}

function buildRuntimeStatistics(
  runtimeStatistics: {
    flashcardsReviewed: number
    quizzesCompleted: number
    quizQuestions: number
    quizCorrect: number
    studyTimeMinutes: number
  },
  planType = "study_plan"
) {
  const isAssessmentPlan = planType === "assessment"
  const accuracy = runtimeStatistics.quizQuestions > 0
    ? `${Math.round((runtimeStatistics.quizCorrect / runtimeStatistics.quizQuestions) * 100)}%`
    : "—"

  return [
    {
      label: "Quizzes completed",
      value: String(runtimeStatistics.quizzesCompleted),
      detail: runtimeStatistics.quizzesCompleted > 0
        ? `${runtimeStatistics.quizQuestions} questions answered`
        : isAssessmentPlan
          ? "No completed Assessment quiz yet"
          : "No completed Study Plan quiz yet"
    },
    {
      label: "Flashcards reviewed",
      value: String(runtimeStatistics.flashcardsReviewed),
      detail: runtimeStatistics.flashcardsReviewed > 0
        ? isAssessmentPlan
          ? "Reviewed during this Assessment module"
          : "Reviewed during this Study Plan module"
        : isAssessmentPlan
          ? "No Assessment flashcards reviewed yet"
          : "No Study Plan flashcards reviewed yet"
    },
    {
      label: isAssessmentPlan
        ? "Assessment accuracy"
        : "Study Plan accuracy",
      value: accuracy,
      detail: runtimeStatistics.quizQuestions > 0
        ? `${runtimeStatistics.quizCorrect}/${runtimeStatistics.quizQuestions} correct`
        : isAssessmentPlan
          ? "No Assessment quiz result yet"
          : "No Study Plan quiz result yet"
    },
    {
      label: "Study time",
      value: runtimeStatistics.studyTimeMinutes
        ? `${runtimeStatistics.studyTimeMinutes} min`
        : "—",
      detail: isAssessmentPlan
        ? "Current Assessment module runtime"
        : "Current Study Plan module runtime"
    }
  ]
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function buildSessionTitle(plan: PlannerWeekResponse["daily_plans"][number]) {
  const categories = unique(plan.planned_allocations.map(allocation => allocation.category))

  if (categories.length === 0) {
    return "Open study session"
  }

  if (categories.length === 1) {
    return `${categories[0]} session`
  }

  return `${categories[0]} + ${categories.length - 1} more`
}

function inferWeeklyObjective(week: PlannerWeekResponse) {
  const activities = week.daily_plans.flatMap(plan => plan.activities)
  const quizCount = activities.filter(activity => activity.type === "QUIZ").length
  const flashcardCount = activities.filter(activity => activity.type === "FLASHCARDS").length
  const categories = unique(
    week.daily_plans.flatMap(plan =>
      plan.planned_allocations.map(allocation => allocation.category)
    )
  )
  const anchor = categories[0]
  const italian = isItalianStudyLanguage(week)

  if (activities.length === 0) {
    return italian
      ? "L’obiettivo del Piano di Studio sarà definito dal Professore."
      : "The Study Plan Objective will be defined by the Professor."
  }

  if (quizCount > 0 && flashcardCount === 0) {
    if (italian) {
      return anchor
        ? `L’obiettivo è costruire una prima base concettuale attorno a ${anchor}, verificando che cosa è già stabile e dove il lavoro successivo dovrà concentrarsi.`
        : "L’obiettivo è trasformare questo primo passaggio in evidenza affidabile: ciò che è già stabile, ciò che è incerto e dove concentrare il lavoro successivo."
    }

    return anchor
      ? `The objective is to build an initial conceptual foundation around ${anchor}, testing what is already stable and where the next work should concentrate.`
      : "The objective is to turn this first pass into reliable evidence: what is already secure, what is uncertain, and where the next work should concentrate."
  }

  if (flashcardCount > 0 && quizCount === 0) {
    if (italian) {
      return anchor
        ? `L’obiettivo è rendere più stabile la base concettuale di ${anchor} prima di aumentare il peso della verifica.`
        : "L’obiettivo è rendere più stabili i concetti essenziali prima di aumentare il peso della verifica."
    }

    return anchor
      ? `The objective is to make the conceptual base around ${anchor} more stable before increasing the pressure of assessment.`
      : "The objective is to make the essential concepts more stable before increasing the pressure of assessment."
  }

  if (italian) {
    return anchor
      ? `L’obiettivo è collegare il consolidamento di ${anchor} alla verifica, così memoria e applicazione crescono insieme.`
      : "L’obiettivo è collegare consolidamento e verifica, così memoria e applicazione crescono insieme invece di restare separate."
  }

  return anchor
    ? `The objective is to connect consolidation around ${anchor} with assessment, so recall and application develop together.`
    : "The objective is to connect consolidation with assessment, so recall and application develop together instead of remaining separate."
}

function inferStudyDuration(week: PlannerWeekResponse) {
  const maxDuration = Math.max(
    0,
    ...week.daily_plans.map(plan =>
      Math.round(
        plan.planned_allocations.reduce(
          (total, allocation) => total + allocation.estimated_duration_minutes,
          0
        )
      )
    )
  )

  return `${maxDuration} minutes`
}

function inferPreferredExamStyle(week: PlannerWeekResponse) {
  const quiz = week.daily_plans
    .flatMap(plan => plan.activities)
    .find(activity => activity.type === "QUIZ")

  return quiz?.configuration.question_style || "Balanced"
}

function inferMaxVisibleModules(week: PlannerWeekResponse) {
  const value = week.weekly_statistics?.metadata?.max_visible_modules

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  return week.daily_plans.length
}

function inferAdditionalModulesMessage(week: PlannerWeekResponse) {
  const additionalModulesRemain =
    week.weekly_statistics?.metadata?.additional_modules_remain
  const italian = isItalianStudyLanguage(week)

  if (additionalModulesRemain === true) {
    return italian
      ? "Questo Piano di Studio copre intenzionalmente la prima parte del percorso. Il prossimo potrà continuare dallo stesso filo, dando priorità agli argomenti che richiedono ancora attenzione."
      : "This Study Plan intentionally covers the first part of the path. The next one can continue from the same thread, giving priority to the topics that still need attention."
  }

  return italian
    ? "Quando questo Piano di Studio sarà completato, il passo successivo dovrà seguire l’evidenza raccolta qui, mantenendo continuità invece di ripartire da zero."
    : "Once this Study Plan is complete, the next step should follow the evidence collected here, preserving continuity rather than starting again from zero."
}

function isItalianStudyLanguage(week: PlannerWeekResponse) {
  return String(week.study_language || "")
    .trim()
    .toLowerCase()
    .startsWith("italian")
}

function formatOptionalPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "—"
  }

  return `${Math.round(value * 100)}%`
}

function formatStudyTime(value?: number | null) {
  if (!value) {
    return "—"
  }

  return `${value} min`
}

function formatWeekLabel(startDate: string, endDate: string) {
  return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })
}

function formatPlannerDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short"
  })
}

function plannerModuleLabel(index: number) {
  return `Module ${index + 1}`
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function generatedProfessorText(value: unknown): string | undefined {
  if (!hasText(value)) {
    return undefined
  }

  const text = value.trim()

  if (isProfessorPlaceholderText(text)) {
    return undefined
  }

  return text
}

function isProfessorPlaceholderText(text: string) {
  const normalized = text.toLowerCase()

  return (
    (
      normalized.startsWith("this ")
      && (
        normalized.includes(" will be generated ")
        || normalized.includes(" will be generated after ")
      )
    )
    || (
      normalized.startsWith("available after completing ")
      && normalized.endsWith(" session.")
    )
  )
}
