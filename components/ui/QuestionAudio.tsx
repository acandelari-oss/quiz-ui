import { useEffect, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"

// Mounted only for the current question; its object URL lives for this mount.
export default function QuestionAudio({ projectId, question, enabled }: { projectId: string; question: string; enabled: boolean }) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const request = useRef<AbortController | null>(null)
  const url = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      request.current?.abort()
      audio?.pause()
      audio?.removeAttribute("src")
      audio?.load()
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) void play()
    return () => {
      request.current?.abort()
      request.current = null
      audioRef.current?.pause()
      setLoading(false)
    }
  }, [enabled])

  async function play() {
    if (!enabled) return
    if (request.current) return
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      audio.currentTime = 0
    }
    const controller = new AbortController()
    request.current = controller
    setError(false)
    setBlocked(false)
    try {
      if (!url.current) {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (controller.signal.aborted) return
        if (!session?.access_token) throw new Error("No session")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${encodeURIComponent(projectId)}/active_recall_question_audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ question }),
          signal: controller.signal
        })
        if (!response.ok) throw new Error("Audio unavailable")
        const blob = await response.blob()
        if (controller.signal.aborted) return
        url.current = URL.createObjectURL(blob)
        audio.src = url.current
      }
      audio.currentTime = 0
      await audio.play()
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof Error && error.name === "NotAllowedError") setBlocked(true)
        else setError(true)
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null
        setLoading(false)
      }
    }
  }

  return <div style={{ marginTop: 10 }}>
    <audio ref={audioRef} onError={() => setError(true)} />
    <button type="button" onClick={play} disabled={loading || !enabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "7px 10px", color: "#7dd3fc", opacity: enabled ? 1 : 0.5, cursor: loading ? "wait" : enabled ? "pointer" : "default" }}>
      <Volume2 size={16} aria-hidden="true" />
      {t(loading ? "oralAudio.loading" : "oralAudio.play")}
    </button>
    <span style={{ marginLeft: 8, fontSize: 12, color: "#9ca3af" }}>{t("oralAudio.disclosure")}</span>
    {blocked && <p role="status" style={{ margin: "6px 0 0", fontSize: 12, color: "#cbd5e1" }}>{t("oralAudio.blocked")}</p>}
    {error && <p role="status" style={{ margin: "6px 0 0", fontSize: 12, color: "#cbd5e1" }}>{t("oralAudio.error")}</p>}
  </div>
}
