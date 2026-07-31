import type { ReactNode } from "react"

export default function SummarySection({
  title,
  action,
  children,
  className = "",
}: {
  title: string
  action?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`summary-v2-section ${className}`}>
      <div className="summary-v2-section-header">
        <h3>{title}</h3>
        {action && <button type="button">{action} →</button>}
      </div>
      {children}
    </section>
  )
}
