import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

export function useTaxonomyDocuments(projectId: string, loadTopics: any) {
  const [documents, setDocuments] = useState<any[]>([])
  const [error, setError] = useState(false)
  const reload = useRef(loadTopics)
  reload.current = loadTopics
  const refresh = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let last = ""
    let busy = false
    async function poll() {
      if (busy || !projectId) return
      busy = true
      clearTimeout(timer)
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session?.access_token) throw Error("Session required")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents`, { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        if (!response.ok) throw Error("Documents unavailable")
        const body = await response.json()
        if (!active) return
        setError(false); setDocuments(body.documents || [])
        const signature = JSON.stringify(body.documents)
        if (signature !== last) await reload.current?.(projectId)
        last = signature
      } catch { if (active) setError(true) }
      finally {
        busy = false
        if (active) timer = setTimeout(poll, 4000)
      }
    }
    refresh.current = poll
    setDocuments([])
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [projectId])
  return { documents, error, refresh: async () => { await refresh.current(); await reload.current?.(projectId) } }
}
