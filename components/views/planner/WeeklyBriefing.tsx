import type { PlannerMockData } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function WeeklyBriefing({
  briefing
}: {
  briefing: PlannerMockData["weeklyBriefing"]
}) {
  const { t: translate } = useTranslation()

  return (
    <section style={section}>
      <div style={sectionLabel}>
        {translate("stats.Professor Study Plan Briefing")}
      </div>
      <div style={briefingGrid}>
        <BriefingBlock
          title={translate("stats.Why these categories")}
          text={briefing.selectedCategoriesReason}
        />
        <BriefingBlock
          title={translate("stats.Study Plan Objective")}
          text={briefing.objective}
        />
        <BriefingBlock
          title={translate("stats.What comes next")}
          text={briefing.lowerPriorityCategories}
        />
      </div>
    </section>
  )
}

function BriefingBlock({
  title,
  text
}: {
  title: string
  text: string
}) {
  return (
    <div style={block}>
      <div style={titleStyle}>{title}</div>
      <p style={textStyle}>{text}</p>
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

const briefingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14
}

const block = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 16
}

const titleStyle = {
  color: "#36F2ED",
  fontWeight: 800,
  marginBottom: 8
}

const textStyle = {
  color: "#cbd5e1",
  lineHeight: 1.6,
  margin: 0
}
