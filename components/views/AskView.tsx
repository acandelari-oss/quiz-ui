import { useEffect, useState } from "react"
import { Headphones } from "lucide-react"
import { useTranslation } from 'react-i18next';
import { exportConversationPDF } from "../../utils/pdfExport"
import MarkdownContent from "@/components/ui/MarkdownContent"

const container = {
  display: "flex",
  flexDirection: "column",
  height: "100%"
}

const chatBox = {
  flex: 1,
  overflowY: "auto",
  marginBottom: 10
}

const input = {
  width: "100%",
  padding: "10px",
  background: "#111827",
  border: "1px solid #374151",
  color: "white"
}

const button = {
  marginTop: 8,
  padding: "10px",
  background: "#2FA4A9",
  color: "white",
  border: "none",
  cursor: "pointer"
}

export default function AskView({
  askQuestion,
  setAskQuestion,
  askDocuments,
  asking,
  chatMessages,
  projectId,
  projectName,
  selectedTopic, // 1. Recurperiamo il topic dal padre
  selectedTopics,
  useGlobalKnowledge,
  setUseGlobalKnowledge
}) {
  const messages = chatMessages || []
  const [recording, setRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [attachedImage, setAttachedImage] = useState<File | null>(null)
  const [attachedImagePreviewUrl, setAttachedImagePreviewUrl] = useState<string | null>(null)
  const { t: translate, i18n } = useTranslation();
  

  console.log("🧠 ASK RECEIVED TOPICS:", selectedTopics)

  function selectedCategoryNames() {
    return Array.from(
      new Set(
        (selectedTopics || [])
          .map((topic: any) => {
            if (typeof topic === "string") return topic
            return topic?.category || topic?.source_section || topic?.topic || ""
          })
          .map((value: any) => String(value || "").trim())
          .filter(Boolean)
      )
    )
  }

  const selectedCategoryKey = selectedCategoryNames().join("|")
  const focusCategories = selectedCategoryNames()
  const focusLabel = focusCategories.length === 1
    ? focusCategories[0]
    : focusCategories.length > 1
      ? `${focusCategories.length} ${translate("stats.categories")}`
      : ""
  const focusTopicCount = selectedTopics?.length || 0
  const imageInputId = "ask-image-attachment-input"

  useEffect(() => {
    setAttachedImage(null)
  }, [projectId])

  useEffect(() => {
    if (!attachedImage) {
      setAttachedImagePreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(attachedImage)
    setAttachedImagePreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [attachedImage])

  useEffect(() => {
    let cancelled = false

    async function loadSuggestions() {
      if (!projectId || messages.length > 0) {
        setSuggestedQuestions([])
        return
      }

      setLoadingSuggestions(true)

      try {
        const { supabase } = await import("../../lib/supabase")
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
          if (!cancelled) setSuggestedQuestions([])
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/ask_suggestions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              categories: selectedCategoryNames(),
              language: i18n.language === "it" ? "Italian" : "English"
            })
          }
        )

        if (!res.ok) {
          if (!cancelled) setSuggestedQuestions([])
          return
        }

        const data = await res.json()
        if (!cancelled) {
          setSuggestedQuestions(
            Array.isArray(data.suggestions)
              ? data.suggestions.filter(Boolean).slice(0, 4)
              : []
          )
        }
      } catch (error) {
        console.error("ASK SUGGESTIONS ERROR:", error)
        if (!cancelled) setSuggestedQuestions([])
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }

    loadSuggestions()

    return () => {
      cancelled = true
    }
  }, [projectId, messages.length, selectedCategoryKey, i18n.language])

  function uniqueSources(sources: any[] = []) {
    const seen = new Set()
    return sources.filter((source) => {
      const document = source?.document
      const page = source?.page
      if (!document || page === undefined || page === null) return false
      const key = `${document}::${page}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function renderSourceNote(message: any) {
    if (message.role !== "assistant") return null

    const sources = uniqueSources(message.sources)
    const usedGlobalKnowledge = Boolean(message.usedGlobalKnowledge)
    const usedImage = Boolean(message.usedImage)

    if (!sources.length && !usedGlobalKnowledge && !usedImage) return null

    return (
      <div style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: "1px solid rgba(148, 163, 184, 0.18)",
        color: "#9ca3af",
        fontSize: 12,
        lineHeight: 1.45,
        whiteSpace: "normal"
      }}>
        <div style={{ color: "#cbd5e1", fontWeight: 700, marginBottom: 4 }}>
          {sources.length > 1 ? translate("stats.Sources") : translate("stats.Source")}
        </div>

        {sources.map((source, index) => (
          <div key={`${source.document}-${source.page}-${index}`}>
            • {source.document} — {translate("stats.page")} {source.page}
          </div>
        ))}

        {usedGlobalKnowledge && (
          <>
            <div>• {translate("stats.General AI knowledge")}</div>
            {!sources.length && (
              <div style={{ marginTop: 4 }}>
                {translate("stats.No document source was used for this part of the answer.")}
              </div>
            )}
          </>
        )}

        {usedImage && (
          <div>• {translate("stats.Attached image")}</div>
        )}
      </div>
    )
  }

  function startRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech not supported")
      return
    }

    const recog = new SpeechRecognition()
    recog.lang =
      i18n.language === "it"
        ? "it-IT"
        : "en-US";
    recog.continuous = false
    recog.interimResults = false // 🔥 FIX duplicazioni

    setRecognition(recog)
    setRecording(true)

    recog.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setAskQuestion(prev => prev + " " + transcript)
    }

    recog.onend = () => {
      setRecording(false)
    }

    recog.start()
  }

  function stopRecording() {
  if (recognition) {
    recognition.stop()
  }
  setRecording(false)
}

function toggleRecording() {
  if (recording) {
    stopRecording()
  } else {
    startRecording()
  }
}

function downloadAskPDF() {
  const selectedSubject =
    focusLabel
      ? focusTopicCount > 1
        ? `${focusLabel} (${focusTopicCount} ${translate('stats.topics')})`
        : focusLabel
      : "Full Project"

  exportConversationPDF({
    title: "ASK A QUESTION",
    projectName,
    subjectLabel: "Focus",
    subject: selectedSubject,
    messages,
    filename: `ask_conversation_${new Date().toISOString().slice(0, 10)}.pdf`,
    userLabel: "QUESTION",
    assistantLabel: "AI ANSWER"
  })
}

  return (
    <div className="ask-mobile-shell" style={container}>
      {/* HEADER CON FOCUS INDICATOR */}
      <div className="ask-mobile-title-row" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 15,
        paddingBottom: 10,
        borderBottom: selectedTopic ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid #374151" 
      }}>
        <h3 className="ask-mobile-title" style={{ margin: 0 }}>{translate('stats.Ask your documents')}</h3>
        
        {(selectedTopics && selectedTopics.length > 0) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#22c55e",
            color: "white",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
            animation: "fadeIn 0.3s ease-out"
          }}>
            <span style={{ fontSize: "16px" }}>🎯</span>

            {focusTopicCount > 1
              ? `${translate("stats.Macro topic")}: ${focusLabel}`
              : `${translate("stats.Selected topic")}: ${focusLabel}`
            }

          </div>
        )}
      </div>

      <div className="ask-mobile-chat-box" style={chatBox}>
        {attachedImage && attachedImagePreviewUrl && (
          <div className="ask-attached-image-preview">
            <div className="ask-attached-image-preview-header">
              <div>
                <strong>{translate("stats.Attached image")}</strong>
                <span>{attachedImage.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
              >
                {translate("stats.Remove image")}
              </button>
            </div>
            <a
              href={attachedImagePreviewUrl}
              target="_blank"
              rel="noreferrer"
              title={translate("stats.Open image preview")}
            >
              <img src={attachedImagePreviewUrl} alt={translate("stats.Attached image")} />
            </a>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10
            }}
          >
            <div
              className={m.role === "assistant" ? "ask-answer-bubble" : "ask-user-bubble"}
              style={{
                background: m.role === "user" ? "#2563eb" : "#1f2937",
                padding: "10px 12px",
                borderRadius: 8,
                maxWidth: "70%",
                color: "white",
                whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
                lineHeight: m.role === "user" ? 1.6 : 1.42
              }}
            >
              <MarkdownContent
                text={m.content}
                className={m.role === "assistant"
                  ? "markdown-content ask-answer-markdown"
                  : "markdown-content"
                }
              />
              {renderSourceNote(m)}
            </div>
          </div>
        ))}
      </div>

      {asking && (
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 10 }}>
          <div style={{
            background: "#1f2937",
            padding: "10px 12px",
            borderRadius: 8,
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse 1s infinite"
            }} />
            {translate('stats.Thinking...')}
          </div>
        </div>
      )}
                  
      <div className="ask-mobile-input-area" style={{ marginTop: 15 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <div className="ask-mobile-search-card" style={{
              marginBottom: '15px',
              padding: '10px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: '#22c55e'
                  }}>
                    {translate('stats.Search Mode')}: {
                      useGlobalKnowledge
                        ? translate('stats.Global AI Knowledge')
                        : translate('stats.Strict Document Search')
                    }
                  </span>

                  <span style={{
                    fontSize: '11px',
                    color: '#9ca3af'
                  }}>
                    {
                      useGlobalKnowledge
                        ? translate('stats.The AI can expand beyond your uploaded material.')
                        : translate('stats.The AI answers using ONLY your uploaded study material.')
                    }
                  </span>

                </div>

                <div
                  onClick={() =>
                    setUseGlobalKnowledge(!useGlobalKnowledge)
                  }
                  style={{
                    width: '44px',
                    height: '22px',
                    backgroundColor: useGlobalKnowledge
                      ? '#10b981'
                      : '#4b5563',
                    borderRadius: '20px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                    flexShrink: 0
                  }}
                >

                  <div style={{
                    width: '18px',
                    height: '18px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: useGlobalKnowledge
                      ? '24px'
                      : '2px',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />

                </div>

              </div>

            </div>
          <textarea
            className="ask-mobile-textarea"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            disabled={asking}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                // PASSAGGIO TOPIC ALL'INVIO
                if (askQuestion.trim() && !asking) askDocuments(attachedImage)
              }
            }}
            placeholder={
              focusLabel && focusTopicCount > 1
                ? `${translate('stats.Ask about')} ${focusLabel} (${focusTopicCount} ${translate('stats.topics')})...`
                : focusLabel
                ? `${translate('stats.Ask about')} ${focusLabel}...`
                : translate('stats.Ask something about your documents...')
            }
            style={{
              width: "100%",
              minHeight: 118,
              maxHeight: 200,
              resize: "none",
              padding: attachedImage
                ? "12px 150px 46px 12px"
                : "12px 150px 12px 12px",
              borderRadius: 15,
              border: "1px solid #374151",
              background: "#111827",
              color: "white",
              lineHeight: 1.5,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              outline: "none",
              boxSizing: "border-box"
            }}
          />

          {attachedImage && (
            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 17,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                maxWidth: "calc(100% - 176px)",
                padding: "6px 9px",
                borderRadius: 999,
                background: "rgba(47, 164, 169, 0.16)",
                border: "1px solid rgba(47, 164, 169, 0.38)",
                color: "#d1d5db",
                fontSize: 12,
                boxShadow: "0 6px 18px rgba(0, 0, 0, 0.20)"
              }}
            >
              <img
                src="/icons/upload-image.svg"
                alt=""
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  display: "block",
                  flexShrink: 0
                }}
              />
              <span style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {attachedImage.name}
              </span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#fca5a5",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0
                }}
                aria-label={translate("stats.Remove image")}
              >
                ×
              </button>
            </div>
          )}

          <input
            id={imageInputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0] || null
              setAttachedImage(file)
              event.target.value = ""
            }}
          />

          {/* IMAGE ATTACHMENT */}
          <label
            htmlFor={imageInputId}
            className="ask-mobile-image-button"
            title={translate("stats.Attach image")}
            style={{
              position: "absolute",
              right: 90,
              bottom: 18,
              background: attachedImage ? "#2FA4A9" : "#1f2937",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "pointer",
              color: "white",
              fontSize: 14,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              src="/icons/upload-image.svg"
              alt=""
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                display: "block"
              }}
            />
          </label>

          {/* MIC */}
          <button
            className="ask-mobile-mic-button"
            onClick={toggleRecording}
            disabled={asking}
            style={{
              position: "absolute",
              right: 50,
              bottom: 18,
              background: recording ? "#ef4444" : "#1f2937",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: asking ? "not-allowed" : "pointer",
              opacity: asking ? 0.6 : 1
            }}
          >
            {recording ? "⏹️" : (
              <img
                src="/icons/microphone.svg"
                alt="Microphone"
                style={{
                  width: 16,
                  height: 16,
                  display: "block"
                }}
              />
            )}
          </button>

          {/* SEND */}
          <button
            className="ask-mobile-send-button"
            onClick={() => askQuestion.trim() && !asking && askDocuments(attachedImage)}
            disabled={asking || !askQuestion.trim()}
            style={{
              position: "absolute",
              right: 10,
              bottom: 18,
              background: "#22c55e",
              border: "none",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: asking || !askQuestion.trim() ? "not-allowed" : "pointer",
              opacity: asking || !askQuestion.trim() ? 0.65 : 1,
              fontWeight: 600
            }}
          >
            ➤
          </button>
        </div>

        {messages.length === 0 && (loadingSuggestions || suggestedQuestions.length > 0) && (
          <div className="ask-suggestion-section" style={{ marginTop: 18 }}>
            <div style={{
              color: "#e5e7eb",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 10
            }}>
              {translate("stats.Example questions")}
            </div>

            <div className="ask-suggestion-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12
            }}>
              {loadingSuggestions && suggestedQuestions.length === 0
                ? [0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      style={{
                        minHeight: 42,
                        borderRadius: 9,
                        background: "rgba(15, 23, 42, 0.62)",
                        border: "1px solid rgba(59, 130, 246, 0.08)",
                        opacity: 0.55
                      }}
                    />
                  ))
                : suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAskQuestion(suggestion)}
                      style={{
                        minHeight: 42,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        textAlign: "left",
                        border: "1px solid rgba(59, 130, 246, 0.08)",
                        borderRadius: 9,
                        background: "rgba(15, 23, 42, 0.72)",
                        color: "#e5e7eb",
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1.3
                      }}
                    >
                      <span>{suggestion}</span>
                      <span style={{ color: "#60a5fa", fontSize: 17 }}>↗</span>
                    </button>
                  ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <button
            className="ask-download-pdf-button"
            onClick={downloadAskPDF}
            style={{
              marginTop: 8,
              alignSelf: "flex-start",
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Download PDF
          </button>
        )}
      </div>
      <style jsx global>{`
        .ask-answer-bubble {
          max-width: min(860px, 82%) !important;
        }

        .ask-answer-markdown {
          line-height: 1.42;
        }

        .ask-answer-markdown p {
          margin: 0 0 0.45em;
        }

        .ask-answer-markdown p:last-child {
          margin-bottom: 0;
        }

        .ask-answer-markdown ul,
        .ask-answer-markdown ol {
          margin: 0.25em 0 0.55em;
          padding-left: 1.25em;
        }

        .ask-answer-markdown li {
          margin: 0.12em 0;
          padding-left: 0.1em;
        }

        .ask-answer-markdown li > p {
          margin: 0.1em 0;
        }

        .ask-answer-markdown h1,
        .ask-answer-markdown h2,
        .ask-answer-markdown h3,
        .ask-answer-markdown h4 {
          margin: 0.75em 0 0.35em;
          line-height: 1.2;
        }

        .ask-answer-markdown strong {
          font-weight: 800;
        }

        .ask-attached-image-preview {
          margin: 0 0 14px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(47, 164, 169, 0.28);
          background: rgba(15, 23, 42, 0.72);
        }

        .ask-attached-image-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .ask-attached-image-preview-header strong {
          display: block;
          color: #36f2ed;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .ask-attached-image-preview-header span {
          display: block;
          max-width: 520px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #cbd5e1;
          font-size: 12px;
        }

        .ask-attached-image-preview-header button {
          border: 1px solid rgba(248, 113, 113, 0.36);
          border-radius: 999px;
          background: rgba(127, 29, 29, 0.2);
          color: #fca5a5;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .ask-attached-image-preview a {
          display: block;
        }

        .ask-attached-image-preview img {
          display: block;
          width: min(420px, 100%);
          max-height: 260px;
          object-fit: contain;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(2, 6, 23, 0.8);
        }

        @media (max-width: 900px) {
          .ask-mobile-shell {
            padding: 10px 10px 14px !important;
            min-height: calc(100dvh - 76px);
            box-sizing: border-box;
          }

          .ask-mobile-title-row {
            margin-bottom: 8px !important;
            padding-bottom: 7px !important;
          }

          .ask-mobile-title {
            font-size: 18px !important;
            line-height: 1.15 !important;
            font-weight: 700 !important;
          }

          .ask-mobile-chat-box {
            margin-bottom: 6px !important;
          }

          .ask-attached-image-preview {
            padding: 10px !important;
            margin-bottom: 10px !important;
          }

          .ask-attached-image-preview-header {
            align-items: flex-start !important;
          }

          .ask-attached-image-preview img {
            width: 100% !important;
            max-height: 220px !important;
          }

          .ask-mobile-input-area {
            margin-top: 8px !important;
          }

          .ask-mobile-search-card {
            margin-bottom: 8px !important;
            padding: 7px 9px !important;
            border-radius: 9px !important;
          }

          .ask-mobile-search-card > div {
            gap: 10px;
          }

          .ask-mobile-textarea {
            min-height: 136px !important;
            padding: 10px 82px 10px 11px !important;
            border-radius: 12px !important;
            font-size: 15px !important;
            line-height: 1.35 !important;
          }

          .ask-mobile-mic-button,
          .ask-mobile-send-button {
            top: auto !important;
            bottom: 9px !important;
            transform: none !important;
            min-width: 34px;
            min-height: 34px;
            padding: 6px 8px !important;
          }

          .ask-mobile-mic-button {
            right: 48px !important;
          }

          .ask-mobile-send-button {
            right: 9px !important;
          }

          .ask-download-pdf-button {
            margin-top: 6px !important;
            padding: 7px 10px !important;
            border-radius: 7px !important;
            font-size: 12px !important;
            line-height: 1.1 !important;
          }

          .ask-suggestion-section {
            margin-top: 12px !important;
          }

          .ask-suggestion-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }

        @media (min-width: 901px) and (max-width: 1200px) {
          .ask-suggestion-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}

// ANIMAZIONI (Fondamentali per il pulse dell'asking)
const styleSheet = typeof document !== "undefined" && document.createElement("style")

if (styleSheet && !document.getElementById("ask-animations")) {
  styleSheet.id = "ask-animations"
  styleSheet.innerHTML = `
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.8); opacity: 0.5; }
    }
  `
  document.head.appendChild(styleSheet)
}
