import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Clock3,
  Flame,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"
import SummarySection from "../summary/SummarySection"
import StatisticCard from "../summary/StatisticCard"
import ChartCard from "../summary/ChartCard"
import InsightCard from "../summary/InsightCard"
import TimelineCard from "../summary/TimelineCard"
import ProgressCard from "../summary/ProgressCard"

const fallbackActivityDistribution = [
  { labelKey: "Quiz", value: 42, color: "#8b5cf6" },
  { labelKey: "Flashcards", value: 32, color: "#1687ff" },
  { labelKey: "Ask", value: 11, color: "#fbbf24" },
  { labelKey: "Memory Check", value: 7, color: "#22c55e" },
  { labelKey: "Study Planner", value: 7, color: "#f97316" },
]

const trendSeries = [
  { quiz: 11, flashcards: 5, ask: 2 },
  { quiz: 9, flashcards: 3, ask: 1 },
  { quiz: 9, flashcards: 4, ask: 1 },
  { quiz: 12, flashcards: 6, ask: 2 },
  { quiz: 9, flashcards: 4, ask: 1 },
  { quiz: 11, flashcards: 5, ask: 2 },
  { quiz: 15, flashcards: 9, ask: 4 },
  { quiz: 13, flashcards: 7, ask: 2 },
  { quiz: 15, flashcards: 9, ask: 3 },
  { quiz: 16, flashcards: 10, ask: 4 },
]

const fallbackRecentActivities = [
  {
    icon: "◈",
    titleKey: "Mock quiz activity title",
    detailKey: "Mock quiz activity detail",
    metaKey: "Mock activity today first",
    result: "25 min",
    tone: "purple" as const,
  },
  {
    icon: "▣",
    titleKey: "Mock flashcards activity title",
    detailKey: "Mock flashcards activity detail",
    metaKey: "Mock activity today second",
    result: "15 min",
    tone: "blue" as const,
  },
  {
    icon: "?",
    titleKey: "Mock ask activity title",
    detailKey: "Mock ask activity detail",
    metaKey: "Mock activity yesterday first",
    result: "5 min",
    tone: "orange" as const,
  },
  {
    icon: "◎",
    titleKey: "Mock memory activity title",
    detailKey: "Mock memory activity detail",
    metaKey: "Mock activity yesterday second",
    result: "12 min",
    tone: "green" as const,
  },
]

const fallbackFocusTopics = [
  { titleKey: "Mock focus topic electron transport", value: 50 },
  { titleKey: "Mock focus topic Krebs cycle", value: 50 },
  { titleKey: "Mock focus topic ATP synthesis", value: 50 },
  { titleKey: "Mock focus topic transporters", value: 50 },
  { titleKey: "Mock focus topic energy balance", value: 40 },
]

type LearningSummary = {
  total_sessions: number
  completed_sessions: number
  abandoned_sessions: number
  completion_rate: number
  total_study_seconds: number
  current_streak: number
  quiz_accuracy_history: Array<{
    completed_at: string
    accuracy: number
  }>
  favorite_activity: string | null
  activities: Record<string, number>
}

type LearningJournalEntry = {
  id: string
  project_id: string
  session_type: string
  started_at: string | null
  completed_at: string | null
  status: string | null
  duration_seconds: number | null
}

type LearningInsight = {
  type: string
  level: string
  title: string
  message: string
}

type LearningPreferences = {
  typical_session_seconds: number | null
  session_duration_profile: string | null
}

