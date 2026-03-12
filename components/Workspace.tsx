import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import ProjectManagerView from "./views/ProjectManagerView"
import SummaryView from "./views/SummaryView"


export default function Workspace({
activeView,
askAnswer,
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
topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics,

projects,
projectName,
setProjectName,
createProject,
selectProject,
projectId,
deleteProject,
files,
setFiles,
uploadFiles,
documents,
askQuestion,
setAskQuestion,
askDocuments,
chatMessages,
summaryStats,
resultsData,
asking
}) {

return (

<div style={workspace}>

{activeView === "ask" && (
<AskView
askQuestion={askQuestion}
setAskQuestion={setAskQuestion}
askDocuments={askDocuments}
asking={asking}
chatMessages={chatMessages}
/>
)}



{activeView === "flashcards" && (
<FlashcardsView
flashcards={flashcards}
openCard={openCard}
setOpenCard={setOpenCard}
/>
)}

{activeView === "quiz" && (
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
/>
)}



{activeView === "results" && (
<ResultsView resultsData={resultsData}/>
)}
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
};