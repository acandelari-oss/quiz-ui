import { useState } from "react"
import { Headphones } from "lucide-react"
import { useTranslation } from 'react-i18next';
import { exportConversationPDF } from "../../utils/pdfExport"

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
  projectName,
  selectedTopic, // 1. Recurperiamo il topic dal padre
  selectedTopics,
  useGlobalKnowledge,
  setUseGlobalKnowledge
}) {
  const messages = chatMessages || []
  const [recording, setRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const { t: translate, i18n } = useTranslation();
  

  console.log("🧠 ASK RECEIVED TOPICS:", selectedTopics)

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
    selectedTopics?.length > 1
      ? `${
          (
            typeof selectedTopics[0] === "string"
              ? selectedTopics[0]
              : selectedTopics[0]?.topic
          )?.split(" ")[0] || "Selected topics"
        } (${selectedTopics.length} ${translate('stats.topics')})`
      : selectedTopics?.length === 1
      ? (
          typeof selectedTopics[0] === "string"
            ? selectedTopics[0]
            : selectedTopics[0]?.topic
        )
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

            {selectedTopics.length > 1
              ? `MACRO TOPIC: ${
                  (
                    typeof selectedTopics[0] === "string"
                      ? selectedTopics[0]
                      : selectedTopics[0]?.topic
                  )?.split(" ")[0]
                }`
              : `SELECTED TOPIC: ${
                  (
                    typeof selectedTopics[0] === "string"
                      ? selectedTopics[0]
                      : selectedTopics[0]?.topic
                  )?.toUpperCase()
                }`
            }

          </div>
        )}
      </div>

      <div className="ask-mobile-chat-box" style={chatBox}>
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
              style={{
                background: m.role === "user" ? "#2563eb" : "#1f2937",
                padding: "10px 12px",
                borderRadius: 8,
                maxWidth: "70%",
                color: "white",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6
              }}
            >
              {m.content}
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
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                // PASSAGGIO TOPIC ALL'INVIO
                if (askQuestion.trim()) askDocuments(selectedTopic)
              }
            }}
            placeholder={
              selectedTopics?.length > 1
                ? `${translate('stats.Ask about')} ${
                    (
                      typeof selectedTopics[0] === "string"
                        ? selectedTopics[0]
                        : selectedTopics[0]?.topic
                    )?.split(" ")[0]
                  } (${selectedTopics.length} ${translate('stats.topics')})...`
                : selectedTopics?.length === 1
                ? `${translate('stats.Ask about')} ${
                    typeof selectedTopics[0] === "string"
                      ? selectedTopics[0]
                      : selectedTopics[0]?.topic
                  }...`
                : translate('stats.Ask something about your documents...')
            }
            style={{
              width: "100%",
              minHeight: 80,
              maxHeight: 200,
              resize: "none",
              padding: "12px 110px 12px 12px",
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

          {/* MIC */}
          <button
            className="ask-mobile-mic-button"
            onClick={toggleRecording}
            style={{
              position: "absolute",
              right: 50,
              top: "50%",
              transform: "translateY(-50%)",
              background: recording ? "#ef4444" : "#1f2937",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "pointer"
            }}
          >
            {recording ? "⏹️" : "🎙️"}
          </button>

          {/* SEND */}
          <button
            className="ask-mobile-send-button"
            onClick={() => askQuestion.trim() && askDocuments(selectedTopic)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#22c55e",
              border: "none",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            ➤
          </button>
        </div>
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
            min-height: 112px !important;
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
