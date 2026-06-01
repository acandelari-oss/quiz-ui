import TopicsView from "./views/TopicsView"
import React, { useState } from "react"
import { useTranslation } from 'react-i18next';
import SelectedTopicsBanner from "./SelectedTopicsBanner"

export default function ToolPanel({


activeView,
setActiveView,
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
flashcards,
generatingFlashcards,
loadingFlashcards,

previousFlashcards,
studyMode,
setStudyMode,
status,
uploadStatus,
toolMode,
questionStyle,
setQuestionStyle,


}: any) {

  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const topicLabel = selectedTopic || "General";
  const { t: translate } = useTranslation();
  const [maxQuestions, setMaxQuestions] = useState(5)
  const [sessionDuration, setSessionDuration] = useState(20)
  const [studyConfig, setStudyConfig] = useState({
    flashcards: 8,
    recall: 3,
    quiz: 5
  })
 

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
            {translate('stats.ACTIVE PROJECT')}
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
            {documents?.length || 0} {translate('stats.documents')} • {topics?.length || 0} {translate('stats.topics')}
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* CREATE PROJECT */}
      {/* ========================= */}
      {activeView === "create_project" && (
        <>
          <h3>{translate('stats.Create Project')}</h3>

          {/* STEP 1 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {translate('stats.1. Project Name')}
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
              {translate('stats.Create project')}
            </button>
          </div>

          <hr style={{ borderColor: "#374151", margin: "16px 0" }} />

          {/* STEP 2 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {translate('stats.2. Upload Documents')}
            </div>

            {!projectId ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>
                {translate('stats.Create the project first to enable document upload.')}
              </div>
            ) : (
              <>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  style={input}
                />
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>
                  Accepted formats: PDF. Text-based PDFs work best.
                </div>

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
                  {translate('stats.Upload documents')}
                </button>

                {uploadStatus && (
                  <div style={statusBox}>
                    {uploadStatus}
                  </div>
                )}

                {documents?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      {translate('stats.Uploaded documents')}
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
          <h3>{translate('stats.Load Project')}</h3>

          <div style={{marginBottom:8,fontWeight:600}}>
            {translate('stats.Select project')}
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
              <label style={{display:"block", marginTop:16}}>{translate('stats.Upload documents')}</label>

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
              {translate('stats.Uploaded documents')}
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
              {translate('stats.Detected topics')}
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

      {activeView === "ask_setup" && (
        <div style={{ padding: "0px" }}>

          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12
          }}>
            Ask AI Tutor
          </h3>
          {selectedTopics.length === 0 && (
            <p style={{
              color: "#9ca3af",
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.5
            }}>
              Select one or more topics to focus your AI conversation.
          </p>
        )}
          {/* SELECTED TOPICS BANNER */}

          {selectedTopics && selectedTopics.length > 0 && (
            <div style={{
              marginBottom: 12,
              padding: "8px 10px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid #22c55e",
              borderRadius: 6,
              fontSize: 13,
              color: "#e5e7eb"
            }}>

              <b>Selected topics:</b>

              <div style={{
                color: "#22c55e",
                marginTop: 4,
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                {selectedTopics.map((t:any, i:number) => (

                  <div key={i}>
                    • {
                      typeof t === "string"
                        ? t
                        : t.topic
                    }
                  </div>

                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedTopics([])
                  setSelectedTopic(null)
                }}
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid #22c55e",
                  borderRadius: 6,
                  color: "#22c55e",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                ✏ Change topics
              </button>
              

            </div>
            
          )}
          {selectedTopics.length === 0 && (

            <div style={{ marginBottom: 20 }}>

              <label style={{
                fontSize: 11,
                color: "#9ca3af",
                letterSpacing: 0.5,
                marginBottom: 8,
                display: "block"
              }}>
                SELECT TOPICS TO FOCUS
              </label>

              <div style={{
                maxHeight: "250px",
                overflowY: "auto",
                padding: "10px"
              }}>

                {topics && topics.map((t:any) => (

                  <label
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: selectedTopics.includes(t.topic)
                        ? "#22c55e"
                        : "#cbd5e1"
                    }}
                  >

                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(t.topic)}

                      onChange={() => {

                        if (selectedTopics.includes(t.topic)) {

                          setSelectedTopics(
                            selectedTopics.filter(
                              (item:string) => item !== t.topic
                            )
                          )

                        } else {

                          setSelectedTopics([
                            ...selectedTopics,
                            t.topic
                          ])

                        }

                      }}

                      style={{
                        accentColor: "#22c55e"
                      }}
                    />

                    {t.topic}

                  </label>

                ))}

              </div>

            </div>

          )}
          <button
            onClick={() => setActiveView("ask")}
            style={{
              marginTop: 10,
              padding: "10px",
              background: "#2563eb",
              border: "none",
              color: "white",
              borderRadius: 6,
              cursor: "pointer",
              width: "100%"
            }}
          >
            Start Conversation
          </button>

        </div>
      )}

      

    {/* ========================= */}
      {/* GENERATE FLASHCARDS VIEW  */}
      {/* ========================= */}
      
      {activeView === "generate_flashcards" && (
        <>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12
          }}>
            {translate('stats.Generate Flashcards')}
          </h3>

          {/* SELECTED TOPICS BANNER */}

          <SelectedTopicsBanner
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            setSelectedTopic={setSelectedTopic}
          />

          {/* TOPIC SELECTOR */}

          {selectedTopics.length === 0 && (

            <div style={{ marginBottom: 20 }}>

              <label style={{
                fontSize: 11,
                color: "#9ca3af",
                letterSpacing: 0.5,
                marginBottom: 8,
                display: "block"
              }}>
                {translate('stats.SELECT TOPICS TO COVER')}
              </label>

              <div style={{
                maxHeight: "250px",
                overflowY: "auto",
                padding: "10px"
              }}>

                {topics && topics.map((t:any) => (

                  <label
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: selectedTopics.includes(t.topic)
                        ? "#22c55e"
                        : "#cbd5e1"
                    }}
                  >

                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(t.topic)}

                      onChange={() => {

                        if (selectedTopics.includes(t.topic)) {

                          setSelectedTopics(
                            selectedTopics.filter(
                              (item:string) => item !== t.topic
                            )
                          )

                        } else {

                          setSelectedTopics([
                            ...selectedTopics,
                            t.topic
                          ])

                        }

                      }}

                      style={{
                        accentColor: "#22c55e"
                      }}
                    />

                    {t.topic}

                  </label>

                ))}

              </div>

            </div>

          )}

          <div style={{
            fontSize: 13,
            marginBottom: 4
          }}>
            {translate('stats.Number of cards')}
          </div>

          <input
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            style={input}
          />

          <button
            onClick={() => generateFlashcards()}
            disabled={generatingFlashcards}
            style={{
              ...button,
              marginTop: 15,
              background: generatingFlashcards
                ? "#334155"
                : "#22c55e",
              cursor: generatingFlashcards
                ? "not-allowed"
                : "pointer"
            }}
          >
            {generatingFlashcards
              ? "Generating..."
              : translate('stats.Generate')}
          </button>

        </>
      )}
      


      {/* ========================= */}
      {/* STUDY FLASHCARDS VIEW     */}
      {/* ========================= */}
      {activeView === "flashcards" && (
        <div style={{ padding: "0px" }}> {/* Rimosso padding extra per allineare allo stile */}
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            {translate('stats.Flashcard Settings')}
          </h3>

          {/* Banner Topic se presente (dal tuo codice originale) */}
          <SelectedTopicsBanner
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            setSelectedTopic={setSelectedTopic}
          />

          {/* LOGICA SELEZIONE MODALITÀ */}
          <div style={{ marginBottom: 20 }}>

            {selectedTopics.length === 0 && (

              <>
                <label style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  display: "block"
                }}>
                  SELECT TOPICS TO REVIEW
                </label>

                <div style={{
                  maxHeight: "250px",
                  overflowY: "auto",
                  padding: "10px"
                }}>

                  {topics && topics.map((t:any) => (

                    <label
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 0",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: selectedTopics.includes(t.topic)
                          ? "#22c55e"
                          : "#cbd5e1"
                      }}
                    >

                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(t.topic)}

                        onChange={() => {

                          if (selectedTopics.includes(t.topic)) {

                            setSelectedTopics(
                              selectedTopics.filter(
                                (item:string) => item !== t.topic
                              )
                            )

                          } else {

                            setSelectedTopics([
                              ...selectedTopics,
                              t.topic
                            ])

                          }

                        }}

                        style={{
                          accentColor: "#22c55e"
                        }}
                      />

                      {t.topic}

                    </label>

                  ))}

                </div>
              </>
            )}

          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Number of flashcards
          </div>

          <input
            type="number"
            value={studyCount}
            onChange={(e) => setStudyCount(Number(e.target.value))}
            style={input}
          />

          <button
            onClick={() => {
              setStudyMode("loaded")
              loadStudyFlashcards()
            }}
            style={{
              ...button,
              marginTop: 15
            }}
          >
            Start Study
          </button>
        </div>
      )}
      {/* ========================= */}
      {/* ASK SETUP */}
      {/* ========================= */}
      

      {/* ========================= */}
      {/* ACTIVE RECALL SETUP */}
      {/* ========================= */}

      {activeView === "active_recall_setup" && (
        <>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12
          }}>
            Active Recall Session
          </h3>

          <SelectedTopicsBanner
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            setSelectedTopic={setSelectedTopic}
          />

          <div style={{ marginBottom: 20 }}>
            {selectedTopics.length === 0 && (
            <label style={{
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: 0.5,
              marginBottom: 8,
              display: "block"
            }}>
              SELECT TOPICS TO PRACTICE
            </label>
            )}
            <div style={{
              maxHeight: "250px",
              overflowY: "auto",
              padding: "10px"
            }}>
              {selectedTopics.length === 0 && (
                <>
                {topics && topics.map((t:any) => (

                  <label
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: selectedTopics.includes(t.topic)
                        ? "#22c55e"
                        : "#cbd5e1"
                    }}
                  >

                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(t.topic)}

                      onChange={() => {

                        if (selectedTopics.includes(t.topic)) {

                          setSelectedTopics(
                            selectedTopics.filter(
                              (item:string) => item !== t.topic
                            )
                          )

                        } else {

                          setSelectedTopics([
                            ...selectedTopics,
                            t.topic
                          ])

                        }

                      }}

                      style={{
                        accentColor: "#22c55e"
                      }}
                    />

                    {t.topic}

                  </label>

                ))}
                </>
              )}

            </div>

          </div>

          <div style={{
            fontSize: 13,
            marginBottom: 4
          }}>
            Number of questions
          </div>

          <input
            type="number"
            value={maxQuestions}
            onChange={(e) =>
              setMaxQuestions(Number(e.target.value))
            }
            style={input}
          />

          <button
            onClick={() => setActiveView("active_recall")}
            style={{
              ...button,
              marginTop: 15
            }}
          >
            Start Active Recall
          </button>
        </>
      )}

      {/* ========================= */}
      {/* STUDY SESSION SETUP */}
      {/* ========================= */}
        {activeView === "study_session_setup" && (
          <>
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 12
            }}>
              Guided Study Session
            </h3>
            <SelectedTopicsBanner
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              setSelectedTopic={setSelectedTopic}
            />
            <p style={{
              color: "#9ca3af",
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5
            }}>
              Create an adaptive study session focused on your selected topics.
            </p>

            <div style={{ marginBottom: 20 }}>
              {selectedTopics.length === 0 && (
              <label style={{
                fontSize: 11,
                color: "#9ca3af",
                letterSpacing: 0.5,
                marginBottom: 8,
                display: "block"
              }}>
                SELECT TOPICS TO STUDY
              </label>
              )}
              <div style={{
                maxHeight: "250px",
                overflowY: "auto",
                padding: "10px"
              }}>
               
             
              </div>

            </div>

            <div style={{
              fontSize: 13,
              marginBottom: 8
            }}>
              Session Duration
            </div>

            <select
              value={sessionDuration}
              onChange={(e) => {

                const duration = Number(e.target.value)

                setSessionDuration(duration)

                if (duration === 20) {

                  setStudyConfig({
                    flashcards: 8,
                    recall: 3,
                    quiz: 5
                  })

                }

                if (duration === 40) {

                  setStudyConfig({
                    flashcards: 15,
                    recall: 5,
                    quiz: 10
                  })

                }

                if (duration === 60) {

                  setStudyConfig({
                    flashcards: 25,
                    recall: 8,
                    quiz: 15
                  })

                }

              }}
              style={input}
            >
              <option value={20}>20 minutes</option>
              <option value={40}>40 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
            <div style={{
              marginTop: 14,
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #374151",
              borderRadius: 8,
              fontSize: 12,
              color: "#9ca3af",
              lineHeight: 1.6
            }}>

              {sessionDuration === 20 && (
                <>
                  <div>• 8 flashcards</div>
                  <div>• 3 memory checks</div>
                  <div>• 5 quiz questions</div>
                </>
              )}

              {sessionDuration === 40 && (
                <>
                  <div>• 15 flashcards</div>
                  <div>• 5 memory checks</div>
                  <div>• 10 quiz questions</div>
                </>
              )}

              {sessionDuration === 60 && (
                <>
                  <div>• 25 flashcards</div>
                  <div>• 8 memory checks</div>
                  <div>• 15 quiz questions</div>
                </>
              )}

            </div>

            <button
              onClick={() => setActiveView("study_session")}
              style={{
                ...button,
                marginTop: 15
              }}
            >
              Start Study Session
            </button>
          </>
        )}
      {/* ========================= */}
      {/* PLANNER SETUP */}
      {/* ========================= */}

      {activeView === "planner" && (
        <>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12
          }}>
            Weekly Study Planner
          </h3>

          <p style={{
            color: "#9ca3af",
            fontSize: 13,
            lineHeight: 1.6,
            marginBottom: 20
          }}>
            Generate a fixed weekly study plan based on your weakest topics and study progress.
          </p>

          <div style={{
            padding: 12,
            border: "1px solid #374151",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            marginBottom: 20
          }}>

            <div style={{
              fontSize: 13,
              marginBottom: 8
            }}>
              Weekly intensity
            </div>

            <select style={input}>
              <option>Light</option>
              <option>Balanced</option>
              <option>Intensive</option>
            </select>

          </div>

          <button
            onClick={() => setActiveView("planner_view")}
            style={button}
          >
            Generate Weekly Plan
          </button>
        </>
      )}
      {/* ========================= */}
      {/* QUIZ */}
      {/* ========================= */}
      {activeView === "quiz" && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{translate('stats.Generate Quiz')}</h3>

          {/* FOCUS MODE PER QUIZ */}
          <SelectedTopicsBanner
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            setSelectedTopic={setSelectedTopic}
          />
          {selectedTopics.length === 0 && (

            <div style={{ marginBottom: 20 }}>

              <label style={{
                fontSize: 11,
                color: "#9ca3af",
                letterSpacing: 0.5,
                marginBottom: 8,
                display: "block"
              }}>
                SELECT TOPICS TO COVER
              </label>

              <div style={{
                maxHeight: "250px",
                overflowY: "auto",
                padding: "10px"
              }}>

                {topics && topics.map((t:any) => (

                  <label
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: selectedTopics.includes(t.topic)
                        ? "#22c55e"
                        : "#cbd5e1"
                    }}
                  >

                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(t.topic)}

                      onChange={() => {

                        if (selectedTopics.includes(t.topic)) {

                          setSelectedTopics(
                            selectedTopics.filter(
                              (item:string) => item !== t.topic
                            )
                          )

                        } else {

                          setSelectedTopics([
                            ...selectedTopics,
                            t.topic
                          ])

                        }

                      }}

                      style={{
                        accentColor: "#22c55e"
                      }}
                    />

                    {t.topic}

                  </label>

                ))}

              </div>
              
            </div>

          )}

          <div style={{ fontSize: 13, marginBottom: 4 }}>{translate('stats.Questions')}</div>
          <input
            type="number"
            value={numQuestions}
            onChange={(e)=>setNumQuestions(Number(e.target.value))}
            style={input}
          />

          <div style={{ fontSize: 13, marginBottom: 4 }}>{translate('stats.Difficulty')}</div>
          <select
            value={difficulty}
            onChange={(e)=>setDifficulty(e.target.value)}
            style={input}
          >
            <option>easy</option>
            <option>medium</option>
            <option>hard</option>
          </select>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Question Style
          </div>

          <select
            value={questionStyle}
            onChange={(e)=>setQuestionStyle(e.target.value)}
            style={input}
          >
            <option value="balanced">
              Balanced
            </option>

            <option value="exam">
              Exam Style
            </option>

            <option value="reasoning">
              Reasoning Heavy
            </option>
          </select>

          <div style={{ fontSize: 13, marginBottom: 4 }}>{translate('stats.Language')}</div>
          <select
            value={language}
            onChange={(e)=>setLanguage(e.target.value)}
            style={input}
          >
            <option>English</option>
            <option>Italian</option>
          </select>

          <div style={{ fontSize: 13, marginBottom: 4 }}>{translate('stats.Timer (minutes)')}</div>
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
            Generate {selectedTopic ? 'Topic' : 'General'} {translate('stats.Quiz')}
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