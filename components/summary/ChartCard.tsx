import type { ReactNode } from "react"
import SummaryCard from "./SummaryCard"

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string
  subtitle?: string
  action?: string
  children: ReactNode
  className?: string
}) {
  return (
    <SummaryCard className={`summary-v2-chart-card ${className}`}>
      <div className="summary-v2-card-heading">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <button type="button">{action} →</button>}
      </div>
      {children}
    </SummaryCard>
  )
}
