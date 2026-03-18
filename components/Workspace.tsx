import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryView from "./views/SummaryView"
import ActiveRecallView from "./views/ActiveRecallView"
import { useState, useEffect } from "react"
import StudySessionView from "./views/StudySessionView"
import { Heading2 } from "lucide-react"
import { supabase } from "../lib/supabase"

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
const [docsByProject, setDocsByProject] = useState<{[key:string]: any[]}>({})
const [openProjects, setOpenProjects] = useState<{[key:string]: boolean}>({})

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

useEffect(()=>{

  async function loadAllDocs(){

    if(!projects) return

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if(!token) return

    const result: {[key:string]: any[]} = {}

    for(const p of projects){

      try{

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/${p.id}/documents`,
          {
            headers:{
              Authorization: `Bearer ${token}`
            }
          }
        )

        if(!res.ok){
          console.error("Docs fetch failed", res.status)
          result[p.id] = []
          continue
        }

        const data = await res.json()

        result[p.id] = data.documents || []

      } catch(e){
        console.error("Docs load error", e)
        result[p.id] = []
      }

    }

    setDocsByProject(result)
  }

  loadAllDocs()

}, [projects])

return (

<div style={workspace}>

{!projectId ? (

  // =========================
  // WELCOME ONLY
  // =========================
  <div style={{
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
    justifyContent:"center",
    height:"70vh",
    textAlign:"center"
  }}>

    <img
      src="/logo.png"
      alt="StudyForge logo"
      style={{
        width:80,
        marginBottom:20,
        opacity:0.9
      }}
    />

    <h1 style={{
      color:"white",
      fontSize:32,
      marginBottom:10
    }}>
      StudyForge
    </h1>

    <p style={{
      color:"#9ca3af",
      maxWidth:400,
      lineHeight:1.6
    }}>
      Welcome 👋  
      Create a new project or load an existing one to start studying.
    </p>

  </div>

) : (

  // =========================
  // NORMAL APP
  // =========================
  <>

    {/* MANAGE PROJECTS */}
    {activeView === "manage_projects" && (
      <div style={{padding:40}}>
        <h2>Manage Projects</h2>

        {projects?.map((p:any)=>{

          const docs = docsByProject[p.id] || []

          return (

            <div
              key={p.id}
              style={{
                padding:"12px 14px",
                marginBottom:14,
                background:"#111827",
                border:"1px solid #374151",
                borderRadius:8,
                color:"white"
              }}
            >

              {/* HEADER */}
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                marginBottom:8
              }}>

                <span style={{fontWeight:600}}>
                  {p.name}
                </span>

                <button
                  onClick={()=>deleteProject(p.id)}
                  style={{
                    background:"#7f1d1d",
                    color:"white",
                    border:"1px solid #ef4444",
                    borderRadius:6,
                    padding:"6px 8px",
                    cursor:"pointer"
                  }}
                >
                  Delete project
                </button>

              </div>

              {/* DOCUMENT LIST */}
              {docs.length === 0 && (
                <div style={{color:"#9ca3af", fontSize:13}}>
                  No documents
                </div>
              )}

              {docs.map((d:any)=>(
                <div
                  key={d.title}
                  style={{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"center",
                    fontSize:13,
                    marginBottom:6
                  }}
                >
                  <span>📄 {d.title}</span>

                  <button
                    onClick={async ()=>{
                      await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/projects/${p.id}/documents/${encodeURIComponent(d.title)}`,
                        { method:"DELETE" }
                      )

                      setDocsByProject(prev => ({
                        ...prev,
                        [p.id]: prev[p.id].filter((doc:any)=>doc.title !== d.title)
                      }))
                    }}
                    style={{
                      background:"#7f1d1d",
                      border:"1px solid #ef4444",
                      color:"white",
                      borderRadius:4,
                      padding:"2px 6px",
                      cursor:"pointer"
                    }}
                  >
                    ✕
                  </button>

                </div>
              ))}

            </div>

          )

        })}

      </div>
    )}

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

    {/* ACTIVE RECALL */}
    {activeView === "active_recall" && (
      <ActiveRecallView projectId={projectId} />
    )}

    {/* FLASHCARDS */}
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

    {/* STUDY SESSION */}
    {activeView === "study_session" && projectId && (
      <StudySessionView projectId={projectId} />
    )}

    {/* RESULTS */}
    {activeView === "results_summary" && (
      <div>
        <ResultsView resultsData={resultsData} />
        <div style={{ marginTop: 40 }} />
        <SummaryView 
          summaryStats={summaryStats} 
          projectId={projectId}
        />
      </div>
    )}

  </>   

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