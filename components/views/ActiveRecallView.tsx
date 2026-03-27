import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

export default function ActiveRecallView({ projectId }:{projectId:string}){

const [messages,setMessages]=useState<any[]>([])
const [sessionStarted,setSessionStarted]=useState(false)
const [questionCount,setQuestionCount]=useState(0)
const [answerHistory,setAnswerHistory]=useState<string[]>([])
const maxQuestions=5
const [input,setInput]=useState("")
const [loading,setLoading]=useState(false)
const [isRecording, setIsRecording] = useState(false)
const [recognition, setRecognition] = useState<any>(null)
const [speechSupported, setSpeechSupported] = useState(true)
const [showAnswer, setShowAnswer] = useState(false)
const [aiAnswer, setAiAnswer] = useState("")

useEffect(() => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    setSpeechSupported(false)
    return
  }

  const recog = new SpeechRecognition()

  recog.lang = "en-US"
  recog.continuous = false
  recog.interimResults = true

  recog.onresult = (event: any) => {
    let interimTranscript = ""
    let finalTranscript = ""

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript

      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    setInput(finalTranscript + interimTranscript)
  }

  recog.onend = () => {
    setIsRecording(false)
  }

  setRecognition(recog)

}, [])

async function generateQuestion(){

if(questionCount >= maxQuestions){
return
}

setLoading(true)

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/active_recall_question`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({})
}
)

if(!res.ok){
setLoading(false)
return
}

const data = await res.json()

setMessages(prev=>[
...prev,
{role:"assistant",content:data.question}
])

setShowAnswer(false)

setQuestionCount(prev=>prev+1)

setLoading(false)

setAiAnswer("")

}

function toggleRecording() {
  console.log("🎤 CLICK MIC")

  if (!recognition) {
    console.log("❌ recognition is null")
    return
  }

  if (isRecording) {
    console.log("🛑 STOP")
    recognition.stop()
    setIsRecording(false)
  } else {
    console.log("▶️ START")
    recognition.start()
    setIsRecording(true)
  }
}

async function submitAnswer(){

if(!input.trim()) return

const studentAnswer=input

setMessages([
...messages,
{role:"assistant",content:messages[messages.length-1]?.content},
{role:"user",content:studentAnswer}
])

setInput("")
setLoading(true)

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/active_recall_evaluate`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
question:messages[messages.length-1]?.content,
student_answer:studentAnswer,
history:answerHistory
})
}
)

if(!res.ok){
setLoading(false)
return
}

const data = await res.json()

setAnswerHistory(prev => [...prev, studentAnswer])

setMessages(prev=>[
...prev,
{role:"feedback",content:data.feedback}
])

setAnswerHistory([])

setLoading(false)

}

