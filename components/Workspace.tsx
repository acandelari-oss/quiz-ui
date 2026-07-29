import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryViewNew from "./views/SummaryView"
import ActiveRecallView from "./views/ActiveRecallView"
import { useState, useEffect, useRef } from "react"
import StudySessionView from "./views/StudySessionView"
import PlannerView from "./views/PlannerView"
import { Heading2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import TopicsView from "./views/TopicsView"
import { useTranslation } from 'react-i18next';
import HintBox from "@/components/ui/HintBox";
import MarkdownContent from "@/components/ui/MarkdownContent";
import { CategoryPriorityProvider } from "@/components/ui/CategoryLabel";
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
handleSidebarNavigation,
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
quizPacingOverTarget,
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
uploadFlightSessionId,
projectId,
projectName,
studentFirstName,
projectStudyMode,
projectReadyVisible,
projectReadyDismissed,
quizId,
previousQuizzes,
loadQuiz,
loadQuizStats,
loadHistoryStats,
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
resetPlannerRuntimeForNewStudyPlan,
plannerActivityProgress = [],
plannerActivityDebriefs,
onUploadAnotherFile,
onBeginStudy,
onLearningHomeLaunch,
priorityCategories = [],
setPriorityCategories = (_value: any) => {},
onPriorityCategoriesSaved = (_projectId: string, _priorityCategories: string[]) => {},





}) {
console.log("🧠 ACTIVE VIEW:", activeView)
const quizList = Array.isArray(quiz) ? quiz : []

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

const { t: translate } = useTranslation();
const handleLogout = async () => {
  console.log("[WORKSPACE NAV TRACE] window.location.reload called", {
    timestamp: new Date().toISOString(),
    component: "Workspace",
    reason: "logout button clicked",
    activeView,
    stack: new Error().stack
      ?.split("\n")
      .slice(2, 8)
      .map(line => line.trim())
  })
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
      if (!projectId || statsLoaded) return;

      console.log("🔄 Caricamento statistiche in corso...");
      if (activeView === "previous_quizzes" && loadHistoryStats) {
        const perQuizStats = await loadHistoryStats(projectId);
        setQuizStats(perQuizStats || {});
        setStatsLoaded(true);
        return;
      }

      if (!loadQuizStats) return;

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
  }, [activeView, projectId, loadQuizStats, loadHistoryStats, statsLoaded]); // Aggiunto statsLoaded alle dipendenze

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
const showProjectReadyScreen =
  projectStudyMode === "building"
  && !projectReadyDismissed
  && (
    projectReadyVisible
    || Boolean(projectId && ((documents?.length || 0) > 0 || (topics?.length || 0) > 0))
  )
const plannerGuidedSessionActive =
  plannerRuntime?.dailyPlan
  && (
    plannerRuntime?.mode === "external_activity"
    || plannerRuntime?.mode === "activity_review"
  )
const plannerGuidedActivity =
  plannerRuntime?.dailyPlan?.activities?.[plannerRuntime?.activityIndex]
const workspaceLoaderConditions = {
  uploading: Boolean(uploading),
  generatingFlashcards: Boolean(generatingFlashcards),
  generatingQuiz: Boolean(generatingQuiz),
  loadingProject: status === "Loading project...",
  loadingPreviousMaterial: status === "Loading previous material...",
  projectLoadedSuccessfully: status === "Project loaded successfully",
  projectUploadCompletedWithoutReadyScreen:
    status === "Project upload completed" && !showProjectReadyScreen,
  processingTopics: status === "Processing topics..."
}
const workspaceLoaderVisible = Object.values(workspaceLoaderConditions).some(Boolean)
const previousWorkspaceLoaderVisible = useRef<boolean | null>(null)

