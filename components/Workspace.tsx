import AskView from "./views/AskView"
import FlashcardsView from "./views/FlashcardsView"
import QuizView from "./views/QuizView"
import ResultsView from "./views/ResultsView"
import SummaryViewNew from "./views/SummaryView"
import ActiveRecallView from "./views/ActiveRecallView"
import { useState, useEffect } from "react"
import StudySessionView from "./views/StudySessionView"
import { Heading2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import TopicsView from "./views/TopicsView"
import { useTranslation } from 'react-i18next';

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





}) {
console.log("🧠 ACTIVE VIEW:", activeView)
const quizList = Array.isArray(quiz) ? quiz : []

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

const { t: translate } = useTranslation();
const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
  let interval: any;
  // Controlla che queste variabili siano quelle che attivano il caricamento nel tuo codice
  if (uploading || generatingFlashcards || generatingQuiz) {
    interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 4); // Ruota da 0 a 3
    }, 3000);
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
return (
  
  <div style={{ ...workspace, position: "relative" }}>
    
    {/* --- INIZIO BLOCCO LOADER AGGIORNATO --- */}
    {uploading ||
    generatingFlashcards ||
    generatingQuiz ||
    status === "Loading project..." ||
    status === "Loading previous material..." ||
    status === "Project loaded successfully" ||
    status === "Processing topics..." ? (
      <div style={loaderContainer}>
        
        {/* 1. SPINNER O CHECK DI SUCCESSO */}
        {status === "Project loaded successfully" ? (
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
            status === "Processing topics..."
              ? "We're organizing your material into study topics"
            :status
          )}
        </div>

        {/* 3. SOTTOTITOLO DINAMICO TRADOTTO */}
        <div style={loaderSubtitle}>
          {mounted ? (
            uploading
              ? (
                  uploadLog?.includes("LARGE_FILE_WARNING")
                    ? "Large academic document detected. Processing may take longer than usual."
                    : translate('stats.OCR files may take longer to process')
                )
              : "☕ Good moment for a short coffee break — when you're back, your study workspace will be ready."
          ) : "..."}
        </div>

        
      </div>
    ) : /* --- FINE BLOCCO LOADER --- */

    !projectId ? (
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
      src="/logoSTX.png"
      alt="StutorX logo"
      style={{
        width:280,
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

) : documents?.length === 0 ? (

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
      <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "20px", fontWeight: "600" }}>
          📚 Centro di Controllo Argomenti
        </h2>
        <p style={{ color: "#9ca3af", marginBottom: "30px" }}>
          {translate('stats.Select a specific topic to start a targeted study session.')}
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
        selectedTopics={selectedTopics} 
        useGlobalKnowledge={useGlobalKnowledge}
        setUseGlobalKnowledge={setUseGlobalKnowledge}
      />
    )}

    {/* ACTIVE RECALL - CORRETTO */}
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
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", textAlign:"center" }}>
        <h3 style={{ color:"white", fontSize:22 }}>{translate('stats.Generate Flashcards')}</h3>
        <p style={{ color:"#9ca3af", maxWidth:600 }}>
          {translate('stats.Select topics and number of cards in the left panel, then press')}
          <b style={{color:"white"}}> {translate('stats.Generate')} </b>.
        </p>
      </div>
    )}

    {/* 2. VISTA FLASHCARDS (Caricamento e Visualizzazione) */}
    {activeView === "flashcards" && (
      <>
        {/* 1. Banner del Topic (Se selezionato) */}
        {selectedTopic && (
          <div style={{
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
          <FlashcardsView
            flashcards={flashcards}
            openCard={openCard}
            setOpenCard={setOpenCard}
          />
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
    {activeView === "study_session" && (
      projectId ? (
        <StudySessionView 
          projectId={projectId} 
          selectedTopics={selectedTopics}  // 🔥 FIX
          studyConfig={studyConfig}
// <--- Fondamentale per filtrare i materiali
        />
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
            src="/logo.png"
            alt="StudyForge logo"
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
              Score trend
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

      <div style={{
        padding: 30,
        color: "white"
      }}>

        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24
        }}>
          📅 Weekly Study Planner
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18
        }}>

          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
          ].map((day, i) => (

            <div
              key={i}
              style={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 12,
                padding: 18,
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >

              <div>

                <div style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginBottom: 12
                }}>
                  {day}
                </div>

                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 10
                }}>
                  Biochemistry
                </div>

                <div style={{
                  fontSize: 13,
                  color: "#cbd5e1",
                  marginBottom: 16
                }}>
                  ~ 45 min
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  color: "#e5e7eb"
                }}>

                  <div>• Flashcards</div>
                  <div>• Recall</div>
                  <div>• Quiz</div>

                </div>

              </div>

              <button
                style={{
                  marginTop: 20,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #22c55e",
                  background: "transparent",
                  color: "#22c55e",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Start Daily Session
              </button>

            </div>

          ))}

        </div>

      </div>

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