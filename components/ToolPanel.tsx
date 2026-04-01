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
selectedTopic,
setSelectedTopic,
selectedTopics,
setSelectedTopics,
compactMode,

availableFlashcards = 0,
studyCount,
setStudyCount,
loadStudyFlashcards,

previousFlashcards,
studyMode,
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
      {/* SEZIONE TOPICS DINAMICA */}
      {/* ========================= */}
      {projectId && topics?.length > 0 &&
        (activeView === "ask" || activeView === "quiz" || activeView === "flashcards") && (
          
        <div style={{ marginBottom: 20 }}>

          {!selectedTopic && (
            <>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                Select a topic
              </div>

              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {topics.map((t: any, i: number) => {
                  const isSelected = selectedTopics?.some((st: any) => st.id === t.id)

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedTopics([t])
                        setSelectedTopic(t.topic || t)
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: isSelected ? "#1f2937" : "transparent"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                      />

                      <span style={{ fontSize: 13 }}>
                        {t.topic}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

        </div>
      )}

      

      {/* ========================= */}
      {/* GENERATE FLASHCARDS */}
      {/* ========================= */}
      {activeView === "generate_flashcards" && (
        <>
          

          <h3>Generate Flashcards</h3>
          
          <label>Number of cards</label>

          <input
            type="number"
            value={numQuestions}
            onChange={(e)=>setNumQuestions(Number(e.target.value))}
            style={input}
          />

          <button
            onClick={() => {
              // Passiamo selectedTopic come argomento alla funzione
              generateFlashcards(selectedTopic); 
            }}
            style={button}>
            Generate {selectedTopic 
              ? `"${typeof selectedTopic === 'object' ? selectedTopic.value : selectedTopic}"` 
              : "General"} Flashcards
          </button>
        </>
      )}

      {/* ========================= */}
      {/* STUDY FLASHCARDS */}
      {/* ========================= */}
      {activeView === "flashcards" && studyMode === "loaded" && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Study Flashcards</h3>

          {!selectedTopic ? (
            <TopicsView
              topics={topics}
              loadingTopics={loadingTopics}
              topicsOpen={topicsOpen}
              setTopicsOpen={setTopicsOpen}
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              previousFlashcards={previousFlashcards}
              studyMode={studyMode}
              setSelectedTopic={setSelectedTopic} // Deve puntare alla funzione dello stato globale
              setActiveView={setActiveView}
            />
          ) : (
            <div style={{
              marginBottom: 16,
              padding: "12px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid #22c55e",
              borderRadius: 8
            }}>
              <div style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold", marginBottom: 4 }}>FOCUS MODE ACTIVE</div>
              <div style={{ fontSize: 14, fontWeight: "600", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {selectedTopic}
                <button onClick={() => setSelectedTopic(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            </div>
          )}

          <p style={{color:"#9ca3af", marginTop: 12}}>
            Available cards today: {availableFlashcards}
          </p>

          <label style={{ fontSize: 13 }}>How many cards do you want to study today?</label>

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

      {activeView === "flashcards" && studyMode === "generated" && (
        <>
          <h3>Generated Flashcards</h3>
          {selectedTopic && (
            <div style={{
              marginBottom: 12,
              padding: "8px 10px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid #22c55e",
              borderRadius: 6,
              fontSize: 13,
              color: "#e5e7eb"
            }}>
              <b>Selected topic:</b>
              <div style={{ color: "#22c55e", marginTop: 4 }}>• {selectedTopic}</div>
            </div>
          )}
        </>
      )}

      {/* ========================= */}
      {/* QUIZ */}
      {/* ========================= */}
      {activeView === "quiz" && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Generate Quiz</h3>

          {/* FOCUS MODE PER QUIZ */}
          {selectedTopic && (
            <div style={{
              marginBottom: 16,
              padding: "12px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid #22c55e",
              borderRadius: 8
            }}>
              <div style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold", marginBottom: 4 }}>TARGET TOPIC</div>
              <div style={{ fontSize: 14, fontWeight: "600", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {selectedTopic}
                <button onClick={() => setSelectedTopic(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, marginBottom: 4 }}>Questions</div>
          <input
            type="number"
            value={numQuestions}
            onChange={(e)=>setNumQuestions(Number(e.target.value))}
            style={input}
          />

          <div style={{ fontSize: 13, marginBottom: 4 }}>Difficulty</div>
          <select
            value={difficulty}
            onChange={(e)=>setDifficulty(e.target.value)}
            style={input}
          >
            <option>easy</option>
            <option>medium</option>
            <option>hard</option>
          </select>

          <div style={{ fontSize: 13, marginBottom: 4 }}>Language</div>
          <select
            value={language}
            onChange={(e)=>setLanguage(e.target.value)}
            style={input}
          >
            <option>English</option>
            <option>Italian</option>
          </select>

          <div style={{ fontSize: 13, marginBottom: 4 }}>Timer (minutes)</div>
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
            Generate {selectedTopic ? 'Topic' : 'General'} Quiz
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