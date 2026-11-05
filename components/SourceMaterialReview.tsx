import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { supabase } from "../lib/supabase"

export default function SourceMaterialReview({ projectId, documentId, ready, locked }: any) {
  const { t } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState(false)
  const url = `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents/${documentId}/source-review`
  async function headers() {
    const { data } = await supabase.auth.getSession()
    if (!data.session?.access_token) throw Error("Session required")
    return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }
  }
  useEffect(() => {
    let active = true
    setData(null); setError(false)
    if (ready && documentId) void (async () => {
      try {
        const response = await fetch(url, { headers: await headers() })
        if (!response.ok) throw Error("Review unavailable")
        const result = await response.json()
        if (active) setData(result)
      } catch { if (active) setError(true) }
    })()
    return () => { active = false }
  }, [url, ready, documentId])
  if (!ready || !documentId) return null
  const unsupported = data?.unsupported_candidates || []
  if (!error && !data?.pending_count && !unsupported.length) return null
  return <aside style={{ margin: "12px 0", padding: 12, border: "1px solid #b99756", borderRadius: 8 }}>
    {error && <p role="alert">{t("sourceReview.coverageError")}</p>}
    {data && (data.pending_count > 0 || unsupported.length > 0) && <details>
      <summary><span role="status">{t("sourceReview.coverageNotice")}</span></summary>
      {data.pending_count > 0 && <p>{t("sourceReview.coverageSummary")}</p>}
      {unsupported.length > 0 && <p>{t("sourceReview.proposalsNote")}</p>}
      {data.stale && <p role="alert">{t("sourceReview.coverageStale")}</p>}
    </details>}
  </aside>
}
