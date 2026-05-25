import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useTranslation } from 'react-i18next';

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
          <div style={{ color: "#9ca3af", fontSize: 18 }}>
            {translate('stats.Select how many flashcards you want to revise')}<br/>
            and press <b>{translate('stats.Start Study')}</b>
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

    <div>

      <div
        style={{
          textAlign: "center",
          color: "#9ca3af",
          marginBottom: 20,
          fontSize: 14
        }}
      >
        Card {currentIndex + 1} / {flashcards.length}
      </div>

      <div style={progressBar}>
        <div
          style={{
            ...progressFill,
            width: `${((currentIndex + 1) / flashcards.length) * 100}%`
          }}
        />
      </div>

      <div
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
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            fontWeight: 600
          }}
        >
          {card.question}
        </h2>

        {openCard && (

          <>

            <div style={answerBox}>
              {card.answer}
            </div>
            {card.topic && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#9ca3af"
                }}
              >
                Topic: {card.topic}
              </div>
            )}

            <div style={{
              marginTop: 25,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap"
            }}>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, false, 1)
                }}
                style={wrongBtn}
              >
                {translate('stats.Wrong')}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 1)
                }}
                style={hardBtn}
              >
                {translate('stats.Correct but hard')}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 2)
                }}
                style={goodBtn}
              >
                {translate('stats.Correct')}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 3)
                }}
                style={easyBtn}
              >
                {translate('stats.Easy')}
              </button>

              <button onClick={goToPrevious}>
                ⬅️ {translate('stats.Previous')}
              </button>

            </div>

          </>

        )}

      </div>

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