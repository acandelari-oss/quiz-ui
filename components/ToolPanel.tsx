import TopicsView from "./views/TopicsView"
import React from "react"

export default function ToolPanel({


activeView,
projectName,

askQuestion,
setAskQuestion,
askDocuments,
asking,

numQuestions = 10,
setNumQuestions = () => {},

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

availableFlashcards = 0,
studyCount,
setStudyCount,
loadStudyFlashcards,

status,
uploadStatus

}: any) {

  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])

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

      {/* ========================= */}
      {/* CREATE PROJECT */}
      {/* ========================= */}
      {activeView === "create_project" && (
        <>
          <h3>Create Project</h3>

          {/* STEP 1 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              1. Project Name
            </div>

            <input
              placeholder="Enter project name..."
              value={projectName || ""}
              onChange={(e) => setProjectName(e.target.value)}
              style={input}
            />

            <button
              onClick={createProject}
              disabled={!projectName?.trim()}
              style={{
                ...button,
                opacity: !projectName?.trim() ? 0.5 : 1,
                cursor: !projectName?.trim() ? "not-allowed" : "pointer"
              }}
            >
              Create project
            </button>
          </div>

          <hr style={{ borderColor: "#374151", margin: "16px 0" }} />

          {/* STEP 2 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              2. Upload Documents
            </div>

            {!projectId ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>
                Create the project first to enable document upload.
              </div>
            ) : (
              <>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  style={input}
                />

                <button
                  onClick={uploadFiles}
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  Upload documents
                </button>

                {uploadStatus && (
                  <div style={statusBox}>
                    {uploadStatus}
                  </div>
                )}

                {documents?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      Uploaded documents
                    </div>

                    {documents.map((doc: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 13,
                          color: "#22c55e",
                          marginBottom: 4
                        }}
                      >
                        ✔ {doc.title}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ========================= */}
      {/* LOAD PROJECT */}
      {/* ========================= */}
      {activeView === "load_project" && (
        <>
          <h3>Load Project</h3>

          <div style={{marginBottom:8,fontWeight:600}}>
            Select project
          </div>

          <div style={projectList}>
            {projects?.map((p:any)=>(
              <div
                key={p.id}
                onClick={()=>selectProject(p.id)}
                style={{
                  padding:"8px 10px",
                  background:p.id===projectId ? "#1f2937" : "#111827",
                  borderBottom:"1px solid #374151",
                  color:"white",
                  fontSize:14,
                  cursor:"pointer"
                }}
              >
                {p.name}
              </div>
            ))}
          </div>

          {projectId && (
            <>
              <label style={{display:"block", marginTop:16}}>Upload documents</label>

              <input
                type="file"
                multiple
                onChange={(e)=>setFiles(e.target.files)}
                style={input}
              />

              <button
                onClick={uploadFiles}
                style={button}
              >
                Upload files
              </button>

              {uploadStatus && (
                <div style={statusBox}>
                  {uploadStatus}
                </div>
              )}
              {/* DOCUMENT LIST */}

              {documents?.length > 0 && (

              <div style={{marginTop:20}}>

              <div style={{fontWeight:600, marginBottom:6}}>
              Uploaded documents
              </div>

              {documents.map((doc:any,i:number)=>(

              <div
              key={i}
              style={{
              fontSize:13,
              color:"#e5e7eb",
              marginBottom:4
              }}
              >
              • {doc.title}
              </div>

              ))}

              </div>

              )}
              {/* TOPIC LIST */}

              {topics?.length > 0 && (

              <div style={{marginTop:20}}>

              <div style={{fontWeight:600, marginBottom:6}}>
              Detected topics
              </div>

              {topics.map((t:any,i:number)=>(

              <div
              key={i}
              style={{
              fontSize:13,
              color:"#9ca3af",
              marginBottom:4
              }}
              >
              • {t.topic}
              </div>

              ))}

              </div>

              )}
            </>
          )}
        </>
      )}

      {/* ========================= */}
      {/* ASK */}
      {/* ========================= */}
      {(activeView === "quiz" || activeView === "ask") && (
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

      

      {/* ========================= */}
      {/* GENERATE FLASHCARDS */}
      {/* ========================= */}
      {activeView === "generate_flashcards" && (
        <>
          <TopicsView
            topics={topics}
            loadingTopics={loadingTopics}
            topicsOpen={topicsOpen}
            setTopicsOpen={setTopicsOpen}
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
          />

          <h3>Generate Flashcards</h3>

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
        </>
      )}

      {/* ========================= */}
      {/* STUDY FLASHCARDS */}
      {/* ========================= */}
      {activeView === "flashcards" && (
        <>
          <h3>Study Flashcards</h3>

          <p style={{color:"#9ca3af"}}>
            Available cards today: {availableFlashcards}
          </p>

          <label>How many cards do you want to study today?</label>

          <input
            type="number"
            value={studyCount}
            onChange={(e)=>setStudyCount(Number(e.target.value))}
            style={input}
          />

          <button 
            onClick={() => {
              console.log("CLICK LOAD FLASHCARDS")
              loadStudyFlashcards()
            }} 
            style={button}
          >
            Start Study
          </button>
        </>
      )}

      {/* ========================= */}
      {/* QUIZ */}
      {/* ========================= */}
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

          <button
            onClick={()=>{
              console.log("START QUIZ CLICKED")
              generateQuiz()
            }}
            style={button}
          >
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

const panel: React.CSSProperties = {
  width: 320,
  background: "#020617",
  borderRight: "1px solid #1f2937",
  padding: 20,
  height: "100vh",
  overflowY: "auto" as const,
  color: "white",
  zIndex: 2
}

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#111827",
  color: "white",
  boxSizing: "border-box"
}

const button: React.CSSProperties = {
  width: "100%",
  padding: 10,
  background: "#111528",
  color: "white",
  border: "1px solid #374151",
  borderRadius: 6,
  cursor: "pointer"
}

const statusBox: React.CSSProperties = {
  marginTop: 20,
  padding: "8px 10px",
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 6,
  fontSize: 13,
  color: "#9ca3af"
}

const projectList: React.CSSProperties = {
  maxHeight: 180,
  overflowY: "auto" as const,
  border: "1px solid #374151",
  borderRadius: 6,
  marginBottom: 12
}