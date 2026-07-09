import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import PlannerDailySession from "./planner/PlannerDailySession"
import PlannerDashboard from "./planner/PlannerDashboard"
import PlannerConfiguration from "./planner/PlannerConfiguration"
import {
  generatePlannerWeek,
  type PlannerGenerationConfiguration
} from "../../services/plannerApi"
import type {
  PlannerCompletedSessionResults,
  PlannerDailyPlan,
  PlannerDay,
  PlannerModuleDebriefs,
  PlannerMockData,
  PlannerSessionResults
} from "./planner/PlannerTypes"
import { usePlannerState } from "./planner/usePlannerState"

export default function PlannerView({
  projectId,
  topics,
  plannerRuntime,
  openPlannerDailySession,
  launchPlannerActivity,
  returnToPlannerDashboard
}: {
  projectId: string
  topics: Array<{
    category?: string | null
  }>
  plannerRuntime: {
    mode: string
    dailyPlan: PlannerDailyPlan | null
    todaySessionCompleted: boolean
    sessionResults: PlannerSessionResults
    completedSessionResults: PlannerCompletedSessionResults
    moduleDebriefs: PlannerModuleDebriefs
    studyPlanDebrief: string
  }
  openPlannerDailySession: (dailyPlan: PlannerDailyPlan) => void
  launchPlannerActivity: (
    dailyPlan: PlannerDailyPlan,
    activityIndex: number
  ) => Promise<void>
  returnToPlannerDashboard: () => void
}) {
  const { t: translate } = useTranslation()
  const {
    plannerState,
    plannerData,
    loading,
    error,
    reload
  } = usePlannerState(projectId)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generatingStudyPlan, setGeneratingStudyPlan] = useState(false)
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0)

  const generationMessages = [
    translate("stats.Reviewing your initial preparation..."),
    translate("stats.Organizing the modules..."),
    translate("stats.Defining the study sequence..."),
    translate("stats.Preparing your Study Plan...")
  ]

  useEffect(() => {
    if (!generatingStudyPlan) {
      setGenerationMessageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setGenerationMessageIndex(current => (
        current + 1 >= generationMessages.length ? current : current + 1
      ))
    }, 3500)

    return () => clearInterval(interval)
  }, [generatingStudyPlan, generationMessages.length])

  if (loading) {
    return (
      <div style={container}>
        <section style={heroCard}>
          <div style={eyebrow}>{translate("stats.Study Planner")}</div>
          <h2 style={title}>{translate("stats.Loading your Study Plan…")}</h2>
          <p style={paragraph}>
            {translate("stats.The Professor is loading the current Study Plan.")}
          </p>
        </section>
      </div>
    )
  }

  if (error || !plannerData) {
    return (
      <div style={container}>
        <section style={heroCard}>
          <div style={eyebrow}>{translate("stats.Study Planner")}</div>
          <h2 style={title}>{translate("stats.Planner unavailable")}</h2>
          <p style={paragraph}>
            {error || translate("stats.The Planner could not load the current Study Plan.")}
          </p>
          <button onClick={reload} style={primaryButton}>
            {translate("stats.Retry")}
          </button>
        </section>
      </div>
    )
  }

  const openDailySession = (day: PlannerDay) => {
    console.log("PLANNER DAILY SESSION OPENED:", day)
    const selectedDailyPlan =
      plannerData.dailyPlans[day.sessionIndex]
      || plannerData.todayPlan

    openPlannerDailySession({
      ...selectedDailyPlan,
      studyPlanModuleCount: plannerData.dailyPlans.length
    })
  }

  const plannerDataWithLocalSessionState = applyRuntimeSessionResults(
    plannerData,
    plannerRuntime.sessionResults,
    plannerRuntime.todaySessionCompleted,
    plannerRuntime.dailyPlan?.sessionIndex,
    plannerRuntime.completedSessionResults,
    plannerRuntime.moduleDebriefs,
    plannerRuntime.studyPlanDebrief,
    translate
  )

  const projectCategories = Array.from(
    new Set(
      (topics || [])
        .map(topic => topic?.category)
        .filter((category): category is string => Boolean(category))
    )
  )
  const handleGenerateWeeklyPlan = async (
    configuration: PlannerGenerationConfiguration
  ) => {
    setGenerationError(null)
    setGeneratingStudyPlan(true)
    setGenerationMessageIndex(0)

    try {
      await generatePlannerWeek(projectId, configuration)
      await reload()
    } catch (err) {
      console.error("PLANNER WEEK GENERATION ERROR:", err)
      setGenerationError(
        err instanceof Error
          ? err.message
          : translate("stats.Unable to generate Study Plan.")
      )
    } finally {
      setGeneratingStudyPlan(false)
    }
  }

  if (generatingStudyPlan) {
    return (
      <PlannerGenerationLoading
        title={translate("stats.The Professor is preparing your Study Plan")}
        body={translate("stats.I’m reviewing your answers and organizing the most suitable path for the available material.")}
        message={generationMessages[generationMessageIndex] || generationMessages[0]}
      />
    )
  }

  if (plannerState === "NEW_PROJECT") {
    return (
      <>
        {generationError && <PlannerError message={generationError} />}
        <PlannerConfiguration
          showLearningSurvey
          categories={projectCategories}
          onGenerate={handleGenerateWeeklyPlan}
          generating={generatingStudyPlan}
        />
      </>
    )
  }

  if (plannerState === "READY_FOR_FIRST_PLAN") {
    return (
      <>
        {generationError && <PlannerError message={generationError} />}
        <PlannerConfiguration
          showLearningSurvey={false}
          categories={projectCategories}
          onGenerate={handleGenerateWeeklyPlan}
          generating={generatingStudyPlan}
        />
      </>
    )
  }

  if (plannerState === "WEEK_COMPLETED") {
    return (
      <div style={container}>
        <section style={heroCard}>
          <div style={eyebrow}>{translate("stats.Professor Study Plan Review")}</div>
          <h2 style={title}>
            {translate(`stats.${plannerData.weeklyReview.title}`, {
              defaultValue: plannerData.weeklyReview.title
            })}
          </h2>
          {plannerData.weeklyReview.message && (
            <p style={paragraph}>{plannerData.weeklyReview.message}</p>
          )}
        </section>

        <section style={card}>
          <div style={sectionTitle}>{translate("stats.Study Plan Preferences")}</div>
          <div style={preferenceGrid}>
            <Preference
              label={translate("stats.Study duration")}
              value={plannerData.preferences.studyDuration}
            />
            <Preference
              label={translate("stats.Visible modules")}
              value={plannerData.preferences.visibleModules}
            />
            <Preference
              label={translate("stats.Preferred quiz style")}
              value={plannerData.preferences.preferredExamStyle}
            />
          </div>
        </section>

        <button style={primaryButton}>{translate("stats.Generate Next Study Plan")}</button>
      </div>
    )
  }

  if (
    plannerRuntime.mode === "daily_briefing"
    && plannerRuntime.dailyPlan
  ) {
    return (
      <PlannerDailySession
        dailyPlan={plannerRuntime.dailyPlan}
        mode="briefing"
        onStartSession={() => launchPlannerActivity(
          plannerRuntime.dailyPlan as PlannerDailyPlan,
          0
        )}
        onBackToDashboard={returnToPlannerDashboard}
      />
    )
  }

  if (
    plannerRuntime.mode === "summary"
    && plannerRuntime.dailyPlan
  ) {
    return (
      <PlannerDailySession
        dailyPlan={applyRuntimeResultsToDailyPlan(
          plannerRuntime.dailyPlan,
          plannerRuntime.sessionResults,
          plannerRuntime.moduleDebriefs[plannerRuntime.dailyPlan.sessionIndex]
        )}
        mode="summary"
        onStartSession={() => {}}
        onBackToDashboard={returnToPlannerDashboard}
      />
    )
  }

  return (
    <PlannerDashboard
      plan={plannerDataWithLocalSessionState}
      onOpenDailySession={openDailySession}
    />
  )
}

