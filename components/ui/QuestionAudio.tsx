import { useEffect, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"

// Mounted only for the latest completed professor reply; its object URL lives for this mount.
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
    if (!enabled || !question.trim() || question.length > 4096) return
    const audio = audioRef.current
    if (!audio) return
    if (request.current) {
      // A user gesture can unblock playback while the remaining audio downloads.
      if (url.current) {
        try { await audio.play(); setBlocked(false) }
        catch (error) {
          if (error instanceof Error && error.name === "NotAllowedError") setBlocked(true)
          else setError(true)
        }
      }
      return
    }
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
        if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported("audio/mpeg") && response.body) {
          const media = new MediaSource()
          const mediaUrl = URL.createObjectURL(media)
          url.current = mediaUrl
          const waitFor = (target: EventTarget, event: string) => new Promise<void>((resolve, reject) => {
            const cleanup = () => {
              target.removeEventListener(event, done)
              target.removeEventListener("error", failed)
              controller.signal.removeEventListener("abort", failed)
            }
            const done = () => { cleanup(); resolve() }
            const failed = () => { cleanup(); reject(new Error("Audio stream interrupted")) }
            if (controller.signal.aborted) { failed(); return }
            target.addEventListener(event, done, { once: true })
            target.addEventListener("error", failed, { once: true })
            controller.signal.addEventListener("abort", failed, { once: true })
          })
          const opened = waitFor(media, "sourceopen")
          audio.src = mediaUrl
          const reader = response.body.getReader()
          let completed = false
          try {
            await opened
            const buffer = media.addSourceBuffer("audio/mpeg")
            let started = false
            while (true) {
              const { done, value } = await reader.read()
              if (controller.signal.aborted) throw new Error("Audio stream interrupted")
              if (done) break
              if (!value.byteLength) continue
              const appended = waitFor(buffer, "updateend")
              try {
                buffer.appendBuffer(value)
              } catch (appendError) {
                // Settle the listener promise before propagating synchronous decode errors.
                buffer.dispatchEvent(new Event("error"))
                await appended.catch(() => {})
                throw appendError
              }
              await appended
              if (!started) {
                started = true
                setLoading(false)
                // Do not wait for playback before reading the rest of the stream.
                void audio.play().catch(error => {
                  if (!controller.signal.aborted) {
                    if (error?.name === "NotAllowedError") setBlocked(true)
                    else setError(true)
                  }
                })
              }
            }
            if (!started) throw new Error("Empty audio stream")
            media.endOfStream()
            completed = true
          } finally {
            if (!completed) {
              await reader.cancel().catch(() => {})
              audio.pause()
              audio.removeAttribute("src")
              URL.revokeObjectURL(mediaUrl)
              if (url.current === mediaUrl) url.current = null
            }
            reader.releaseLock()
          }
          return
        }
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

  if (question.length > 4096) return enabled ? <p role="status">{t("oralAudio.tooLong")}</p> : null

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
