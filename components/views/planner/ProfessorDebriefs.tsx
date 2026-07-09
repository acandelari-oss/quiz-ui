import Accordion from "./Accordion"
import type { PlannerDebrief } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function ProfessorDebriefs({
  debriefs
}: {
  debriefs: PlannerDebrief[]
}) {
  const { t: translate } = useTranslation()

  if (debriefs.length === 0) {
    return null
  }

  return (
    <section style={section}>
      <div style={sectionLabel}>{translate("stats.Professor Daily Debriefs")}</div>
      <Accordion
        items={debriefs.map(debrief => ({
          title: debrief.day,
          subtitle: debrief.sessionData.focus,
          content: (
            <div>
              <div style={subheading}>{translate("stats.Professor Debrief")}</div>
              <p style={paragraph}>{debrief.professorDebrief}</p>

              <div style={subheading}>{translate("stats.Module Data")}</div>
              <div style={dataGrid}>
                <DataPoint label={translate("stats.Flashcards")} value={String(debrief.sessionData.flashcards)} />
                <DataPoint label={translate("stats.Quiz")} value={String(debrief.sessionData.quiz)} />
                <DataPoint label={translate("stats.Accuracy")} value={debrief.sessionData.accuracy} />
                <DataPoint label={translate("stats.Time")} value={debrief.sessionData.time} />
              </div>
            </div>
          )
        }))}
      />
    </section>
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

const subheading = {
  color: "#36F2ED",
  fontWeight: 800,
  margin: "8px 0"
}

const paragraph = {
  margin: "0 0 16px",
  color: "#cbd5e1"
}

const dataGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10
}

const dataPoint = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 10,
  padding: 12
}

const dataValue = {
  color: "white",
  fontWeight: 900,
  marginBottom: 4
}

const dataLabel = {
  color: "#9ca3af",
  fontSize: 12
}