function applyRuntimeSessionResults(
  plannerData: PlannerMockData,
  results: PlannerSessionResults,
  sessionCompleted: boolean,
  completedSessionIndex?: number,
  completedSessionResults: PlannerCompletedSessionResults = {},
  moduleDebriefs: PlannerModuleDebriefs = {},
  studyPlanDebrief = "",
  translate: (key: string) => string = key => key
): PlannerMockData {
  const completedSessionIndexes = new Set(
    Object.keys(completedSessionResults).map(Number)
  )

  if (completedSessionIndexes.size === 0) {
    return plannerData
  }

  const weeklyResults = aggregatePlannerSessionResults(completedSessionResults)

  return {
    ...plannerData,
    todaySessionCompleted: sessionCompleted,
    calendar: plannerData.calendar.map(day =>
      completedSessionIndexes.has(day.sessionIndex)
        ? {
            ...day,
            status: "completed" as const
          }
        : day
    ),
    statistics: buildRuntimeStatistics(weeklyResults, translate),
    debriefs: plannerData.dailyPlans
      .filter(plan => completedSessionIndexes.has(plan.sessionIndex))
      .filter(plan => Boolean(moduleDebriefs[plan.sessionIndex] || plan.summary.professorDebrief))
      .map(plan => {
        const runtimePlan = applyRuntimeResultsToDailyPlan(
          plan,
          completedSessionResults[plan.sessionIndex],
          moduleDebriefs[plan.sessionIndex]
        )

        return {
          day: runtimePlan.day,
          professorDebrief: runtimePlan.summary.professorDebrief || "",
          sessionData: runtimePlan.summary.sessionData
        }
      }),
    todayPlan: sessionCompleted && completedSessionIndex !== undefined
      ? applyRuntimeResultsToDailyPlan(plannerData.todayPlan, results)
      : plannerData.todayPlan,
    weeklyReview: studyPlanDebrief
      ? {
          ...plannerData.weeklyReview,
          message: studyPlanDebrief
        }
      : plannerData.weeklyReview
  }
}

