import { useState } from "react"

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

  async function askQuestionChat(i: number, q: any) {
  if (!projectId) return;

  const input = chatInput[i] || "";
  if (!input.trim()) return;

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

  } catch (error) {
    console.error("Chat Error:", error);
  }
}
  return (
    <div style={quizBox}>

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
        <div style={{ marginBottom: 20, color: "#9ca3af", fontWeight: 600 }}>
          Time left: {formatTime()}
        </div>
      )}

      {started && !finished && (
        <div style={{ marginBottom: 20, color: "#9ca3af" }}>
          Answered: {answeredCount} / {quiz.length}
        </div>
      )}

      {quiz.map((q: any, i: number) => {

        

        return (
          <div key={i} style={question}>

            <h3>{i + 1}. {q.question}</h3>

            {(q.options || []).map((opt: string, j: number) => {
              const selected = answers[i] === opt
              console.log("finished:", finished)

              const correctRaw = (q.correct ?? "").toString().trim()
              const optTextNorm = opt?.toString().trim().toLowerCase()
              const correctTextNorm = correctRaw.toLowerCase()
              const optLetter = String.fromCharCode(65 + j)

              const correct =
                correctTextNorm === optTextNorm ||
                correctRaw === optLetter ||
                String(Number(correctRaw)) === String(j)

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
                    style={{
                      fontWeight: 600,
                      color: "#9ca3af",
                      minWidth: 18
                    }}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>

                  <span>{opt}</span>
                </div>
              )
            })}

            {finished === true && (
              <div
                style={{
                  marginTop: 10,
                  background: "#020617",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #374151",
                  fontSize: 14
                }}
              >
                <div
                  style={{
                    color: "#2FA4A9",
                    marginBottom: 6,
                    fontWeight: 600
                  }}
                >
                  Explanation
                </div>

                <div style={{ color: "#d1d5db" }}>
                  {q.explanation}
                </div>

                {q.explanation_long && (
                  <div
                    style={{
                      marginTop: 6,
                      color: "#9ca3af",
                      fontSize: 13
                    }}
                  >
                    {q.explanation_long}
                  </div>
                )}

                {q.source_document && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#6b7280"
                    }}
                  >
                    Source: {q.source_document} – page {q.source_page}
                  </div>
                )}
              </div>
            )}

            {finished && (
              <>
                <button
                  onClick={() =>
                    setChatOpen({
                      ...chatOpen,
                      [i]: !chatOpen[i]
                    })
                  }
                  style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: 6,
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  {chatOpen[i] ? "Hide chat ▲" : "Chat about this question ▼"}
                </button>

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
                        {m.content}
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
                      onClick={() => askQuestionChat(i, q)}
                      style={chatAskButton}
                    >
                      Ask
                    </button>
                  </div>
                )}
              </>
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
  padding: 8,
  marginTop: 6,
  background: "#020617",
  border: "1px solid #374151",
  borderRadius: 6,
  color: "white",
  boxSizing: "border-box" as const
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