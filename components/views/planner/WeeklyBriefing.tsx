import type { PlannerMockData } from "./PlannerTypes"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export default function WeeklyBriefing({
  briefing
}: {
  briefing: PlannerMockData["weeklyBriefing"]
}) {
  const { t: translate } = useTranslation()

  return (
    <section className="planner-mobile-briefing-section" style={section}>
      <div className="planner-mobile-section-label" style={sectionLabel}>
        {translate("stats.Professor Study Plan Briefing")}
      </div>
      <div className="planner-mobile-briefing-grid" style={briefingGrid}>
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
      <style jsx global>{`
        @media (max-width: 900px) {
          .planner-mobile-briefing-section {
            padding: 12px !important;
            margin-bottom: 10px !important;
            border-radius: 12px !important;
          }

          .planner-mobile-section-label {
            font-size: 16px !important;
            margin-bottom: 10px !important;
          }

          .planner-mobile-briefing-grid {
            grid-template-columns: 1fr !important;
            gap: 9px !important;
          }

          .planner-mobile-briefing-block {
            padding: 11px !important;
            border-radius: 10px !important;
          }

          .planner-mobile-briefing-title {
            margin-bottom: 5px !important;
          }

          .planner-mobile-briefing-text {
            line-height: 1.45 !important;
            max-height: 8.7em;
            overflow: hidden;
          }

          .planner-mobile-briefing-text.is-expanded {
            max-height: none;
          }

          .planner-mobile-read-more {
            display: inline-block;
            margin-top: 7px;
            border: none;
            background: transparent;
            color: #36F2ED;
            padding: 0;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }
        }

        @media (min-width: 901px) {
          .planner-mobile-read-more {
            display: none;
          }
        }
      `}</style>
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
  const { t: translate } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="planner-mobile-briefing-block" style={block}>
      <div className="planner-mobile-briefing-title" style={titleStyle}>{title}</div>
      <p
        className={
          expanded
            ? "planner-mobile-briefing-text is-expanded"
            : "planner-mobile-briefing-text"
        }
        style={textStyle}
      >
        {text}
      </p>
      <button
        type="button"
        className="planner-mobile-read-more"
        onClick={() => setExpanded(!expanded)}
      >
        {translate(expanded ? "stats.Show less" : "stats.Read more")}
      </button>
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
