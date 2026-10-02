import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { supabase } from "../../lib/supabase"
import MarkdownContent from "./MarkdownContent"

export type ChatMessage = { role: "user" | "assistant"; content: string }
export type AnswerChatHistory = Map<string, ChatMessage[]>

type Props = {
  projectId: string
  context: string
  conversationId: string
  histories?: AnswerChatHistory
  kind: "quiz" | "flashcard"
}

const button = { maxWidth: "100%", whiteSpace: "normal" as const, overflowWrap: "anywhere" as const, background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#e5e7eb", padding: "8px 12px", cursor: "pointer" }

// Each instance is keyed by its question/card. Histories stay in the study view, not storage.
export default function StudyAnswerChat({ projectId, context, conversationId, histories, kind }: Props) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>(() => histories?.get(conversationId) || [])
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [global, setGlobal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [recording, setRecording] = useState(false)
  const request = useRef<AbortController | null>(null)
  const recognition = useRef<any>(null)

  useEffect(() => () => {
    request.current?.abort()
    stopRecording()
  }, [])

  function stopRecording() {
    const current = recognition.current
    recognition.current = null
    if (current) {
      current.onresult = current.onend = current.onerror = null
      current.stop()
    }
    setRecording(false)
  }

  function toggleRecording() {
    if (recognition.current) { stopRecording(); return }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) { setError(t("answerChat.micUnavailable")); return }
    const current = new Recognition()
    recognition.current = current
    current.lang = i18n.language || navigator.language || "en-US"
    current.interimResults = false
    current.continuous = false
    current.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ""
      setInput(previous => `${previous} ${transcript}`.trim())
    }
    current.onend = () => { recognition.current = null; setRecording(false) }
    current.onerror = () => { stopRecording(); setError(t("answerChat.micUnavailable")) }
    try { current.start(); setRecording(true); setError("") }
    catch { stopRecording(); setError(t("answerChat.micUnavailable")) }
  }

  async function send(suggestion?: string) {
    const question = (suggestion ?? input).trim()
    if (!question || request.current) return
    stopRecording()
    const controller = new AbortController()
    request.current = controller
    setOpen(true)
    setInput(question)
    setLoading(true)
    setError("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (controller.signal.aborted) return
      if (!session?.access_token || !projectId) throw new Error("Missing session or project")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
        body: JSON.stringify({
          project_id: projectId,
          question: `${global ? "Use the study material and general knowledge." : "Use ONLY the study material."}\nReply in the student's language (${i18n.language}).\n\n${context}\n\nStudent follow-up question:\n${question}`,
          history: messages,
          expand_search: global
        })
      })
      if (!response.ok) throw new Error("Request failed")
      const data = await response.json()
      if (controller.signal.aborted) return
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Missing answer")
      const next: ChatMessage[] = [...messages, { role: "user", content: question }, { role: "assistant", content: data.answer }]
      histories?.set(conversationId, next)
      setMessages(next)
      setInput("")
    } catch {
      if (!controller.signal.aborted) setError(t("answerChat.error"))
    } finally {
      if (!controller.signal.aborted) { request.current = null; setLoading(false) }
    }
  }

  const promptButton = kind === "flashcard"
    ? { ...button, flex: "1 1 140px", minWidth: 0, fontSize: 12, lineHeight: 1.3, padding: "6px 8px", minHeight: 32 }
    : button

  return <section style={{ marginTop: kind === "flashcard" ? 0 : 12, padding: 14, background: "rgba(15,23,42,.78)", border: "1px solid #374151", borderRadius: 12, width: "100%", boxSizing: "border-box", minWidth: 0 }}>
    <h3 style={{ margin: "0 0 12px", color: "#36f2ed", fontSize: 15, fontWeight: 750 }}>{t("answerChat.title")}</h3>
    <div style={kind === "flashcard" ? { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "stretch" } : undefined}>
    <button type="button" aria-expanded={open} onClick={() => { if (open) stopRecording(); setOpen(!open) }} style={{ ...promptButton, fontWeight: 700 }}>{t(kind === "flashcard" ? "answerChat.cardTitle" : "answerChat.quizTitle")}</button>
    <div style={kind === "flashcard" ? { display: "contents" } : { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {(kind === "quiz" ? ["why", "simpler", "example", "compare"] : ["simpler", "example", "remember"]).map(key => <button key={key} type="button" disabled={loading} style={promptButton} onClick={() => void send(t(`answerChat.${key}`))}>{t(`answerChat.${key}`)}</button>)}
    </div>
    </div>
    <div style={{ marginTop: 12, padding: 10, border: "1px solid #374151", borderRadius: 8, background: "rgba(255,255,255,.03)" }}>
      <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, color: "#cbd5e1", fontSize: 12 }}>
        <span>{t("answerChat.sourceMode")}</span>
        <select value={global ? "expanded" : "material"} disabled={loading} onChange={event => setGlobal(event.target.value === "expanded")} style={{ ...button, fontSize: 12, minWidth: 0, maxWidth: "100%", flex: "0 1 260px" }}>
          <option value="material">{t("answerChat.materialOnly")}</option>
          <option value="expanded">{t("answerChat.materialAndKnowledge")}</option>
        </select>
      </label>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>{t(global ? "answerChat.expandedHelp" : "answerChat.materialHelp")}</p>
    </div>
    {open && <div style={{ marginTop: 12 }}>
      {messages.map((message, index) => <div key={index} style={{ marginBottom: 12, color: message.role === "user" ? "#93c5fd" : "#d1d5db", overflowWrap: "anywhere" }}>
        <strong>{t(message.role === "user" ? "answerChat.you" : "answerChat.tutor")}</strong>
        <MarkdownContent text={message.content} />
      </div>)}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input aria-label={t("answerChat.placeholder")} placeholder={t("answerChat.placeholder")} value={input} disabled={loading} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} style={{ ...button, cursor: "text", flex: "1 1 160px", minWidth: 0 }} />
        <button type="button" disabled={loading} onClick={toggleRecording} aria-label={t(recording ? "answerChat.stopMic" : "answerChat.startMic")} aria-pressed={recording} style={{ ...button, background: recording ? "#b91c1c" : button.background }}>{recording ? "■" : "🎙"}</button>
        <button type="button" disabled={loading || !input.trim()} onClick={() => void send()} style={button}>{t(loading ? "answerChat.loading" : "answerChat.send")}</button>
      </div>
      <div role="status" style={{ display: loading ? "flex" : "none", alignItems: "center", gap: 10, marginTop: 12 }}>
        <img src="/douno_chat.gif" alt="" width={50} height={50} style={{ width: 50, height: 50, objectFit: "contain", flexShrink: 0 }} />
        {loading && <span>{t("answerChat.loading")}</span>}
      </div>
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
    </div>}
  </section>
}
