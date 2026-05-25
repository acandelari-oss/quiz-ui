import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import FlashcardsView from "./FlashcardsView"
import ActiveRecallView from "./ActiveRecallView"
import QuizView from "./QuizView"
import { useTranslation } from 'react-i18next';

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

export default function StudySessionView({
  projectId,
  selectedTopics,
  studyConfig
}: {
  projectId: string,
  selectedTopics?: string[] | null,
  studyConfig?: {
    flashcards: number,
    recall: number,
    quiz: number
  }
}) {
  const normalizedSelectedTopics = (selectedTopics || []).map((t:any) => {

    const value =
      typeof t === "string"
        ? t
        : t.topic

    return String(value)
      .replace(/\s+/g, " ")
      .trim()

  });

console.log("🧼 NORMALIZED TOPICS:", normalizedSelectedTopics);
  const [step, setStep] = useState(0)
  const [openCard, setOpenCard] = useState<number | null>(0)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weakTopics, setWeakTopics] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState<number>(0)
  const [wrongCount, setWrongCount] = useState<number>(0)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [recallTopics, setRecallTopics] = useState<string[]>([])
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set())
  const [reviewedCount, setReviewedCount] = useState(0)
  
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const accuracy = correctCount + wrongCount > 0 ? correctCount / (correctCount + wrongCount) : 0.5
  const steps = ["Flashcards", "Active Recall", "Quiz", "Summary"]
  const { t: translate } = useTranslation();

  useEffect(() => {
  setSessionLoaded(false)
}, [projectId, normalizedSelectedTopics])

  useEffect(() => {
    const handler = () => {
      console.log("➡️ Moving to Quiz")
      setStep(2)
    }

    window.addEventListener("recallComplete", handler)

    return () => window.removeEventListener("recallComplete", handler)
  }, [])

  function handleFlashcardsComplete() {
    if (flashcards.length === 0) return

    // 🔥 controllo reale
    if (reviewedCount < flashcards.length) {
      console.log("⛔ NOT FINISHED FLASHCARDS")
      return
    }
    console.log("📊 CHECK:", reviewedCount, flashcards.length)
    console.log("✅ FLASHCARDS COMPLETATE")

   

    setStep(1)
  }

  function handleRecallComplete() {
    setStep(2)
  }

  function handleQuizComplete() {
    setStep(3)
  }

  async function handleReview(flashcardId: number, difficulty: number, isCorrect: boolean) {

    // 🔥 BLOCCO DUPLICATI
    setReviewedIds(prev => {
      if (prev.has(flashcardId)) {
        console.warn("⛔ DUPLICATE BLOCKED:", flashcardId)
        return prev
      }

      const newSet = new Set(prev)
      newSet.add(flashcardId)

      // 🔥 aggiorna count FUORI dal set (ma in sync)
      setReviewedCount(newSet.size)

      return newSet
    })
    
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

      const card = flashcards.find(f => f.id === flashcardId)

      if (card?.topic) {
        setWeakTopics(prev => [...prev, card.topic])
      }

      // ❌ NIENTE recovery durante la sessione
    }
 else {
      if (difficulty <= 1) {
        setWrongCount(prev => prev + 1)
      } else {
        setCorrectCount(prev => prev + 1)
      }
    }
  }
  const hasGeneratedQuiz = useRef(false);

  useEffect(() => {
    if (step === 2 && quizData.length === 0 && !hasGeneratedQuiz.current) {
      hasGeneratedQuiz.current = true;
      generateQuiz();
    }
  }, [step]);

  const [quizData, setQuizData] = useState<any[]>([])
