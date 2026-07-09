import Accordion from "./Accordion"
import type { PlannerHomework } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function HomeworkAccordion({
  homework
}: {
  homework: PlannerHomework[]
}) {
  const { t: translate } = useTranslation()

  return (
    <section style={section}>
      <div style={sectionLabel}>{translate("stats.Homework")}</div>
      <Accordion
        items={homework.map(item => ({
          title: item.day,
          subtitle: translate("stats.Professor homework suggestions"),
          content: (
            <p style={paragraph}>
              {item.suggestion}
            </p>
          )
        }))}
      />
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

const paragraph = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.6
}
