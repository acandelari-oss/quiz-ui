import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useTranslation } from 'react-i18next';
import MarkdownContent from "@/components/ui/MarkdownContent"

export default function FlashcardsView({
flashcards,
openCard,
setOpenCard,
onReview,
onFlashcardsComplete,
projectId,
loadingFlashcards,
loaderText
}) {
const { t: translate } = useTranslation();

const [currentIndex, setCurrentIndex] = useState(0)

if(openCard === null){
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>

        {/* 1. MOSTRA IL LOADER SOLO SE STA CARICANDO */}
        {loadingFlashcards ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 15,
            padding: "20px"
          }}>
            <div style={{ 
                width: 35, height: 35, 
                border: "3px solid #374151", 
                borderTop: "3px solid #22c55e", 
                borderRadius: "50%",
                animation: "spin 1s linear infinite" 
            }} />
            <p style={{ color: "#22c55e", fontWeight: 600, fontSize: "18px" }}>
              {loaderText || translate('stats.generating_flashcards')}
            </p>
          </div>
        ) : (
          /* 2. MOSTRA LE ISTRUZIONI SE NON STA CARICANDO */
          <div style={{ color: "#ffffff", fontSize: 24 }}>
            {translate('stats.Select how many flashcards you want to revise and press')}<br/>
            <b>{translate('stats.Start Study')}</b>
          </div>
        )}

      </div>
    )
  }

  

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // sicurezza: flashcards non esiste o non è array
  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        color: "#9ca3af",
        marginTop: 60
      }}>
        {translate('stats.No flashcards generated')}
      </div>
    )
  }

  // fine sessione
  if (currentIndex >= flashcards.length) {
    return (
      <div style={{
        textAlign: "center",
        color: "white",
        marginTop: 60
      }}>
        <h2>🎉 {translate('stats.Study session completed')}</h2>
        <p style={{ color: "#9ca3af" }}>
          {translate('stats.You reviewed')} {flashcards.length} {translate('stats.cards')}.
        </p>
      </div>
    )
  }

  const card = flashcards[currentIndex]

  console.log("CARD:", card)

 async function reviewCard(id, isCorrect, difficulty) {

  if (!id) {
    console.warn("Skipping review: no flashcard_id")
    return
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    console.error("No auth token")
    return
  }
  console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)

  try {
    console.log("reviewCard payload:", {
    flashcard_id: id,
    difficulty,
    is_correct: isCorrect,
    elapsed_seconds: 0
  })
  console.log("typeof id:", typeof id, "value:", id)
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/review_flashcard`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          flashcard_id: id,
          difficulty,
          is_correct: isCorrect,
          elapsed_seconds: 0
        })
      }
    )


  const responseText = await res.text()
  console.log("RESPONSE STATUS:", res.status)
  console.log("RESPONSE BODY:", responseText)

} catch (e) {
  console.error("FETCH ERROR:", e)
}



  

  }

  async function reviewAndNext(id: number, isCorrect: boolean, difficulty: number) {

    await reviewCard(id, isCorrect, difficulty)

    if (onReview) {
      await onReview(id, difficulty, isCorrect)
    }

    setOpenCard(false)

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      console.log("📍 LAST CARD UI")

      // 🔥 NON chiamare subito complete
      // lascia decidere StudySessionView
      if (onReview) {
        onReview(id, difficulty, isCorrect)
      }
    }
  }

  return (

    <div className="flashcards-execution-shell">

      <div
        className="flashcards-card-counter"
        style={{
          textAlign: "center",
          color: "#9ca3af",
          marginBottom: 20,
          fontSize: 14
        }}
      >
        Card {currentIndex + 1} / {flashcards.length}
      </div>

      <div className="flashcards-progress-bar" style={progressBar}>
        <div
          style={{
            ...progressFill,
            width: `${((currentIndex + 1) / flashcards.length) * 100}%`
          }}
        />
      </div>

      <div
        className={
          openCard
            ? "flashcards-card flashcards-card-answer-view"
            : "flashcards-card flashcards-card-question-view"
        }
        onClick={() => setOpenCard(!openCard)}
        style={{
          background: "#111827",
          border: "1px solid #374151",
          color: "white",
          padding: "40px",
          borderRadius: 12,
          margin: "40px auto",
          maxWidth: 700,
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          cursor: "pointer"
        }}
      >

        <h2
          className="flashcards-question"
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            fontWeight: 600
          }}
        >
          <MarkdownContent text={card.question} inline />
        </h2>

        {openCard && (

          <>

            <div className="flashcards-answer-box" style={answerBox}>
              <div className="flashcards-answer">
                <MarkdownContent text={card.answer} />
              </div>
            </div>
            {card.topic && (
              <div
                className="flashcards-topic"
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#9ca3af"
                }}
              >
                Topic: {card.topic}
              </div>
            )}

            <div className="flashcards-review-actions" style={{
              marginTop: 25,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap"
            }}>

              <button
                className="flashcards-review-button"
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, false, 1)
                }}
                style={wrongBtn}
              >
                {translate('stats.Wrong')}
              </button>

              <button
                className="flashcards-review-button"
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 1)
                }}
                style={hardBtn}
              >
                {translate('stats.Correct but hard')}
              </button>

              <button
                className="flashcards-review-button"
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 2)
                }}
                style={goodBtn}
              >
                {translate('stats.Correct')}
              </button>

              <button
                className="flashcards-review-button"
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 3)
                }}
                style={easyBtn}
              >
                {translate('stats.Easy')}
              </button>

              <button className="flashcards-previous-button" onClick={goToPrevious}>
                ⬅️ {translate('stats.Previous')}
              </button>

            </div>

          </>

        )}

      </div>
      <style jsx global>{`
        @media (max-width: 900px) {
          .flashcards-mobile-hidden {
            display: none !important;
          }

          .flashcards-execution-shell {
            padding: 10px 10px 14px;
            box-sizing: border-box;
          }

          .flashcards-card-counter {
            margin-bottom: 8px !important;
            font-size: 13px !important;
            line-height: 1.1 !important;
          }

          .flashcards-progress-bar {
            height: 6px !important;
            margin: 0 auto 14px auto !important;
            max-width: none !important;
          }

          .flashcards-card {
            width: 100%;
            max-width: none !important;
            box-sizing: border-box;
            margin: 14px auto 0 !important;
            padding: 24px 18px !important;
            border-radius: 10px !important;
          }

          .flashcards-card-question-view {
            min-height: 36dvh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .flashcards-card-answer-view {
            padding: 18px 14px 14px !important;
          }

          .flashcards-question {
            font-size: 21px !important;
            line-height: 1.25 !important;
            font-weight: 600 !important;
            margin: 0 !important;
          }

          .flashcards-card-answer-view .flashcards-question {
            font-size: 16px !important;
            line-height: 1.22 !important;
            color: #cbd5e1 !important;
            font-weight: 500 !important;
            margin-bottom: 10px !important;
          }

          .flashcards-answer-box {
            margin-top: 0 !important;
            padding: 12px !important;
            border-radius: 8px !important;
          }

          .flashcards-answer {
            font-size: 20px;
            line-height: 1.35;
            font-weight: 650;
            color: #f8fafc;
          }

          .flashcards-topic {
            margin-top: 7px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }

          .flashcards-review-actions {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 6px !important;
            margin-top: 12px !important;
          }

          .flashcards-review-button,
          .flashcards-previous-button {
            min-height: 36px;
            padding: 7px 6px !important;
            border-radius: 7px !important;
            font-size: 11px !important;
            line-height: 1.15 !important;
            font-weight: 600;
            box-sizing: border-box;
          }

          .flashcards-previous-button {
            grid-column: 1 / -1;
            background: #1f2937;
            border: 1px solid #374151;
            color: white;
            cursor: pointer;
          }
        }
      `}</style>

    </div>

  )
}

const wrongBtn = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer"
}

const hardBtn = {
  background: "#111827",
  color: "white",
  border: "1px solid #374151",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer"
}

const goodBtn = {
  background: "#eab308",
  color: "black",
  border: "none",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer"
}

const easyBtn = {
  background: "#22c55e",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer"
}

const answerBox = {
  marginTop: 10,
  padding: 15,
  background: "#0f172a",
  border: "1px solid #374151",
  borderRadius: 8,
  color: "#e5e7eb"
}

const progressBar = {
  height: 8,
  background: "#1f2937",
  borderRadius: 999,
  maxWidth: 500,
  margin: "0 auto 30px auto",
  overflow: "hidden"
}

const progressFill = {
  height: "100%",
  background: "#22c55e",
  borderRadius: 999,
  transition: "width 0.3s ease"
}
