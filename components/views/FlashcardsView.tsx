import { useEffect, useState } from "react"
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
loaderText,
standaloneCompletionAvailable = false,
onGenerateMore,
onBackToDashboard
}) {
const { t: translate } = useTranslation();

const [currentIndex, setCurrentIndex] = useState(0)
const cardTurned = Boolean(openCard)

useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (!Array.isArray(flashcards) || flashcards.length === 0) return
    if (currentIndex >= flashcards.length) return

    const target = event.target as HTMLElement | null
    const tagName = target?.tagName?.toLowerCase()
    if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) {
      return
    }

    const currentCard = flashcards[currentIndex]

    if (event.code === "Space") {
      event.preventDefault()
      setOpenCard(true)
      return
    }

    if (!cardTurned || !currentCard) return

    if (event.key === "1") {
      event.preventDefault()
      reviewAndNext(currentCard.id, false, 1)
    }

    if (event.key === "2") {
      event.preventDefault()
      reviewAndNext(currentCard.id, true, 1)
    }

    if (event.key === "3") {
      event.preventDefault()
      reviewAndNext(currentCard.id, true, 2)
    }

    if (event.key === "4") {
      event.preventDefault()
      reviewAndNext(currentCard.id, true, 3)
    }
  }

  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
}, [cardTurned, currentIndex, flashcards, openCard])

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
      setOpenCard(false)
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
        minHeight: "100%",
        padding: "32px 18px",
        boxSizing: "border-box",
        color: "white"
      }}>
        <section style={{
          margin: "28px auto 0",
          maxWidth: 760,
          padding: 22,
          borderRadius: 16,
          border: "1px solid rgba(47, 164, 169, 0.34)",
          background:
            "radial-gradient(circle at top right, rgba(47, 164, 169, 0.12), transparent 36%), linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96))",
          color: "#ffffff",
          textAlign: "center"
        }}>
          <h2 style={{
            margin: "0 0 10px",
            fontSize: 22
          }}>
            ✅ {translate('stats.Flashcards Session Completed title')}
          </h2>
          <p style={{
            margin: "0 auto 18px",
            maxWidth: 620,
            color: "#cbd5e1",
            lineHeight: 1.55
          }}>
            {standaloneCompletionAvailable
              ? translate("stats.Flashcards Session Completed description")
              : `${translate('stats.You reviewed')} ${flashcards.length} ${translate('stats.cards')}.`
            }
          </p>
          {(onBackToDashboard || (standaloneCompletionAvailable && onGenerateMore)) && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap"
            }}>
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  style={{
                    padding: "11px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(47, 164, 169, 0.5)",
                    background: "#111827",
                    color: "#ffffff",
                    fontWeight: 760,
                    cursor: "pointer"
                  }}
                >
                  ← {translate("stats.Back to Dashboard")}
                </button>
              )}
              {standaloneCompletionAvailable && onGenerateMore && (
                <button
                  type="button"
                  onClick={onGenerateMore}
                  style={{
                    padding: "11px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(34, 197, 94, 0.55)",
                    background: "#22c55e",
                    color: "#ffffff",
                    fontWeight: 760,
                    cursor: "pointer"
                  }}
                >
                  {translate("stats.Generate More Cards")}
                </button>
              )}
            </div>
          )}
        </section>
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
      if (onFlashcardsComplete) {
        await onFlashcardsComplete()
      }
      setCurrentIndex(flashcards.length)
    }
  }

  return (
    <div className="flashcards-execution-shell">
      <div className="flashcards-deck-progress">
        <div className="flashcards-card-counter">
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
      </div>

      <div className="flashcards-deck-stage">
        {currentIndex > 0 && (
          <button
            className="flashcards-previous-arrow"
            onClick={goToPrevious}
            aria-label={translate("stats.Previous")}
          >
            ‹
          </button>
        )}

        <div
          className="flashcards-card-scene"
          onClick={() => !cardTurned && setOpenCard(true)}
        >
          <div className={`flashcards-card-flipper ${cardTurned ? "is-turned" : ""}`}>
            <section className="flashcards-card-face flashcards-card-front">
              <div className="flashcards-card-kind">Question</div>
              <h2 className="flashcards-question">
                <MarkdownContent text={card.question} inline />
              </h2>

              {card.topic && (
                <div className="flashcards-topic">
                  Topic: {card.topic}
                </div>
              )}

              <button
                className="flashcards-turn-button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenCard(true)
                }}
              >
                {translate("stats.Turn card")}
              </button>
            </section>

            <section className="flashcards-card-face flashcards-card-back">
              <div className="flashcards-card-kind">Answer</div>
              <div className="flashcards-back-question">
                <MarkdownContent text={card.question} inline />
              </div>
              <div className="flashcards-answer-divider" />
              <div className="flashcards-answer">
                <MarkdownContent text={card.answer} />
              </div>
            </section>
          </div>
        </div>
      </div>

      {!cardTurned && (
        <div className="flashcards-recall-hint">
          💡 {translate("stats.Try to recall the answer before revealing it")}
        </div>
      )}

      {cardTurned && (
        <div className="flashcards-review-panel">
          <div className="flashcards-review-title">
            {translate("stats.How well did you remember?")}
          </div>

          <div className="flashcards-review-actions">
            <div className="flashcards-review-choice">
              <button
                className="flashcards-review-button flashcards-review-wrong"
                onClick={() => reviewAndNext(card.id, false, 1)}
                style={wrongBtn}
              >
                {translate('stats.Wrong')}
              </button>
              <div className="flashcards-review-note">
                {translate("stats.Not at all")}
              </div>
            </div>

            <div className="flashcards-review-choice">
              <button
                className="flashcards-review-button flashcards-review-hard"
                onClick={() => reviewAndNext(card.id, true, 1)}
                style={hardBtn}
              >
                {translate('stats.Correct but hard')}
              </button>
              <div className="flashcards-review-note">
                {translate("stats.With difficulty")}
              </div>
            </div>

            <div className="flashcards-review-choice">
              <button
                className="flashcards-review-button flashcards-review-good"
                onClick={() => reviewAndNext(card.id, true, 2)}
                style={goodBtn}
              >
                {translate('stats.Correct')}
              </button>
              <div className="flashcards-review-note">
                {translate("stats.Almost there")}
              </div>
            </div>

            <div className="flashcards-review-choice">
              <button
                className="flashcards-review-button flashcards-review-easy"
                onClick={() => reviewAndNext(card.id, true, 3)}
                style={easyBtn}
              >
                {translate('stats.Easy')}
              </button>
              <div className="flashcards-review-note">
                {translate("stats.Well remembered")}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flashcards-shortcut-box">
        <div className="flashcards-shortcut-title">
          {translate("stats.Keyboard shortcuts")}
        </div>
        <div className="flashcards-shortcut-row">
          <span className="flashcards-shortcut-item">
            <span className="flashcards-shortcut-key flashcards-shortcut-key-turn">Space</span>
            {translate("stats.Turn card")}
          </span>
          {cardTurned && (
            <>
              <span className="flashcards-shortcut-item">
                <span className="flashcards-shortcut-key flashcards-shortcut-key-wrong">1</span>
                {translate('stats.Wrong')}
              </span>
              <span className="flashcards-shortcut-item">
                <span className="flashcards-shortcut-key flashcards-shortcut-key-hard">2</span>
                {translate('stats.Correct but hard')}
              </span>
              <span className="flashcards-shortcut-item">
                <span className="flashcards-shortcut-key flashcards-shortcut-key-good">3</span>
                {translate('stats.Correct')}
              </span>
              <span className="flashcards-shortcut-item">
                <span className="flashcards-shortcut-key flashcards-shortcut-key-easy">4</span>
                {translate('stats.Easy')}
              </span>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .flashcards-completion-shell {
          min-height: 100%;
          padding: 32px 18px;
          box-sizing: border-box;
          color: white;
        }

        .flashcards-completion-panel {
          margin: 28px auto 0;
          max-width: 760px;
          padding: 22px;
          border-radius: 16px;
          border: 1px solid rgba(47, 164, 169, 0.34);
          background:
            radial-gradient(circle at top right, rgba(47, 164, 169, 0.12), transparent 36%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
          color: #ffffff;
          text-align: center;
        }

        .flashcards-completion-panel h2 {
          margin: 0 0 10px;
          font-size: 22px;
        }

        .flashcards-completion-panel p {
          margin: 0 auto 18px;
          max-width: 620px;
          color: #cbd5e1;
          line-height: 1.55;
        }

        .flashcards-completion-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .flashcards-completion-back-button,
        .flashcards-completion-generate-button {
          padding: 11px 18px;
          border-radius: 10px;
          color: #ffffff;
          font-weight: 760;
          cursor: pointer;
        }

        .flashcards-completion-back-button {
          border: 1px solid rgba(47, 164, 169, 0.5);
          background: #111827;
        }

        .flashcards-completion-generate-button {
          border: 1px solid rgba(34, 197, 94, 0.55);
          background: #22c55e;
        }

        .flashcards-execution-shell {
          min-height: 100%;
          padding: 18px 18px 32px;
          box-sizing: border-box;
          color: white;
        }

        .flashcards-deck-progress {
          max-width: 560px;
          margin: 0 auto 28px;
        }

        .flashcards-card-counter {
          text-align: center;
          color: #cbd5e1;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .flashcards-deck-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 380px;
        }

        .flashcards-card-scene {
          width: min(760px, 100%);
          min-height: 360px;
          perspective: 1400px;
        }

        .flashcards-card-flipper {
          position: relative;
          width: 100%;
          min-height: 360px;
          transform-style: preserve-3d;
          transition: transform 0.48s ease;
        }

        .flashcards-card-flipper.is-turned {
          transform: rotateY(180deg);
        }

        .flashcards-card-face {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 42px 54px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 20% 0%, rgba(47, 164, 169, 0.12), transparent 32%),
            linear-gradient(145deg, #111827, #0b1220);
          border: 1px solid rgba(47, 164, 169, 0.22);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.38);
          color: white;
          text-align: center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flashcards-card-front {
          cursor: pointer;
        }

        .flashcards-card-back {
          transform: rotateY(180deg);
        }

        .flashcards-card-kind {
          color: #36f2ed;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 22px;
        }

        .flashcards-question {
          font-size: clamp(28px, 3.2vw, 42px);
          line-height: 1.23;
          font-weight: 760;
          max-width: 680px;
          margin: 0;
        }

        .flashcards-topic {
          margin-top: 26px;
          color: #9ca3af;
          font-size: 14px;
        }

        .flashcards-turn-button {
          margin-top: 28px;
          padding: 9px 16px;
          background: rgba(15, 23, 42, 0.78);
          border: 1px solid rgba(54, 242, 237, 0.28);
          border-radius: 999px;
          color: #e5e7eb;
          cursor: pointer;
          font-weight: 650;
        }

        .flashcards-back-question {
          color: #cbd5e1;
          font-size: 17px;
          line-height: 1.35;
          font-weight: 560;
          max-width: 650px;
        }

        .flashcards-answer-divider {
          width: min(560px, 100%);
          height: 1px;
          background: rgba(148, 163, 184, 0.22);
          margin: 24px 0;
        }

        .flashcards-answer {
          max-width: 650px;
          color: #f8fafc;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.42;
          font-weight: 690;
        }

        .flashcards-previous-arrow {
          position: absolute;
          left: max(12px, calc(50% - 480px));
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.72);
          color: #cbd5e1;
          font-size: 34px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0 3px;
          cursor: pointer;
          z-index: 2;
        }

        .flashcards-recall-hint {
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          margin-top: 18px;
        }

        .flashcards-review-panel {
          margin: 28px auto 0;
          max-width: 760px;
          text-align: center;
        }

        .flashcards-review-title {
          color: #f8fafc;
          font-size: 18px;
          font-weight: 760;
          margin-bottom: 14px;
        }

        .flashcards-review-actions {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .flashcards-review-choice {
          min-width: 0;
        }

        .flashcards-review-button {
          width: 100%;
          min-height: 48px;
          border-radius: 12px !important;
          font-weight: 780;
          font-size: 14px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .flashcards-review-note {
          margin-top: 9px;
          color: #a3aab8;
          font-size: 12px;
          line-height: 1.25;
        }

        .flashcards-shortcut-box {
          max-width: 760px;
          margin: 30px auto 0;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid rgba(47, 164, 169, 0.20);
          background: rgba(15, 23, 42, 0.62);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
        }

        .flashcards-shortcut-title {
          color: #36f2ed;
          font-size: 13px;
          font-weight: 780;
          margin-bottom: 12px;
        }

        .flashcards-shortcut-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          align-items: center;
          justify-content: center;
        }

        .flashcards-shortcut-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
          font-size: 12px;
          white-space: nowrap;
        }

        .flashcards-shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 26px;
          padding: 0 8px;
          border-radius: 7px;
          color: white;
          font-weight: 800;
          border: 1px solid rgba(255, 255, 255, 0.22);
          opacity: 0.75;
        }

        .flashcards-shortcut-key-turn {
          background: #334155;
        }

        .flashcards-shortcut-key-wrong {
          background: #ef4444;
        }

        .flashcards-shortcut-key-hard {
          background: #f59e0b;
        }

        .flashcards-shortcut-key-good {
          background: #eab308;
          color: #111827;
        }

        .flashcards-shortcut-key-easy {
          background: #22c55e;
        }

        @media (max-width: 900px) {
          .flashcards-mobile-hidden {
            display: none !important;
          }

          .flashcards-execution-shell {
            padding: 10px 10px 18px;
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

          .flashcards-deck-progress {
            margin-bottom: 12px !important;
          }

          .flashcards-deck-stage {
            min-height: 330px !important;
          }

          .flashcards-card-scene,
          .flashcards-card-flipper {
            min-height: 315px !important;
          }

          .flashcards-card-face {
            padding: 28px 18px !important;
            border-radius: 14px !important;
          }

          .flashcards-card-kind {
            margin-bottom: 14px !important;
            font-size: 11px !important;
          }

          .flashcards-question {
            font-size: 22px !important;
            line-height: 1.25 !important;
            font-weight: 730 !important;
          }

          .flashcards-back-question {
            font-size: 16px !important;
            line-height: 1.22 !important;
            color: #cbd5e1 !important;
            font-weight: 500 !important;
            margin-bottom: 10px !important;
          }

          .flashcards-answer {
            font-size: 20px !important;
            line-height: 1.35 !important;
          }

          .flashcards-topic {
            margin-top: 15px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }

          .flashcards-turn-button {
            margin-top: 18px !important;
          }

          .flashcards-previous-arrow {
            left: 2px !important;
            width: 34px !important;
            height: 34px !important;
            border-radius: 9px !important;
            font-size: 28px !important;
          }

          .flashcards-review-actions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
            margin-top: 0 !important;
          }

          .flashcards-review-button {
            min-height: 36px;
            padding: 7px 6px !important;
            border-radius: 7px !important;
            font-size: 11px !important;
            line-height: 1.15 !important;
            font-weight: 600;
            box-sizing: border-box;
          }

          .flashcards-review-note {
            margin-top: 6px !important;
            font-size: 10px !important;
          }

          .flashcards-shortcut-box {
            display: none !important;
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
  background: "#f59e0b",
  color: "white",
  border: "1px solid rgba(249, 115, 22, 0.75)",
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
