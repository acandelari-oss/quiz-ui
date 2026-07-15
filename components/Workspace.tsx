import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryViewNew from "./views/SummaryView"
import ActiveRecallView from "./views/ActiveRecallView"
import { useState, useEffect } from "react"
import StudySessionView from "./views/StudySessionView"
import PlannerView from "./views/PlannerView"
import { Heading2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import TopicsView from "./views/TopicsView"
import { useTranslation } from 'react-i18next';
import HintBox from "@/components/ui/HintBox";
import { shellHeaderCell } from "./layoutStyles"
import {
  BarChart3,
  Calendar,
  ClipboardList,
  BrainCircuit,
  Layers3,
  HelpCircle,
  Brain,
  AlertTriangle
} from "lucide-react";

export default function Workspace({

activeView,
setActiveView,
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

selectedTopic,
setSelectedTopic,
selectedTopics,
setSelectedTopics,

uploadLog,
uploading,
projectId,
projectName,
quizId,
previousQuizzes,
loadQuiz,
loadQuizStats,
status,
loadPreviousQuizzes,
loadingFlashcards,
generatingFlashcards,
documents,
topics,
loadingTopics,
isGenerating,
loaderStep,
loaderType,
loaderMessages,
useGlobalKnowledge,
setUseGlobalKnowledge,
toolMode,
setToolMode,
studyConfig,
generateQuiz,
generateFlashcards,
plannerRuntime,
openPlannerDailySession,
launchPlannerActivity,
onPlannerFlashcardReview,
continuePlannerActivity,
returnToPlannerDashboard,
plannerActivityDebriefs,





}) {
console.log("🧠 ACTIVE VIEW:", activeView)
const quizList = Array.isArray(quiz) ? quiz : []

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

const { t: translate } = useTranslation();
const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.reload()
}
const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
  let interval: any;
  // Controlla che queste variabili siano quelle che attivano il caricamento nel tuo codice
  if (uploading || generatingFlashcards || generatingQuiz) {
    interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }, 5000);
  } else {
    setCurrentStep(0);
  }
  return () => clearInterval(interval);
}, [uploading, generatingFlashcards, generatingQuiz]); // <--- Fondamentale che ci siano tutte!


const [docsByProject, setDocsByProject] = useState<{[key:string]: any[]}>({})
const [openProjects, setOpenProjects] = useState<{[key:string]: boolean}>({})
const [quizStats, setQuizStats] = useState<{[key:string]: any}>({})
const [statsLoaded, setStatsLoaded] = useState(false)
const [topicsOpen, setTopicsOpen] = useState(true);

const previous = Array.isArray(previousQuizzes) ? previousQuizzes : []
const chartData = previous.map((q:any, index:number) => {
  const stats = quizStats?.[q.id]
  console.log("QUIZ ID:", q.id)
  console.log("QUIZ STATS:", quizStats)
  console.log("STATS FOR THIS QUIZ:", quizStats[q.id])
  console.log("🔥 WORKSPACE resultsData:", resultsData)
  console.log("🔥 topic_mastery:", resultsData?.topic_mastery)
  return {
    name: `Q${index + 1}`, 
    score: stats?.last_score || 0
  }
})

console.log("Valore di currentStep:", currentStep);
console.log("Sta caricando le flashcard?", generatingFlashcards);


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

