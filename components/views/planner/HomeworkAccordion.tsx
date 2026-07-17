import Accordion from "./Accordion"
import type { PlannerHomework } from "./PlannerTypes"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import MarkdownContent from "@/components/ui/MarkdownContent"

export default function HomeworkAccordion({
  homework
}: {
  homework: PlannerHomework[]
}) {
  const { t: translate } = useTranslation()

  if (homework.length === 0) {
    return null
  }

  return (
    <section className="planner-mobile-homework-section" style={section}>
      <div className="planner-mobile-section-label" style={sectionLabel}>{translate("stats.Homework")}</div>
      <Accordion
        items={homework.map(item => ({
          title: item.day,
          subtitle: translate("stats.Professor homework suggestions"),
          content: (
            <HomeworkText text={item.suggestion} />
          )
        }))}
      />
      <style jsx global>{`
        @media (max-width: 900px) {
          .planner-mobile-homework-section {
            padding: 12px !important;
            margin-bottom: 10px !important;
            border-radius: 12px !important;
          }

          .planner-mobile-homework-text {
            line-height: 1.45 !important;
            max-height: 5.8em;
            overflow: hidden;
          }

          .planner-mobile-homework-text.is-expanded {
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

function HomeworkText({ text }: { text: string }) {
  const { t: translate } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className={
          expanded
            ? "planner-mobile-homework-text is-expanded"
            : "planner-mobile-homework-text"
        }
        style={paragraph}
      >
        <MarkdownContent text={text} />
      </div>
      <button
        type="button"
        className="planner-mobile-read-more"
        onClick={() => setExpanded(!expanded)}
      >
        {translate(expanded ? "stats.Show less" : "stats.Read more")}
      </button>
    </>
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

const paragraph = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.6
}
