import { useState, useEffect, useRef } from "react"
import { supabase } from "../../lib/supabase"
import FlashcardsView from "./FlashcardsView"
import ActiveRecallView from "./ActiveRecallView"
import QuizView from "./QuizView"
import { useTranslation } from 'react-i18next';
import {
  extractTopicIds,
  extractTopicNames,
  TopicScopeItem
} from "../../utils/topics"

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
  margin: "20px auto 0",
  padding: "10px",
  width: 300,
  maxWidth: "100%",
  display: "block",
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

const completionMessage = {
  marginTop: 20,
  padding: "14px 18px",
  background: "linear-gradient(135deg, rgba(12, 21, 38, 0.96), rgba(8, 14, 28, 0.94))",
  border: "1px solid rgba(47, 164, 255, 0.22)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  borderRadius: 16,
  color: "#e8f7ff",
  textAlign: "center" as const,
  fontWeight: 600
}

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginTop: 34,
  textAlign: "left" as const
}

const summaryCard = {
  border: "1px solid rgba(54, 242, 237, 0.2)",
  borderRadius: 18,
  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(8, 13, 26, 0.94))",
  boxShadow: "0 18px 46px rgba(0, 0, 0, 0.22)",
  padding: 20,
  minHeight: 132
}

const summaryCardIcon = {
  fontSize: 26,
  marginBottom: 12
}

const summaryCardLabel = {
  color: "#9ca3af",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  marginBottom: 8
}

const summaryCardValue = {
  color: "white",
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 900,
  marginBottom: 8
}

const summaryCardDetail = {
  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.45
}

