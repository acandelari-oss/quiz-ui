import type { PlannerDailyPlan } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function DailyBriefingStep({
  dailyPlan,
  onStart,
  onBackToDashboard
}: {
  dailyPlan: PlannerDailyPlan
  onStart: () => void
  onBackToDashboard: () => void
}) {
  const { t: translate } = useTranslation()

  return (
    <div style={container}>
      <button onClick={onBackToDashboard} style={backButton}>
        {translate("stats.Back to Planner")}
      </button>

      <section style={heroCard}>
        <div style={eyebrow}>{translate("stats.Professor Module Briefing")}</div>
        <h2 style={title}>{translate("stats.Module Session", { module: dailyPlan.day })}</h2>
        <p style={paragraph}>{dailyPlan.briefing}</p>
      </section>

      <section style={card}>
        <div style={sectionTitle}>{translate("stats.Module objective")}</div>
        <p style={paragraph}>{dailyPlan.objective}</p>
      </section>

      <section style={card}>
        <div style={sectionTitle}>{translate("stats.Planned activities")}</div>
        <div style={activityList}>
          {dailyPlan.activities.map((activity, index) => (
            <div key={activity.id} style={activityRow}>
              <div>
                <div style={activityTitle}>
                  {index + 1}. {activity.title}
                </div>
                <div style={activityMeta}>
                  {activity.configuration.category} · {activity.configuration.count}
                  {activity.type === "quiz"
                    ? ` ${translate("stats.questions")}`
                    : ` ${translate("stats.cards")}`}
                  {activity.configuration.difficulty
                    ? ` · ${activity.configuration.difficulty}`
                    : ""}
                  {activity.configuration.style
                    ? ` · ${activity.configuration.style}`
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button onClick={onStart} style={primaryButton}>
        {translate("stats.Start Session")}
      </button>
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
