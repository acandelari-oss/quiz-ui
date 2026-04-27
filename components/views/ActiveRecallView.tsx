import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useRef } from "react"

export default function ActiveRecallView({ 
  projectId, 
  selectedTopics 
}: { 
  projectId: string, 
  selectedTopics: any[] 
}) {
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
  const [topicIndex, setTopicIndex] = useState(0)
  
  const [questionLoaded, setQuestionLoaded] = useState(false)

  const topicsToUse =
  selectedTopics && selectedTopics.length > 0
    ? selectedTopics
    : selectedTopic
    ? [selectedTopic]
    : []

  const topicList = topicsToUse;

  const normalizedTopics = topicList.map(t => {
    const value = typeof t === 'object' ? t.topic : t;
    return String(value).replace(/\s+/g, " ").trim();
  });

  // Prendiamo il topic corrente (solo per debug)
  const currentTopicRaw = normalizedTopics[questionCount % (normalizedTopics.length || 1)];
  const currentTopic = currentTopicRaw;

  console.log("🚀 CURRENT TOPIC:", currentTopic);
  

  function ensureString(value: any) {
    if (typeof value === "string") return value
    if (value == null) return ""
    return String(value)
  }

  // UNICO EFFECT PER GESTIRE IL CARICAMENTO
  const hasFetchedRef = useRef(false);

    const handleNext = () => {
    if (loading) return;

    if (questionCount >= maxQuestions) {
      console.log("🛑 MAX QUESTIONS REACHED");
      return;
    }

    generateQuestion();
  };

  useEffect(() => {
      hasFetchedRef.current = false;
    }, [currentTopic])

    useEffect(() => {
    if (!projectId || !currentTopic) return;

    console.log("🚀 FIRST QUESTION");

    generateQuestion();

    // SOLO UNA VOLTA
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // ActiveRecallView.tsx

  

  async function generateQuestion() {
    if (loading) return;

    if (questionCount >= maxQuestions) {
      console.log("🛑 STOP");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }
  

    // Definiamo l'URL qui internamente per sicurezza
    const apiUrl = import.meta.env?.VITE_API_URL || "http://localhost:8000";

    // RECUPERO TOPIC: Usiamo la prop topicList
    // Se non vedi i 3 topic nel log, scrivi qui: const rawTopics = topicList;
    const rawTopics = normalizedTopics;  // usa quello già definito sopra

    // NON ridefinire normalizedTopics
    const cleanTopics = rawTopics.filter(t => t && String(t).trim() !== "");

    // LOG FONDAMENTALE: Se qui vedi solo un elemento, la rotazione fallirà sempre
    console.log("DEBUG TOPICS:", cleanTopics);

    console.log("📤 INVIO REALE AL BACKEND:", cleanTopics, "Indice:", questionCount);

    const res = await fetch(`${apiUrl}/projects/${projectId}/active_recall_question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ 
        topics: rawTopics,
        index: questionCount 
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Server error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    if (data && data.question) {
      setMessages(prev => [...prev, { role: "assistant", content: String(data.question),  topic: currentTopic }]);
      setCurrentQuestion(String(data.question));
      setQuestionCount(prev => prev + 1);
    }
  } catch (e) {
    console.error("❌ Errore Fetch:", e);
    // Opzionale: mostra un messaggio all'utente nella chat
  } finally {
    setLoading(false);
    setShowAnswer(false);
    setInput("");
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
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }}>
        <h3 style={{ margin: 0 }}>Memory Check Trainer</h3>

        {(selectedTopics && selectedTopics.length > 0) && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f59e0b",
            color: "white",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
          }}>
            <span style={{ fontSize: "16px" }}>🧠</span>

            {selectedTopics.length > 1
              ? `MACRO TOPIC: ${selectedTopics[0].split(" ")[0].toUpperCase()} (${selectedTopics.length})`
              : `SELECTED TOPIC: ${selectedTopics[0].toUpperCase()}`
            }

          </div>
        )}
      </div>
      
      {/* CORREZIONE QUI: Usiamo topicName invece di selectedTopic */}
      
      
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
            <strong>
              {m.role === "assistant"
                ? "AI:"
                : m.role === "user"
                ? "Tu:"
                : "Feedback:"}
            </strong>

            {/* 🔥 NUOVO: focus per ogni domanda */}
            {m.role === "assistant" && m.topic && (
              <div style={{
                fontSize: "12px",
                color: "#2FA4A9",
                marginTop: 5,
                marginBottom: 5
              }}>
                🧠 Focus: {m.topic}
              </div>
            )}

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
            onClick={handleNext}
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