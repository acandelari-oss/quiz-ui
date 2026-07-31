export default function ProgressCard({
  title,
  value,
  color = "#22c55e",
}: {
  title: string
  value: number
  color?: string
}) {
  return (
    <div className="summary-v2-progress-row">
      <div>
        <span>{title}</span>
        <strong>{value}%</strong>
      </div>
      <div className="summary-v2-progress-track">
        <span
          style={{
            width: `${value}%`,
            background: color,
          }}
        />
      </div>
    </div>
  )
}