const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
const [quizFinished, setQuizFinished] = useState(false)
const [quizStarted, setQuizStarted] = useState(false)
const [quizId, setQuizId] = useState<string | null>(null)



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
        num_questions: studyConfig?.quiz || 5,
        difficulty: "medium",
        topics: normalizedSelectedTopics || [],
        language: "english"
      })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server Error:", errorData);
        return;
      }

      const data = await res.json();
      setQuizId(data.quiz_id || data.id)
      console.log("Quiz Data Received:", data);

      const questions = data.questions || data.quiz || [];

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
  if (sessionLoaded) return;

  async function loadSession() {
    setLoading(true)

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    let url = `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/study_session`

    const query = normalizedSelectedTopics.join(",")

    if (query.length > 0) {
      url += `?topics=${encodeURIComponent(query)}`
    }

    console.log("🎯 STUDY SESSION TOPICS:", normalizedSelectedTopics)
    console.log("🚀 FINAL URL:", url)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      setLoading(false)
      return
    }

    const session = await res.json()

    setFlashcards(
      (session.flashcards || []).slice(
        0,
        studyConfig?.flashcards || 8
      )
    )
    setRecallTopics(session.recall_topics || [])
    setLoading(false)
    setSessionLoaded(true) // 🔥 blocca loop
  }

  loadSession()

}, [projectId, sessionVersion])

  

  if (loading) {
  return (
    <div style={loaderContainer}>
      <div style={spinner} />
     <div style={loaderTitle}>
        {step === 0 && (
          selectedTopics && selectedTopics.length > 0
            ? `${translate('stats.Generating study session for')}: ${selectedTopics.join(", ")}`
            : translate('stats.Preparing flashcards')
        )}
        {step === 1 && translate('stats.Analyzing your weak points')}
        {step === 2 && translate('stats.Generating final Quiz')}
      </div>

      <div style={loaderSubtitle}>
        {step === 2 
          ? translate('stats.Creating custom questions based on your performance') 
          : translate('stats.Please wait a moment')
        }
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
        {selectedTopics && selectedTopics.length > 0 && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid #8b5cf6", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "bold", letterSpacing: "1px" }}>{translate('stats.FOCUS STUDY ACTIVE')}</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}>{selectedTopics.join(", ")}</div>
            </div>
            <span style={{ fontSize: "24px" }}>📚</span>
          </div>
        )}

        <h2>{translate('stats.AI Study Session')}</h2>
        <p style={description}>{translate('stats.A guided study session combining flashcards, active recall and quizzes.')}</p>

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
          <>
            {console.log("🧠 STUDY SESSION selectedTopics:", selectedTopics)}
            {console.log("🧪 ORIGINAL:", selectedTopics)}
            {console.log("🧼 NORMALIZED:", normalizedSelectedTopics)};


            <ActiveRecallView 
              projectId={projectId} 
              selectedTopics={normalizedSelectedTopics}
              maxQuestions={studyConfig?.recall || 3}
              onComplete={handleRecallComplete} 
            />
          </>
        )}

        

        {step === 2 && (
          <QuizView 
            quiz={quizData}
            answers={quizAnswers}
            started={quizStarted}
            finished={quizFinished}
            projectId={projectId}
            selectAnswer={(idx: number, val: string) => setQuizAnswers(prev => ({ ...prev, [idx]: val }))}
            submitQuiz={async () => {
              console.log("🔥 STUDY SESSION SUBMIT CHIAMATO")
              setQuizFinished(true)

              const { data } = await supabase.auth.getSession()
              const token = data.session?.access_token

              const answersArray = quizData.map((q, index) => {
                const userAnswer = quizAnswers[index]
                const correctRaw = (q.correct_answer ?? q.correct ?? "").toString().trim()

                let isCorrect = false

                q.options.forEach((opt: string, j: number) => {
                  const optLetter = String.fromCharCode(65 + j)

                  const correct =
                    correctRaw.toLowerCase() === opt.toLowerCase() ||
                    correctRaw === optLetter ||
                    String(Number(correctRaw)) === String(j)

                  if (correct && userAnswer === opt) {
                    isCorrect = true
                  }
                })

                return {
                  question_id: q.id,
                  is_correct: isCorrect,
                  topic: (q.topic || "General").trim().toLowerCase()
                }
              })

              console.log("📦 STUDY SESSION ANSWERS:", answersArray)

              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  quiz_id: quizId,
                  answers: answersArray
                })
              })
            }}
            calculateScore={() => {
                let score = 0;
                quizData.forEach((q, i) => {
                    const correctRaw = q.correct_answer ?? q.correct;

                    if (typeof correctRaw === "number") {
                        if (q.options?.[correctRaw] === quizAnswers[i]) score++;
                        return;
                    }

                    if (quizAnswers[i] === correctRaw) score++;
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
            <p style={{ color: "#9ca3af", marginTop: 10 }}>{translate('stats.Great work. You finished your study session.')}</p>
            {weakTopics.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <h3>{translate('stats.Topics you should review')}</h3>
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
              {translate('stats.Start new session')}
            </button>
          </div>
        )}

        {step < 3 && (
          <button
            onClick={() => {
              console.log("➡️ MANUAL NEXT")

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

if (typeof document !== "undefined" && !document.getElementById("study-animations")) {
  const styleSheet = document.createElement("style")
  styleSheet.id = "study-animations"
  styleSheet.innerHTML = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `
  document.head.appendChild(styleSheet)
}