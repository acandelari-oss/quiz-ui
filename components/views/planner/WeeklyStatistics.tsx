import type { PlannerStatistic } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function WeeklyStatistics({
  statistics,
  planType = "study_plan"
}: {
  statistics: PlannerStatistic[]
  planType?: string
}) {
  const { t: translate } = useTranslation()
  const isAssessmentPlan = planType === "assessment"

  return (
    <section style={section}>
      <div style={sectionLabel}>
        {translate(isAssessmentPlan
          ? "stats.Assessment Statistics"
          : "stats.Study Plan Statistics")}
      </div>
      <div style={statsGrid}>
        {statistics.map(stat => (
          <div key={stat.label} style={statCard}>
            <div style={statValue}>{stat.value}</div>
            <div style={statLabel}>
              {translate(`stats.${stat.label}`, { defaultValue: stat.label })}
            </div>
            <div style={statDetail}>
              {translate(`stats.${stat.detail}`, { defaultValue: stat.detail })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const section = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22
}

const sectionLabel = {
  color: "white",
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 16
}

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12
}

const statCard = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 16
}

const statValue = {
  color: "#36F2ED",
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 4
}

const statLabel = {
  color: "white",
  fontWeight: 700,
  marginBottom: 6
}

const statDetail = {
  color: "#9ca3af",
  fontSize: 13
}