function aggregatePlannerSessionResults(
  completedSessionResults: PlannerCompletedSessionResults
): PlannerSessionResults {
  return Object.values(completedSessionResults).reduce(
    (total, result) => ({
      flashcardsReviewed: total.flashcardsReviewed + result.flashcardsReviewed,
      quizzesCompleted: total.quizzesCompleted + result.quizzesCompleted,
      quizQuestions: total.quizQuestions + result.quizQuestions,
      quizCorrect: total.quizCorrect + result.quizCorrect,
      activityResults: [
        ...(total.activityResults || []),
        ...(result.activityResults || [])
      ],
      startedAtMs: earliestTimestamp(total.startedAtMs, result.startedAtMs),
      completedAtMs: latestTimestamp(total.completedAtMs, result.completedAtMs)
    }),
    {
      flashcardsReviewed: 0,
      quizzesCompleted: 0,
      quizQuestions: 0,
      quizCorrect: 0,
      activityResults: [],
      startedAtMs: null,
      completedAtMs: null
    }
  )
}

function applyRuntimeResultsToDailyPlan(
  dailyPlan: PlannerDailyPlan,
  results: PlannerSessionResults,
  moduleDebrief = ""
): PlannerDailyPlan {
  return {
    ...dailyPlan,
    summary: {
      ...dailyPlan.summary,
      professorDebrief: moduleDebrief || dailyPlan.summary.professorDebrief,
      sessionData: {
        ...dailyPlan.summary.sessionData,
        flashcards: results.flashcardsReviewed || dailyPlan.summary.sessionData.flashcards,
        quiz: results.quizQuestions || dailyPlan.summary.sessionData.quiz,
        accuracy: formatRuntimeAccuracy(results) || dailyPlan.summary.sessionData.accuracy,
        time: formatRuntimeDuration(results) || dailyPlan.summary.sessionData.time
      }
    }
  }
}

function buildRuntimeStatistics(
  results: PlannerSessionResults,
  translate: (key: string) => string
) {
  return [
    {
      label: translate("stats.Quizzes completed"),
      value: String(results.quizzesCompleted),
      detail: results.quizzesCompleted > 0
        ? translate("stats.questions answered count").replace("{count}", String(results.quizQuestions))
        : translate("stats.No Study Plan quiz completed yet")
    },
    {
      label: translate("stats.Flashcards reviewed"),
      value: String(results.flashcardsReviewed),
      detail: results.flashcardsReviewed > 0
        ? translate("stats.Reviewed during this Study Plan module")
        : translate("stats.No Study Plan flashcards reviewed yet")
    },
    {
      label: translate("stats.Study Plan accuracy"),
      value: formatRuntimeAccuracy(results) || "—",
      detail: results.quizQuestions > 0
        ? translate("stats.correct answer count")
          .replace("{correct}", String(results.quizCorrect))
          .replace("{total}", String(results.quizQuestions))
        : translate("stats.No Study Plan quiz result yet")
    },
    {
      label: translate("stats.Study time"),
      value: formatRuntimeDuration(results) || "—",
      detail: translate("stats.Current Study Plan module runtime")
    }
  ]
}

