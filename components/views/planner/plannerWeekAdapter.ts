import type {
  PlannerStateResponse,
  PlannerWeekResponse
} from "../../../services/plannerApi"
import enCommon from "../../../public/locales/en/common.json"
import itCommon from "../../../public/locales/it/common.json"
import type {
  PlannerActivity,
  PlannerDailyPlan,
  PlannerDay,
  PlannerMockData,
  PlannerUiState
} from "./PlannerTypes"

export function adaptPlannerStateToUi(response: PlannerStateResponse): PlannerMockData {
  if (response.state === "ACTIVE_WEEK" && response.week) {
    return withResponseLifecycle(adaptPlannerWeekToUi(response.week), response)
  }

  return withResponseLifecycle(
    buildStateOnlyPlannerData(response.state, response.learning_coverage),
    response
  )
}

export function adaptPlannerWeekToUi(week: PlannerWeekResponse): PlannerMockData {
  const planType = week.plan_type || "study_plan"
  const completedSessionIndexes = completedSessionIndexesFromWeek(week)
  const runtimeStatistics = runtimeStatisticsFromWeek(week)
  const calendar = buildCalendar(week, completedSessionIndexes)
  const italian = isItalianStudyLanguage(week)
  const dailyPlans = week.daily_plans.map((plan, index) =>
    buildDailyPlan(plan, index, planType, week.id, italian, week.study_language || null)
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
    weekLabel: formatWeekLabel(week.start_date, week.end_date, italian),
    todaySessionCompleted: false,
    onboarding: {
      title: "Welcome to your Professor Planner",
      message:
        "Before preparing your first Study Plan, the Professor needs either a short survey or one observation period to understand your study rhythm."
    },
    coverageLifecycle: coverageLifecycleFromWeek(week),
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
      ? buildRuntimeStatistics(runtimeStatistics, planType, isItalianStudyLanguage(week))
      : [
      {
        label: "Quizzes completed",
        value: String(week.weekly_statistics?.sessions_completed ?? 0),
        detail: localizedPlannerLabel(
          planType === "assessment"
            ? "No completed Assessment quiz yet"
            : "No completed Study Plan quiz yet",
          italian
        )
      },
      {
        label: "Flashcards reviewed",
        value: formatOptionalPercent(week.weekly_statistics?.flashcard_completion),
        detail: localizedPlannerLabel(
          planType === "assessment"
            ? "No completed Assessment flashcards yet"
            : "No completed Study Plan flashcards yet",
          italian
        )
      },
      {
        label: planType === "assessment"
          ? "Assessment accuracy"
          : "Study Plan accuracy",
        value: formatOptionalPercent(week.weekly_statistics?.quiz_accuracy),
        detail: localizedPlannerLabel(
          planType === "assessment"
            ? "No Assessment quiz result yet"
            : "No Study Plan quiz result yet",
          italian
        )
      },
      {
        label: "Study time",
        value: formatStudyTime(week.weekly_statistics?.study_time),
        detail: localizedPlannerLabel(
          planType === "assessment"
            ? "No completed Assessment module yet"
            : "No completed Study Plan module yet",
          italian
        )
      }
    ],
    debriefs: completedPlanEntries
      .filter(entry => Boolean(generatedProfessorText(entry.plan.summary?.professor_debrief)))
      .map(entry => buildDebrief(entry.plan, entry.index, italian)),
    homework: completedPlanEntries
      .flatMap(entry =>
        (entry.plan.summary?.homework_recommendations || [])
          .filter(recommendation => Boolean(generatedProfessorText(recommendation.text)))
          .map(recommendation => ({
            day: plannerModuleLabel(entry.index, italian),
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

function withResponseLifecycle(
  plan: PlannerMockData,
  response: PlannerStateResponse
): PlannerMockData {
  const lifecycle = {
    ...plan.coverageLifecycle,
    professorMode: response.professor_mode ?? plan.coverageLifecycle?.professorMode ?? null,
    coverageStatus: response.coverage_status ?? plan.coverageLifecycle?.coverageStatus ?? null,
    coverageComplete: response.coverage_complete ?? plan.coverageLifecycle?.coverageComplete ?? null,
    nextPlanGenerated: response.next_plan_generated ?? plan.coverageLifecycle?.nextPlanGenerated ?? null,
    requiresNewPlan: response.requires_new_plan ?? plan.coverageLifecycle?.requiresNewPlan ?? null
  }

  return {
    ...plan,
    coverageLifecycle: lifecycle
  }
}

function coverageLifecycleFromWeek(week: PlannerWeekResponse) {
  const metadata = week.weekly_statistics?.metadata || {}
  return {
    professorMode: asString(metadata.professor_mode),
    coverageStatus: asString(metadata.coverage_status),
    coverageComplete: asBoolean(metadata.coverage_complete),
    nextPlanGenerated: asBoolean(metadata.next_plan_generated),
    requiresNewPlan: asBoolean(metadata.requires_new_plan)
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
        "Planner state only preferences briefing",
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
    studyLanguage: null,
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
  const italian = isItalianStudyLanguage(week)
  const activeIndex = recommendedModuleIndex(
    week.daily_plans.length,
    completedSessionIndexes
  )

  return week.daily_plans.map((plan, index) => ({
    day: plannerModuleLabel(index, italian),
    date: formatPlannerDate(plan.date, italian),
    sessionIndex: index,
    status:
      completedSessionIndexes.has(index)
        ? "completed"
        : index === activeIndex
          ? "today"
          : "remaining",
    title: buildSessionTitle(plan, italian),
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
  plannerWeekId?: string | null,
  italian = false,
  studyLanguage?: string | null
): PlannerDailyPlan {
  return {
    plannerWeekId,
    day: plannerModuleLabel(index, italian),
    date: formatPlannerDate(plan.date, italian),
    sessionIndex: index,
    studyLanguage: studyLanguage || (italian ? "Italian" : "English"),
    planType,
    objective: generatedProfessorText(plan.objective) || "",
    briefing: generatedProfessorText(plan.briefing) || "",
    activities: plan.activities.map(activity => buildActivity(activity, italian)),
    summary: {
      sessionData: buildSessionData(plan, italian),
      professorDebrief: generatedProfessorText(plan.summary?.professor_debrief) || "",
      homeworkRecommendations:
        plan.summary?.homework_recommendations
          ?.map(item => item.text)
          .map(generatedProfessorText)
          .filter(hasText)
        || [],
      activeRecall: generatedProfessorText(plan.summary?.active_recall_offer?.context)
        ? {
            title: localizedPlannerLabel("Optional Active Recall", italian),
            message: generatedProfessorText(plan.summary?.active_recall_offer?.context) || ""
          }
        : undefined,
      officeHours: generatedProfessorText(plan.summary?.office_hours_offer?.context)
        ? {
            title: localizedPlannerLabel("Ask the Professor", italian),
            message: generatedProfessorText(plan.summary?.office_hours_offer?.context) || ""
          }
        : undefined
    }
  }
}

function buildActivity(
  activity: PlannerWeekResponse["daily_plans"][number]["activities"][number],
  italian = false
): PlannerActivity {
  const isQuiz = activity.type === "QUIZ"
  const count = isQuiz
    ? activity.configuration.num_questions
    : activity.configuration.num_cards
  const fallbackCategory = localizedPlannerLabel("Study Plan category", italian)

  return {
    id: activity.id,
    type: isQuiz ? "quiz" : "flashcards",
    title: isQuiz ? "Quiz" : "Flashcards",
    configuration: {
      category: activity.configuration.category || fallbackCategory,
      selectedTopics: (activity.configuration.selected_topics || []).map(topic => ({
        id: topic.id,
        topic: topic.title,
        title: topic.title,
        category: activity.configuration.category || fallbackCategory,
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
      ? localizedPlannerLabel("Answer each question using the topics selected for this Study Plan.", italian)
      : localizedPlannerLabel("Review the cards for the topics selected for this Study Plan.", italian)
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

function buildDebrief(
  plan: PlannerWeekResponse["daily_plans"][number],
  index: number,
  italian = false
) {
  return {
    day: plannerModuleLabel(index, italian),
    professorDebrief: generatedProfessorText(plan.summary?.professor_debrief) || "",
    sessionData: buildSessionData(plan, italian)
  }
}

function buildSessionData(
  plan: PlannerWeekResponse["daily_plans"][number],
  italian = false
) {
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
    focus: unique(plan.planned_allocations.map(allocation => allocation.category)).join(", ") || localizedPlannerLabel("Study Plan focus", italian)
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
  planType = "study_plan",
  italian = false
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
        ? localizedQuestionsAnswered(runtimeStatistics.quizQuestions, italian)
        : isAssessmentPlan
          ? localizedPlannerLabel("No completed Assessment quiz yet", italian)
          : localizedPlannerLabel("No completed Study Plan quiz yet", italian)
    },
    {
      label: "Flashcards reviewed",
      value: String(runtimeStatistics.flashcardsReviewed),
      detail: runtimeStatistics.flashcardsReviewed > 0
        ? isAssessmentPlan
          ? localizedPlannerLabel("Reviewed during this Assessment module", italian)
          : localizedPlannerLabel("Reviewed during this Study Plan module", italian)
        : isAssessmentPlan
          ? localizedPlannerLabel("No Assessment flashcards reviewed yet", italian)
          : localizedPlannerLabel("No Study Plan flashcards reviewed yet", italian)
    },
    {
      label: isAssessmentPlan
        ? "Assessment accuracy"
        : "Study Plan accuracy",
      value: accuracy,
      detail: runtimeStatistics.quizQuestions > 0
        ? localizedCorrectAnswers(
            runtimeStatistics.quizCorrect,
            runtimeStatistics.quizQuestions,
            italian
          )
        : isAssessmentPlan
          ? localizedPlannerLabel("No Assessment quiz result yet", italian)
          : localizedPlannerLabel("No Study Plan quiz result yet", italian)
    },
    {
      label: "Study time",
      value: runtimeStatistics.studyTimeMinutes
        ? `${runtimeStatistics.studyTimeMinutes} min`
        : "—",
      detail: isAssessmentPlan
        ? localizedPlannerLabel("Current Assessment module runtime", italian)
        : localizedPlannerLabel("Current Study Plan module runtime", italian)
    }
  ]
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function buildSessionTitle(
  plan: PlannerWeekResponse["daily_plans"][number],
  italian = false
) {
  const categories = unique(plan.planned_allocations.map(allocation => allocation.category))

  if (categories.length === 0) {
    return localizedPlannerLabel("Open study session", italian)
  }

  if (categories.length === 1) {
    return `${categories[0]} ${localizedPlannerLabel("session", italian)}`
  }

  return `${categories[0]} + ${categories.length - 1} ${localizedPlannerLabel("more", italian)}`
}

function inferWeeklyObjective(week: PlannerWeekResponse) {
  const activities = week.daily_plans.flatMap(plan => plan.activities)
  const quizCount = activities.filter(activity => activity.type === "QUIZ").length
  const flashcardCount = activities.filter(activity => activity.type === "FLASHCARDS").length

  if (activities.length === 0) {
    return "The Study Plan Objective will be defined by the Professor."
  }

  if (quizCount > 0 && flashcardCount === 0) {
    return "Study Plan objective quiz only fallback"
  }

  if (flashcardCount > 0 && quizCount === 0) {
    return "Study Plan objective flashcards only fallback"
  }

  return "Study Plan objective mixed activity fallback"
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

  if (additionalModulesRemain === true) {
    return "Additional modules remain fallback"
  }

  return "No additional modules remain fallback"
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

function formatWeekLabel(startDate: string, endDate: string, italian = false) {
  return `${formatShortDate(startDate, italian)} – ${formatShortDate(endDate, italian)}`
}

function formatShortDate(value: string, italian = false) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(italian ? "it-IT" : undefined, {
    month: "short",
    day: "numeric"
  })
}

function formatPlannerDate(value: string, italian = false) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(italian ? "it-IT" : undefined, {
    weekday: "short",
    day: "numeric",
    month: "short"
  })
}

function plannerModuleLabel(index: number, italian = false) {
  return `${localizedPlannerLabel("Module", italian)} ${index + 1}`
}

function localizedQuestionsAnswered(count: number, italian = false) {
  return interpolatePlannerLabel(
    localizedPlannerLabel("questions answered count", italian),
    { count: String(count) }
  )
}

function localizedCorrectAnswers(correct: number, total: number, italian = false) {
  return interpolatePlannerLabel(
    localizedPlannerLabel("correct answer count", italian),
    {
      correct: String(correct),
      total: String(total)
    }
  )
}

function localizedPlannerLabel(label: string, italian = false) {
  const stats = italian ? itCommon.stats : enCommon.stats
  const value = (stats as Record<string, unknown>)[label]

  return typeof value === "string" ? value : label
}

function interpolatePlannerLabel(
  template: string,
  values: Record<string, string>
) {
  return Object.entries(values).reduce(
    (text, [key, value]) =>
      text
        .replaceAll(`{{${key}}}`, value)
        .replaceAll(`{${key}}`, value),
    template
  )
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
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
