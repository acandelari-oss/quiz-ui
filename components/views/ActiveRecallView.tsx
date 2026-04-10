import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

export default function ActiveRecallView({ projectId, selectedTopic }: { projectId: string, selectedTopic?: any }) {
  const [messages, setMessages] = useState<any[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiAnswer, setAiAnswer] = useState("")
  const [input, setInput] = useState("")
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [answerHistory, setAnswerHistory] = useState<string[]>([])
  const maxQuestions = 5
  const [recording, setRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  // DEFINIZIONE UNICA DI topicName (Riga 25)
  // Questo risolve l'errore ReferenceError a riga 115
  const topicName = (selectedTopic && typeof selectedTopic === 'object') 
    ? selectedTopic.topic 
    : (typeof selectedTopic === 'string' ? selectedTopic : null);

  

  function ensureString(value: any) {
    if (typeof value === "string") return value
    if (value == null) return ""
    return String(value)
  }

  // UNICO EFFECT PER GESTIRE IL CARICAMENTO
  useEffect(() => {
    // Quando entriamo o cambiamo topic, puliamo tutto
    setMessages([]);
    setQuestionCount(0);
    setAnswerHistory([]);
    setInput("");
    setAiAnswer("");
    setShowAnswer(false);
    
    // Partiamo solo se abbiamo un progetto
    if (projectId) {
      const timer = setTimeout(() => {
        generateQuestion();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedTopic, projectId]); // Ascolta il cambio topic

  async function generateQuestion() {
    if (loading || questionCount >= maxQuestions) return;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // LOG DI VERIFICA: Aprilo con F12 nel browser
      console.log("STO INVIANDO QUESTO TOPIC:", topicName);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/active_recall_question`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({ topic: topicName || null }) 
      });

      const data = await res.json();
      if (data.question) {
        const questionText = String(data.question)

        setMessages(prev => [...prev, { role: "assistant", content: questionText }]);
        setQuestionCount(prev => prev + 1);
        setCurrentQuestion(questionText)
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setShowAnswer(false);
    }
  }

  async function submitAnswer() {
    if (!input.trim() || loading) return
    const studentAnswer = input
    const currentQ = currentQuestion

    setMessages(prev => [...prev, { role: "user", content: studentAnswer }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/active_recall_evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQ,
          student_answer: studentAnswer,
          history: answerHistory
        })
      })
      const data = await res.json()
      setAnswerHistory(prev => [...prev, studentAnswer])
      setMessages(prev => [...prev, { role: "feedback", content: ensureString(data.feedback) }])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnswer() {
  const lastQ = currentQuestion

  if (!lastQ) {
    setAiAnswer("No question found.")
    setShowAnswer(true)
    return
  }

  setLoading(true)

  try {
    const { data: sessionData } = await supabase.auth.getSession()

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token}`
      },
      body: JSON.stringify({
        project_id: projectId,
        question: lastQ,
        topics: topicName ? [topicName] : [],
        history: messages.slice(-6)
      })
    })

    if (!res.ok) {
      console.error("SHOW ANSWER ERROR:", res.status)
      setAiAnswer("Could not load the correct answer.")
      setShowAnswer(true)
      return
    }

    const data = await res.json()

    const answerText = ensureString(data.answer)

    setAiAnswer(answerText)
    setShowAnswer(true)

    // 👇 AGGIUNGI QUESTO BLOCCO
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: `Correct answer:\n${answerText}` }
    ])

  } catch (e) {
    console.error("SHOW ANSWER ERROR:", e)
    setAiAnswer("Could not load the correct answer.")
    setShowAnswer(true)
  } finally {
    setLoading(false)
  }
}

  function startRecording() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech not supported")
      return
    }

    const recog = new SpeechRecognition()
    recog.lang = "en-US"
    recog.continuous = false
    recog.interimResults = false

    setRecognition(recog)
    setRecording(true)

    recog.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev + " " + transcript)
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "white", padding: 20 }}>
      <h3>Memory Check Trainer</h3>
      
      {/* CORREZIONE QUI: Usiamo topicName invece di selectedTopic */}
      {topicName && <p style={{ color: "#2FA4A9" }}>Focus: {topicName}</p>}
      
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 20 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            background: m.role === "user" ? "#2FA4A9" : "#1f2937",
            padding: 15,
            borderRadius: 10,
            marginBottom: 15,
            maxWidth: "85%",
            marginLeft: m.role === "user" ? "auto" : "0"
          }}>
            <strong>{m.role === "assistant" ? "AI:" : m.role === "user" ? "Tu:" : "Feedback:"}</strong>
            <p>{m.content}</p>
            
            
          </div>
        ))}
        {loading && <p>Thinking...</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          style={{ background: "#111827", color: "white", padding: 10, borderRadius: 8, border: "1px solid #374151" }}
          placeholder="Write your answer..."
        />
        <div style={{ display: "flex", gap: 10 }}>

        {/* 🎤 AUDIO */}
        <button
          onClick={toggleRecording}
          style={{
            background: recording ? "#ef4444" : "#111827",
            border: "1px solid #374151",
            color: "white",
            padding: 10,
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          {recording ? "⏹️" : "🎙️"}
        </button>

        {/* INVIA */}
        <button 
          onClick={submitAnswer} 
          style={{ 
            background: "#2FA4A9", 
            color: "white", 
            padding: 10, 
            borderRadius: 5, 
            flex: 1 
          }}
        >
          Submit Answer
        </button>

        {/* SHOW ANSWER */}
        <button 
          onClick={fetchAnswer} 
          style={{ 
            background: "#ef4444", 
            color: "white", 
            padding: 10, 
            borderRadius: 5 
          }}
        >
          Show correct answer
        </button>

        {/* NEXT */}
        {questionCount < maxQuestions && (
          <button 
            onClick={generateQuestion} 
            style={{ 
              background: "#374151", 
              color: "white", 
              padding: 10, 
              borderRadius: 5 
            }}
          >
            Next question
          </button>
        )}

      </div>
      </div>
    </div>
  )
}