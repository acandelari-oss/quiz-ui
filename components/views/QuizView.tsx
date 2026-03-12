import { useState } from "react"

export default function QuizView({
  quiz,
  answers,
  selectAnswer,
  finished,
  started,
  submitQuiz,
  score,
  expanded,
  setExpanded,
  generatingQuiz,
  formatTime,
  answeredCount,
  projectId,
  quizId
}: any) {

  const [chatOpen, setChatOpen] = useState<{ [key: number]: boolean }>({})
  const [chatMessages, setChatMessages] = useState<{ [key: number]: any[] }>({})
  const [chatInput, setChatInput] = useState<{ [key: number]: string }>({})

  async function askQuestionChat(i:number,q:any){
  if(!projectId){
  console.log("Missing projectId")
  return
  }

  const input = chatInput[i] || ""

  if(!input.trim()) return

  console.log("ASK PAYLOAD",{
  project_id: projectId,
  question: input
  })

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/ask`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        project_id: projectId,
        question: `
Explain this quiz question using ONLY the study material.

Question:
${q.question}

Options:
${(q.options || []).join("\n")}

Student selected:
${answers[i] || "No answer selected"}

Student follow-up question:
${input}
`
      })
    }
  )

  const data = await res.json()

  setChatMessages({
    ...chatMessages,
    [i]:[
      ...(chatMessages[i] || []),
      {role:"user",content:input},
      {role:"assistant",content:data.answer}
    ]
  })

  setChatInput({
    ...chatInput,
    [i]:""
  })

}
  return (
    <div style={quizBox}>

      {generatingQuiz && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            fontWeight: 600
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: "3px solid #e5e7eb",
              borderTop: "3px solid #2FA4A9",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
          Generating quiz...
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

              const correctRaw = (q.correct ?? "").toString().trim()
              const optTextNorm = opt?.toString().trim().toLowerCase()
              const correctTextNorm = correctRaw.toLowerCase()
              const optLetter = String.fromCharCode(65 + j)

              const correct =
                correctTextNorm === optTextNorm ||
                correctRaw === optLetter ||
                String(Number(correctRaw)) === String(j)

              let background = "#020617"

              if (finished) {
                if (correct) background = "#2FA4A9"
                else if (selected) background = "#ff6b6b"
              } else {
                if (selected) background = "#1f2937"
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

            {finished && (
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
                    {(chatMessages[i] || []).map((m: any, k: number) => (
                      <div
                        key={k}
                        style={{
                          marginBottom: 6,
                          color: m.role === "user" ? "#93c5fd" : "#d1d5db",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {m.content}
                      </div>
                    ))}

                    <input
                      value={chatInput[i] || ""}
                      onChange={(e) =>
                        setChatInput({
                          ...chatInput,
                          [i]: e.target.value
                        })
                      }
                      placeholder="Ask about this question..."
                      style={chatInputStyle}
                    />

                    <button
                    onClick={()=>askQuestionChat(i,q)}
                    style={chatAskButton}
                    >
                    Ask
                    </button>
                    
                  </div>
                )}
              </>
            )}

          </div>
        )
      })}

      {started && !finished && (
        <button
          onClick={submitQuiz}
          style={{ ...button, marginTop: 20 }}
        >
          Submit Quiz
        </button>
      )}

      {finished && (
        <div style={{ marginTop: 20 }}>
          <h2>Score: {score()} / {quiz.length}</h2>
        </div>
      )}
    </div>
  )
}

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