async function fetchAnswer(){

  const question = messages[messages.length - 1]?.content

  if(!question) return

  setLoading(true)

  try {

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ask`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          project_id: projectId,
          question: question
        })
      }
    )

    if(!res.ok){
      setLoading(false)
      return
    }

    const data = await res.json()

    setAiAnswer(data.answer || "")
    setShowAnswer(true)

  } catch(e){
    console.log("ANSWER ERROR:", e)
  }

  setLoading(false)
}

return(

<div style={container}>

<h3 style={title}>Memory check Trainer</h3>
{sessionStarted && (

<div style={progressWrapper}>

<div style={progressBarBackground}>

<div
style={{
...progressBarFill,
width: `${(questionCount / maxQuestions) * 100}%`
}}
/>

</div>

<div style={progressText}>
Question {questionCount} / {maxQuestions}
</div>

</div>

)}

<p style={description}>
Active Recall is one of the most effective learning techniques.  
The AI will generate questions based on your study material.
Try to explain the concept in your own words before checking the feedback.
</p>

<div style={sessionBox}>
Session practice – answer the questions and improve your understanding.
</div>

{/* CHAT */}

<div style={chatBox}>

{messages.map((m,i)=>{

if(m.role==="assistant"){
  return(
    <div key={i}>

      <div style={assistantBubble}>
        {m.content}
      </div>

      {/* 🔥 RISPOSTA QUI */}
      {i === messages.length - 1 && showAnswer && aiAnswer && (
        <div style={{
          marginTop: 8,
          padding: "12px",
          background: "#020617",
          border: "1px solid #374151",
          borderRadius: 8,
          color: "white",
          lineHeight: 1.6
        }}>
          <strong>Answer:</strong>
          <p>{aiAnswer}</p>
        </div>
      )}

    </div>
  )
}

if(m.role==="user"){
return(
<div key={i} style={userBubble}>
{m.content}
</div>
)
}

if(m.role==="feedback"){
return(
<div key={i} style={feedbackBubble}>
<strong>Feedback:</strong>
<p>{m.content}</p>
</div>
)
}

})}

{loading && (
<div style={{color:"#9ca3af"}}>Thinking...</div>
)}

</div>

{/* INPUT AREA */}

<div style={inputArea}>

{!sessionStarted && (

<button
onClick={()=>{
setSessionStarted(true)
generateQuestion()
}}
style={generateButton}
>
Start Session
</button>

)}

{sessionStarted && questionCount < maxQuestions && (

<button
onClick={generateQuestion}
style={generateButton}
>
Next Question
</button>

)}

{questionCount >= maxQuestions && (

<div style={sessionEnd}>
Session complete 🎉  
Great job reviewing your material.
</div>

)}

<div style={{ position: "relative", width: "100%" }}>

  <textarea
    value={input}
    onChange={(e)=>setInput(e.target.value)}
    placeholder="Write your answer or use voice..."
    style={{
      width: "100%",
      minHeight: 80,
      maxHeight: 200,
      resize: "none",
      padding: "12px 110px 12px 12px",
      borderRadius: 14,
      border: isRecording ? "2px solid #ef4444" : "1px solid #374151",
      background: "#111827",
      color: "white",
      lineHeight: 1.5,
      outline: "none",
      boxSizing: "border-box"
    }}
  />

  {/* 🎤 MIC */}
  {speechSupported && (
    <button
      onClick={toggleRecording}
      style={{
        position: "absolute",
        right: 50,
        top: "50%",
        transform: "translateY(-50%)",
        background: isRecording ? "#ef4444" : "#1f2937",
        color: "white",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: "6px 8px",
        cursor: "pointer"
      }}
    >
      🎤
    </button>
  )}

  {/* ➤ SEND */}
  <button
    onClick={submitAnswer}
    style={{
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      background: "#22c55e",
      border: "none",
      borderRadius: 6,
      padding: "6px 8px",
      cursor: "pointer",
      fontWeight: 600
    }}
  >
    ➤
  </button>

</div>
<button
  onClick={fetchAnswer}
  style={{
    marginTop: 8,
    background: "#ef4444",
    color: "white",
    padding: "8px 10px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
    width: "fit-content"
  }}
>
  Show answer
</button>

{isRecording && (
  <div style={{ color: "#ef4444", fontSize: 12 }}>
    Listening... speak clearly
  </div>
)}
</div>
</div>
)
}

const container={
display:"flex",
flexDirection:"column" as const,
height:"100%"
}

const title={
marginBottom:10
}

const chatBox={
flex:1,
overflowY:"auto" as const,
paddingRight:10
}

const assistantBubble={
background:"#1f2937",
color:"white",
padding:"10px 12px",
borderRadius:8,
maxWidth:"70%",
marginBottom:10
}

const userBubble={
background:"#2FA4A9",
color:"white",
padding:"10px 12px",
borderRadius:8,
maxWidth:"70%",
marginBottom:10,
marginLeft:"auto"
}

const feedbackBubble={
background:"#020617",
border:"1px solid #374151",
padding:"12px",
borderRadius:8,
marginBottom:10,
color:"#e5e7eb"
}

const inputArea={
marginTop:10,
display:"flex",
flexDirection:"column" as const,
gap:8
}

const textarea={
width:"100%",
height:100,
padding:10,
background:"#111827",
border:"1px solid #374151",
color:"white",
borderRadius:6
}

const generateButton={
background:"#1f2937",
color:"white",
padding:"8px",
border:"1px solid #374151",
borderRadius:6,
cursor:"pointer"
}

const submitButton={
background:"#2FA4A9",
color:"white",
padding:"10px",
border:"none",
borderRadius:6,
cursor:"pointer"
}

const description={
color:"#9ca3af",
maxWidth:600,
lineHeight:1.6,
marginBottom:20
}



const sessionBox={
background:"#020617",
border:"1px solid #374151",
padding:"10px 12px",
borderRadius:8,
marginBottom:20,
color:"#e5e7eb",
fontSize:14
}

const progressBox={
background:"#111827",
border:"1px solid #374151",
padding:"6px 10px",
borderRadius:6,
marginBottom:10,
color:"#9ca3af",
fontSize:13,
width:"fit-content"
}

const sessionEnd={
marginTop:10,
color:"#22c55e",
fontWeight:600
}

const progressWrapper={
marginBottom:20,
maxWidth:500
}

const progressBarBackground={
height:10,
background:"#1f2937",
borderRadius:6,
overflow:"hidden",
marginBottom:6
}

const progressBarFill={
height:"100%",
background:"#22c55e",
transition:"width 0.3s ease"
}

const progressText={
fontSize:12,
color:"#9ca3af"
}