export default function StudySessionView({
  projectId,
  selectedTopics,
  studyConfig
}: {
  projectId: string,
  selectedTopics?: Array<string | TopicScopeItem> | null,
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
  const selectedTopicIds = extractTopicIds(selectedTopics || [])
  const selectedTopicNames = extractTopicNames(selectedTopics || [])
  const selectedTopicLabel = selectedTopicNames.join(", ")

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

function isQuizAnswerCorrect(q: any, index: number) {
  const userAnswer = quizAnswers[index]
  const correctRaw = (q?.correct_answer ?? q?.correct ?? "").toString().trim()

  if (!userAnswer || !Array.isArray(q?.options)) return false

  return q.options.some((opt: string, optionIndex: number) => {
    const optLetter = String.fromCharCode(65 + optionIndex)

    const correct =
      correctRaw.toLowerCase() === String(opt).toLowerCase() ||
      correctRaw === optLetter ||
      String(Number(correctRaw)) === String(optionIndex)

    return correct && userAnswer === opt
  })
}

const quizCorrectCount = quizData.reduce(
  (count, question, index) => count + (isQuizAnswerCorrect(question, index) ? 1 : 0),
  0
)
const quizTotalCount = quizData.length
const quizPercent = quizTotalCount > 0
  ? Math.round((quizCorrectCount / quizTotalCount) * 100)
  : 0
const flashcardRecallPercent = reviewedCount > 0
  ? Math.round((correctCount / reviewedCount) * 100)
  : 0
const quizWeakTopics = quizData
  .filter((question, index) => !isQuizAnswerCorrect(question, index))
  .map(question => String(question?.topic || "").trim())
  .filter(Boolean)
const topicsToReview = Array.from(new Set([...weakTopics, ...quizWeakTopics])).slice(0, 5)



async function generateQuiz() {
  setLoading(true);
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    console.log("PAYLOAD TOPIC_IDS COUNT:", selectedTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", selectedTopicNames.length)

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
        topic_ids: selectedTopicIds,
        topics: selectedTopicNames,
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
    console.log("PAYLOAD TOPIC_IDS COUNT:", selectedTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", selectedTopicNames.length)

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
            ? `${translate('stats.Generating study session for')}: ${selectedTopicLabel}`
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
            <div style={{ height: 6, background: step >= i ? "#2b7dcb" : "#374151", marginBottom: 6, borderRadius: 4 }} />
            {label}
          </div>
        ))}
      </div>

      <div>
        {selectedTopics && selectedTopics.length > 0 && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid #8b5cf6", padding: "15px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "bold", letterSpacing: "1px" }}>{translate('stats.FOCUS STUDY ACTIVE')}</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "white" }}>{selectedTopicLabel}</div>
            </div>
            <span style={{ fontSize: "24px" }}>📚</span>
          </div>
        )}

        <h2>{translate('stats.AI Study Session')}</h2>
        <p style={description}>{translate('stats.A guided study session combining flashcards, active recall and quizzes.')}</p>

        <div style={progress}>
          {steps.map((s, i) => (
            <div key={i} style={{ ...stepBox, background: step === i ? "#2b7dcb" : "#1f2937" }}>{s}</div>
          ))}
        </div>

        {step === 0 && (
          <>
            <FlashcardsView
              flashcards={flashcards}
              openCard={openCard}
              setOpenCard={setOpenCard}
              onReview={handleReview}
              onFlashcardsComplete={handleFlashcardsComplete}
            />
            {flashcards.length > 0
              && reviewedCount >= flashcards.length && (
              <div style={completionMessage}>
                🎉 Flashcards completed! Press Next to continue to Active Recall.
              </div>
            )}
          </>
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
          <>
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

              const answersArray = quizData.map((q, index) => ({
                question_id: q.id,
                is_correct: isQuizAnswerCorrect(q, index),
                topic: (q.topic || "General").trim().toLowerCase()
              }))

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
                return quizCorrectCount;
            }}
            // --- AGGIUNGI QUESTE RIGHE PER EVITARE L'ERRORE ---
            formatTime={(s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`}
            answeredCount={Object.keys(quizAnswers).length}
            generatingQuiz={loading}
            setExpanded={() => {}} // Se non lo usi, passa una funzione vuota
            expanded={true}
          />
            {quizFinished && (
              <div style={completionMessage}>
                🎉 Quiz completed! Press Next to view your Study Summary.
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", marginTop: 60, color: "white" }}>
            <h2>🎉 Study Session Completed</h2>
            <p style={{ color: "#9ca3af", marginTop: 10 }}>{translate('stats.Great work. You finished your study session.')}</p>

            <div style={summaryGrid}>
              <div style={summaryCard}>
                <div style={summaryCardIcon}>🧠</div>
                <div style={summaryCardLabel}>{translate("stats.Flashcards completed")}</div>
                <div style={summaryCardValue}>{reviewedCount}/{flashcards.length}</div>
                <div style={summaryCardDetail}>
                  {translate("stats.cards reviewed")}
                </div>
              </div>

              <div style={summaryCard}>
                <div style={summaryCardIcon}>✅</div>
                <div style={summaryCardLabel}>{translate("stats.Flashcard recall")}</div>
                <div style={summaryCardValue}>{flashcardRecallPercent}%</div>
                <div style={summaryCardDetail}>
                  {correctCount} {translate("stats.remembered")} · {wrongCount} {translate("stats.difficult or wrong")}
                </div>
              </div>

              <div style={summaryCard}>
                <div style={summaryCardIcon}>🎯</div>
                <div style={summaryCardLabel}>{translate("stats.Quiz score")}</div>
                <div style={summaryCardValue}>{quizPercent}%</div>
                <div style={summaryCardDetail}>
                  {quizCorrectCount}/{quizTotalCount} {translate("stats.correct answers")}
                </div>
              </div>

              <div style={summaryCard}>
                <div style={summaryCardIcon}>📌</div>
                <div style={summaryCardLabel}>{translate("stats.Topics to review")}</div>
                <div style={{ ...summaryCardValue, fontSize: 22 }}>
                  {topicsToReview.length || "—"}
                </div>
                <div style={summaryCardDetail}>
                  {topicsToReview.length > 0
                    ? topicsToReview.join(", ")
                    : translate("stats.No weak topics detected")}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStep(0);
                setOpenCard(0);
                setWeakTopics([]);
                setCorrectCount(0);
                setWrongCount(0);
                setReviewedIds(new Set());
                setReviewedCount(0);
                setQuizData([]);
                setQuizAnswers({});
                setQuizFinished(false);
                setQuizStarted(false);
                hasGeneratedQuiz.current = false;
                setLoading(true);
                setSessionVersion(prev => prev + 1);
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
