import ProjectManagerView from "./views/ProjectManagerView"
import TopicsView from "./views/TopicsView"
export default function ToolPanel({

activeView,
projectName,

askQuestion,
setAskQuestion,
askDocuments,
asking,

numQuestions,
setNumQuestions,

difficulty,
setDifficulty,

language,
setLanguage,

timerMinutes,
setTimerMinutes,

generateQuiz,
generateFlashcards,

projects,

setProjectName,
createProject,
selectProject,
projectId,
deleteProject,
files,
setFiles,
uploadFiles,
documents,

topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics,

availableFlashcards,
studyCount,
setStudyCount,
loadStudyFlashcards,

status,
uploadStatus



}: any) {

  return (
    <div style={panel}>
      
      {projectName && (
    <div style={{
      position: "sticky",
      top: 0,
      background: "#111827",
      padding: "10px",
      borderBottom: "1px solid #374151",
      marginBottom: 12,
      zIndex: 10
    }}>
      <div style={{
        fontSize: 11,
        color: "#9ca3af",
        letterSpacing: 1
      }}>
        ACTIVE PROJECT
      </div>

      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#e5e7eb"
      }}>
        📂 {projectName}
      </div>
      <div style={{
      fontSize: 11,
      color: "#9ca3af",
      marginTop: 4
    }}>
      {documents?.length || 0} documents • {topics?.length || 0} topics
    </div>
    </div>
)}
      {activeView === "project" && (

        <ProjectManagerView

        projects={projects}
        projectName={projectName}
        setProjectName={setProjectName}
        createProject={createProject}
        selectProject={selectProject}
        projectId={projectId}
        deleteProject={deleteProject}

        files={files}
        setFiles={setFiles}
        uploadFiles={uploadFiles}
        documents={documents}
        uploadStatus={uploadStatus}

        />

)}
      {(activeView === "quiz" || activeView === "flashcards" || activeView === "ask") && (

      <TopicsView
      topics={topics}
      loadingTopics={loadingTopics}
      topicsOpen={topicsOpen}
      setTopicsOpen={setTopicsOpen}
      selectedTopics={selectedTopics}
      setSelectedTopics={setSelectedTopics}
      setAskQuestion={setAskQuestion}
      activeView={activeView}
      />

)}

      {activeView === "ask" && (
        <>
          <h3>Ask your documents</h3>

          <input
            placeholder="Ask something..."
            value={askQuestion}
            onChange={(e)=>setAskQuestion(e.target.value)}
            style={input}
          />

          <button onClick={askDocuments} style={button}>
            {asking ? "Thinking..." : "Ask"}
          </button>
        </>
      )}

      {activeView === "flashcards" && (

      <>

      <h3>Flashcards</h3>

      {/* GENERATE */}

      <div style={{marginBottom:25}}>

      <h4 style={{marginBottom:10}}>Generate new flashcards</h4>

      <label>Number of cards</label>

      <input
      type="number"
      value={numQuestions}
      onChange={(e)=>setNumQuestions(Number(e.target.value))}
      style={input}
      />

      <button onClick={generateFlashcards} style={button}>
      Generate
      </button>

      </div>

      {/* STUDY */}

      <div>

      <h4 style={{marginBottom:10}}>Flashcard you have created:</h4>

      <p style={{color:"#9ca3af"}}>
      Available cards today: {availableFlashcards}
      </p>

      <label>How many cards do you want to study?</label>

      <input
      type="number"
      value={studyCount}
      onChange={(e)=>setStudyCount(Number(e.target.value))}
      style={input}
      />

      <button onClick={loadStudyFlashcards} style={button}>
      Start Study
      </button>

      </div>

      </>

      )}

      {activeView === "quiz" && (
        <>
          <h3>Generate Quiz</h3>

          Questions
          <input
            type="number"
            value={numQuestions}
            onChange={(e)=>setNumQuestions(Number(e.target.value))}
            style={input}
          />

          Difficulty
          <select
            value={difficulty}
            onChange={(e)=>setDifficulty(e.target.value)}
            style={input}
          >
            <option>easy</option>
            <option>medium</option>
            <option>hard</option>
          </select>

          Language
          <select
            value={language}
            onChange={(e)=>setLanguage(e.target.value)}
            style={input}
          >
            <option>English</option>
            <option>Italian</option>
          </select>

          Timer
          <input
            type="number"
            value={timerMinutes}
            onChange={(e)=>setTimerMinutes(Number(e.target.value))}
            style={input}
          />

          <button onClick={generateQuiz} style={button}>
            Start Quiz
          </button>
        </>
      )}
       {status && (
      <div style={statusBox}>
        {status}
      </div>
    )}
    </div>
         
  )
}

const panel = {
  width: 320,
  background: "#020617",
  borderRight: "1px solid #1f2937",
  padding: 20,
  height: "100vh",
  overflowY: "auto" as const,
  color: "white"
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#111827",
  color: "white",
  boxSizing: "border-box"
};

const button = {
  width: "100%",
  padding: 10,
  background: "#111528",
  color: "white",
  border: "1px solid #374151",
  borderRadius: 6,
  cursor: "pointer"
};

const statusBar = {
background:"#111827",
border:"1px solid #374151",
padding:"8px 10px",
borderRadius:6,
marginBottom:15,
fontSize:12,
color:"#9ca3af"
};

const statusBox = {
marginTop:20,
padding:"8px 10px",
background:"#111827",
border:"1px solid #374151",
borderRadius:6,
fontSize:13,
color:"#9ca3af"
}