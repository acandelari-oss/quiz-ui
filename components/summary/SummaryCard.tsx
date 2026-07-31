import type { ReactNode } from "react"

export default function SummaryCard({
  children,
  className = "",
  accent = "blue",
}: {
  children: ReactNode
  className?: string
  accent?: "blue" | "green" | "orange" | "purple" | "red" | "teal"
}) {
  return (
    <section className={`summary-v2-card summary-v2-card-${accent} ${className}`}>
      {children}
    </section>
  )
}