// 1. Reset delle stats quando cambi vista o progetto
  useEffect(() => {
    setStatsLoaded(false);
  }, [activeView, projectId]);

  



  // 2. Caricamento effettivo delle statistiche
  useEffect(() => {
    async function loadStats() {
      if (activeView !== "previous_quizzes" && activeView !== "results_summary") return;
      if (!projectId || !loadQuizStats || statsLoaded) return;

      console.log("🔄 Caricamento statistiche in corso...");
      const data = await loadQuizStats(projectId);
      
      const map: any = {};
      if (data && data.quiz_history) {
        data.quiz_history.forEach((s: any) => {
          map[s.id] = {
            attempts: s.attempts || 1,
            best_score: s.score,
            last_score: s.score
          };
        });
      }

      setQuizStats(map);
      setStatsLoaded(true);
    }

    loadStats();
  }, [activeView, projectId, loadQuizStats, statsLoaded]); // Aggiunto statsLoaded alle dipendenze

  useEffect(() => {
    // Se abbiamo flashcard caricate e siamo nella vista flashcards, 
    // assicuriamoci che il loader di generazione sia spento.
    if (activeView === "flashcards" && flashcards && flashcards.length > 0) {
      // Se hai accesso alla funzione setter qui:
      // setGeneratingFlashcards(false); 
    }
  }, [activeView, flashcards]);


