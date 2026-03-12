import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryView from "./views/SummaryView"

export default function Workspace({
activeView,
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

return (

<div style={workspace}>

{/* ASK */}
{activeView === "ask" && (
<AskView
askQuestion={askQuestion}
setAskQuestion={setAskQuestion}
askDocuments={askDocuments}
asking={asking}
chatMessages={chatMessages}
/>
)}

{/* FLASHCARDS */}
{activeView === "flashcards" && (
<FlashcardsView
flashcards={flashcards}
openCard={openCard}
setOpenCard={setOpenCard}
/>
)}

{/* QUIZ VIEW */}
{activeView === "quiz" && (

<div>

{/* LISTA QUIZ SALVATI */}
{quiz.length === 0 && (

<div>

<h2 style={{marginBottom:20}}>Previous quizzes</h2>

{previousQuizzes?.length === 0 && (
<div style={{color:"#9ca3af"}}>
No quizzes created yet
</div>
)}

{previousQuizzes?.map((q:any)=>(
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

{/* QUIZ ATTIVO */}
{quiz.length > 0 && (

<QuizView
quiz={quiz}
answers={answers}
selectAnswer={selectAnswer}
finished={finished}
started={started}
submitQuiz={submitQuiz}
score={score}
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

{/* RESULTS */}
{activeView === "results" && (
<ResultsView resultsData={resultsData}/>
)}

{/* SUMMARY */}
{activeView === "summary" && (
<SummaryView summaryStats={summaryStats}/>
)}

</div>

)

}

const workspace = {
flex: 1,
background: "#0f172a",
color: "#e5e7eb",
padding: "30px",
overflowY: "auto" as const
}