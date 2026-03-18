import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function FlashcardsView({
flashcards,
openCard,
setOpenCard,
onReview,
onFlashcardsComplete,
projectId
}) {

  if(openCard === null){
  return (
    <div style={{
      textAlign:"center",
      color:"#9ca3af",
      marginTop:60,
      fontSize:18
    }}>
      Select how many flashcards you want to revise<br/>
      and press <b>Start Study</b>
    </div>
  )
}

  const [currentIndex, setCurrentIndex] = useState(0)

  // sicurezza: flashcards non esiste o non è array
  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        color: "#9ca3af",
        marginTop: 60
      }}>
        No flashcards generated
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
        <h2>🎉 Study session completed</h2>
        <p style={{ color: "#9ca3af" }}>
          You reviewed {flashcards.length} cards.
        </p>
      </div>
    )
  }

  const card = flashcards[currentIndex]

  async function reviewCard(id: number, isCorrect: boolean, difficulty: number) {

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

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
  is_correct: isCorrect,
  difficulty
  })
  }
  )

  if(!res.ok){
  console.error("Flashcard review failed")
  }

  

  }

  async function reviewAndNext(id: number, isCorrect: boolean, difficulty: number) {

  await reviewCard(id, isCorrect, difficulty)

  setOpenCard(false)

  if (currentIndex < flashcards.length - 1) {

    setCurrentIndex(currentIndex + 1)

  } else {

    setCurrentIndex(flashcards.length)

    if(onFlashcardsComplete){
      onFlashcardsComplete()
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
                Wrong
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 1)
                }}
                style={hardBtn}
              >
                Correct but hard
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 2)
                }}
                style={goodBtn}
              >
                Correct
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  reviewAndNext(card.id, true, 3)
                }}
                style={easyBtn}
              >
                Easy
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