console.log("WORKSPACE LOG:", uploadLog)
console.log("WORKSPACE resultsData:", resultsData);
console.log("RENDERING ATTUALE - View:", activeView, "Cards:", flashcards?.length, "Gen:", generatingFlashcards);
const canRenderWithoutProject = activeView === "manage_projects"
return (
  
  <div style={{ ...workspace, position: "relative" }}>
    <div
      className={
        activeView === "quiz" && started
          ? "workspace-header workspace-mobile-hidden quiz-runtime-mobile-hidden"
          : "workspace-header"
      }
      style={{
        ...shellHeaderCell,
        marginTop: 20,
        justifyContent: "flex-end",
        gap: 12,
        padding: "0 12px",
        borderBottom: "1px solid #1f2937",
        background: "#080a10",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >

      <button
        style={{
          padding: "8px 5px",
          borderRadius: 8,
          border: "1px solid #374151",
          background: "#1f2937",
          color: "white",
          cursor: "pointer",
         
        }}
        onClick={() => alert("Account area coming soon")}
      >
        Account
      </button>

      <button
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #ef4444",
          background: "#7f1d1d",
          color: "white",
          cursor: "pointer",
          
        }}
        onClick={handleLogout}
      >
        Logout
      </button>

    </div>

    <div
      className={
        activeView === "quiz" && started
          ? "workspace-content quiz-runtime-mobile-content"
          : "workspace-content"
      }
      style={{ padding: 30 }}
    >
    <style>{`
      @media (max-width: 900px) {
        .workspace-mobile-hidden,
        .workspace-header {
          display: none !important;
        }

        .workspace-content {
          padding: 0 !important;
        }

        .quiz-runtime-mobile-hidden {
          display: none !important;
        }

        .quiz-runtime-mobile-content {
          padding: 0 !important;
        }
      }
    `}</style>
    {/* --- INIZIO BLOCCO LOADER AGGIORNATO --- */}
    {uploading ||
    generatingFlashcards ||
    generatingQuiz ||
    status === "Loading project..." ||
    status === "Loading previous material..." ||
    status === "Project loaded successfully" ||
    status === "Project upload completed" ||
    status === "Processing topics..." ? (
      <div style={loaderContainer}>
        
        {/* 1. SPINNER O CHECK DI SUCCESSO */}
        {status === "Project loaded successfully" ||
        status === "Project upload completed" ? (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "white",
            animation: "pop 0.3s ease"
          }}>
            ✔
          </div>
        ) : (
          <div style={spinner}></div>
        )}

        {/* 2. TITOLO DINAMICO TRADOTTO */}
        <div style={loaderTitle}>
          {!mounted ? (
            "Loading..."
          ) : uploading ? (
            (uploadLog || translate('stats.Uploading document...'))
          ) : generatingFlashcards ? (
            // Prova senza "common:" se vedi ancora la chiave tecnica
            translate(`loaders.flashcards_${currentStep}`)
          ) : generatingQuiz ? (
            translate(`loaders.quiz_${currentStep}`)
          ) : (
            /* LOGICA STATUS */
            status === "Loading project..." ? translate('stats.Loading project') :
            status === "Loading previous material..." ? translate('stats.Loading previous material') :
            status === "Project loaded successfully" ? translate('stats.Project loaded successfully') :
            status === "Project upload completed" ? translate('stats.Project upload completed') :
            status === "Processing topics..."
              ? translate('stats.We are organizing your material into study topics')
              :status
          )}
        </div>

        {/* 3. SOTTOTITOLO DINAMICO TRADOTTO */}
       <div style={loaderSubtitle}>
        {mounted ? (
          uploading ? (
            uploadLog?.includes("LARGE_FILE_WARNING")
              ? translate('stats.Large academic document detected. Processing may take longer than usual.')
              : translate('stats.OCR files may take longer to process')
          ) : generatingQuiz ? (
            translate('stats.We are building your quiz and checking question quality.')
          ) : generatingFlashcards ? (
            translate('stats.We are extracting key concepts and preparing your flashcards.')
          ) : status === "Processing topics..." ? (
            translate('stats.We are organizing your material into study topics.')
          ) : status === "Project upload completed" ? (
            translate('stats.Your material is ready. Choose the next action from the sidebar.')
          ) : (
            translate('stats.Preparing your learning workspace.')
          )
        ) : "..."}
      </div>

        
      </div>
    ) : /* --- FINE BLOCCO LOADER --- */

    !projectId && !canRenderWithoutProject ? (
      // Qui continua con il tuo codice del logo (StudyForge)

  
  <div style={{
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
    justifyContent:"center",
    height:"70vh",
    textAlign:"center"
  }}>

    <img
      src="/logoduntext.png"
      alt="Do U No logo"
      style={{
        width:360,
        marginBottom:20,
        opacity:0.9
      }}
    />

    

    <p style={{
      color:"#9ca3af",
      maxWidth:400,
      lineHeight:1.6
    }}>
      {mounted ? (
        <>
          {translate('stats.Welcome 👋')} 
          {translate('stats.Create a new project or load an existing one to start studying.')}
        </>
      ) : (
        "Loading..." // Testo temporaneo che corrisponde tra server e client
      )}
    </p>

  </div>

) : documents?.length === 0 && !canRenderWithoutProject ? (

  // 🔥 NUOVA SCHERMATA (DOPO CREAZIONE PROGETTO)
  <div style={{
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
    justifyContent:"center",
    height:"70vh",
    textAlign:"center"
  }}>

    <h2 style={{
      color:"white",
      fontSize:26,
      marginBottom:10
    }}>
      {translate('stats.Upload your study material')}
    </h2>

    <p style={{
      color:"#9ca3af",
      maxWidth:400,
      lineHeight:1.6
    }}>
      {translate('stats.Upload your files to start generating topics, flashcards and quizzes.')}
    </p>
    <div style={{
      marginTop: 28,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "18px 22px",
      maxWidth: 700,
      textAlign: "left"
    }}>

      <div style={{
        color: "white",
        fontWeight: 600,
        marginBottom: 12,
        fontSize: 18
      }}>
        📚 Study Material Tips
      </div>

      <div style={{
        color: "#d1d5db",
        fontSize: 15,
        lineHeight: 1.7
      }}>

        <div style={{ marginBottom: 10 }}>
          <strong>Accepted formats</strong><br />
          • PDF<br />
          • Word (.docx)<br />
          • PowerPoint (.pptx)
        </div>

        <div style={{ marginBottom: 10 }}>
          <strong>Best results</strong><br />
          • text-based documents work best<br />
          • chapter-based uploads improve topic quality<br />
          • smaller thematic uploads generate more precise quizzes and flashcards
        </div>

        <div style={{ marginBottom: 10 }}>
          <strong>Recommended size</strong><br />
          • ~40–80 pages per upload for optimal study analysis<br />
          • very large academic files may require additional processing time
        </div>

        <div>
          <strong>Good to know</strong><br />
          • scanned documents and OCR files may take longer<br />
          • the platform analyzes conceptual relationships before generating quizzes and flashcards
        </div>

      </div>
    </div>

  </div>
  

) : (  




  // =========================
  // NORMAL APP
  // =========================
  <>
    {activeView === "upload_error" && (

      <div style={{ padding: 20 }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          color: "#ef4444",
          fontWeight: 600,
          fontSize: 24
        }}>
          <AlertTriangle size={48}/>
          <p>FILE PROCESSING FAILED</p>
        </div>

        <HintBox
          text="The uploaded file could not be fully processed. Large scanned PDFs, unsupported formatting, or extremely large documents may cause ingestion failures."
        />

        <div style={{
          marginTop: 30,
          color: "#9ca3af",
          lineHeight: 1.8,
          fontSize: 14,
          maxWidth: 700,
          marginInline: "auto",
          textAlign: "center"
        }}>
          <p>Suggestions:</p>

          <p>• Split very large files into chapters</p>
          <p>• Export the document as a text-based PDF</p>
          <p>• Avoid scanned or image-only pages</p>
          <p>• Remove heavily formatted slides when possible</p>
        </div>

      </div>

    )}
    {/* MANAGE PROJECTS */}
    {activeView === "manage_projects" && (
      <div style={{padding:40}}>
        <h2>{translate('stats.Manage Projects')}</h2>

        

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
                  {translate('stats.Delete project')}
                </button>

              </div>

              {/* DOCUMENT LIST */}
              {docs.length === 0 && (
                <div style={{color:"#9ca3af", fontSize:13}}>
                  {translate('stats.No documents')} 
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
                      const { data: sessionData } = await supabase.auth.getSession()
                      const token = sessionData.session?.access_token

                      await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/projects/${p.id}/documents/${encodeURIComponent(d.title)}`,
                        {
                          method: "DELETE",
                          headers: {
                            Authorization: `Bearer ${token}`
                          }
                        }
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
    {/* 🎯 NUOVA DASHBOARD TOPICS */}
    {activeView === "topics" && (
      <div className="topics-dashboard-mobile-shell" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <h2 className="topics-dashboard-mobile-title" style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "600" }}>
          <img
            className="topics-dashboard-mobile-title-icon"
            src="/icons/topic-dashboard.svg"
            alt=""
            width={48}
            height={48}
          /> {translate('stats.Topic Dashboard')}
        </h2>
        <p className="topics-dashboard-mobile-subtitle" style={{ color: "#9ca3af", marginBottom: "30px" }}>
          {translate('stats.Use the buttons at the bottom of each category to start a targeted activity.')}
        </p>

        <TopicsView
          topics={topics}
          projectId={projectId}
          loadingTopics={loadingTopics}
          topicsOpen={topicsOpen}
          setTopicsOpen={() => {}}
          selectedTopics={selectedTopics}
          setSelectedTopics={setSelectedTopics}
          previousFlashcards={flashcards}
          studyMode={status === "completed" ? "loaded" : "generated"}
          // Funzioni per far funzionare i bottoni dentro TopicsView
          setSelectedTopic={setSelectedTopic}
          setActiveView={setActiveView}
          summaryStats={summaryStats}
          resultsData={resultsData} 
        />
        <style jsx global>{`
          @media (max-width: 900px) {
            .topics-dashboard-mobile-shell {
              padding: 18px 12px 20px !important;
              max-width: none !important;
              width: 100%;
              box-sizing: border-box;
            }

            .topics-dashboard-mobile-title {
              margin: 0 0 8px !important;
              font-size: 28px !important;
              line-height: 1.1 !important;
              font-weight: 800 !important;
              color: #2fb8ff;
            }

            .topics-dashboard-mobile-title-icon {
              display: none !important;
            }

            .topics-dashboard-mobile-subtitle {
              margin: 0 0 22px !important;
              font-size: 15px !important;
              line-height: 1.35 !important;
              color: #9ca3af !important;
              max-width: 92%;
            }
          }
        `}</style>
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
        projectName={projectName}
        selectedTopics={selectedTopics} 
        useGlobalKnowledge={useGlobalKnowledge}
        setUseGlobalKnowledge={setUseGlobalKnowledge}
      />
    )}

    {/* ACTIVE RECALL - CORRETTO */}
    {activeView === "ask_setup" && (

      <div style={{ padding: 20 }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 24
        }}>
          <img
            src="/icons/ask.svg"
            alt=""
            width={48}
            height={48}
          />
          <p>{translate('stats.ASK A QUESTION')} </p>
        </div>

        <HintBox
          text={translate('stats.Ask the AI to explain concepts, compare ideas, simplify difficult topics, or clarify mistakes from your quizzes.')}
        />

      </div>

    )}

     {activeView === "active_recall_setup" && (

      <div style={{ padding: 20 }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 24
        }}>
          <img
            src="/icons/memory-check.svg"
            alt=""
            width={48}
            height={48}
          />
          <p>{translate('stats.MEMORY CHECK')}</p>
        </div>

        <HintBox
          text={translate('stats.Memory Check is designed to strengthen long-term recall. Try answering in your own words before asking for help.')}  
        />

      </div>

    )} 

    {activeView === "active_recall" && (
      <ActiveRecallView 
        projectId={projectId} 
        selectedTopics={selectedTopics}
        useGlobalKnowledge={useGlobalKnowledge}
        setUseGlobalKnowledge={setUseGlobalKnowledge}
      />
    )}

    {/* 1. VISTA GENERAZIONE (Solo se chiamata esplicitamente) */}
    {activeView === "generate_flashcards" && (
      <>
      <div style={{ padding: 20 }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 24
        }}>
          <img
            src="/icons/flashcards.svg"
            alt=""
            width={48}
            height={48}
          />
          <p>{translate('stats.FLASHCARDS')}</p>
        </div>

        <HintBox
          text={translate('stats.Flashcards work best with active recall. Try answering mentally before revealing the solution.')}  
        />

      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"20vh", textAlign:"center" }}>
        <h3 style={{ color:"white", fontSize:22 }}>{translate('stats.Generate Flashcards')}</h3>
        <p style={{ color:"#9ca3af", maxWidth:600, fontSize:18 }}>
          {translate('stats.Select topics and number of cards in the left panel, then press')}
          <b style={{color:"white"}}> {translate('stats.Generate')} </b>.
        </p>
      </div>
      </>
    )}

    {/* 2. VISTA FLASHCARDS (Caricamento e Visualizzazione) */}
    {activeView === "flashcards" && (
      <>
        {/* 1. Banner del Topic (Se selezionato) */}
        {selectedTopic && (
          <div className="flashcards-mobile-hidden" style={{
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid #22c55e",
            padding: "10px 15px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#22c55e",
            fontWeight: "bold"
          }}>
            🎯 Focusing on: {typeof selectedTopic === 'object' ? selectedTopic.value : selectedTopic}
          </div>
        )}

        {/* 2. Gestione Spinner (Solo durante caricamento o generazione) */}
        {loadingFlashcards || generatingFlashcards ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "60vh", color: "white"
          }}>
            <div style={spinner}></div>
            <div style={{ marginTop: 10 }}>
              {generatingFlashcards ? "Generating flashcards..." : "Loading flashcards..."}
            </div>
          </div>
        ) : flashcards && flashcards.length > 0 ? (
          /* 3. Visualizzazione Flashcards (Se i dati sono pronti) */
          <>
            <FlashcardsView
              flashcards={flashcards}
              openCard={openCard}
              setOpenCard={setOpenCard}
              onReview={onPlannerFlashcardReview}
            />
            {plannerRuntime?.mode === "activity_review" && (
              <PlannerActivityReviewCheckpoint
                title="Flashcards completed"
                message="Review the completed flashcards, then continue when you are ready."
                professorDebrief={
                  plannerActivityDebriefs?.[
                    String(plannerRuntime?.dailyPlan?.activities?.[plannerRuntime?.activityIndex]?.id || "")
                  ]
                }
                onContinue={continuePlannerActivity}
              />
            )}
          </>
        ) : (
          /* 4. Schermata di Benvenuto/Generate (Contenuto ripristinato) */
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            textAlign: "center"
          }}>
            <h3 style={{
              color: "white",
              fontSize: 22,
              marginBottom: 10
            }}>
              {translate('stats.Flashcard Study')}
            </h3>

            <p style={{
              color: "#9ca3af",
              maxWidth: 500,
              lineHeight: 1.6
            }}>
              {translate('stats.Choose how many new flashcards you want to generate and press ')}
              <b style={{ color: "white" }}> {translate('stats.Generate')}</b><br />
              {translate('stats.or choose how many of your existing flashcards you would like to review and press ')}
              <b style={{ color: "white" }}> {translate('stats.Start Study')}</b>.
            </p>
          </div>
        )}
      </>
    )}
    

    {/* ========================= */}
    {/* STUDY SESSION */}
    {/* ========================= */}

    {activeView === "study_session_setup" && (

      <div style={{ padding: 20 }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          color: "#36F2ED",
          fontWeight: 600,
          fontSize: 24
        }}>
          <BrainCircuit size={48}/>
          <p>{translate('stats.STUDY SESSION')}</p>
        </div>

        <HintBox
          text={translate('stats.Study Sessions combine quizzes, flashcards, and memory exercises to reinforce understanding over time.')}
        />

      </div>

    )}

    {activeView === "study_session" && (
      projectId ? (

        <div style={{ padding: 20 }}>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 20,
            color: "#36F2ED",
            fontWeight: 600,
            fontSize: 24
          }}>
            <BrainCircuit size={48}/>
            <p>{translate('stats.STUDY SESSION')}</p>
          </div>

          <HintBox
            text={translate('stats.Study Sessions combine quizzes, flashcards, and memory exercises to reinforce understanding over time.')}
          />

          <StudySessionView 
            projectId={projectId} 
            selectedTopics={selectedTopics}
            studyConfig={studyConfig}
          />

        </div>

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
            src="/logodun.png"
            alt="Do U No logo"
            style={{
              width: 80,
              marginBottom: 20,
              opacity: 0.9
            }}
          />
          <h2 style={{ color: "#9ca3af", maxWidth: 400 }}>
            {translate('stats.Welcome 👋 ')}
            {translate('stats.Create a new project or load an existing one to start studying.')}
          </h2>
        </div>
      )
    )}

    {/* ========================= */}
    {/* QUIZ VIEW */}
    {/* ========================= */}
    {activeView === "quiz" && (
      <div style={{ padding: 20 }}>
        {generatingQuiz ? (
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "60vh" 
          }}>
            {/* 1. DEFINIZIONE DELLO STILE (Lo spinner che mi hai inviato) */}
            <div style={{
              width: 40,
              height: 40,
              border: "4px solid #374151",
              borderTop: "4px solid #22c55e",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginBottom: 20
            }}></div>

            {/* FIX: Uso dei backtick per evitare l'errore di parsing */}
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            
            <p style={{ 
              color: "#9ca3af", 
              fontWeight: 500,
              fontSize: "14px",
              textAlign: "center"
            }}>
              {loaderMessages 
                ? loaderMessages[loaderType][loaderStep] 
                : `Generating your ${
                    selectedTopics && selectedTopics.length > 1
                      ? `${selectedTopics[0].split(" ")[0]} (${selectedTopics.length} topics)`
                      : selectedTopics?.[0] || selectedTopic || "general"
                  } quiz...`}
            </p>
          </div>
        ) : (
          <>
            <div className="desktop-quiz-intro" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 20,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 24
            }}>
              <img
            src="/icons/quiz.svg"
            alt=""
            width={36}
              height={36}
          /><p>{translate('stats.QUIZ GENERATION')}</p>
            </div>
            <div className="desktop-quiz-intro">
              <HintBox
                text={translate('stats.Smaller quizzes improve retention and focus. Use quiz mode to evaluate your understanding, not just to repeat information.')}
              />
            </div>
            <style jsx global>{`
              @media (max-width: 900px) {
                .desktop-quiz-intro {
                  display: none !important;
                }
              }
            `}</style>
            <QuizView
              quiz={quiz}
              answers={answers}
              selectAnswer={selectAnswer}
              finished={finished}
              started={started}
              submitQuiz={submitQuiz}
              expanded={expanded}
              setExpanded={setExpanded}
              formatTime={formatTime}
              answeredCount={answeredCount}
              calculateScore={calculateScore}
              loadQuizStats={loadQuizStats}
              projectId={projectId}
              quizId={quizId}
            />
            {plannerRuntime?.mode === "activity_review" && (
              <PlannerActivityReviewCheckpoint
                title="Quiz review"
                message="Review your answers, explanations, sources, and question chat before continuing."
                professorDebrief={
                  plannerActivityDebriefs?.[
                    String(plannerRuntime?.dailyPlan?.activities?.[plannerRuntime?.activityIndex]?.id || "")
                  ]
                }
                onContinue={continuePlannerActivity}
              />
            )}
          </>
        )}
      </div>
    )}

    {/* ========================= */}
    {/* PREVIOUS QUIZZES */}
    {/* ========================= */}
    {activeView === "previous_quizzes" && (
      <div style={{ padding: 20 }}>

        <h3 style={{ color: "white", marginBottom: 20 }}>
          Previous quizzes
        </h3>
        {chartData.length > 0 && (
          <div style={{
            background:"#111827",
            border:"1px solid #374151",
            borderRadius:10,
            padding:20,
            marginBottom:20
          }}>
            <div style={{ color:"#9ca3af", marginBottom:10 }}>
              {translate('stats.Score trend')}  
            </div>

            <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
              {chartData.map((d:any, i:number) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{
                    height: d.score * 2,
                    width: 20,
                    background:"#22c55e",
                    borderRadius:4,
                    transition:"all 0.3s ease"
                  }} />

                  <div style={{
                    fontSize:10,
                    color:"#9ca3af",
                    marginTop:4
                  }}>
                    {d.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(previous) && previous.length > 0 ? (
          previous.map((q:any, index:number) => {

            const stats = quizStats?.[q.id]

            
            
            return (
              <div
                key={q.id}
                style={{
                  padding: "12px 14px",
                  marginBottom: 10,
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >

                <div>
                  <div style={{ fontWeight: 600 }}>
                     Quiz Q{index + 1}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {new Date(q.created_at).toLocaleDateString()}
                  </div>

                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {q.num_questions} {translate('stats.questions')}
                  </div>

                  {stats && (
                    <div style={{
                      fontSize: 14,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap"
                    }}>
                      
                      <span style={{ color: "#9ca3af" }}>
                        {translate('stats.Attempts: {stats.attempts}')}
                      </span>

                      <span>·</span>

                      <span style={{
                        color: stats.best_score > 70 ? "#22c55e" :
                              stats.best_score > 40 ? "#f59e0b" :
                              "#ef4444",
                        fontWeight: 600
                      }}>
                        {translate('stats.Best: {stats.best_score}%')}
                      </span>

                      <span>·</span>

                      <span style={{
                        color: stats.last_score > 70 ? "#22c55e" :
                              stats.last_score > 40 ? "#f59e0b" :
                              "#ef4444",
                        fontWeight: 600
                      }}>
                        {translate('stats.Last: {stats.last_score}%')}
                      </span>

                      {stats.attempts > 1 && (
                        <>
                          <span>·</span>
                          <span style={{
                            color: stats.last_score >= stats.best_score ? "#22c55e" : "#ef4444",
                            fontWeight: 600
                          }}>
                            {stats.last_score >= stats.best_score ? translate('stats.↑ Improving') : translate('stats.↓ Needs review')}
                          </span>
                        </>
                      )}

                    </div>
                  )}
                  
                  
                </div>

                <button
                  onClick={() => loadQuiz(q.id)}
                  style={{
                    background: "#22c55e",
                    color: "black",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  {translate('stats.Retake')}
                </button>

              </div>
            )
          })
        ) : (
          <div style={{ color:"#9ca3af" }}>
            {translate('stats.No quizzes yet')}
          </div>
        )}

      </div>
    )}
    {/* ========================= */}
    {/* PLANNER VIEW */}
    {/* ========================= */}

    {activeView === "planner_view" && (
      <PlannerView
        projectId={projectId}
        topics={topics}
        plannerRuntime={plannerRuntime}
        openPlannerDailySession={openPlannerDailySession}
        launchPlannerActivity={launchPlannerActivity}
        returnToPlannerDashboard={returnToPlannerDashboard}
      />
    )}
    {/* RESULTS */}
    {/* RESULTS & SUMMARY UNITI */}
    {activeView === "results_summary" && (
      <div style={{ padding: 20 }}>
        <h2 style={{ color: "white", marginBottom: 20 }}>
          {translate('stats.Results & Summary')}
        </h2>

        {/* Usiamo solo SummaryView che ora contiene tutto */}
        <SummaryViewNew 
          summaryStats={summaryStats} 
          resultsData={resultsData} // Passiamo anche i dati dei topic
          projectId={projectId}
        />
      </div>
    )}

  </>
)}   

</div>
</div>  

  )
}

function PlannerActivityReviewCheckpoint({
  title,
  message,
  professorDebrief,
  onContinue
}: {
  title: string
  message: string
  professorDebrief?: string
  onContinue: () => void
}) {
  return (
    <div style={plannerReviewCheckpoint}>
      <div>
        <div style={plannerReviewTitle}>🎉 {title}</div>
        <div style={plannerReviewMessage}>{message}</div>
        {professorDebrief && (
          <div style={plannerReviewProfessorDebrief}>{professorDebrief}</div>
        )}
      </div>
      <button
        onClick={onContinue}
        style={plannerReviewButton}
      >
        Continue to next exercise
      </button>
    </div>
  )
}



const workspace = {
flex:1,
minWidth:0,
background:"#080a10",
color:"#e5e7eb",
overflowY:"auto" as const,
overflowX:"hidden" as const,
height:"100%",
boxSizing:"border-box" as const,
WebkitOverflowScrolling:"touch" as const
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

const plannerReviewCheckpoint = {
background: "#052b2a",
border: "1px solid #0e6c69",
borderRadius: 14,
padding: 18,
marginTop: 24,
marginBottom: 0,
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: 16,
flexWrap: "wrap" as const
}

const plannerReviewTitle = {
color: "#36F2ED",
fontSize: 18,
fontWeight: 900,
marginBottom: 4
}

const plannerReviewMessage = {
color: "#cbd5e1",
fontSize: 14,
lineHeight: 1.5
}

const plannerReviewProfessorDebrief = {
marginTop: 14,
paddingTop: 14,
borderTop: "1px solid rgba(54, 242, 237, 0.18)",
color: "#e5e7eb",
fontSize: 15,
lineHeight: 1.65
}

const plannerReviewButton = {
background: "#2b7dcb",
border: "none",
borderRadius: 10,
color: "white",
cursor: "pointer",
fontWeight: 800,
padding: "12px 18px"
}

const styleSheet = typeof document !== "undefined" && document.createElement("style")

if (styleSheet && !document.getElementById("loader-animations")) {
  styleSheet.id = "loader-animations"
  styleSheet.innerHTML = `
    @keyframes pop {
      0% { transform: scale(0.6); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
  `
  document.head.appendChild(styleSheet)
}
