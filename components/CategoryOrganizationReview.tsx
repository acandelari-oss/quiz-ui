import React from "react"
import { useTranslation } from "react-i18next"
import { supabase } from "../lib/supabase"

export default function CategoryOrganizationReview({ topics, projectId, loadTopics, ready }: any) {
  const { t } = useTranslation()
  const [moved, setMoved] = React.useState<Record<string, boolean>>({})
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState(false)
  const details = React.useRef<HTMLDetailsElement>(null)
  React.useEffect(() => { setMoved({}); setError(false) }, [topics, projectId])
  const pending = (topics || []).filter((topic: any) =>
    topic.system_category === "to_organize" && !moved[topic.id])
  if (!ready || !pending.length) return null

  async function move(topic: any, category: string) {
    if (!category || busy) return
    setBusy(topic.id)
    setError(false)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.access_token) throw new Error("Session required")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics/${topic.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      })
      if (!response.ok) throw new Error("Reassignment failed")
      setMoved(previous => ({ ...previous, [topic.id]: true }))
      if (loadTopics) await loadTopics(projectId)
    } catch { setError(true) }
    finally { setBusy(null) }
  }

  return <aside style={{ margin: "0 16px 16px", padding: 14, border: "1px solid #64748b", borderRadius: 10 }}>
    <p role="status">{t("categoryReview.completed", { count: pending.length })}</p>
    <p>{t("categoryReview.help")}</p>
    <button type="button" style={{ padding: "8px 12px", background: "#15313a", color: "#dffeff", border: "1px solid #2fa4a9", borderRadius: 8, cursor: "pointer" }} onClick={() => {
      if (details.current) {
        details.current.open = true
        details.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
        details.current.querySelector("select")?.focus()
      }
    }}>{t("categoryReview.open")}</button>
    {error && <p role="alert">{t("categoryReview.error")}</p>}
    <details ref={details}>
      <summary>{t("categoryReview.title")} — {t("categoryReview.system")}</summary>
      {pending.map((topic: any) => <div key={topic.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingTop: 12 }}>
        <span style={{ flex: "1 1 220px", overflowWrap: "anywhere" }}>{topic.topic}</span>
        <label style={{ maxWidth: "100%" }}>
          <span>{t("categoryReview.move")}</span>{" "}
          <select aria-label={`${t("categoryReview.move")} ${topic.topic}`} value=""
            style={{ maxWidth: "100%", padding: 8, background: "#0b1220", color: "#f8fafc" }}
            disabled={!!busy || topic.accepted_for_study || topic.taxonomy_locked}
            onChange={event => void move(topic, event.target.value)}>
            <option value="">{t("categoryReview.choose")}</option>
            {(topic.review_categories || []).map((name: string) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>)}
    </details>
  </aside>
}
