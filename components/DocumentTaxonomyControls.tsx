import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { supabase } from "../lib/supabase"

type CategoryPreview = {
  document_id: string
  topic_count: number
  categories: { name: string; topic_count: number }[]
  assignments: { topic_id: string; topic_title: string; category: string }[]
}

export default function DocumentTaxonomyControls({ document, projectId, locked, onChanged }: any) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  // Temporary preview UI; never applies organization or refreshes persisted taxonomy.
  const [preview, setPreview] = useState<CategoryPreview | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewRequested = useRef(false)
  async function generatePreview() {
    if (previewRequested.current || busy || locked || !document.id || document.status !== "ready") return
    previewRequested.current = true
    setPreviewBusy(true)
    setPreviewError(null)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.access_token) throw Error(t("documentTaxonomy.previewSession"))
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(document.id)}/category-organization/preview`, {
        method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      const body = await response.json()
      if (!response.ok) throw Error(typeof body.detail === "string" ? body.detail : t("documentTaxonomy.previewError"))
      if (body.document_id !== document.id || !Array.isArray(body.categories) || !Array.isArray(body.assignments)) throw Error(t("documentTaxonomy.previewError"))
      setPreview(body)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : t("documentTaxonomy.previewError"))
    } finally {
      setPreviewBusy(false)
    }
  }
  const status = document.status || "legacy"
  async function act(retry: boolean) {
    if (busy || previewBusy || locked || !window.confirm(t(retry ? "documentTaxonomy.confirmRetry" : "documentTaxonomy.confirmDelete"))) return
    setBusy(true); setError(false)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session?.access_token) throw Error("Session required")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents/${encodeURIComponent(document.id)}${retry ? "/taxonomy/retry" : ""}`, {
        method: retry ? "POST" : "DELETE", headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      if (!response.ok) throw Error("Document action failed")
      await onChanged()
    } catch { setError(true) }
    finally { setBusy(false) }
  }
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "8px 4px" }}>
    <span role="status">{t(`documentTaxonomy.${status}`)}</span>
    {!locked && document.id && <>
      {["failed", "queued", "building"].includes(status) && <button disabled={busy || previewBusy} onClick={() => void act(true)}>{t(status === "failed" ? "documentTaxonomy.retry" : "documentTaxonomy.recover")}</button>}
      <button disabled={busy || previewBusy} onClick={() => void act(false)}>{t("documentTaxonomy.delete")}</button>
    </>}
    {!locked && document.id && status === "ready" && <button
      disabled={busy || previewRequested.current}
      onClick={() => void generatePreview()}
    >{t(previewBusy ? "documentTaxonomy.previewLoading" : "documentTaxonomy.preview")}</button>}
    {previewBusy && <span role="status">{t("documentTaxonomy.previewLoading")}</span>}
    {previewError && <span role="alert">{previewError}</span>}
    {preview && <div style={{ flexBasis: "100%", minWidth: 0, border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
      <p role="status">{t("documentTaxonomy.previewNotice", { count: preview.topic_count })}</p>
      {preview.categories.map(category => <details key={category.name} style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", overflowWrap: "anywhere" }}>{category.name} ({category.topic_count})</summary>
        <ul style={{ maxHeight: 320, overflowY: "auto", overflowWrap: "anywhere" }}>
          {preview.assignments.filter(topic => topic.category === category.name).map(topic =>
            <li key={topic.topic_id}>{topic.topic_title}</li>)}
        </ul>
      </details>)}
    </div>}
    {error && <span role="alert">{t("documentTaxonomy.actionError")}</span>}
  </div>
}
