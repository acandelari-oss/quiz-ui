import type { ReactNode } from "react"
import SummaryCard from "./SummaryCard"

export default function StatisticCard({
  icon,
  label,
  value,
  detail,
  children,
  accent = "blue",
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  children?: ReactNode
  accent?: "blue" | "green" | "orange" | "purple" | "red" | "teal"
}) {
  return (
    <SummaryCard className="summary-v2-stat-card" accent={accent}>
      <div className="summary-v2-stat-top">
        <span className="summary-v2-stat-icon">{icon}</span>
        <span className="summary-v2-stat-label">{label}</span>
      </div>
      <div className="summary-v2-stat-body">
        <div>
          <strong>{value}</strong>
          <p>{detail}</p>
        </div>
        {children}
      </div>
    </SummaryCard>
  )
}
