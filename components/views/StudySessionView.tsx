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

export default function StudySessionView({ projectId }: { projectId: string }) {
  const [step, setStep] = useState(0)
  const [openCard, setOpenCard] = useState<number | null>(0)
  const [flashcards, setFlashcards] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [weakTopics, setWeakTopics] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState<number>(0)
  const [wrongCount, setWrongCount] = useState<number>(0)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [recallTopics, setRecallTopics] = useState<string[]>([])

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

  async function handleReview(
    flashcardId: number,
    difficulty: number,
    isCorrect: boolean
  ) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/review_flashcard`,
      {
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
      }
    )

    // ... (tutto uguale sopra)

    if (!isCorrect) {

        // ❌ completamente sbagliato
        setWrongCount(prev => prev + 1)
        setWeakTopics(prev => [...prev, `Flashcard ${flashcardId}`])

        generateRecoveryFlashcards(
            flashcardId,
            flashcards.find(f => f.id === flashcardId)?.question
        )

    } else {

        // ✅ corretto → differenziamo
        if (difficulty <= 1) {
            // ⚠️ difficile → trattalo quasi come errore
            setWrongCount(prev => prev + 1)
        } else if (difficulty === 2) {
            // 🙂 corretto normale
            setCorrectCount(prev => prev + 1)
        } else {
            // 😎 facile → boost
            setCorrectCount(prev => prev + 1)
        }

    }   

}   // ✅ QUESTA ERA LA GRAFFA MANCANTE

const steps = ["Flashcards", "Active Recall", "Quiz", "Summary"]

// ... (tutto il resto IDENTICO) 

  

    useEffect(() => {
        async function loadSession() {
            const { data } = await supabase.auth.getSession()
            const token = data.session?.access_token

            const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/study_session`,
            {
                headers: {
                Authorization: `Bearer ${token}`
                }
            }
            )

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
        }, [projectId, sessionVersion])

        async function generateRecoveryFlashcards(
        flashcardId: number,
        question?: string
        ) {
        try {
            const { data } = await supabase.auth.getSession()
            const token = data.session?.access_token

            const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/generate_recovery_flashcards`,
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                project_id: projectId,
                question: question
                })
            }
            )

            if (!res.ok) {
            console.error("Recovery fetch failed")
            return
            }

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
            Preparing your AI study session
        </div>

        <div style={loaderSubtitle}>
            Generating flashcards for study session...
        </div>

        </div>
    )
    }
  const accuracy =
    correctCount + wrongCount > 0
        ? correctCount / (correctCount + wrongCount)
        : 0.5
  return (
    <div>
      <div style={progressContainer}>
        {["Flashcards", "Active Recall", "Quiz", "Summary"].map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center" as const,
              color: step >= i ? "white" : "#6b7280",
              fontWeight: step === i ? 600 : 400
            }}
          >
            <div
              style={{
                height: 6,
                background: step >= i ? "#22c55e" : "#374151",
                marginBottom: 6,
                borderRadius: 4
              }}
            />
            {label}
          </div>
        ))}
      </div>

      <div>
        <h2>AI Study Session</h2>

        <p style={description}>
          A guided study session combining flashcards, active recall and quizzes.
        </p>

        <p style={description}>
          Your study session adapts automatically to your performance.
          Weak topics will generate more recall questions, while strong topics
          will generate more quiz questions.
        </p>

        <div style={progress}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                ...stepBox,
                background: step === i ? "#22c55e" : "#1f2937"
              }}
            >
              {s}
            </div>
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
            onComplete={handleRecallComplete}
          />
        )}

        {step === 2 && (
          <div style={{ color: "white" }}>
            Quiz phase coming next
            <div>
              <button
                onClick={handleQuizComplete}
                style={button}
              >
                Complete Quiz Phase
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div
            style={{
              textAlign: "center" as const,
              marginTop: 60,
              color: "white"
            }}
          >
            <h2>🎉 Study Session Completed</h2>

            <p
              style={{
                color: "#9ca3af",
                marginTop: 10
              }}
            >
              Great work. You finished your study session.
            </p>

            {weakTopics.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h3>Topics you should review</h3>

                <ul
                  style={{
                    marginTop: 10,
                    color: "#f87171",
                    listStyle: "none",
                    padding: 0
                  }}
                >
                  {[...new Set(weakTopics)].map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                marginTop: 30,
                display: "flex",
                gap: 10,
                justifyContent: "center"
              }}
            >
              <button
                onClick={() => console.log("Generate targeted flashcards", weakTopics)}
                style={button}
              >
                Targeted Flashcards
              </button>

              <button
                onClick={() => console.log("Generate targeted quiz", weakTopics)}
                style={button}
              >
                Targeted Quiz
              </button>
            </div>

            <button
              onClick={() => {
                setStep(0)
                setOpenCard(0)
                setWeakTopics([])
                setLoading(true)
                setSessionVersion(prev => prev + 1)
            }}
              style={{
                marginTop: 30,
                padding: "12px 20px",
                background: "#2563eb",
                border: "none",
                borderRadius: 8,
                color: "white",
                cursor: "pointer"
              }}
            >
              Start new session
            </button>
          </div>
        )}

        {step < 3 && (
          <button
            onClick={() => {

                if (accuracy > 0.8 && step === 0) {
                    setStep(2) // salta recall
                    return
                }

                setStep(step + 1)
                setOpenCard(0)
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