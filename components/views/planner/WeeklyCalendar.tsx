import type { PlannerDay } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function WeeklyCalendar({
  weekLabel,
  days,
  planType = "study_plan",
  onDayClick
}: {
  weekLabel: string
  days: PlannerDay[]
  planType?: string
  onDayClick: (day: PlannerDay) => void
}) {
  const { t: translate } = useTranslation()
  const completed = days.filter(day => day.status === "completed").length
  const currentModule = days.find(day => day.status === "today")
  const remaining = days.filter(day => day.status !== "completed").length
  const isAssessmentPlan = planType === "assessment"

  return (
    <section style={section} aria-label={weekLabel}>
      <div style={topRow}>
        <div>
          <div style={eyebrow}>
            {translate(isAssessmentPlan ? "stats.Current Assessment" : "stats.Current plan")}
          </div>
          <h2 style={title}>
            {translate(isAssessmentPlan ? "stats.Professor Assessment" : "stats.Study Plan")}
          </h2>
        </div>

        <div style={summaryRow}>
          <StatusPill label={translate("stats.Completed")} value={String(completed)} />
          <StatusPill
            label={translate(isAssessmentPlan
              ? "stats.Current assessment module"
              : "stats.Current module")}
            value={currentModule?.day || "—"}
          />
          <StatusPill label={translate("stats.Remaining")} value={String(remaining)} />
        </div>
      </div>

      <div style={calendarGrid}>
        {days.map(day => {
          const styles = statusStyles[day.status]

          return (
            <button
              key={day.day}
              onClick={() => onDayClick(day)}
              style={{
                ...dayCard,
                border: `1px solid ${styles.border}`,
                background: styles.background
              }}
            >
              <div style={dayHeader}>
                <span style={dayName}>{day.day}</span>
              </div>

              <div style={categoryList}>
                {day.categories.length > 0
                  ? day.categories.map(category => (
                    <div key={category} style={categoryText}>{category}</div>
                  ))
                  : (
                    <div style={categoryText}>
                      {translate(isAssessmentPlan
                        ? "stats.Open assessment module"
                        : "stats.Open study module")}
                    </div>
                  )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StatusPill({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={pill}>
      <span style={pillLabel}>{label}</span>
      <span style={pillValue}>{value}</span>
    </div>
  )
}

const statusStyles = {
  completed: {
    border: "#0e6c69",
    background: "#052b2a",
    color: "#36F2ED"
  },
  today: {
    border: "#2b7dcb",
    background: "rgba(43, 125, 203, 0.18)",
    color: "#93c5fd"
  },
  remaining: {
    border: "#374151",
    background: "#111827",
    color: "#9ca3af"
  }
}

const section = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 22,
  marginBottom: 22
}

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 20,
  flexWrap: "wrap" as const
}

const eyebrow = {
  color: "#36F2ED",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  marginBottom: 6
}

const title = {
  margin: 0,
  color: "white",
  fontSize: 30,
  fontWeight: 800
}

const summaryRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const
}

const pill = {
  padding: "9px 12px",
  borderRadius: 999,
  background: "#111827",
  border: "1px solid #374151",
  display: "flex",
  gap: 8,
  alignItems: "center"
}

const pillLabel = {
  color: "#9ca3af",
  fontSize: 12
}

const pillValue = {
  color: "white",
  fontWeight: 800,
  fontSize: 13
}

const calendarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12
}

const dayCard = {
  minHeight: 150,
  borderRadius: 14,
  padding: 14,
  color: "white",
  cursor: "pointer",
  textAlign: "left" as const
}

const dayHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12
}

const dayName = {
  fontWeight: 800
}

const categoryList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6
}

const categoryText = {
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.4
}
