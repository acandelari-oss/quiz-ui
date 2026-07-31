import type { ReactNode } from "react"

export default function InsightCard({
  icon,
  title,
  text,
  value,
  tone = "green",
}: {
  icon: ReactNode
  title: string
  text: string
  value?: string
  tone?: "green" | "red" | "blue" | "orange"
}) {
  return (
    <div className={`summary-v2-insight summary-v2-insight-${tone}`}>
      <span className="summary-v2-insight-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      {value && <em>{value}</em>}
    </div>
  )
}
