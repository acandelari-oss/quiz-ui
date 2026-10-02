import StudyAnswerChat from "../ui/StudyAnswerChat"
import { isCorrectQuizOption, resolveCorrectAnswerIndex } from "@/utils/quizAnswers"
import MarkdownContent from "@/components/ui/MarkdownContent"
import { useTranslation } from "react-i18next"

export default function QuizView({
  quiz,
  answers,
  selectAnswer,
  finished,
  started,
  submitQuiz,
  expanded,
  setExpanded,
  generatingQuiz,
  formatTime,
  quizPacingOverTarget,
  answeredCount,
  projectId,
  quizId,
  calculateScore,
  onBackToDashboard,
  hideCompletionPanel = false,
  loaderText

}: any) {

  const { t: translate } = useTranslation()
  return (
    <div className="quiz-shell" style={quizBox}>

      {generatingQuiz && (
        <div style={{
            display: "flex",
            flexDirection: "column", // Cambiato a column per ospitare meglio il testo
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 30,
            padding: "20px",
            background: "rgba(47, 164, 169, 0.05)",
            borderRadius: "12px",
            border: "1px dashed #2FA4A9"
        }}>
          <div style={{
              width: 24,
              height: 24,
              border: "3px solid rgba(229, 231, 235, 0.2)",
              borderTop: "3px solid #2FA4A9",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
          }} />
          <div style={{ color: "#2FA4A9", fontWeight: 600, fontSize: "16px" }}>
            {loaderText || "Generating quiz..."} {/* <--- Messaggio dinamico */}
          </div>
        </div>
      )}

      {started && !finished && (
        <div
          className="quiz-mobile-status"
          style={{
            marginBottom: 20,
            color: "#9ca3af",
            fontWeight: 600
          }}
        >
          <span>
            <span className="quiz-status-mobile-icon">⏱ </span>
            <span className="quiz-status-desktop-label">Elapsed: </span>
            <span style={{ color: quizPacingOverTarget ? "#f87171" : "inherit" }}>
              {formatTime()}
            </span>
          </span>
          <span className="quiz-mobile-answered-inline">
            <span className="quiz-status-mobile-icon">✓ </span>
            <span className="quiz-status-desktop-label">Answered: </span>
            {answeredCount} / {quiz.length}
          </span>
        </div>
      )}

      {started && !finished && (
        <div className="quiz-desktop-answered" style={{ marginBottom: 20, color: "#9ca3af" }}>
          Answered: {answeredCount} / {quiz.length}
        </div>
      )}

      {quiz.map((q: any, i: number) => {

        

        return (
          <div key={i} className="quiz-question-block" style={question}>

            <h3 className="quiz-question-title">
              {i + 1}. <MarkdownContent text={q.question} inline />
            </h3>

            {(q.options || []).map((opt: string, j: number) => {
              const selected = answers[i] === opt
              console.log("finished:", finished)

              const correct = isCorrectQuizOption(q, j)

              let background = "#020617"

              if (finished === true) {

                if (correct) {
                  background = "#2FA4A9"
                }

                if (selected && !correct) {
                  background = "#ff6b6b"
                }

              } else {

                if (selected) {
                  background = "#2FA4A9"
                }

              }

              return (
                <div
                  className="quiz-answer-option"
                  key={j}
                  onClick={() => selectAnswer(i, opt)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    marginTop: 6,
                    cursor: finished ? "default" : "pointer",
                    borderRadius: 8,
                    border: "1px solid #374151",
                    background: background,
                    color: "white",
                    transition: "all 0.15s"
                  }}
                >
                  <span
                    className="quiz-answer-letter"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "1px solid rgba(148, 163, 184, 0.45)",
                      background: "rgba(15, 23, 42, 0.72)",
                      fontWeight: 600,
                      color: correct && finished ? "white" : "#9ca3af",
                      minWidth: 24,
                      flexShrink: 0
                    }}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>

                  <span className="quiz-answer-text">
                    <MarkdownContent text={opt} inline />
                  </span>
                </div>
              )
            })}

            {finished === true && (
              <div
                className="quiz-review-explanation-card"
                style={{
                  marginTop: 14,
                  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96))",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid rgba(47, 164, 169, 0.28)",
                  fontSize: 14,
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: 12,
                  alignItems: "flex-start"
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(47, 164, 169, 0.08)",
                  border: "1px solid rgba(47, 164, 169, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <img
                    src="/icons/answer.svg"
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none"
                    }}
                    style={{
                      width: 17,
                      height: 17,
                      opacity: 0.62
                    }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      color: "#2FA4A9",
                      marginBottom: 7,
                      fontWeight: 700,
                      letterSpacing: 0.2
                    }}
                  >
                    Explanation
                  </div>

                  <div style={{ color: "#d1d5db", lineHeight: 1.55 }}>
                    <MarkdownContent text={q.explanation} />
                  </div>

                  {q.explanation_long && (
                    <div
                      style={{
                        marginTop: 6,
                        color: "#9ca3af",
                        fontSize: 13,
                        lineHeight: 1.5
                      }}
                    >
                      <MarkdownContent text={q.explanation_long} />
                    </div>
                  )}

                  {q.source_document && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#94a3b8",
                        borderTop: "1px solid rgba(148, 163, 184, 0.14)",
                        paddingTop: 8
                      }}
                    >
                      Source: {q.source_document}
                      {q.source_page !== undefined && q.source_page !== null && q.source_page !== ""
                        ? ` – page ${q.source_page}`
                        : ""}
                    </div>
                  )}
                </div>
                
              </div>
            )}

            {finished && (
              <StudyAnswerChat
                key={JSON.stringify([projectId, quizId, q.id, i, q.question])}
                conversationId={JSON.stringify([projectId, quizId, q.id, i, q.question])}
                projectId={projectId}
                kind="quiz"
                context={`Quiz question:
${q.question}
Options:
${(q.options || []).join("\n")}
Correct answer:
${q.options?.[resolveCorrectAnswerIndex(q) ?? -1] ?? q.correct_answer ?? q.correct ?? q.answer ?? "Not available"}
Student selected:
${answers[i] ?? "No answer selected"}
Explanation:
${q.explanation || ""}
${q.explanation_long || ""}`}
              />
            )}
          </div>
        ) // <--- MANCAVA QUESTO (chiude il return del map)
      })}
      {started && !finished && (
        <button
          onClick={submitQuiz}
          style={{ ...button, marginTop: 20 }}
        >
          Submit Quiz
        </button>
      )}

      {finished && typeof calculateScore === "function" && (
        <div style={{ marginTop: 20 }}>
          <h2>Score: {calculateScore()} / {quiz.length}</h2>
        </div>
      )}

      {finished && !hideCompletionPanel && (
        <section className="quiz-completion-panel">
          <h2>{translate("stats.Quiz Submitted title")}</h2>
          <p>{translate("stats.Quiz Submitted description")}</p>
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="quiz-completion-back-button"
            >
              ← {translate("stats.Back to Dashboard")}
            </button>
          )}
        </section>
      )}
      <style jsx global>{`
        .quiz-completion-panel {
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

        .quiz-completion-panel h2 {
          margin: 0 0 10px;
          font-size: 22px;
        }

        .quiz-completion-panel p {
          margin: 0 auto 18px;
          max-width: 620px;
          color: #cbd5e1;
          line-height: 1.55;
        }

        .quiz-completion-back-button {
          padding: 11px 18px;
          border: 1px solid rgba(47, 164, 169, 0.5);
          border-radius: 10px;
          background: #111827;
          color: #ffffff;
          font-weight: 760;
          cursor: pointer;
        }

        .quiz-status-mobile-icon {
          display: none;
        }

        .quiz-mobile-answered-inline {
          display: none;
        }

        @media (max-width: 900px) {
          .quiz-shell {
            background: #080a10 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 10px 16px !important;
          }

          .quiz-mobile-status {
            position: sticky;
            top: 0;
            z-index: 5;
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            min-height: 30px;
            margin: 0 -10px 8px !important;
            padding: 5px 12px;
            background: rgba(8, 10, 16, 0.96);
            border-bottom: 1px solid #1f2937;
            font-size: 13px;
            line-height: 1.1;
            backdrop-filter: blur(8px);
            color: #cbd5e1 !important;
            font-weight: 500 !important;
          }

          .quiz-status-mobile-icon {
            display: inline;
            color: #36f2ed;
          }

          .quiz-status-desktop-label {
            display: none;
          }

          .quiz-mobile-answered-inline {
            display: inline;
          }

          .quiz-desktop-answered {
            display: none !important;
          }

          .quiz-question-block {
            margin-bottom: 16px !important;
          }

          .quiz-question-title {
            margin: 0 0 7px !important;
            font-size: 17px !important;
            line-height: 1.2 !important;
            font-weight: 750 !important;
            color: #f8fafc;
          }

          .quiz-answer-option {
            gap: 8px !important;
            padding: 6px 9px !important;
            margin-top: 4px !important;
            border-radius: 7px !important;
            min-height: 34px;
          }

          .quiz-answer-letter {
            min-width: 18px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
          }

          .quiz-answer-text {
            font-size: 15px !important;
            line-height: 1.2 !important;
            font-weight: 450 !important;
          }

          .quiz-review-explanation-card {
            grid-template-columns: 28px 1fr !important;
            gap: 10px !important;
            padding: 12px !important;
            margin-top: 10px !important;
          }

          .quiz-question-chat-panel {
            padding: 11px !important;
            margin-top: 10px !important;
          }

          .quiz-question-chat-suggestions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      
    </div> // Chiude il contenitore principale
  );
} // Chiude la funzione QuizView

const quizBox = {
  background: "#111827",
  border: "1px solid #374151",
  color: "white",
  padding: 35,
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
}

const question = {
  marginBottom: 20
}

const button = {
  marginTop: 10,
  background: "#2FA4A9",
  color: "white",
  padding: "10px 14px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
}
