import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryView from "./views/SummaryView"
import ActiveRecallView from "./views/ActiveRecallView"
import { useState, useEffect } from "react"
import StudySessionView from "./views/StudySessionView"

export default function Workspace({

activeView,

projects,
deleteProject,

flashcards,
openCard,
setOpenCard,

quiz,
answers,
selectAnswer,
finished,
started,
submitQuiz,
score,
generatingQuiz,
expanded,
setExpanded,
formatTime,
answeredCount,
calculateScore,

askQuestion,
setAskQuestion,
askDocuments,
chatMessages,
asking,

summaryStats,
resultsData,

projectId,
quizId,
previousQuizzes,
loadQuiz

}) {

const quizList = Array.isArray(quiz) ? quiz : []
const previous = Array.isArray(previousQuizzes) ? previousQuizzes : []

const [loaderStep,setLoaderStep] = useState(0)

const loaderMessages = [
"Analyzing documents",
"Creating questions",
"Finalizing quiz"
]

useEffect(()=>{

if(!generatingQuiz) return

setLoaderStep(0)

const steps = [1,2,3]
let i = 0

const interval = setInterval(()=>{

i++

if(i >= steps.length){
clearInterval(interval)
return
}

setLoaderStep(steps[i])

},2000)

return ()=>clearInterval(interval)

},[generatingQuiz])


return (

<div style={workspace}>

{/* ========================= */}
{/* MANAGE PROJECTS */}
{/* ========================= */}

{activeView === "manage_projects" && (

<div style={{padding:40}}>

<h2>Manage Projects</h2>

{projects?.map((p:any)=>(

<div
key={p.id}
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"12px 14px",
marginBottom:10,
background:"#111827",
border:"1px solid #374151",
borderRadius:8,
color:"white"
}}
>

<span>{p.name}</span>

<button
onClick={()=>deleteProject(p.id)}
style={{
background:"#7f1d1d",
color:"white",
border:"1px solid #ef4444",
borderRadius:6,
padding:"8px 10px",
cursor:"pointer"
}}
>
Delete project
</button>

</div>

))}

</div>

)}

{/* ========================= */}
{/* ASK */}
{/* ========================= */}



{activeView === "ask" && (
<AskView
askQuestion={askQuestion}
setAskQuestion={setAskQuestion}
askDocuments={askDocuments}
asking={asking}
chatMessages={chatMessages}
/>
)}

{/* ========================= */}
{/* ACTIVE RECALL */}
{/* ========================= */}

{activeView === "active_recall" && (

<ActiveRecallView
projectId={projectId}
/>

)}

{/* ========================= */}
{/* FLASHCARDS */}
{/* ========================= */}

{activeView === "flashcards" && (

<>

{flashcards.length > 0 ? (

<FlashcardsView
flashcards={flashcards}
openCard={openCard}
setOpenCard={setOpenCard}
/>

) : (

<div style={{
display:"flex",
flexDirection:"column",
alignItems:"center",
justifyContent:"center",
height:"60vh",
textAlign:"center"
}}>

<h3 style={{
color:"white",
fontSize:22,
marginBottom:10
}}>
Flashcard Study
</h3>

<p style={{
color:"#9ca3af",
maxWidth:500,
lineHeight:1.6
}}>
Choose how many new flashcards you want to generate and press 
<b style={{color:"white"}}> Generate </b>,  
or choose how many of your existing flashcards you’d like to review and press 
<b style={{color:"white"}}> Start Study </b>.
</p>

</div>

)}

</>

)}

{/* ========================= */}
{/* PREVIOUS QUIZZES */}
{/* ========================= */}

{activeView === "previous" && (

<div>

<h2 style={{marginBottom:20}}>Previous quizzes</h2>

{previous.length === 0 && (

<div style={{color:"#9ca3af"}}>
No quizzes created yet
</div>

)}

{previous.map((q:any)=>(

<div
key={q.id}
onClick={()=>loadQuiz(q.id)}
style={{
background:"#020617",
border:"1px solid #374151",
borderRadius:8,
padding:14,
marginBottom:10,
cursor:"pointer"
}}
>

<div style={{fontWeight:600}}>
{q.num_questions} questions
</div>

<div style={{color:"#9ca3af",fontSize:13}}>
Difficulty: {q.difficulty}
</div>

</div>

))}

</div>

)}

{/* ========================= */}
{/* QUIZ */}
{/* ========================= */}

{activeView === "quiz" && (

<div>

{generatingQuiz && (

<div style={loaderContainer}>

<div style={spinner}/>

<div style={loaderTitle}>
Generating quiz
</div>

<div style={loaderSubtitle}>
{loaderMessages[loaderStep]}
</div>

</div>

)}

{quizList.length > 0 && (

<QuizView
quiz={quizList}
answers={answers}
selectAnswer={selectAnswer}
finished={finished}
started={started}
submitQuiz={submitQuiz}
calculateScore={calculateScore}
generatingQuiz={generatingQuiz}
expanded={expanded}
setExpanded={setExpanded}
formatTime={formatTime}
answeredCount={answeredCount}
projectId={projectId}
quizId={quizId}
/>

)}

</div>

)}

{/* ========================= */}
{/* STUDY SESSION */}
{/* ========================= */}

{activeView === "study_session" && (

  selectedProject ? (

    <StudySessionView projectId={selectedProject.id} />

  ) : (

    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh",
      color: "white",
      textAlign: "center"
    }}>

      <img
      src="/logo.png"
      alt="StudyForge logo"
      style={{
        width: 80,
        marginBottom: 20,
        opacity: 0.9
      }}
/>

      <h2 style={{ color: "#9ca3af", maxWidth: 400 }}>
        Welcome 👋  
        Create a new project or load an existing one to start studying.
      </h2>

    </div>

  )

)}


{/* ========================= */}
{/* RESULTS + SUMMARY */}
{/* ========================= */}

{activeView === "results_summary" && (

<div>

<ResultsView resultsData={resultsData} />

<div style={{marginTop:40}} />

<SummaryView summaryStats={summaryStats} />

</div>

)}

</div>

)

}

const workspace = {
flex:1,
background:"#0f172a",
color:"#e5e7eb",
padding:"30px",
overflowY:"auto" as const
}

const loaderContainer = {
display:"flex",
flexDirection:"column",
alignItems:"center",
justifyContent:"center",
height:"60vh",
color:"white"
}

const spinner = {
width:40,
height:40,
border:"4px solid #374151",
borderTop:"4px solid #22c55e",
borderRadius:"50%",
animation:"spin 0.8s linear infinite",
marginBottom:20
}

const loaderTitle = {
fontSize:24,
fontWeight:600
}

const loaderSubtitle = {
color:"#9ca3af",
marginTop:6
}