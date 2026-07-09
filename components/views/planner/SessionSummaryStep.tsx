import type { PlannerDailyPlan } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function SessionSummaryStep({
  dailyPlan,
  onBackToDashboard
}: {
  dailyPlan: PlannerDailyPlan
  onBackToDashboard: () => void
}) {
  const { t: translate } = useTranslation()
  const summary = dailyPlan.summary

  return (
    <div style={container}>
      <section style={heroCard}>
        <div style={eyebrow}>{translate("stats.Module Summary")}</div>
        <h2 style={title}>{translate("stats.Module completed", { module: dailyPlan.day })}</h2>
        <p style={paragraph}>{summary.professorDebrief}</p>
      </section>

      <section style={card}>
        <div style={sectionTitle}>{translate("stats.Module Data")}</div>
        <div style={dataGrid}>
          <DataPoint label={translate("stats.Flashcards")} value={String(summary.sessionData.flashcards)} />
          <DataPoint label={translate("stats.Quiz")} value={String(summary.sessionData.quiz)} />
          <DataPoint label={translate("stats.Accuracy")} value={summary.sessionData.accuracy} />
          <DataPoint label={translate("stats.Time")} value={summary.sessionData.time} />
        </div>
      </section>

      <section style={card}>
        <div style={sectionTitle}>{translate("stats.Homework Recommendations")}</div>
        <ul style={homeworkList}>
          {summary.homeworkRecommendations.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div style={twoColumn}>
        <section style={infoBox}>
          <div style={boxTitle}>{summary.activeRecall.title}</div>
          <p style={boxText}>{summary.activeRecall.message}</p>
        </section>

        <section style={infoBox}>
          <div style={boxTitle}>{summary.officeHours.title}</div>
          <p style={boxText}>{summary.officeHours.message}</p>
        </section>
      </div>

      <button onClick={onBackToDashboard} style={primaryButton}>
        {translate("stats.Back to Study Plan")}
      </button>
    </div>
  )
}

function DataPoint({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={dataPoint}>
      <div style={dataValue}>{value}</div>
      <div style={dataLabel}>{label}</div>
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 980,
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

const dataGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10
}

const dataPoint = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 14
}

const dataValue = {
  color: "#36F2ED",
  fontWeight: 900,
  fontSize: 22,
  marginBottom: 4
}

const dataLabel = {
  color: "#9ca3af",
  fontSize: 12
}

const homeworkList = {
  color: "#cbd5e1",
  lineHeight: 1.8,
  margin: 0,
  paddingLeft: 20
}

const twoColumn = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  marginBottom: 22
}

const infoBox = {
  background: "#052b2a",
  border: "1px solid #0e6c69",
  borderRadius: 16,
  padding: 18
}

const boxTitle = {
  color: "#36F2ED",
  fontWeight: 900,
  marginBottom: 8
}

const boxText = {
  color: "#cbd5e1",
  lineHeight: 1.6,
  margin: 0
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
