import { useState } from "react"
import { Headphones } from "lucide-react"

const container={
  display:"flex",
  flexDirection:"column",
  height:"100%"
}

const chatBox={
  flex:1,
  overflowY:"auto",
  marginBottom:10
}

const input={
  width:"100%",
  padding:"10px",
  background:"#111827",
  border:"1px solid #374151",
  color:"white"
}

const button={
  marginTop:8,
  padding:"10px",
  background:"#2FA4A9",
  color:"white",
  border:"none",
  cursor:"pointer"
}



export default function AskView({
  askQuestion,
  setAskQuestion,
  askDocuments,
  asking,
  chatMessages
}) {

  const messages = chatMessages || []
  const [recording, setRecording] = useState(false)

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
    recog.interimResults = true

    setRecording(true)

    recog.onresult = (event) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // 🔥 QUI CAMBIA SOLO QUESTO
      setAskQuestion(finalTranscript + interimTranscript)
    }

    recog.onend = () => {
      setRecording(false)
    }

    recog.start()
  }
  
  return (

  <div style={container}>

    <h3>Ask your documents</h3>

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
  {/* 🔥 SPINNER QUI */}
  {asking && (
    <div style={{
      display: "flex",
      justifyContent: "flex-start",
      marginTop: 10
    }}>
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
              if (askQuestion.trim()) askDocuments()
            }
          }}
          placeholder="Ask something about your documents..."
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
        {asking && (
          <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
          </div>
        )}

        {/* MIC */}
        <button
          onClick={startRecording}   // 🔥 poi lo colleghiamo
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
          <Headphones size={16} />
        </button>

        {/* SEND */}
        <button
          onClick={() => askQuestion.trim() && askDocuments()}
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