import TopicsView from "./views/TopicsView"
import React, { useState } from "react"
import { useTranslation } from 'react-i18next';
import { shellHeaderCell } from "./layoutStyles"
import {
  getTopicScopeKey,
  logCategoryScope,
  resolveCategoryTopicObjects,
  TopicScopeItem
} from "../utils/topics"

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
plannerSessionActive = false,


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

  const categoryGroups = React.useMemo(() => {
    const groups = new Map<string, TopicScopeItem[]>()

    for (const topic of (topics || []) as TopicScopeItem[]) {
      const category = topic.category || "General"
      const categoryTopics = groups.get(category) || []
      categoryTopics.push(topic)
      groups.set(category, categoryTopics)
    }

    return Array.from(groups.entries()).map(
      ([category, categoryTopics]) => ({
        category,
        topics: categoryTopics
      })
    )
  }, [topics])

  const selectedTopicKeys = new Set(
    (selectedTopics || [])
      .map(getTopicScopeKey)
      .filter(Boolean)
  )

  const isCategorySelected = (
    categoryTopics: TopicScopeItem[]
  ) => {
    const topicKeys = categoryTopics
      .map(getTopicScopeKey)
      .filter(Boolean)

    return (
      topicKeys.length > 0
      && topicKeys.every((key: string) => selectedTopicKeys.has(key))
    )
  }

  const toggleCategory = (
    category: string
  ) => {
    const categoryTopics = resolveCategoryTopicObjects(
      category,
      topics || []
    )
    const categoryTopicKeys = new Set(
      categoryTopics
        .map(getTopicScopeKey)
        .filter(Boolean)
    )

    if (isCategorySelected(categoryTopics)) {
      setSelectedTopics(
        (selectedTopics || []).filter(
          (topic: string | TopicScopeItem) =>
            !categoryTopicKeys.has(getTopicScopeKey(topic))
        )
      )
      console.log("CATEGORY SELECTED:", category)
      console.log("RESOLVED TOPIC COUNT:", 0)
      console.log("RESOLVED TOPIC IDS COUNT:", 0)
      return
    }

    const additions = categoryTopics
      .filter(
        topic => !selectedTopicKeys.has(getTopicScopeKey(topic))
      )

    setSelectedTopics([
      ...(selectedTopics || []),
      ...additions
    ])
    logCategoryScope(category, categoryTopics)
  }

  const renderCategorySelector = (
    label: string,
    accentColor = "#22c55e"
  ) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        fontSize: 11,
        color: "#9ca3af",
        letterSpacing: 0.5,
        marginBottom: 8,
        display: "block"
      }}>
        {label}
      </label>

      <div style={{
        maxHeight: "250px",
        overflowY: "auto",
        padding: "10px"
      }}>
        {categoryGroups.map(({ category, topics: categoryTopics }) => {
          const selected = isCategorySelected(categoryTopics)

          return (
            <label
              key={category}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 0",
                cursor: "pointer",
                fontSize: "13px",
                color: selected ? accentColor : "#cbd5e1"
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleCategory(category)}
                style={{ accentColor }}
              />

              {category}
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={panel}>
      
      {projectName && (
      <div
        style={{
          ...shellHeaderCell,
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 12,
          padding: 10,
          marginBottom: 16
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#36f2ed",
            letterSpacing: 1,
            textTransform: "uppercase"
          }}
        >
          Active Project
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 18,
            fontWeight: 700,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
           {projectName}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 12
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#1f2937",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#d1d5db"
            }}
          >
           <img
            src="/icons/document.svg"
            width={18}
            height={18}
            alt=""
          /> uploaded files: {documents?.length || 0}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#1f2937",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "#d1d5db"
            }}
          >
          <img
            src="/icons/category-topic-side.svg"
            width={18}
            height={18}
            alt=""
          />
          Topics: {topics?.length || 0}
          </div>
        </div>
      </div>
    )}

      {plannerSessionActive && (
        <div style={plannerSessionNotice}>
          You are currently following a Planner session.
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
          <p style={{
            color: "#9ca3af",
            fontSize: 13,
            marginBottom: 14,
            lineHeight: 1.5
          }}>
            Select one or more categories to focus your AI conversation.
          </p>

          {renderCategorySelector("SELECT CATEGORIES TO FOCUS")}
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
      
      {activeView === "generate_flashcards" && !plannerSessionActive && (
        <>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 12
          }}>
            {translate('stats.Generate Flashcards')}
          </h3>

          {renderCategorySelector("SELECT CATEGORIES TO COVER")}

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
      {activeView === "flashcards" && !plannerSessionActive && (
        <div style={{ padding: "0px" }}> {/* Rimosso padding extra per allineare allo stile */}
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            {translate('stats.Flashcard Settings')}
          </h3>

          {renderCategorySelector("SELECT CATEGORIES TO REVIEW")}

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

          {renderCategorySelector("SELECT CATEGORIES TO PRACTICE")}

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
            <p style={{
              color: "#9ca3af",
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5
            }}>
              Create an adaptive study session focused on your selected categories.
            </p>

            {renderCategorySelector("SELECT CATEGORIES TO STUDY")}

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
      {/* QUIZ */}
      {/* ========================= */}
      {activeView === "quiz" && !plannerSessionActive && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{translate('stats.Generate Quiz')}</h3>

          {renderCategorySelector("SELECT CATEGORIES TO COVER")}

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

      {plannerSessionActive && (
        activeView === "generate_flashcards"
        || activeView === "flashcards"
        || activeView === "quiz"
      ) && (
        <div style={plannerSessionMutedBox}>
          Quiz and flashcard controls are paused while the Planner is guiding this session.
        </div>
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
  width: "100%",
  boxSizing: "border-box",
  background: "#080a10",
  borderRight: "1px solid #1f2937",
  padding: 20,
  height: "100%",
  overflowY: "auto" as const,
  color: "white",
  zIndex: 2
}

const plannerSessionNotice: React.CSSProperties = {
  background: "#052b2a",
  border: "1px solid #0e6c69",
  color: "#36F2ED",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.5,
  marginBottom: 16
}

const plannerSessionMutedBox: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #374151",
  color: "#9ca3af",
  borderRadius: 10,
  padding: 14,
  fontSize: 13,
  lineHeight: 1.6
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