function formatRuntimeAccuracy(results: PlannerSessionResults) {
  if (!results.quizQuestions) {
    return ""
  }

  return `${Math.round((results.quizCorrect / results.quizQuestions) * 100)}%`
}

function formatRuntimeDuration(results: PlannerSessionResults) {
  if (!results.startedAtMs || !results.completedAtMs) {
    return ""
  }

  const minutes = Math.max(
    1,
    Math.round((results.completedAtMs - results.startedAtMs) / 60000)
  )

  return `${minutes} min`
}

function earliestTimestamp(
  current?: number | null,
  next?: number | null
) {
  if (!current) {
    return next ?? null
  }

  if (!next) {
    return current
  }

  return Math.min(current, next)
}

function latestTimestamp(
  current?: number | null,
  next?: number | null
) {
  if (!current) {
    return next ?? null
  }

  if (!next) {
    return current
  }

  return Math.max(current, next)
}

function PlannerError({ message }: { message: string }) {
  return (
    <div style={errorBox}>
      {message}
    </div>
  )
}

function PlannerGenerationLoading({
  title,
  body,
  message
}: {
  title: string
  body: string
  message: string
}) {
  const { t: translate } = useTranslation()

  return (
    <div style={generationContainer}>
      <section style={generationCard}>
        <div style={generationSpinner} />
        <div style={eyebrow}>{translate("stats.Professor")}</div>
        <h2 style={titleStyle}>{title}</h2>
        <p style={paragraph}>{body}</p>
        <div style={generationStatus}>
          {message}
        </div>
      </section>
    </div>
  )
}

function Preference({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={preferenceBox}>
      <div style={preferenceLabel}>{label}</div>
      <div style={preferenceValue}>{value}</div>
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 920,
  margin: "0 auto"
}

const heroCard = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 26,
  marginBottom: 22
}

const eyebrow = {
  color: "#36F2ED",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  marginBottom: 8
}

const title = {
  color: "white",
  fontSize: 30,
  fontWeight: 900,
  margin: "0 0 12px"
}

const titleStyle = title

const paragraph = {
  color: "#cbd5e1",
  lineHeight: 1.7,
  margin: "0 0 20px"
}

const buttonRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const
}

const primaryButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2b7dcb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer"
}

const secondaryButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #2b7dcb",
  background: "transparent",
  color: "#93c5fd",
  fontWeight: 800,
  cursor: "pointer"
}

const card = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22
}

const sectionTitle = {
  color: "white",
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 16
}

const preferenceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12
}

const preferenceBox = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 14
}

const preferenceLabel = {
  color: "#9ca3af",
  fontSize: 12,
  marginBottom: 6
}

const preferenceValue = {
  color: "white",
  fontWeight: 800
}

const errorBox = {
  maxWidth: 920,
  margin: "20px auto 0",
  background: "#2b0b0b",
  border: "1px solid #7f1d1d",
  color: "#fecaca",
  borderRadius: 12,
  padding: 14,
  fontWeight: 700
}

const generationContainer = {
  minHeight: "70vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24
}

const generationCard = {
  ...heroCard,
  width: "min(620px, 100%)",
  textAlign: "center" as const,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center"
}

const generationSpinner = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "3px solid rgba(43, 125, 203, 0.22)",
  borderTopColor: "#2b7dcb",
  marginBottom: 18,
  animation: "spin 0.9s linear infinite"
}

const generationStatus = {
  marginTop: 18,
  padding: "10px 14px",
  borderRadius: 999,
  background: "#0f1f33",
  border: "1px solid #1d4f83",
  color: "#bfdbfe",
  fontWeight: 800,
  fontSize: 14
}
