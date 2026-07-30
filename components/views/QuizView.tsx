import { useState } from "react"
import { isCorrectQuizOption } from "@/utils/quizAnswers"
import MarkdownContent from "@/components/ui/MarkdownContent"

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
  loaderText
  
}: any) {

  const [chatOpen, setChatOpen] = useState<{ [key: number]: boolean }>({})
  const [chatMessages, setChatMessages] = useState<{ [key: number]: any[] }>({})
  const [chatInput, setChatInput] = useState<{ [key: number]: string }>({})
  const [isGlobal, setIsGlobal] = useState<{ [key: number]: boolean }>({})
  const [recordingQuestionIndex, setRecordingQuestionIndex] = useState<number | null>(null)
  const [recognition, setRecognition] = useState<any>(null)
  const questionChatSuggestions = [
    "Why is this answer incorrect?",
    "Explain it more simply",
    "Give me another example",
    "Why is the correct answer better?"
  ]

  async function askQuestionChat(i: number, q: any, suggestedPrompt?: string) {
  if (!projectId) return;

  const input = suggestedPrompt || chatInput[i] || "";
  if (!input.trim()) return;
  setChatOpen({
    ...chatOpen,
    [i]: true
  });

  // 1. Definiamo la domanda da inviare al server
  // Se isGlobal[i] è attivo, non forziamo "ONLY study material" nel prompt
  const basePrompt = isGlobal[i] 
    ? `Explain this quiz question. Use the study material and your general knowledge.`
    : `Explain this quiz question using ONLY the study material.`;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        question: `
${basePrompt}

Question:
${q.question}

Options:
${(q.options || []).join("\n")}

Student selected:
${answers[i] || "No answer selected"}

Student follow-up question:
${input}
`,
        history: chatMessages[i] || [],
        expand_search: isGlobal[i] || false // <--- Questo attiva la logica nel tuo main.py
      })
    });

    const data = await res.json();

    // 2. Aggiorniamo i messaggi della chat
    setChatMessages({
      ...chatMessages,
      [i]: [
        ...(chatMessages[i] || []),
        { role: "user", content: input },
        { role: "assistant", content: data.answer }
      ]
    });

    // 3. Puliamo l'input
    setChatInput({
      ...chatInput,
      [i]: ""
    });
    setChatOpen({
      ...chatOpen,
      [i]: true
    });

  } catch (error) {
    console.error("Chat Error:", error);
  }
}

  function startQuestionChatRecording(i: number) {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.")
      return
    }

    if (recognition) {
      recognition.stop()
    }

    const nextRecognition = new SpeechRecognition()
    nextRecognition.lang = navigator.language || "en-US"
    nextRecognition.interimResults = false
    nextRecognition.continuous = false

    nextRecognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ""
      if (!transcript.trim()) return

      setChatInput(prev => ({
        ...prev,
        [i]: `${prev[i] || ""} ${transcript}`.trim()
      }))
    }

    nextRecognition.onend = () => {
      setRecordingQuestionIndex(null)
      setRecognition(null)
    }

    setRecognition(nextRecognition)
    setRecordingQuestionIndex(i)
    nextRecognition.start()
  }

  function stopQuestionChatRecording() {
    if (recognition) {
      recognition.stop()
    }
    setRecordingQuestionIndex(null)
    setRecognition(null)
  }

  function toggleQuestionChatRecording(i: number) {
    if (recordingQuestionIndex === i) {
      stopQuestionChatRecording()
      return
    }

    startQuestionChatRecording(i)
  }

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
                      Source: {q.source_document} – page {q.source_page}
                    </div>
                  )}
                </div>
                
              </div>
            )}

            {finished && (
              <div
                className="quiz-question-chat-panel"
                style={{
                  marginTop: 12,
                  background: "rgba(15, 23, 42, 0.78)",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid rgba(55, 65, 81, 0.9)"
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    marginBottom: 10
                  }}
                >
                  Ask about this question
                </div>

                <div
                  className="quiz-question-chat-suggestions"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    marginBottom: 10
                  }}
                >
                  {questionChatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => askQuestionChat(i, q, suggestion)}
                      style={{
                        textAlign: "left",
                        padding: "9px 10px",
                        background: "#111827",
                        border: "1px solid rgba(47, 164, 169, 0.22)",
                        borderRadius: 8,
                        color: "#e5e7eb",
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: 1.25
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {!chatOpen[i] && (
                  <button
                    onClick={() =>
                      setChatOpen({
                        ...chatOpen,
                        [i]: true
                      })
                    }
                    style={{
                      padding: "7px 11px",
                      background: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 7,
                      color: "white",
                      cursor: "pointer",
                      fontSize: 13
                    }}
                  >
                    Start chat
                  </button>
                )}

                {chatOpen[i] && (
                  <div
                    style={{
                      marginTop: 10,
                      background: "#020617",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #374151"
                    }}
                  >
                    {/* Lista Messaggi */}
                    {(chatMessages[i] || []).map((m: any, k: number) => (
                      <div
                        key={k}
                        style={{
                          marginBottom: 10,
                          color: m.role === "user" ? "#93c5fd" : "#d1d5db",
                          whiteSpace: "pre-wrap",
                          fontSize: "14px",
                          borderLeft: m.role === "assistant" ? "2px solid #374151" : "none",
                          paddingLeft: m.role === "assistant" ? 8 : 0
                        }}
                      >
                        <strong>{m.role === "user" ? "You: " : "Tutor: "}</strong>
                        <MarkdownContent text={m.content} />
                      </div>
                    ))}

                    {/* --- SEZIONE CONTROLLO MODALITÀ RICERCA --- */}
                    <div style={{ 
                      marginBottom: '15px', 
                      marginTop: '10px', 
                      padding: '10px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '8px',
                      border: '1px solid #374151'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e' }}>
                            Search Mode: {isGlobal[i] ? "Global AI Knowledge" : "Strict Document Search"}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {isGlobal[i] 
                              ? "The AI uses its own knowledge to expand on the topics." 
                              : "The AI answers using ONLY your uploaded PDF files."}
                          </span>
                        </div>

                        {/* Toggle Switch */}
                        <div 
                          onClick={() => setIsGlobal({ ...isGlobal, [i]: !isGlobal[i] })}
                          style={{
                            width: '44px',
                            height: '22px',
                            backgroundColor: isGlobal[i] ? '#10b981' : '#4b5563',
                            borderRadius: '20px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s',
                            flexShrink: 0
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isGlobal[i] ? '24px' : '2px',
                            transition: 'left 0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>
                    </div>
                    {/* --- FINE SEZIONE --- */}

                    <div style={chatInputWrapper}>
                      <input
                        value={chatInput[i] || ""}
                        onChange={(e) =>
                          setChatInput({
                            ...chatInput,
                            [i]: e.target.value
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") askQuestionChat(i, q);
                        }}
                        placeholder="Ask about this question..."
                        style={chatInputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => toggleQuestionChatRecording(i)}
                        aria-label={
                          recordingQuestionIndex === i
                            ? "Stop voice input"
                            : "Start voice input"
                        }
                        style={{
                          ...chatMicButton,
                          background:
                            recordingQuestionIndex === i
                              ? "#ef4444"
                              : "#111827"
                        }}
                      >
                        {recordingQuestionIndex === i ? "⏹️" : (
                          <img
                            src="/icons/microphone.svg"
                            alt=""
                            style={{
                              width: 15,
                              height: 15,
                              display: "block"
                            }}
                          />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => askQuestionChat(i, q)}
                      style={chatAskButton}
                    >
                      Ask
                    </button>
                  </div>
                )}
              </div>
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
      <style jsx global>{`
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

const chatInputStyle = {
  width: "100%",
  padding: "8px 38px 8px 8px",
  background: "#020617",
  border: "1px solid #374151",
  borderRadius: 6,
  color: "white",
  boxSizing: "border-box" as const
}

const chatInputWrapper = {
  position: "relative" as const,
  marginTop: 6
}

const chatMicButton = {
  position: "absolute" as const,
  right: 6,
  top: "50%",
  transform: "translateY(-50%)",
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #374151",
  borderRadius: 6,
  color: "white",
  cursor: "pointer",
  padding: 0
}

const chatAskButton = {
  marginTop: 6,
  padding: "6px 10px",
  background: "#2FA4A9",
  border: "none",
  borderRadius: 6,
  color: "white",
  cursor: "pointer"
}