export default function SummaryView({
  resultsData,
  onStartFocusSession,
}: {
  summaryStats?: any
  projectId?: string
  resultsData?: any
  onStartFocusSession?: (topics: string[]) => void
}) {
  const { t: translate } = useTranslation()
  const [learningSummary, setLearningSummary] = useState<LearningSummary | null>(null)
  const [learningJournal, setLearningJournal] = useState<LearningJournalEntry[]>([])
  const [learningInsights, setLearningInsights] = useState<LearningInsight[]>([])
  const [learningPreferences, setLearningPreferences] = useState<LearningPreferences | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadLearningSummaryData() {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) return

      const headers = {
        Authorization: `Bearer ${token}`
      }

      try {
        const [summaryRes, journalRes, intelligenceRes, preferencesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/summary`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/journal?limit=30`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/intelligence`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning/preferences`, { headers }),
        ])

        const [summary, journal, intelligence, preferences] = await Promise.all([
          summaryRes.ok ? summaryRes.json() : null,
          journalRes.ok ? journalRes.json() : [],
          intelligenceRes.ok ? intelligenceRes.json() : [],
          preferencesRes.ok ? preferencesRes.json() : null,
        ])

        if (cancelled) return

        setLearningSummary(summary)
        setLearningJournal(Array.isArray(journal) ? journal : [])
        setLearningInsights(Array.isArray(intelligence) ? intelligence : [])
        setLearningPreferences(preferences)
      } catch (error) {
        console.error("LEARNING SUMMARY LOAD ERROR:", error)
      }
    }

    loadLearningSummaryData()

    return () => {
      cancelled = true
    }
  }, [])

  const realFocusTopics = useMemo(() => {
    const topicRows = Array.isArray(resultsData?.weak_areas)
      ? resultsData.weak_areas
      : Array.isArray(resultsData?.topics_detail)
        ? resultsData.topics_detail
        : Array.isArray(resultsData?.topic_mastery)
          ? resultsData.topic_mastery
          : []

    return topicRows
      .map((topic: any) => ({
        title: String(topic?.topic || topic?.title || "Topic"),
        value: Math.round(Number(topic?.accuracy ?? topic?.score ?? 0))
      }))
      .filter((topic: { title: string; value: number }) =>
        topic.title
        && Number.isFinite(topic.value)
        && topic.value < 60
      )
      .sort((left: { value: number }, right: { value: number }) => left.value - right.value)
      .slice(0, 5)
  }, [resultsData])

  const displayedFocusTopics = realFocusTopics.length > 0
    ? realFocusTopics
    : fallbackFocusTopics.map(topic => ({
        title: translate(`stats.${topic.titleKey}`),
        value: topic.value,
      }))

  const activityDistributionData = useMemo(() => {
    const activities = learningSummary?.activities
    if (!activities) {
      return fallbackActivityDistribution.map(item => ({
        label: translate(`stats.${item.labelKey}`),
        value: item.value,
        color: item.color,
      }))
    }

    const total = Object.values(activities)
      .reduce((sum, value) => sum + Number(value || 0), 0)

    if (total <= 0) {
      return fallbackActivityDistribution.map(item => ({
        label: translate(`stats.${item.labelKey}`),
        value: item.value,
        color: item.color,
      }))
    }

    return [
      { label: translate("stats.Quiz"), key: "quiz", color: "#8b5cf6" },
      { label: translate("stats.Flashcards"), key: "flashcards", color: "#1687ff" },
      { label: translate("stats.Ask"), key: "ask", color: "#fbbf24" },
      { label: translate("stats.Memory Check"), key: "active_recall", color: "#22c55e" },
      { label: translate("stats.Study Planner"), key: "planner", color: "#f97316" },
    ].map(item => ({
      label: item.label,
      value: Math.round((Number(activities[item.key] || 0) / total) * 100),
      count: Number(activities[item.key] || 0),
      color: item.color,
    }))
  }, [learningSummary, translate])

  const trendData = useMemo(() => {
    if (learningJournal.length === 0) return trendSeries

    const buckets = new Map<string, { quiz: number; flashcards: number; ask: number }>()

    learningJournal
      .slice()
      .reverse()
      .forEach(entry => {
        if (!entry.started_at) return
        const date = new Date(entry.started_at)
        if (Number.isNaN(date.getTime())) return
        const key = date.toISOString().slice(0, 10)
        const bucket = buckets.get(key) || { quiz: 0, flashcards: 0, ask: 0 }

        if (entry.session_type === "quiz") bucket.quiz += 1
        if (entry.session_type === "flashcards") bucket.flashcards += 1
        if (entry.session_type === "ask") bucket.ask += 1

        buckets.set(key, bucket)
      })

    const values = Array.from(buckets.values()).slice(-10)
    return values.length > 0 ? values : trendSeries
  }, [learningJournal])

  const recentActivitiesData = useMemo(() => {
    if (learningJournal.length === 0) {
      return fallbackRecentActivities.map(activity => ({
        icon: activity.icon,
        title: translate(`stats.${activity.titleKey}`),
        detail: translate(`stats.${activity.detailKey}`),
        meta: translate(`stats.${activity.metaKey}`),
        result: activity.result,
        tone: activity.tone,
      }))
    }

    return learningJournal.slice(0, 4).map(entry => ({
      icon: activityIcon(entry.session_type),
      title: activityTitle(entry.session_type, translate),
      detail: entry.status === "completed"
        ? translate("stats.Completed session")
        : translate("stats.Abandoned session"),
      meta: formatJournalDate(entry.started_at),
      result: entry.duration_seconds != null
        ? formatDuration(entry.duration_seconds)
        : "—",
      tone: activityTone(entry.session_type),
    }))
  }, [learningJournal, translate])

  const insightCards = learningInsights.length > 0
    ? learningInsights.slice(0, 3)
    : []

  const bottomInsight = learningInsights[0]?.message
    || (
      learningPreferences?.session_duration_profile
        ? translate("stats.Typical study rhythm insight", {
            profile: translate(`stats.session profile ${learningPreferences.session_duration_profile}`)
          })
        : translate("stats.Medium sessions insight")
    )

  const totalStudySeconds = learningSummary?.total_study_seconds
  const totalSessions = learningSummary?.total_sessions
  const completedSessions = learningSummary?.completed_sessions
  const abandonedSessions = learningSummary?.abandoned_sessions
  const completionRate = learningSummary?.completion_rate
  const currentStreak = learningSummary?.current_streak
  const streakDaysShown = Math.min(Math.max(currentStreak || 0, 0), 7)
  const quizAccuracyHistory = Array.isArray(learningSummary?.quiz_accuracy_history)
    ? learningSummary.quiz_accuracy_history
    : []
  const quizAccuracyValues = quizAccuracyHistory
    .map(point => Number(point.accuracy))
    .filter(value => Number.isFinite(value))
  const averageQuizAccuracy = quizAccuracyValues.length > 0
    ? Math.round(
        quizAccuracyValues.reduce((sum, value) => sum + value, 0) / quizAccuracyValues.length
      )
    : null

  return (
    <div className="summary-v2-root">
      <header className="summary-v2-hero">
        <div>
          <h1>{translate("stats.Learning Summary")}</h1>
          <p>{translate("stats.Learning Summary subtitle")}</p>
        </div>
      </header>

      <section className="summary-v2-stats-grid">
        <StatisticCard
          icon={<Clock3 size={22} />}
          label={translate("stats.Total Study Time")}
          value={totalStudySeconds != null ? formatDuration(totalStudySeconds) : "—"}
          detail={translate("stats.From completed learning sessions")}
          accent="blue"
        />

        <StatisticCard
          icon={<CalendarDays size={22} />}
          label={translate("stats.Total Sessions")}
          value={totalSessions != null ? String(totalSessions) : "28"}
          detail={
            learningSummary
              ? translate("stats.completed abandoned count", {
                  completed: completedSessions || 0,
                  abandoned: abandonedSessions || 0,
                })
              : translate("stats.Learning activities recorded")
          }
          accent="blue"
        >
          <MiniBars values={[32, 52, 46, 58, 70, 82]} />
        </StatisticCard>

        <section className="summary-v2-card summary-v2-streak-card">
          <div className="summary-v2-streak-glow" />
          <div className="summary-v2-streak-heading">
            <span><Flame size={28} /></span>
            <div>
              <p>{translate("stats.Current Streak")}</p>
              <strong>
                {currentStreak != null
                  ? translate("stats.days count", { count: currentStreak })
                  : "—"}
              </strong>
            </div>
          </div>
          <div className="summary-v2-streak-value">
            <strong>{currentStreak ?? "—"}</strong>
            <span>{translate("stats.consecutive study days")}</span>
          </div>
          <div className="summary-v2-streak-days">
            {["T", "F", "S", "S", "M", "T", "W"].map((day, index) => (
              <span
                key={`${day}-${index}`}
                className={index >= 7 - streakDaysShown ? "is-complete" : ""}
              >
                {day}
              </span>
            ))}
          </div>
        </section>

        <StatisticCard
          icon={<Target size={22} />}
          label={translate("stats.Completion Rate")}
          value={completionRate != null ? `${completionRate}%` : "91%"}
          detail={translate("stats.Completed learning sessions")}
          accent="green"
        >
          <RadialProgress value={completionRate != null ? Math.round(completionRate) : 91} label="100%" color="#20d69b" />
        </StatisticCard>
      </section>

      <section className="summary-v2-main-grid">
        <ChartCard title={translate("stats.Activity Distribution")}>
          <div className="summary-v2-donut-layout">
            <DonutChart
              items={activityDistributionData}
              total={learningSummary?.total_sessions ?? 28}
            />
            <div className="summary-v2-donut-legend">
              {activityDistributionData.map((item: any, index) => (
                <div key={item.label}>
                  <span style={{ background: item.color }} />
                  <strong>{item.label}</strong>
                  <em>{item.count ?? [12, 9, 3, 2, 2][index]}</em>
                  <small>{item.value}%</small>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title={translate("stats.Last Month Trend")}>
          <Legend items={[
            { label: translate("stats.Quiz"), color: "#8b5cf6" },
            { label: translate("stats.Flashcards"), color: "#1687ff" },
            { label: translate("stats.Ask"), color: "#fbbf24" },
          ]} />
          <TrendChart data={trendData} />
        </ChartCard>

        <ChartCard
          title={translate("stats.Quiz Accuracy")}
          subtitle={translate("stats.Average Accuracy")}
        >
          {quizAccuracyValues.length > 0 ? (
            <div className="summary-v2-accuracy-card-body">
              <div className="summary-v2-accuracy-value">{averageQuizAccuracy}%</div>
              <AreaChart values={quizAccuracyValues} />
            </div>
          ) : (
            <div className="summary-v2-empty-state">
              {translate("stats.No quiz accuracy history yet")}
            </div>
          )}
        </ChartCard>
      </section>

      <section className="summary-v2-lower-grid">
        <SummarySection title={translate("stats.Your Strengths")}>
          {insightCards.length > 0 ? (
            insightCards.map((insight, index) => (
              <InsightCard
                key={`${insight.type}-${index}`}
                icon={insightIcon(index)}
                title={insight.title}
                text={insight.message}
                tone={insight.level === "warning" ? "orange" : insight.level === "positive" ? "green" : "blue"}
              />
            ))
          ) : (
            <>
              <InsightCard
                icon={<Trophy size={20} />}
                title={translate("stats.Flashcard consistency strength")}
                text={translate("stats.Flashcard consistency strength text")}
                value="90%"
              />
              <InsightCard
                icon={<Sparkles size={20} />}
                title={translate("stats.Short term memory strength")}
                text={translate("stats.Short term memory strength text")}
                value="43.8%"
              />
              <InsightCard
                icon={<Rocket size={20} />}
                title={translate("stats.Improving strength")}
                text={translate("stats.Improving strength text")}
                value="+18%"
              />
            </>
          )}
        </SummarySection>

        <SummarySection title={translate("stats.Topics to Improve")}>
          <div className="summary-v2-topic-list">
            {displayedFocusTopics.map(topic => (
              <ProgressCard
                key={topic.title}
                title={topic.title}
                value={topic.value}
                color={topic.value <= 40 ? "#fb7185" : "#ff4d70"}
              />
            ))}
          </div>
          <button
            type="button"
            className={`summary-v2-focus-cta ${realFocusTopics.length === 0 ? "is-disabled" : ""}`}
            disabled={realFocusTopics.length === 0}
            onClick={() => onStartFocusSession?.(
              realFocusTopics.map(topic => topic.title)
            )}
          >
            🎯 {translate("stats.Start Focus Session")}
          </button>
        </SummarySection>

        <SummarySection title={translate("stats.Recent Activity")}>
          <div className="summary-v2-timeline-list">
            {recentActivitiesData.map(activity => (
              <TimelineCard key={activity.title} {...activity} />
            ))}
          </div>
        </SummarySection>
      </section>

      <footer className="summary-v2-advice">
        <span><Lightbulb size={24} /></span>
        <strong>{translate("stats.Learning Insight")}</strong>
        <p>{bottomInsight}</p>
      </footer>

      <style jsx global>{summaryV2Styles}</style>
    </div>
  )
}

function RadialProgress({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="summary-v2-radial" style={{ ["--value" as any]: value, ["--color" as any]: color }}>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function MiniBars({ values }: { values: number[] }) {
  return (
    <div className="summary-v2-mini-bars">
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value}%` }} />
      ))}
    </div>
  )
}

function DonutChart({
  items,
  total,
}: {
  items: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const { t: translate } = useTranslation()
  let current = 0
  const gradient = items
    .map(item => {
      const start = current
      current += item.value
      return `${item.color} ${start}% ${current}%`
    })
    .join(", ")

  return (
    <div className="summary-v2-donut" style={{ background: `conic-gradient(${gradient})` }}>
      <div>
        <span>{translate("stats.Total")}</span>
        <strong>{total}</strong>
        <small>{translate("stats.sessions")}</small>
      </div>
    </div>
  )
}

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="summary-v2-legend">
      {items.map(item => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function TrendChart({
  data,
}: {
  data: Array<{ quiz: number; flashcards: number; ask: number }>
}) {
  const { t: translate } = useTranslation()
  const max = 20
  return (
    <div className="summary-v2-trend-chart">
      <div className="summary-v2-chart-grid" />
      {["quiz", "flashcards", "ask"].map(key => (
        <svg key={key} viewBox="0 0 320 150" preserveAspectRatio="none">
          <polyline
            points={data
              .map((point, index) => {
                const value = point[key as keyof typeof point]
                const x = data.length > 1
                  ? (index / (data.length - 1)) * 320
                  : 160
                const y = 145 - (value / max) * 130
                return `${x},${y}`
              })
              .join(" ")}
            fill="none"
            stroke={
              key === "quiz"
                ? "#8b5cf6"
                : key === "flashcards"
                ? "#1687ff"
                : "#fbbf24"
            }
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
      <div className="summary-v2-chart-axis">
        <span>{translate("stats.Mock chart date 1")}</span>
        <span>{translate("stats.Mock chart date 2")}</span>
        <span>{translate("stats.Mock chart date 3")}</span>
        <span>{translate("stats.Mock chart date 4")}</span>
        <span>{translate("stats.Mock chart date 5")}</span>
      </div>
    </div>
  )
}

function AreaChart({ values }: { values: number[] }) {
  const yTicks = [100, 75, 50, 25, 0]

  const chartPoints = values.map((value, index) => {
    const x = values.length === 1
      ? 160
      : (index / (values.length - 1)) * 320
    const y = 120 - (Math.max(0, Math.min(100, value)) / 100) * 95
    return { x, y }
  })
  const points = chartPoints
    .map(point => `${point.x},${point.y}`)
    .join(" ")
  const areaPoints = values.length === 1
    ? `${chartPoints[0].x},130 ${points} ${chartPoints[0].x},130`
    : `0,130 ${points} 320,130`

  return (
    <div className="summary-v2-area-chart">
      <div className="summary-v2-area-y-axis">
        {yTicks.map(tick => (
          <span
            key={tick}
            style={{ top: `${((100 - tick) / 100) * 100}%` }}
          >
            {tick}%
          </span>
        ))}
      </div>
      <svg viewBox="0 0 320 130" preserveAspectRatio="none">
        <defs>
          <linearGradient id="summaryAccuracyFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(tick => {
          const y = 120 - (tick / 100) * 95
          return (
            <line
              key={tick}
              x1="0"
              x2="320"
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.16)"
              strokeWidth="1"
            />
          )
        })}
        <polygon points={areaPoints} fill="url(#summaryAccuracyFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#a855f7"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {chartPoints.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="#c084fc"
            stroke="#111827"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  )
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes} min`
}

function formatJournalDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function activityTitle(
  sessionType: string,
  translate: (key: string) => string
) {
  const labels: Record<string, string> = {
    quiz: translate("stats.Quiz"),
    flashcards: translate("stats.Flashcards"),
    ask: translate("stats.Ask"),
    active_recall: translate("stats.Memory Check"),
    planner: translate("stats.Study Planner"),
  }

  return labels[sessionType] || translate("stats.Learning Session")
}

function activityIcon(sessionType: string) {
  const icons: Record<string, string> = {
    quiz: "◈",
    flashcards: "▣",
    ask: "?",
    active_recall: "◎",
    planner: "✦",
  }

  return icons[sessionType] || "•"
}

function activityTone(sessionType: string): "green" | "blue" | "purple" | "orange" {
  if (sessionType === "quiz") return "purple"
  if (sessionType === "flashcards") return "blue"
  if (sessionType === "ask") return "orange"
  return "green"
}

function insightIcon(index: number) {
  if (index === 0) return <Trophy size={20} />
  if (index === 1) return <Sparkles size={20} />
  return <Rocket size={20} />
}

const summaryV2Styles = `
  .summary-v2-root {
    min-height: 100%;
    padding: 4px 0 10px;
    color: #ffffff;
  }

  .summary-v2-hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .summary-v2-hero h1 {
    margin: 0 0 6px;
    font-size: clamp(30px, 3vw, 42px);
    line-height: 1.05;
    letter-spacing: -0.04em;
  }

  .summary-v2-hero p {
    margin: 0;
    color: #c7d2e3;
    font-size: 17px;
  }

  .summary-v2-toolbar {
    display: flex;
    gap: 14px;
    align-items: center;
  }

  .summary-v2-toolbar button,
  .summary-v2-card-heading button,
  .summary-v2-section-header button,
  .summary-v2-advice button {
    border: 1px solid rgba(47, 164, 255, 0.24);
    border-radius: 14px;
    background: rgba(9, 18, 34, 0.74);
    color: #ffffff;
    cursor: pointer;
  }

  .summary-v2-period {
    min-width: 176px;
    padding: 12px 16px;
    text-align: left;
  }

  .summary-v2-period span {
    display: block;
    color: #94a3b8;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .summary-v2-period strong {
    font-size: 15px;
  }

  .summary-v2-export {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 18px;
    font-weight: 800;
  }

  .summary-v2-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 18px;
  }

  .summary-v2-card,
  .summary-v2-section,
  .summary-v2-advice {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(80, 132, 186, 0.22);
    border-radius: 22px;
    background:
      radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 42%),
      linear-gradient(145deg, rgba(11, 22, 38, 0.94), rgba(5, 11, 20, 0.94));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 22px 60px rgba(0, 0, 0, 0.24);
  }

  .summary-v2-card-green {
    background:
      radial-gradient(circle at top right, rgba(34, 197, 94, 0.16), transparent 42%),
      linear-gradient(145deg, rgba(11, 22, 38, 0.94), rgba(5, 11, 20, 0.94));
  }

  .summary-v2-card-orange {
    background:
      radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 42%),
      linear-gradient(145deg, rgba(11, 22, 38, 0.94), rgba(5, 11, 20, 0.94));
  }

  .summary-v2-stat-card {
    min-height: 176px;
    padding: 24px;
  }

  .summary-v2-stat-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    color: #c9d7ed;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 13px;
  }

  .summary-v2-stat-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    color: #21c8ff;
    border: 1px solid rgba(33, 200, 255, 0.42);
    background: rgba(33, 200, 255, 0.08);
  }

  .summary-v2-stat-card strong {
    display: block;
    font-size: clamp(28px, 2.6vw, 38px);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .summary-v2-stat-card p {
    margin: 10px 0 0;
    color: #c7d2e3;
  }

  .summary-v2-stat-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .summary-v2-streak-card {
    min-height: 176px;
    padding: 24px;
    isolation: isolate;
    background:
      radial-gradient(circle at 78% 18%, rgba(251, 99, 64, 0.4), transparent 30%),
      radial-gradient(circle at 18% 12%, rgba(250, 204, 21, 0.22), transparent 34%),
      linear-gradient(145deg, rgba(35, 18, 15, 0.96), rgba(7, 12, 22, 0.96));
    border-color: rgba(251, 99, 64, 0.38);
  }

  .summary-v2-streak-glow {
    position: absolute;
    inset: auto -20% -45% 10%;
    height: 110px;
    background: radial-gradient(circle, rgba(251, 99, 64, 0.32), transparent 62%);
    filter: blur(6px);
    z-index: -1;
  }

  .summary-v2-streak-heading {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .summary-v2-streak-heading > span {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    color: #ff9b42;
    background: rgba(251, 99, 64, 0.16);
    border: 1px solid rgba(251, 99, 64, 0.34);
    box-shadow: 0 0 28px rgba(251, 99, 64, 0.25);
  }

  .summary-v2-streak-heading p {
    margin: 0 0 5px;
    color: #fed7aa;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  .summary-v2-streak-heading strong {
    display: block;
    font-size: clamp(30px, 2.8vw, 42px);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .summary-v2-streak-value {
    position: absolute;
    right: 24px;
    top: 56px;
    display: grid;
    place-items: center;
    width: 92px;
    height: 92px;
    border-radius: 999px;
    color: #fff7ed;
    background:
      radial-gradient(circle at 50% 50%, rgba(251, 99, 64, 0.18), rgba(15, 23, 42, 0.62)),
      linear-gradient(135deg, rgba(251, 99, 64, 0.36), rgba(250, 204, 21, 0.18));
    border: 1px solid rgba(251, 99, 64, 0.38);
    box-shadow: 0 0 32px rgba(251, 99, 64, 0.22);
    text-align: center;
  }

  .summary-v2-streak-value strong {
    font-size: 32px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .summary-v2-streak-value span {
    max-width: 70px;
    margin-top: 5px;
    color: #fed7aa;
    font-size: 10px;
    font-weight: 800;
    line-height: 1.15;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-v2-streak-days {
    display: flex;
    gap: 8px;
    margin-top: 42px;
  }

  .summary-v2-streak-days span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    color: #64748b;
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.2);
    font-size: 12px;
    font-weight: 800;
  }

  .summary-v2-streak-days .is-complete {
    color: #052e16;
    background: #22c55e;
    border-color: #22c55e;
    box-shadow: 0 0 18px rgba(34, 197, 94, 0.24);
  }

  .summary-v2-radial {
    width: 96px;
    height: 96px;
    flex: 0 0 auto;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: conic-gradient(var(--color) calc(var(--value) * 1%), rgba(48, 64, 86, 0.52) 0);
    box-shadow: 0 0 28px color-mix(in srgb, var(--color) 30%, transparent);
  }

  .summary-v2-radial > div {
    width: 70px;
    height: 70px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    text-align: center;
    background: #08111f;
  }

  .summary-v2-radial strong {
    font-size: 22px;
  }

  .summary-v2-radial span {
    display: block;
    max-width: 80px;
    color: #a9b8ca;
    font-size: 10px;
  }

  .summary-v2-mini-bars {
    display: flex;
    align-items: end;
    gap: 9px;
    width: 118px;
    height: 88px;
  }

  .summary-v2-mini-bars span {
    width: 16px;
    border-radius: 5px 5px 2px 2px;
    background: linear-gradient(180deg, #1687ff, #1763d8);
    box-shadow: 0 0 18px rgba(22, 135, 255, 0.3);
  }

  .summary-v2-main-grid {
    display: grid;
    grid-template-columns: 1.1fr 1.2fr 1fr;
    gap: 18px;
    margin-bottom: 18px;
  }

  .summary-v2-chart-card,
  .summary-v2-section {
    padding: 22px;
    min-height: 294px;
  }

  .summary-v2-card-heading,
  .summary-v2-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 20px;
  }

  .summary-v2-card-heading h3,
  .summary-v2-section-header h3 {
    margin: 0;
    color: #f8fbff;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    font-size: 17px;
  }

  .summary-v2-card-heading p {
    margin: 8px 0 0;
    color: #9fb0c6;
  }

  .summary-v2-card-heading button,
  .summary-v2-section-header button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #21c8ff;
    font-weight: 700;
    white-space: nowrap;
  }

  .summary-v2-donut-layout {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 1fr;
    gap: 24px;
    align-items: center;
  }

  .summary-v2-donut {
    width: min(220px, 100%);
    aspect-ratio: 1;
    border-radius: 999px;
    display: grid;
    place-items: center;
    margin: 0 auto;
  }

  .summary-v2-donut > div {
    width: 52%;
    height: 52%;
    display: grid;
    place-items: center;
    border-radius: 999px;
    text-align: center;
    background: #08111f;
  }

  .summary-v2-donut span,
  .summary-v2-donut small {
    color: #c7d2e3;
    font-size: 12px;
  }

  .summary-v2-donut strong {
    font-size: 32px;
  }

  .summary-v2-donut-legend {
    display: grid;
    gap: 14px;
  }

  .summary-v2-donut-legend div {
    display: grid;
    grid-template-columns: 13px 1fr auto auto;
    align-items: center;
    gap: 10px;
    color: #ffffff;
  }

  .summary-v2-donut-legend span {
    width: 13px;
    height: 13px;
    border-radius: 999px;
  }

  .summary-v2-donut-legend em,
  .summary-v2-donut-legend small {
    color: #d8e3f4;
    font-style: normal;
  }

  .summary-v2-legend {
    display: flex;
    justify-content: center;
    gap: 28px;
    margin-bottom: 14px;
    color: #c7d2e3;
    font-size: 13px;
  }

  .summary-v2-legend span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .summary-v2-legend i {
    width: 16px;
    height: 4px;
    border-radius: 999px;
  }

  .summary-v2-trend-chart {
    position: relative;
    min-height: 184px;
  }

  .summary-v2-trend-chart svg {
    position: absolute;
    inset: 0 0 28px;
    width: 100%;
    height: calc(100% - 28px);
  }

  .summary-v2-area-chart {
    position: relative;
    min-height: 184px;
    margin-top: 8px;
    padding-left: 42px;
  }

  .summary-v2-area-chart svg {
    position: absolute;
    inset: 0 0 0 42px;
    width: calc(100% - 42px);
    height: 100%;
  }

  .summary-v2-area-y-axis {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 34px;
  }

  .summary-v2-area-y-axis span {
    position: absolute;
    right: 8px;
    transform: translateY(-50%);
    color: #91a0b8;
    font-size: 11px;
    font-weight: 700;
  }

  .summary-v2-chart-grid {
    position: absolute;
    inset: 0 0 28px;
    background-image: linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px);
    background-size: 100% 38px;
  }

  .summary-v2-chart-axis {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    color: #91a0b8;
    font-size: 12px;
  }

  .summary-v2-accuracy-card-body {
    position: relative;
    padding-top: 4px;
  }

  .summary-v2-accuracy-value {
    position: absolute;
    right: 0;
    top: -54px;
    font-size: 42px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .summary-v2-empty-state {
    min-height: 184px;
    display: grid;
    place-items: center;
    padding: 22px;
    border-radius: 18px;
    color: #9fb0c6;
    text-align: center;
    background: rgba(15, 23, 42, 0.42);
    border: 1px dashed rgba(148, 163, 184, 0.24);
  }

  .summary-v2-lower-grid {
    display: grid;
    grid-template-columns: 1.08fr 1fr 1.16fr;
    gap: 18px;
    margin-bottom: 18px;
  }

  .summary-v2-section {
    min-height: 292px;
  }

  .summary-v2-insight {
    display: grid;
    grid-template-columns: 42px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }

  .summary-v2-insight:last-child {
    border-bottom: 0;
  }

  .summary-v2-insight-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    color: #22c55e;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.24);
  }

  .summary-v2-insight strong,
  .summary-v2-progress-row span,
  .summary-v2-timeline-card strong {
    display: block;
    color: #ffffff;
    font-size: 15px;
  }

  .summary-v2-insight p,
  .summary-v2-timeline-card p {
    margin: 5px 0 0;
    color: #aebbd0;
    font-size: 13px;
  }

  .summary-v2-insight em {
    color: #22c55e;
    font-size: 20px;
    font-style: normal;
    font-weight: 800;
  }

  .summary-v2-topic-list {
    display: grid;
    gap: 13px;
  }

  .summary-v2-focus-cta {
    width: 100%;
    margin-top: 20px;
    padding: 14px 18px;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #0b72ff, #00c8ff);
    color: #ffffff;
    font-weight: 900;
    cursor: pointer;
    box-shadow: 0 14px 34px rgba(11, 114, 255, 0.24);
  }

  .summary-v2-focus-cta.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .summary-v2-progress-row > div:first-child {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 8px;
  }

  .summary-v2-progress-row strong {
    font-size: 14px;
  }

  .summary-v2-progress-track {
    height: 7px;
    border-radius: 999px;
    background: rgba(71, 85, 105, 0.5);
    overflow: hidden;
  }

  .summary-v2-progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    box-shadow: 0 0 16px rgba(255, 77, 112, 0.42);
  }

  .summary-v2-timeline-list {
    display: grid;
    gap: 10px;
  }

  .summary-v2-timeline-card {
    display: grid;
    grid-template-columns: 38px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(18, 33, 54, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.1);
  }

  .summary-v2-timeline-card > span {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.18);
    color: #c084fc;
  }

  .summary-v2-timeline-blue > span {
    background: rgba(22, 135, 255, 0.18);
    color: #38bdf8;
  }

  .summary-v2-timeline-orange > span {
    background: rgba(251, 191, 36, 0.18);
    color: #fbbf24;
  }

  .summary-v2-timeline-green > span {
    background: rgba(34, 197, 94, 0.18);
    color: #22c55e;
  }

  .summary-v2-timeline-meta {
    text-align: right;
    min-width: 74px;
  }

  .summary-v2-timeline-meta small,
  .summary-v2-timeline-meta em {
    display: block;
    color: #c7d2e3;
    font-style: normal;
    font-size: 12px;
  }

  .summary-v2-advice {
    display: grid;
    grid-template-columns: 38px auto 1fr;
    align-items: center;
    gap: 18px;
    padding: 18px 22px;
    background:
      radial-gradient(circle at 8% 50%, rgba(250, 204, 21, 0.13), transparent 26%),
      linear-gradient(145deg, rgba(11, 22, 38, 0.94), rgba(5, 11, 20, 0.94));
  }

  .summary-v2-advice span {
    color: #facc15;
  }

  .summary-v2-advice strong {
    color: #21c8ff;
  }

  .summary-v2-advice p {
    margin: 0;
    color: #c7d2e3;
  }

  @media (max-width: 1200px) {
    .summary-v2-stats-grid,
    .summary-v2-main-grid,
    .summary-v2-lower-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-v2-main-grid > :first-child,
    .summary-v2-lower-grid > :last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 760px) {
    .summary-v2-hero,
    .summary-v2-toolbar,
    .summary-v2-stat-body,
    .summary-v2-donut-layout,
    .summary-v2-advice {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .summary-v2-stats-grid,
    .summary-v2-main-grid,
    .summary-v2-lower-grid {
      grid-template-columns: 1fr;
    }

    .summary-v2-main-grid > :first-child,
    .summary-v2-lower-grid > :last-child {
      grid-column: auto;
    }

    .summary-v2-stat-card,
    .summary-v2-chart-card,
    .summary-v2-section {
      padding: 18px;
    }

    .summary-v2-streak-value {
      position: static;
      margin-top: 18px;
    }

    .summary-v2-timeline-card {
      grid-template-columns: 32px 1fr;
    }

    .summary-v2-timeline-meta {
      grid-column: 2;
      text-align: left;
    }
  }
`