useEffect(() => {
  if (previousWorkspaceLoaderVisible.current === workspaceLoaderVisible) {
    return
  }

  console.log(
    `[${uploadFlightSessionId || "NOSESSION"}] Workspace Loader ${workspaceLoaderVisible ? "ON" : "OFF"}`,
    {
      reason: workspaceLoaderConditions,
      status,
      uploading: Boolean(uploading),
      uploadLogPresent: Boolean(uploadLog),
      activeView,
      projectReadyVisible: Boolean(projectReadyVisible),
      projectReadyDismissed: Boolean(projectReadyDismissed),
      showProjectReadyScreen: Boolean(showProjectReadyScreen)
    }
  )

  previousWorkspaceLoaderVisible.current = workspaceLoaderVisible
}, [
  workspaceLoaderVisible,
  uploading,
  generatingFlashcards,
  generatingQuiz,
  status,
  uploadLog,
  uploadFlightSessionId,
  activeView,
  projectReadyVisible,
  projectReadyDismissed,
  showProjectReadyScreen
])
return (
  <CategoryPriorityProvider priorityCategories={priorityCategories}>
  <div style={{ ...workspace, position: "relative" }}>
    {plannerGuidedSessionActive && (
      <div
        className={
          activeView === "quiz" && started
            ? "workspace-header workspace-mobile-hidden quiz-runtime-mobile-hidden"
            : "workspace-header"
        }
        style={{
          ...shellHeaderCell,
          marginTop: 20,
          justifyContent: "space-between",
          gap: 12,
          padding: "0 12px",
          borderBottom: "1px solid #1f2937",
          background: "#080a10",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <PlannerGuidedSessionHeader
          translate={translate}
          dailyPlan={plannerRuntime.dailyPlan}
          activity={plannerGuidedActivity}
          progress={plannerActivityProgress}
        />
      </div>
    )}

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
    {workspaceLoaderVisible ? (
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

    showProjectReadyScreen ? (
      <ProjectReadyScreen
        translate={translate}
        onUploadAnotherFile={onUploadAnotherFile}
        onBeginStudy={onBeginStudy}
      />
    ) :

    !projectId && !canRenderWithoutProject ? (
      <DashboardHome
        translate={translate}
        hasProject={false}
        projectName={projectName}
        topics={topics}
        documents={documents}
        previousQuizzes={previousQuizzes}
        resultsData={resultsData}
        onCreateProject={() => handleSidebarNavigation ? handleSidebarNavigation("create_project") : setActiveView("create_project")}
        onLoadProject={() => handleSidebarNavigation ? handleSidebarNavigation("load_project") : setActiveView("load_project")}
        onLaunch={onLearningHomeLaunch}
      />

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
    {activeView === "learning_home" && (
      <DashboardHome
        translate={translate}
        hasProject={true}
        projectName={projectName}
        studentFirstName={studentFirstName}
        topics={topics}
        documents={documents}
        previousQuizzes={previousQuizzes}
        resultsData={resultsData}
        onCreateProject={() => handleSidebarNavigation ? handleSidebarNavigation("create_project") : setActiveView("create_project")}
        onLoadProject={() => handleSidebarNavigation ? handleSidebarNavigation("load_project") : setActiveView("load_project")}
        onLaunch={onLearningHomeLaunch}
      />
    )}

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
	        <p className="topics-dashboard-mobile-subtitle topics-dashboard-desktop-help" style={{ color: "#9ca3af", marginBottom: "30px" }}>
	          {translate('stats.Use the buttons on the right of each category to start a targeted activity.')}
	        </p>
	        <p className="topics-dashboard-mobile-subtitle topics-dashboard-mobile-help" style={{ color: "#9ca3af", marginBottom: "30px", display: "none" }}>
	          {translate('stats.Use the buttons below each category to start a targeted activity.')}
	        </p>
	        <p className="topics-dashboard-mobile-subtitle topics-dashboard-desktop-help" style={{ color: "#9ca3af", marginTop: "-20px", marginBottom: "30px" }}>
	          {translate('stats.Click the star icon next to a category to mark it as a Study Priority. You can select up to three categories. DOUNO will give these categories more attention when building your personalized Study Plan.')}
	        </p>
	        <p className="topics-dashboard-mobile-subtitle topics-dashboard-mobile-help" style={{ color: "#9ca3af", marginTop: "-20px", marginBottom: "30px", display: "none" }}>
	          {translate('stats.Tap the star icon next to a category to mark it as a Study Priority. You can select up to three categories. DOUNO will give these categories more attention when building your personalized Study Plan.')}
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
	          priorityCategories={priorityCategories}
	          setPriorityCategories={setPriorityCategories}
	          onPriorityCategoriesSaved={onPriorityCategoriesSaved}
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

	            .topics-dashboard-desktop-help {
	              display: none !important;
	            }

	            .topics-dashboard-mobile-help {
	              display: block !important;
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
              {generatingFlashcards
                ? translate("stats.Generating flashcards...")
                : translate("stats.Loading flashcards...")}
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
                title={translate("stats.Flashcards completed")}
                message={translate("stats.Review the completed flashcards, then continue when you are ready.")}
                professorDebrief={
                  plannerActivityDebriefs?.[
                    String(plannerRuntime?.dailyPlan?.activities?.[plannerRuntime?.activityIndex]?.id || "")
                  ]
                }
                isFinalActivity={
                  ((plannerRuntime?.activityIndex ?? 0) + 1)
                  >= (plannerRuntime?.dailyPlan?.activities?.length ?? 0)
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
              quizPacingOverTarget={quizPacingOverTarget}
              answeredCount={answeredCount}
              calculateScore={calculateScore}
              loadQuizStats={loadQuizStats}
              projectId={projectId}
              quizId={quizId}
            />
            {plannerRuntime?.mode === "activity_review" && (
              <PlannerActivityReviewCheckpoint
                title={translate("stats.Quiz review")}
                message={translate("stats.Review your answers, explanations, sources, and question chat before continuing.")}
                professorDebrief={
                  plannerActivityDebriefs?.[
                    String(plannerRuntime?.dailyPlan?.activities?.[plannerRuntime?.activityIndex]?.id || "")
                  ]
                }
                isFinalActivity={
                  ((plannerRuntime?.activityIndex ?? 0) + 1)
                  >= (plannerRuntime?.dailyPlan?.activities?.length ?? 0)
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
          {translate('stats.Previous quizzes')}
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
              <span className="previous-quiz-trend-title-desktop">
                {translate('stats.Score trend')}
              </span>
              <span className="previous-quiz-trend-title-mobile">
                {translate('stats.Latest quiz score trend')}
              </span>
            </div>

            <div className="previous-quiz-trend-chart" style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
              {chartData.map((d:any, i:number) => (
                <div key={i} className="previous-quiz-trend-item" style={{ textAlign:"center" }}>
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
            <style jsx>{`
              @media (max-width: 900px) {
                .previous-quiz-trend-chart {
                  justify-content: center;
                  max-width: 100%;
                  overflow: hidden;
                }

                .previous-quiz-trend-item:nth-last-child(n+11) {
                  display: none;
                }

                .previous-quiz-trend-title-desktop {
                  display: none;
                }

                .previous-quiz-trend-title-mobile {
                  display: inline;
                }
              }

              @media (min-width: 901px) {
                .previous-quiz-trend-title-mobile {
                  display: none;
                }
              }
            `}</style>
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
                    {translate('stats.Previous quiz item', { number: index + 1 })}
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
                        {translate('stats.Attempts value', { count: stats.attempts })}
                      </span>

                      <span>·</span>

                      <span style={{
                        color: stats.best_score > 70 ? "#22c55e" :
                              stats.best_score > 40 ? "#f59e0b" :
                              "#ef4444",
                        fontWeight: 600
                      }}>
                        {translate('stats.Best score value', { score: stats.best_score })}
                      </span>

                      <span>·</span>

                      <span style={{
                        color: stats.last_score > 70 ? "#22c55e" :
                              stats.last_score > 40 ? "#f59e0b" :
                              "#ef4444",
                        fontWeight: 600
                      }}>
                        {translate('stats.Last score value', { score: stats.last_score })}
                      </span>

                      {stats.attempts > 1 && (
                        <>
                          <span>·</span>
                          <span style={{
                            color: stats.last_score >= stats.best_score ? "#22c55e" : "#ef4444",
                            fontWeight: 600
                          }}>
                            {stats.last_score >= stats.best_score ? translate('stats.Improving status') : translate('stats.Needs review status')}
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
	          resetPlannerRuntimeForNewStudyPlan={resetPlannerRuntimeForNewStudyPlan}
	          priorityCategories={priorityCategories}
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

  </CategoryPriorityProvider>
  )
}

function PlannerActivityReviewCheckpoint({
  title,
  message,
  professorDebrief,
  isFinalActivity = false,
  onContinue
}: {
  title: string
  message: string
  professorDebrief?: string
  isFinalActivity?: boolean
  onContinue: () => void | Promise<void>
}) {
  const { t: translate } = useTranslation()
  const [isContinuing, setIsContinuing] = useState(false)
  const buttonLabel = isFinalActivity
    ? translate("stats.Continue to debrief")
    : translate("stats.Continue to next exercise")
  const loadingLabel = isFinalActivity
    ? translate("stats.Preparing debrief...")
    : translate("stats.Opening next exercise...")

  async function handleContinue() {
    if (isContinuing) {
      return
    }

    setIsContinuing(true)

    try {
      await onContinue()
    } catch (error) {
      setIsContinuing(false)
      throw error
    }
  }

  return (
    <div style={plannerReviewCheckpoint}>
      <div>
        <div style={plannerReviewTitle}>🎉 {title}</div>
        <div style={plannerReviewMessage}>{message}</div>
        {professorDebrief && (
          <div style={plannerReviewProfessorDebrief}>
            <MarkdownContent text={professorDebrief} />
          </div>
        )}
      </div>
      <button
        onClick={handleContinue}
        disabled={isContinuing}
        aria-busy={isContinuing}
        style={{
          ...plannerReviewButton,
          ...(isContinuing ? plannerReviewButtonLoading : {})
        }}
      >
        {isContinuing ? loadingLabel : buttonLabel}
      </button>
    </div>
  )
}

function PlannerGuidedSessionHeader({
  translate,
  dailyPlan,
  activity,
  progress = []
}: any) {
  const moduleNumber = Number(dailyPlan?.sessionIndex ?? 0) + 1
  const moduleTotal = dailyPlan?.studyPlanModuleCount || moduleNumber
  const activityLabel = plannerGuidedActivityLabel(activity?.type, translate)

  return (
    <div style={plannerGuidedHeader}>
      <div style={plannerGuidedHeaderInfo}>
        <div style={plannerGuidedHeaderTitle}>
          {translate("stats.Professor Guided Session")}
        </div>
        <div style={plannerGuidedHeaderMeta}>
          <span>
            {translate("stats.Module {current} of {total}")
              .replace("{current}", String(moduleNumber))
              .replace("{total}", String(moduleTotal))}
          </span>
          <span style={plannerGuidedHeaderDot}>•</span>
          <span>{activityLabel}</span>
        </div>
      </div>
      <div style={plannerGuidedProgress}>
        {progress.map((item: any) => (
          <div
            key={`${item.label}-${item.value}`}
            style={{
              ...plannerGuidedProgressItem,
              ...(item.warning ? plannerGuidedProgressWarning : {})
            }}
          >
            <span
              style={{
                ...plannerGuidedProgressIcon,
                ...(item.warning ? plannerGuidedProgressIconWarning : {})
              }}
            >
              {item.icon}
            </span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function plannerGuidedActivityLabel(activityType: string, translate: (key: string) => string) {
  const normalizedType = String(activityType || "").toLowerCase()

  if (normalizedType === "quiz") {
    return translate("stats.Quiz")
  }

  if (normalizedType === "flashcards") {
    return translate("stats.Flashcards")
  }

  if (normalizedType === "memory_check" || normalizedType === "active_recall") {
    return translate("stats.Memory Check")
  }

  if (normalizedType === "study_session") {
    return translate("stats.Study Session")
  }

  return translate("stats.Study activity")
}

function ProjectReadyScreen({
  translate,
  onUploadAnotherFile,
  onBeginStudy
}: any) {
  return (
    <div style={projectReadyContainer}>
      <div style={projectReadyCheck}>✓</div>
      <h2 style={projectReadyTitle}>
        {translate("stats.Project upload completed")}
      </h2>
      <p style={projectReadySubtitle}>
        {translate("stats.Your study material has been successfully processed.")}
        <br />
        {translate("stats.What would you like to do next?")}
      </p>

      <div style={projectReadyCards}>
        <div style={projectReadyCard}>
          <h3 style={projectReadyCardTitle}>
            {translate("stats.Continue building your project")}
          </h3>
          <p style={projectReadyCardText}>
            {translate("stats.Upload another document and expand your study material.")}
          </p>
          <div style={projectReadyInfoText}>
            {translate("stats.Continue adding study material using the Tool Panel.")}
          </div>
        </div>

        <div style={projectReadyCard}>
          <h3 style={projectReadyCardTitle}>
            {translate("stats.I'm ready to study")}
          </h3>
          <p style={projectReadyCardText}>
            {translate("stats.Start your learning journey with the material you've prepared.")}
          </p>
          <button
            type="button"
            style={projectReadyButton}
            onClick={onBeginStudy}
          >
            {translate("stats.BEGIN STUDY")}
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardHome({
  translate,
  hasProject,
  projectName,
  studentFirstName,
  topics,
  documents,
  previousQuizzes,
  resultsData,
  onCreateProject,
  onLoadProject,
  onLaunch
}: any) {
  const topicCount = Array.isArray(topics) ? topics.length : 0
  const documentCount = Array.isArray(documents) ? documents.length : 0
  const quizCount = Array.isArray(previousQuizzes) ? previousQuizzes.length : 0
  const topicMastery = Array.isArray(resultsData?.topic_mastery)
    ? resultsData.topic_mastery
    : []
  const topicsDetail = Array.isArray(resultsData?.topics_detail)
    ? resultsData.topics_detail
    : []
  const completedTopics = topicsDetail.length > 0
    ? topicsDetail.filter((topic: any) => Number(topic?.accuracy || 0) >= 80).length
    : topicMastery.filter((topic: any) => {
        const correct = Number(topic?.correct || 0)
        const total = Number(topic?.total || 0)
        return total > 0 && correct >= total
      }).length
  const progressPercent = topicCount > 0
    ? Math.min(100, Math.round((completedTopics / topicCount) * 100))
    : 0
  const recentQuizzes = Array.isArray(previousQuizzes)
    ? previousQuizzes.slice(0, 4)
    : []
  const heroTitle = hasProject
    ? translate("stats.Dashboard hero title project")
    : translate("stats.Dashboard hero title no project")
  const heroText = hasProject
    ? translate("stats.Dashboard hero text project")
    : translate("stats.Dashboard hero text no project")
  const greeting = hasProject && studentFirstName
    ? `${translate("stats.Welcome back")}, ${studentFirstName}!`
    : translate("stats.Dashboard hero eyebrow")

  const tools = [
    {
      title: translate("stats.Ask question"),
      description: translate("stats.Chat with AI about your study material."),
      icon: "/icons/ask-side.svg",
      view: "ask_setup"
    },
    {
      title: translate("stats.Memory Check"),
      description: translate("stats.Answer open questions without hints."),
      icon: "/icons/memory-check-side.svg",
      view: "active_recall_setup"
    },
    {
      title: translate("stats.Study Session"),
      description: translate("stats.Combine multiple activities into one session."),
      icon: "/icons/study-session-side.svg",
      view: "study_session_setup"
    },
    {
      title: translate("stats.Quiz"),
      description: translate("stats.Test your knowledge with AI-generated questions."),
      icon: "/icons/quiz-side.svg",
      view: "quiz"
    },
    {
      title: translate("stats.Flashcards"),
      description: translate("stats.Review concepts using spaced repetition."),
      icon: "/icons/flashcards-side.svg",
      view: "generate_flashcards"
    }
  ]

  return (
    <div className="dashboard-v2" style={dashboardContainer}>
      <section className="dashboard-v2-hero" style={dashboardHero}>
        <div style={dashboardHeroOverlay} />
        <div className="dashboard-v2-hero-content" style={dashboardHeroContent}>
          <div className="dashboard-v2-hero-eyebrow" style={dashboardHeroEyebrow}>{greeting}</div>
          <h1 className="dashboard-v2-hero-title" style={dashboardHeroTitle}>{heroTitle}</h1>
          <p className="dashboard-v2-hero-text" style={dashboardHeroText}>{heroText}</p>
          <button
            type="button"
            className="dashboard-v2-hero-button"
            style={dashboardHeroButton}
            onClick={() => hasProject ? onLaunch("planner_view") : onCreateProject()}
          >
            {hasProject
              ? translate("stats.START GUIDED STUDY")
              : translate("stats.Create project")}
            <span>→</span>
          </button>
        </div>
      </section>

      {!hasProject && (
        <section className="dashboard-v2-project-grid" style={dashboardProjectGrid}>
          <button
            type="button"
            className="dashboard-v2-project-card"
            style={{
              ...dashboardProjectCard,
              backgroundImage: "url('/dashboard-v2/create-project-3d.png'), linear-gradient(145deg, rgba(10, 21, 42, 0.92), rgba(7, 10, 20, 0.95))"
            }}
            onClick={onCreateProject}
          >
            <div aria-hidden="true" />
            <div className="dashboard-v2-project-text-box" style={dashboardProjectTextBox}>
              <h2 className="dashboard-v2-project-title" style={dashboardProjectTitle}>
                {translate("stats.Create Project dashboard title")}
              </h2>
              <p className="dashboard-v2-project-text" style={dashboardProjectText}>
                {translate("stats.Create Project dashboard description")}
              </p>
              <span className="dashboard-v2-card-cta" style={dashboardCardCta}>
                {translate("stats.Create project")} →
              </span>
            </div>
          </button>

          <button
            type="button"
            className="dashboard-v2-project-card"
            style={{
              ...dashboardProjectCardPurple,
              backgroundImage: "url('/dashboard-v2/load-project-3d.png'), linear-gradient(145deg, rgba(10, 21, 42, 0.92), rgba(7, 10, 20, 0.95))"
            }}
            onClick={onLoadProject}
          >
            <div aria-hidden="true" />
            <div className="dashboard-v2-project-text-box" style={dashboardProjectTextBox}>
              <h2 className="dashboard-v2-project-title" style={dashboardProjectTitlePurple}>
                {translate("stats.Load Project dashboard title")}
              </h2>
              <p className="dashboard-v2-project-text" style={dashboardProjectText}>
                {translate("stats.Load Project dashboard description")}
              </p>
              <span className="dashboard-v2-card-cta" style={dashboardCardCtaPurple}>
                {translate("stats.Load project")} →
              </span>
            </div>
          </button>
        </section>
      )}

      <section className="dashboard-v2-tools-section">
        <div className="dashboard-v2-section-header" style={dashboardSectionHeader}>
          <h2 style={dashboardSectionTitle}>{translate("stats.Study Tools")}</h2>
          {!hasProject && (
            <span style={dashboardDisabledNote}>
              {translate("stats.Available after loading a project")}
            </span>
          )}
        </div>

        <div className="dashboard-v2-tools-grid" style={dashboardToolsGrid}>
          {tools.map((tool) => (
            <button
              key={tool.view}
              type="button"
              className="dashboard-v2-tool-card"
              disabled={!hasProject}
              onClick={() => hasProject && onLaunch(tool.view)}
              style={{
                ...dashboardToolCard,
                ...(!hasProject ? dashboardToolCardDisabled : {})
              }}
            >
              <img
                src={tool.icon}
                alt=""
                width={44}
                height={44}
                style={{
                  ...dashboardToolIcon,
                  ...(!hasProject ? dashboardToolIconDisabled : {})
                }}
              />
              <h3 style={{
                ...dashboardToolTitle,
                ...(!hasProject ? dashboardToolContentDisabled : {})
              }}>
                {tool.title}
              </h3>
              <p style={{
                ...dashboardToolText,
                ...(!hasProject ? dashboardToolContentDisabled : {})
              }}>
                {tool.description}
              </p>
              <span style={{
                ...dashboardToolCta,
                ...(!hasProject ? dashboardToolContentDisabled : {})
              }}>
                {hasProject ? translate("stats.Open") : translate("stats.Preview")} →
              </span>
            </button>
          ))}
        </div>
      </section>

      {hasProject && (
        <>
          <section className="dashboard-v2-stats-grid" style={dashboardStatsGrid}>
            <div className="dashboard-v2-progress-card" style={dashboardProgressCard}>
              <div>
                <h2 style={dashboardSectionTitle}>{translate("stats.Your progress")}</h2>
                <p style={dashboardMutedText}>
                  {projectName || translate("stats.Project")}
                </p>
              </div>
              <div className="dashboard-v2-progress-row" style={dashboardProgressRow}>
                <div
                  className="dashboard-v2-progress-ring"
                  style={{
                    ...dashboardProgressRing,
                    background: `conic-gradient(#14d9ff ${progressPercent * 3.6}deg, rgba(23, 120, 212, 0.22) 0deg)`
                  }}
                >
                  <div style={dashboardProgressInner}>{progressPercent}%</div>
                </div>
                <div style={dashboardStatList}>
                  <DashboardStatLine
                    icon="/icons/topic-dashboard-side.svg"
                    label={translate("stats.Completed topics")}
                    value={`${completedTopics} / ${topicCount}`}
                  />
                  <DashboardStatLine
                    icon="/icons/document.svg"
                    label={translate("stats.Uploaded documents")}
                    value={documentCount}
                  />
                  <DashboardStatLine
                    icon="/icons/quiz-history-side.svg"
                    label={translate("stats.Previous quizzes count")}
                    value={quizCount}
                  />
                </div>
              </div>
            </div>

            <div className="dashboard-v2-next-card" style={dashboardNextCard}>
              <h2 style={dashboardSectionTitle}>{translate("stats.Next activity")}</h2>
              <p style={dashboardNextText}>
                {translate("stats.Start from a targeted activity or let the Professor guide your next study session.")}
              </p>
              <button
                type="button"
                style={dashboardNextButton}
                onClick={() => onLaunch("planner_view")}
              >
                {translate("stats.START GUIDED STUDY")} →
              </button>
            </div>
          </section>

          <section className="dashboard-v2-recent-section" style={dashboardRecentSection}>
            <h2 style={dashboardSectionTitle}>{translate("stats.Recent activity")}</h2>
            {recentQuizzes.length > 0 ? (
              <div className="dashboard-v2-recent-grid" style={dashboardRecentGrid}>
                {recentQuizzes.map((quizItem: any, index: number) => (
                  <div key={quizItem?.id || index} className="dashboard-v2-recent-card" style={dashboardRecentCard}>
                    <img src="/icons/quiz-history-side.svg" alt="" width={26} height={26} />
                    <div>
                      <div style={dashboardRecentTitle}>
                        {quizItem?.title || quizItem?.topic || translate("stats.Quiz")}
                      </div>
                      <div style={dashboardMutedText}>
                        {translate("stats.Previous quizzes")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={dashboardMutedText}>{translate("stats.No recent activity yet")}</p>
            )}
          </section>
        </>
      )}
      <style jsx>{`
        @media (max-width: 1200px) {
          .dashboard-v2 {
            padding: 0 4px 24px !important;
            gap: 18px !important;
          }

          .dashboard-v2-hero {
            min-height: 240px !important;
            background-position: center right !important;
          }

          .dashboard-v2-hero-content {
            padding: 34px 36px !important;
            max-width: 520px !important;
          }

          .dashboard-v2-tools-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .dashboard-v2-recent-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 900px) {
          .dashboard-v2 {
            padding: 14px 14px 22px !important;
            gap: 16px !important;
          }

          .dashboard-v2-hero {
            min-height: 220px !important;
            background-position: 68% center !important;
          }

          .dashboard-v2-hero-content {
            padding: 28px 24px !important;
            max-width: 460px !important;
          }

          .dashboard-v2-hero-eyebrow {
            font-size: 12px !important;
            margin-bottom: 9px !important;
          }

          .dashboard-v2-hero-title {
            font-size: clamp(26px, 7vw, 36px) !important;
            margin-bottom: 12px !important;
          }

          .dashboard-v2-hero-text {
            font-size: 15px !important;
            line-height: 1.45 !important;
            margin-bottom: 20px !important;
          }

          .dashboard-v2-hero-button,
          .dashboard-v2-card-cta {
            min-height: 44px !important;
          }

          .dashboard-v2-project-grid,
          .dashboard-v2-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-v2-project-card {
            min-height: 190px !important;
            grid-template-columns: 30% 1fr !important;
            background-size: auto 62%, auto !important;
          }

          .dashboard-v2-project-text-box {
            padding: 24px 24px 24px 6px !important;
          }

          .dashboard-v2-project-title {
            font-size: 23px !important;
            margin-bottom: 12px !important;
          }

          .dashboard-v2-project-text {
            font-size: 16px !important;
            line-height: 1.45 !important;
            margin-bottom: 20px !important;
          }

          .dashboard-v2-tools-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .dashboard-v2-tool-card {
            min-height: 152px !important;
            padding: 16px !important;
          }

          .dashboard-v2-progress-row {
            align-items: flex-start !important;
          }

          .dashboard-v2-recent-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-v2-recent-card {
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .dashboard-v2 {
            padding: 12px 10px 20px !important;
          }

          .dashboard-v2-hero {
            min-height: 210px !important;
            background-position: 72% center !important;
          }

          .dashboard-v2-hero::before {
            content: "";
            position: absolute;
            inset: 0;
            background: rgba(5, 8, 18, 0.2);
            pointer-events: none;
            z-index: 1;
          }

          .dashboard-v2-hero-content {
            padding: 24px 18px !important;
            max-width: 100% !important;
          }

          .dashboard-v2-hero-title {
            font-size: clamp(24px, 8vw, 31px) !important;
          }

          .dashboard-v2-hero-text {
            font-size: 14px !important;
          }

          .dashboard-v2-project-card {
            min-height: 174px !important;
            grid-template-columns: 34% 1fr !important;
            background-size: auto 56%, auto !important;
          }

          .dashboard-v2-project-text-box {
            padding: 20px 18px 20px 4px !important;
          }

          .dashboard-v2-project-title {
            font-size: 20px !important;
          }

          .dashboard-v2-project-text {
            font-size: 14px !important;
            margin-bottom: 16px !important;
          }

          .dashboard-v2-card-cta {
            font-size: 13px !important;
            padding: 10px 14px !important;
          }

          .dashboard-v2-tools-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-v2-tool-card {
            min-height: auto !important;
          }

          .dashboard-v2-section-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 6px !important;
          }

          .dashboard-v2-progress-row {
            flex-direction: column !important;
            gap: 18px !important;
          }

          .dashboard-v2-progress-ring {
            width: 118px !important;
            height: 118px !important;
          }
        }
      `}</style>
    </div>
  )
}

function DashboardStatLine({ icon, label, value }: any) {
  return (
    <div style={dashboardStatLine}>
      <img src={icon} alt="" width={22} height={22} />
      <span style={dashboardStatLabel}>{label}</span>
      <span style={dashboardStatValue}>{value}</span>
    </div>
  )
}

function LearningHome({
  translate,
  studentFirstName,
  onLaunch
}: any) {
  const greeting = studentFirstName
    ? `${translate("stats.Welcome back")}, ${studentFirstName}! 👋`
    : `${translate("stats.Welcome back")}! 👋`

  const activities = [
    {
      title: translate("stats.Ask a Question"),
      description: translate("stats.Chat with AI about your study material."),
      icon: "/icons/ask-side.svg",
      view: "ask_setup"
    },
    {
      title: translate("stats.Memory Check"),
      description: translate("stats.Answer open questions without hints."),
      icon: "/icons/memory-check-side.svg",
      view: "active_recall_setup"
    },
    {
      title: translate("stats.Study Session"),
      description: translate("stats.Combine multiple activities into one session."),
      icon: "/icons/study-session-side.svg",
      view: "study_session_setup"
    },
    {
      title: translate("stats.Quiz"),
      description: translate("stats.Test your knowledge with AI-generated questions."),
      icon: "/icons/quiz-side.svg",
      view: "quiz"
    },
    {
      title: translate("stats.Flashcards"),
      description: translate("stats.Review concepts using spaced repetition."),
      icon: "/icons/flashcards-side.svg",
      view: "generate_flashcards"
    }
  ]

  return (
    <div style={learningHomeContainer}>
      <section style={learningIntroSection}>
        <h1 style={learningIntroTitle}>
          {translate("stats.WELCOME TO YOUR STUDY WORKSPACE")}
        </h1>
        <p style={learningGreetingText}>
          {greeting}
        </p>
        <p style={learningIntroText}>
          {translate("stats.Your project is now ready.")}
        </p>
        <p style={learningIntroText}>
          {translate("stats.Your study structure is now stable and your progress will be tracked across every activity.")}
        </p>
        <p style={learningIntroText}>
          {translate("stats.Choose how you'd like to study today.")}
        </p>
        <p style={learningIntroText}>
          {translate("stats.You can upload new files, but these will not affect the taxonomy already created.")}
        </p>
      </section>

      <section style={learningProfessorSection}>
        <h2 style={learningSectionTitle}>
          {translate("stats.Train with your Professor")}
        </h2>
        <p style={learningProfessorText}>
          {translate("stats.Not sure what to study next?")}
        </p>
        <p style={learningProfessorText}>
          {translate("stats.Let your Professor analyze your progress and build today's lesson for you.")}
        </p>
        <p style={learningProfessorStrong}>
          {translate("stats.The Professor chooses what needs your attention.")}
        </p>
        <button
          type="button"
          style={learningPrimaryButton}
          onClick={() => onLaunch("planner_view")}
        >
          {translate("stats.START GUIDED STUDY")}
        </button>
      </section>

      <section style={learningOwnSection}>
        <h2 style={learningSectionTitle}>
          {translate("stats.Train on your own")}
        </h2>
        <p style={learningIntroText}>
          {translate("stats.Choose exactly how you want to practice.")}
        </p>

        <div style={learningActivityGrid}>
          {activities.map(activity => (
            <div
              key={activity.view}
              style={learningActivityCard}
            >
              <img
                src={activity.icon}
                alt=""
                width={48}
                height={48}
                style={learningActivityIcon}
              />
              <h3 style={learningActivityTitle}>{activity.title}</h3>
              <p style={learningActivityText}>{activity.description}</p>
              <button
                type="button"
                style={learningLaunchButton}
                onClick={() => onLaunch(activity.view)}
              >
                {translate("stats.Launch")} →
              </button>
            </div>
          ))}
        </div>
      </section>
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

const dashboardContainer: React.CSSProperties = {
display: "flex",
flexDirection: "column",
gap: 20,
padding: "0 10px 26px",
boxSizing: "border-box"
}

const dashboardPanelBase: React.CSSProperties = {
background: "linear-gradient(145deg, rgba(10, 21, 42, 0.92), rgba(7, 10, 20, 0.95))",
border: "1px solid rgba(20, 217, 255, 0.18)",
borderRadius: 18,
boxShadow: "0 18px 50px rgba(0, 0, 0, 0.24)",
overflow: "hidden"
}

const dashboardHero: React.CSSProperties = {
...dashboardPanelBase,
position: "relative",
minHeight: 260,
backgroundImage: "url('/dashboard-v2/hero-background-progress.png')",
backgroundSize: "cover",
backgroundPosition: "center right",
display: "flex",
alignItems: "center"
}

const dashboardHeroOverlay: React.CSSProperties = {
position: "absolute",
inset: 0,
background: "linear-gradient(90deg, rgba(5, 8, 18, 0.95) 0%, rgba(5, 8, 18, 0.78) 32%, rgba(5, 8, 18, 0.2) 70%)"
}

const dashboardHeroContent: React.CSSProperties = {
position: "relative",
zIndex: 1,
padding: "38px 44px",
maxWidth: 560
}

const dashboardHeroEyebrow: React.CSSProperties = {
color: "#36f2ed",
fontSize: 14,
fontWeight: 800,
letterSpacing: 0.9,
textTransform: "uppercase",
marginBottom: 12
}

const dashboardHeroTitle: React.CSSProperties = {
color: "#f8fafc",
fontSize: "clamp(32px, 3vw, 48px)",
lineHeight: 1.12,
fontWeight: 900,
margin: "0 0 16px"
}

const dashboardHeroText: React.CSSProperties = {
color: "#d5d9e6",
fontSize: 17,
lineHeight: 1.6,
maxWidth: 520,
margin: "0 0 26px"
}

const dashboardHeroButton: React.CSSProperties = {
border: "1px solid rgba(54, 242, 237, 0.22)",
borderRadius: 10,
background: "linear-gradient(135deg, #1778d4, #7c1bdf)",
color: "white",
cursor: "pointer",
fontWeight: 800,
fontSize: 15,
padding: "13px 24px",
display: "inline-flex",
alignItems: "center",
gap: 10,
boxShadow: "0 12px 28px rgba(23, 120, 212, 0.24)"
}

const dashboardProjectGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
gap: 18
}

const dashboardProjectCard: React.CSSProperties = {
...dashboardPanelBase,
minHeight: 230,
borderColor: "rgba(20, 217, 255, 0.28)",
display: "grid",
gridTemplateColumns: "25% 1fr",
alignItems: "center",
textAlign: "left",
padding: 0,
cursor: "pointer",
color: "inherit",
backgroundRepeat: "no-repeat",
backgroundSize: "auto 68%, auto",
backgroundPosition: "left center, center"
}

const dashboardProjectCardPurple: React.CSSProperties = {
...dashboardProjectCard,
borderColor: "rgba(151, 71, 255, 0.32)"
}

const dashboardProjectTextBox: React.CSSProperties = {
padding: "28px 36px 28px 4px"
}

const dashboardProjectTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 27,
fontWeight: 900,
lineHeight: 1.15,
margin: "0 0 16px",
textTransform: "uppercase"
}

const dashboardProjectTitlePurple: React.CSSProperties = {
...dashboardProjectTitle,
color: "#b45cff"
}

const dashboardProjectText: React.CSSProperties = {
color: "#e5e7eb",
fontSize: 18,
lineHeight: 1.55,
margin: "0 0 28px"
}

const dashboardCardCta: React.CSSProperties = {
display: "inline-flex",
alignItems: "center",
borderRadius: 9,
background: "rgba(20, 217, 255, 0.16)",
color: "#a7fff8",
fontWeight: 800,
fontSize: 16,
padding: "12px 22px"
}

const dashboardCardCtaPurple: React.CSSProperties = {
...dashboardCardCta,
background: "rgba(124, 27, 223, 0.22)",
color: "#e3c6ff"
}

const dashboardSectionHeader: React.CSSProperties = {
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: 14,
margin: "4px 0 12px"
}

const dashboardSectionTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 16,
fontWeight: 900,
letterSpacing: 0.4,
textTransform: "uppercase",
margin: 0
}

const dashboardDisabledNote: React.CSSProperties = {
color: "#8b95a7",
fontSize: 13,
fontWeight: 700
}

const dashboardToolsGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
gap: 14
}

const dashboardToolCard: React.CSSProperties = {
...dashboardPanelBase,
borderRadius: 14,
padding: 18,
minHeight: 150,
textAlign: "left",
color: "inherit",
cursor: "pointer",
display: "flex",
flexDirection: "column",
alignItems: "flex-start",
gap: 8
}

const dashboardToolCardDisabled: React.CSSProperties = {
cursor: "not-allowed"
}

const dashboardToolIcon: React.CSSProperties = {
opacity: 1,
filter: "none"
}

const dashboardToolIconDisabled: React.CSSProperties = {
opacity: 1
}

const dashboardToolContentDisabled: React.CSSProperties = {
opacity: 0.5
}

const dashboardToolTitle: React.CSSProperties = {
color: "#f8fafc",
fontSize: 16,
fontWeight: 900,
margin: "4px 0 0"
}

const dashboardToolText: React.CSSProperties = {
color: "#b8c0d1",
fontSize: 13,
lineHeight: 1.45,
margin: 0,
flex: 1
}

const dashboardToolCta: React.CSSProperties = {
color: "#36f2ed",
fontSize: 14,
fontWeight: 800
}

const dashboardStatsGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "1.15fr 0.85fr",
gap: 18
}

const dashboardProgressCard: React.CSSProperties = {
...dashboardPanelBase,
padding: 24
}

const dashboardProgressRow: React.CSSProperties = {
display: "flex",
alignItems: "center",
gap: 26,
marginTop: 20
}

const dashboardProgressRing: React.CSSProperties = {
width: 132,
height: 132,
borderRadius: "50%",
display: "grid",
placeItems: "center",
flexShrink: 0
}

const dashboardProgressInner: React.CSSProperties = {
width: 92,
height: 92,
borderRadius: "50%",
background: "#080a10",
display: "grid",
placeItems: "center",
color: "#f8fafc",
fontSize: 30,
fontWeight: 900
}

const dashboardStatList: React.CSSProperties = {
display: "flex",
flexDirection: "column",
gap: 12,
flex: 1
}

const dashboardStatLine: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "26px 1fr auto",
alignItems: "center",
gap: 10,
color: "#e5e7eb"
}

const dashboardStatLabel: React.CSSProperties = {
color: "#cbd5e1",
fontSize: 14
}

const dashboardStatValue: React.CSSProperties = {
color: "#36f2ed",
fontWeight: 900
}

const dashboardNextCard: React.CSSProperties = {
...dashboardPanelBase,
padding: 24,
display: "flex",
flexDirection: "column",
justifyContent: "space-between",
gap: 18
}

const dashboardNextText: React.CSSProperties = {
color: "#e5e7eb",
fontSize: 16,
lineHeight: 1.55,
margin: 0
}

const dashboardNextButton: React.CSSProperties = {
border: "1px solid rgba(54, 242, 237, 0.2)",
borderRadius: 10,
background: "linear-gradient(135deg, #246bff, #8a18dd)",
color: "white",
cursor: "pointer",
fontWeight: 900,
padding: "13px 18px"
}

const dashboardRecentSection: React.CSSProperties = {
...dashboardPanelBase,
padding: 22
}

const dashboardRecentGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
gap: 12,
marginTop: 14
}

const dashboardRecentCard: React.CSSProperties = {
display: "flex",
alignItems: "center",
gap: 12,
background: "rgba(15, 23, 42, 0.62)",
border: "1px solid rgba(54, 242, 237, 0.08)",
borderRadius: 12,
padding: 14,
minWidth: 0
}

const dashboardRecentTitle: React.CSSProperties = {
color: "#f8fafc",
fontSize: 14,
fontWeight: 800,
whiteSpace: "nowrap",
overflow: "hidden",
textOverflow: "ellipsis",
maxWidth: 220
}

const dashboardMutedText: React.CSSProperties = {
color: "#9ca3af",
fontSize: 13,
lineHeight: 1.45,
margin: 0
}

const workspaceHeaderActions: React.CSSProperties = {
display: "flex",
alignItems: "center",
justifyContent: "flex-end",
gap: 12,
flexShrink: 0
}

const plannerGuidedHeader: React.CSSProperties = {
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: 18,
minWidth: 0,
flex: 1
}

const plannerGuidedHeaderInfo: React.CSSProperties = {
display: "flex",
flexDirection: "column",
gap: 3,
minWidth: 0
}

const plannerGuidedHeaderTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 15,
fontWeight: 900,
whiteSpace: "nowrap"
}

const plannerGuidedHeaderMeta: React.CSSProperties = {
color: "#dbeafe",
fontSize: 12,
lineHeight: 1.35,
display: "flex",
alignItems: "center",
gap: 8,
whiteSpace: "nowrap",
overflow: "hidden",
textOverflow: "ellipsis"
}

const plannerGuidedHeaderDot: React.CSSProperties = {
color: "#64748b"
}

const plannerGuidedProgress: React.CSSProperties = {
display: "flex",
alignItems: "center",
justifyContent: "flex-end",
gap: 12,
flexWrap: "wrap",
flexShrink: 0
}

const plannerGuidedProgressItem: React.CSSProperties = {
display: "inline-flex",
alignItems: "center",
gap: 6,
color: "#f8fafc",
fontSize: 13,
fontWeight: 800,
background: "rgba(15, 23, 42, 0.68)",
border: "1px solid rgba(148, 163, 184, 0.22)",
borderRadius: 999,
padding: "6px 10px",
whiteSpace: "nowrap"
}

const plannerGuidedProgressIcon: React.CSSProperties = {
color: "#36f2ed"
}

const plannerGuidedProgressIconWarning: React.CSSProperties = {
color: "#f87171"
}

const plannerGuidedProgressWarning: React.CSSProperties = {
color: "#fecaca",
borderColor: "rgba(248, 113, 113, 0.42)",
background: "rgba(127, 29, 29, 0.34)"
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

const plannerReviewButtonLoading = {
opacity: 0.72,
cursor: "wait"
}

const projectReadyContainer: React.CSSProperties = {
display: "flex",
flexDirection: "column",
alignItems: "center",
justifyContent: "center",
minHeight: "68vh",
textAlign: "center",
color: "white"
}

const projectReadyCheck: React.CSSProperties = {
width: 44,
height: 44,
borderRadius: "50%",
background: "#22c55e",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 24,
fontWeight: 900,
marginBottom: 18
}

const projectReadyTitle: React.CSSProperties = {
fontSize: 26,
fontWeight: 800,
margin: "0 0 6px"
}

const projectReadySubtitle: React.CSSProperties = {
color: "#cbd5e1",
fontSize: 15,
lineHeight: 1.45,
margin: "0 0 28px"
}

const projectReadyCards: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
gap: 18,
width: "min(680px, 100%)"
}

const projectReadyCard: React.CSSProperties = {
border: "1px solid #1f6d8b",
borderRadius: 10,
background: "rgba(15, 23, 42, 0.28)",
padding: 18,
minHeight: 170,
display: "flex",
flexDirection: "column",
justifyContent: "space-between",
boxSizing: "border-box"
}

const projectReadyCardTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 17,
fontWeight: 800,
margin: "0 0 10px"
}

const projectReadyCardText: React.CSSProperties = {
color: "#f8fafc",
fontSize: 15,
fontWeight: 700,
lineHeight: 1.35,
margin: "0 0 24px"
}

const projectReadyButton: React.CSSProperties = {
background: "#11132c",
border: "1px solid #27305f",
borderRadius: 7,
color: "white",
cursor: "pointer",
fontWeight: 800,
fontSize: 13,
padding: "10px 14px",
width: "100%"
}

const projectReadyInfoText: React.CSSProperties = {
borderTop: "1px solid rgba(54, 242, 237, 0.14)",
color: "#9ca3af",
fontSize: 13,
fontWeight: 600,
lineHeight: 1.45,
paddingTop: 12
}

const learningHomeContainer: React.CSSProperties = {
minHeight: "calc(100vh - 120px)",
display: "flex",
flexDirection: "column",
alignItems: "center",
justifyContent: "center",
gap: 54,
textAlign: "center",
color: "white",
padding: "48px 28px",
boxSizing: "border-box"
}

const learningIntroSection: React.CSSProperties = {
maxWidth: 920
}

const learningIntroTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 30,
fontWeight: 900,
letterSpacing: 0.6,
margin: "0 0 20px",
textTransform: "uppercase"
}

const learningGreetingText: React.CSSProperties = {
color: "#f8fafc",
fontSize: 22,
fontWeight: 700,
lineHeight: 1.35,
margin: "0 0 18px"
}

const learningIntroText: React.CSSProperties = {
color: "#e5e7eb",
fontSize: 18,
lineHeight: 1.55,
margin: "8px 0"
}

const learningProfessorSection: React.CSSProperties = {
maxWidth: 720
}

const learningSectionTitle: React.CSSProperties = {
color: "#1778d4",
fontSize: 22,
fontWeight: 800,
margin: "0 0 14px"
}

const learningProfessorText: React.CSSProperties = {
color: "#f8fafc",
fontSize: 18,
lineHeight: 1.5,
margin: "7px 0"
}

const learningProfessorStrong: React.CSSProperties = {
color: "#f8fafc",
fontSize: 18,
fontWeight: 900,
lineHeight: 1.5,
margin: "7px 0 24px"
}

const learningPrimaryButton: React.CSSProperties = {
background: "#11132c",
border: "1px solid #27305f",
borderRadius: 7,
color: "white",
cursor: "pointer",
fontWeight: 800,
fontSize: 13,
padding: "11px 18px",
minWidth: 220
}

const learningOwnSection: React.CSSProperties = {
width: "100%",
maxWidth: 1260
}

const learningActivityGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: 28,
marginTop: 28,
width: "100%"
}

const learningActivityCard: React.CSSProperties = {
display: "flex",
flexDirection: "column",
alignItems: "center",
gap: 10,
minHeight: 210
}

const learningActivityIcon: React.CSSProperties = {
objectFit: "contain",
marginBottom: 4
}

const learningActivityTitle: React.CSSProperties = {
color: "#36f2ed",
fontSize: 19,
fontWeight: 900,
margin: 0
}

const learningActivityText: React.CSSProperties = {
color: "#f8fafc",
fontSize: 14,
lineHeight: 1.25,
margin: "0 0 auto",
maxWidth: 190
}

const learningLaunchButton: React.CSSProperties = {
background: "#11132c",
border: "1px solid #27305f",
borderRadius: 7,
color: "white",
cursor: "pointer",
fontWeight: 700,
fontSize: 13,
padding: "9px 14px",
width: "100%"
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
