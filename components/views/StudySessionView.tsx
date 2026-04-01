import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import FlashcardsView from "./FlashcardsView"
import ActiveRecallView from "./ActiveRecallView"

const description = {
  color: "#9ca3af",
  marginBottom: 20
}

const progress = {
  display: "flex",
  gap: 10,
  marginBottom: 20
}

const stepBox = {
  padding: "6px 10px",
  borderRadius: 6,
  color: "white"
}

const button = {
  marginTop: 20,
  padding: "10px",
  background: "#2563eb",
  border: "none",
  color: "white",
  borderRadius: 6,
  cursor: "pointer"
}

const progressContainer = {
  display: "flex",
  gap: 10,
  marginBottom: 30
}

const loaderContainer = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  height: "60vh",
  color: "white"
}

const spinner = {
  width: 40,
  height: 40,
  border: "4px solid #374151",
  borderTop: "4px solid #2FA4A9",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  marginBottom: 20
}

const loaderTitle = {
  fontSize: 24,
  fontWeight: 600,
  marginBottom: 8
}

const loaderSubtitle = {
  color: "#9ca3af"
}

export default function StudySessionView({ projectId, selectedTopic }: { projectId: string, selectedTopic?: string | null }) {
  const [step, setStep] = useState(0)
  const [openCard, setOpenCard] = useState<number | null>(0)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weakTopics, setWeakTopics] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState<number>(0)
  const [wrongCount, setWrongCount] = useState<number>(0)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [recallTopics, setRecallTopics] = useState<string[]>([])

  const accuracy = correctCount + wrongCount > 0 ? correctCount / (correctCount + wrongCount) : 0.5
  const steps = ["Flashcards", "Active Recall", "Quiz", "Summary"]

  function handleFlashcardsComplete() {
    if (accuracy < 0.5) {
      alert("Let's review a bit more before moving on 💪")
      return
    }
    setStep(1)
  }

  function handleRecallComplete() {
    setStep(2)
  }

  function handleQuizComplete() {
    setStep(3)
  }

  async function handleReview(flashcardId: number, difficulty: number, isCorrect: boolean) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/review_flashcard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        flashcard_id: flashcardId,
        difficulty: difficulty,
        is_correct: isCorrect
      })
    })

    if (!isCorrect) {
      setWrongCount(prev => prev + 1)
      setWeakTopics(prev => [...prev, `Flashcard ${flashcardId}`])
      generateRecoveryFlashcards(flashcardId, flashcards.find(f => f.id === flashcardId)?.question)
    } else {
      if (difficulty <= 1) {
        setWrongCount(prev => prev + 1)
      } else {
        setCorrectCount(prev => prev + 1)
      }
    }
  }

  useEffect(() => {
    async function loadSession() {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      let url = `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/study_session`
      if (selectedTopic) {
        url += `?topic=${encodeURIComponent(selectedTopic)}`
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        setLoading(false)
        return
      }

      const session = await res.json()
      setFlashcards(session.flashcards || [])
      setRecallTopics(session.recall_topics || [])
      setLoading(false)
    }
    loadSession()
  }, [projectId, sessionVersion, selectedTopic])

  async function generateRecoveryFlashcards(flashcardId: number, question?: string) {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate_recovery_flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          question: question
        })
      })

      if (!res.ok) return
      const result = await res.json()
      setFlashcards(prev => [...prev, ...(result.flashcards || [])])
    } catch (e) {
      console.error("Recovery error:", e)
    }
  }

  if (loading) {
    return (
      <div style={loaderContainer}>
        <div style={spinner} />
        <div style={loaderTitle}>
            {selectedTopic ? `Generating study sesion based on the topic: ${selectedTopic}` : "Preparing your AI study session"}
        </div>
        <div style={loaderSubtitle}>
            {selectedTopic ? "Filtering materials..." : "Generating flashcards..."}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={progressContainer}>
        {steps.map((label, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", color: step >= i ? "white" : "#6b7280", fontWeight: step === i ? 600 : 400 }}>
            <div style={{ height: 6, background: step >= i ? "#22c55e" : "#374151", marginBottom: 6, borderRadius: 4 }} />
            {label}
          </div>
        ))}
      </div>

      <div>
        {selectedTopic && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid #8b5cf6", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "bold", letterSpacing: "1px" }}>FOCUS STUDY ACTIVE</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}>{typeof selectedTopic === 'object' ? selectedTopic.value : selectedTopic}</div>
            </div>
            <span style={{ fontSize: "24px" }}>📚</span>
          </div>
        )}

        <h2>AI Study Session</h2>
        <p style={description}>A guided study session combining flashcards, active recall and quizzes.</p>

        <div style={progress}>
          {steps.map((s, i) => (
            <div key={i} style={{ ...stepBox, background: step === i ? "#22c55e" : "#1f2937" }}>{s}</div>
          ))}
        </div>

        {step === 0 && (
          <FlashcardsView
            flashcards={flashcards}
            openCard={openCard}
            setOpenCard={setOpenCard}
            onReview={handleReview}
            onFlashcardsComplete={handleFlashcardsComplete}
          />
        )}

        {step === 1 && (
          <ActiveRecallView 
            projectId={projectId} 
            selectedTopic={selectedTopic} // <--- AGGIUNGI QUESTA RIGA
            onComplete={handleRecallComplete} 
          />
        )}

        {step === 2 && (
          <div style={{ color: "white" }}>
            Quiz phase coming next
            <div><button onClick={handleQuizComplete} style={button}>Complete Quiz Phase</button></div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", marginTop: 60, color: "white" }}>
            <h2>🎉 Study Session Completed</h2>
            <p style={{ color: "#9ca3af", marginTop: 10 }}>Great work. You finished your study session.</p>
            {weakTopics.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h3>Topics you should review</h3>
                <ul style={{ marginTop: 10, color: "#f87171", listStyle: "none", padding: 0 }}>
                  {[...new Set(weakTopics)].map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            <button
              onClick={() => {
                setStep(0); setOpenCard(0); setWeakTopics([]); setLoading(true); setSessionVersion(prev => prev + 1);
              }}
              style={{ marginTop: 30, padding: "12px 20px", background: "#2563eb", border: "none", borderRadius: 8, color: "white", cursor: "pointer" }}
            >
              Start new session
            </button>
          </div>
        )}

        {step < 3 && (
          <button
            onClick={() => {
              if (accuracy > 0.8 && step === 0) { setStep(2); return; }
              setStep(step + 1); setOpenCard(0);
            }}
            style={button}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

if (typeof document !== "undefined" && !document.getElementById("study-animations")) {
  const styleSheet = document.createElement("style")
  styleSheet.id = "study-animations"
  styleSheet.innerHTML = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `
  document.head.appendChild(styleSheet)
}