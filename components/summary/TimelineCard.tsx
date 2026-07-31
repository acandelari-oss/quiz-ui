export default function TimelineCard({
  icon,
  title,
  detail,
  meta,
  result,
  action,
  onAction,
  tone = "green",
}: {
  icon: string
  title: string
  detail: string
  meta: string
  result: string
  action?: string
  onAction?: () => void
  tone?: "green" | "blue" | "purple" | "orange"
}) {
  return (
    <article className={`summary-v2-timeline-card summary-v2-timeline-${tone}`}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <div className="summary-v2-timeline-meta">
        <small>{meta}</small>
        <em>{result}</em>
        {action && (
          <button type="button" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
    </article>
  )
}
