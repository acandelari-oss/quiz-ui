import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import FlashcardsView from "./FlashcardsView"
import ActiveRecallView from "./ActiveRecallView"
import QuizView from "./QuizView"

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
    if (step === 2 && quizData.length === 0) {
      generateQuiz();
    }
  }, [step]);

  const [quizData, setQuizData] = useState<any[]>([])
const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
const [quizFinished, setQuizFinished] = useState(false)
const [quizStarted, setQuizStarted] = useState(false)

async function generateQuiz() {
  setLoading(true);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // 1. L'URL deve essere /generate_quiz (come nel backend) e non /quiz
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      // 2. Il tuo backend aspetta un oggetto QuizRequest (num_questions, difficulty, language)
      body: JSON.stringify({
        num_questions: 15,
        difficulty: "medium",
        language: "english" // o "italian"
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Server Error:", errorData);
      return;
    }

    const data = await res.json();
    console.log("Quiz Data Received:", data);

    // 3. Il tuo backend restituisce {"quiz": [...]}. Usiamo data.quiz
    const questions = data.quiz || [];
    
    setQuizData(questions);
    setQuizStarted(questions.length > 0);
  } catch (e) {
    console.error("Quiz Generation Error:", e);
  } finally {
    setLoading(false);
  }
}

// Trigger per caricare il quiz allo step 2
useEffect(() => {
  if (step === 2 && quizData.length === 0) {
    generateQuiz()
  }
}, [step])

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
        {step === 0 && (selectedTopic ? `Generating study session for: ${selectedTopic}` : "Preparing flashcards...")}
        {step === 1 && "Analyzing your weak points..."}
        {step === 2 && "Generating final Quiz..."}
      </div>
      <div style={loaderSubtitle}>
        {step === 2 ? "Creating custom questions based on your performance..." : "Please wait a moment."}
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
          <QuizView 
            quiz={quizData}
            answers={quizAnswers}
            started={quizStarted}
            finished={quizFinished}
            projectId={projectId}
            selectAnswer={(idx: number, val: string) => setQuizAnswers(prev => ({ ...prev, [idx]: val }))}
            submitQuiz={() => setQuizFinished(true)}
            calculateScore={() => {
                let score = 0;
                quizData.forEach((q, i) => {
                    if (quizAnswers[i] === q.answer) score++;
                });
                return score;
            }}
            // --- AGGIUNGI QUESTE RIGHE PER EVITARE L'ERRORE ---
            formatTime={(s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`}
            answeredCount={Object.keys(quizAnswers).length}
            generatingQuiz={loading}
            setExpanded={() => {}} // Se non lo usi, passa una funzione vuota
            expanded={true}
          />
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