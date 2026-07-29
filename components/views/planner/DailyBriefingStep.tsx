import type { PlannerDailyPlan } from "./PlannerTypes"
import { useTranslation } from "react-i18next"
import MarkdownContent from "@/components/ui/MarkdownContent"
import CategoryLabel from "@/components/ui/CategoryLabel"

export default function DailyBriefingStep({
  dailyPlan,
  onStart,
  onBackToDashboard
}: {
  dailyPlan: PlannerDailyPlan
  onStart: () => void
  onBackToDashboard: () => void
}) {
  const { i18n } = useTranslation()
  const plannerLanguage = plannerLanguageCode(dailyPlan.studyLanguage, i18n.language)
  const plannerTranslate = i18n.getFixedT(plannerLanguage)
  const isAssessmentPlan = dailyPlan.planType === "assessment"

  return (
    <div style={container}>
      <button onClick={onBackToDashboard} style={backButton}>
        {plannerTranslate("stats.Back to Planner")}
      </button>

      <section style={heroCard}>
        {isAssessmentPlan ? (
          <div style={eyebrow}>{plannerTranslate("stats.Professor Assessment")}</div>
        ) : (
          <div style={eyebrow}>{plannerTranslate("stats.Professor Module Briefing")}</div>
        )}
        <h2 style={title}>
          {plannerTranslate(isAssessmentPlan
            ? "stats.Assessment Module Session"
            : "stats.Module Session", { module: dailyPlan.day })}
        </h2>
        <div style={paragraph}>
          <MarkdownContent
            text={
              isAssessmentPlan
                ? plannerTranslate("stats.This module contributes to your initial assessment. Answer honestly; if you are unsure, choose your best answer. Every answer helps improve the Study Plan that follows.")
                : dailyPlan.briefing
            }
          />
        </div>
      </section>

      {!isAssessmentPlan && dailyPlan.objective && (
        <section style={card}>
          <div style={sectionTitle}>{plannerTranslate("stats.Module objective")}</div>
          <div style={paragraph}>
            <MarkdownContent text={dailyPlan.objective} />
          </div>
        </section>
      )}

      <section style={card}>
        <div style={sectionTitle}>{plannerTranslate("stats.Planned activities")}</div>
        <div style={activityList}>
          {dailyPlan.activities.map((activity, index) => (
            <div key={activity.id} style={activityRow}>
              <div>
                <div style={activityTitle}>
                  {index + 1}. {plannerTranslate(`stats.${activity.title}`, { defaultValue: activity.title })}
                </div>
                <div style={activityMeta}>
                  <CategoryLabel category={activity.configuration.category} /> · {activity.configuration.count}
                  {activity.type === "quiz"
                    ? ` ${plannerTranslate("stats.questions")}`
                    : ` ${plannerTranslate("stats.cards")}`}
                  {activity.configuration.difficulty
                    ? ` · ${plannerTranslate(`stats.${activity.configuration.difficulty}`, { defaultValue: activity.configuration.difficulty })}`
                    : ""}
                  {activity.configuration.style
                    ? ` · ${plannerTranslate(`stats.${activity.configuration.style}`, { defaultValue: activity.configuration.style })}`
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button onClick={onStart} style={primaryButton}>
        {plannerTranslate("stats.Start Session")}
      </button>
    </div>
  )
}

function plannerLanguageCode(
  studyLanguage?: string | null,
  fallbackLanguage = "en"
) {
  const normalized = String(studyLanguage || fallbackLanguage)
    .trim()
    .toLowerCase()

  if (normalized.startsWith("it")) {
    return "it"
  }

  if (normalized.startsWith("italian")) {
    return "it"
  }

  return "en"
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

const paragraph = {
  color: "#cbd5e1",
  lineHeight: 1.7,
  margin: 0
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

const activityList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10
}

const activityRow = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 14
}

const activityTitle = {
  color: "white",
  fontWeight: 800,
  marginBottom: 5
}

const activityMeta = {
  color: "#9ca3af",
  fontSize: 13
}

const primaryButton = {
  width: "100%",
  padding: "13px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2b7dcb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer"
}

const backButton = {
  marginBottom: 18,
  border: "1px solid #374151",
  background: "#0b111d",
  color: "#cbd5e1",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 800
}
