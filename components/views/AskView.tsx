import { useState } from "react"
import { Headphones } from "lucide-react"

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
  selectedTopic // 1. Recurperiamo il topic dal padre
}) {
  const messages = chatMessages || []
  const [recording, setRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  function startRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech not supported")
      return
    }

    const recog = new SpeechRecognition()
    recog.lang = "en-US"
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

  return (
    <div style={container}>
      {/* HEADER CON FOCUS INDICATOR */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 15,
        paddingBottom: 10,
        borderBottom: selectedTopic ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid #374151" 
      }}>
        <h3 style={{ margin: 0 }}>Ask your documents</h3>
        
        {selectedTopic && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#22c55e", // Verde pieno
            color: "white",        // Testo bianco per contrasto
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
            animation: "fadeIn 0.3s ease-out"
          }}>
            <span style={{ fontSize: "16px" }}>🎯</span>
            SELECTED TOPIC: {typeof selectedTopic === 'object' ? selectedTopic.value.toUpperCase() : selectedTopic.toUpperCase()}
          </div>
        )}
      </div>

      <div style={chatBox}>
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
            Thinking...
          </div>
        </div>
      )}

      <div style={{ marginTop: 15 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <textarea
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                // PASSAGGIO TOPIC ALL'INVIO
                if (askQuestion.trim()) askDocuments(selectedTopic)
              }
            }}
            placeholder={selectedTopic ? `Ask about ${selectedTopic}...` : "Ask something about your documents..."}
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
              outline: "none"
            }}
          />

          {/* MIC */}
          <button
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
      </div>
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