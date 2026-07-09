import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

import Sidebar from "../components/Sidebar";
import ToolPanel from "../components/ToolPanel";
import Workspace from "../components/Workspace";
import PlannerView from "@/components/views/PlannerView";
import { useTranslation } from "react-i18next";

import {
  extractTopicIds,
  extractTopicNames,
  normalizeTopic,
  resolveCategoryTopicObjects
} from "../utils/topics";
import { isCorrectQuizOption } from "../utils/quizAnswers";
import {
  generatePlannerActivityDebrief,
  generatePlannerModuleDebrief,
  generatePlannerStudyPlanDebrief
} from "../services/plannerApi";
import type {
  PlannerActivityDebriefs,
  PlannerCompletedSessionResults,
  PlannerDailyPlan,
  PlannerModuleDebriefs,
  PlannerSessionResults
} from "../components/views/planner/PlannerTypes";
import { dispatchPlannerActivity } from "../components/views/planner/plannerActivityDispatcher";

type LearningGenerationOverrides = {
  selectedTopics?: any[]
  selectedTopic?: any
  numQuestions?: number
  numCards?: number
  difficulty?: string
  questionStyle?: string
}

type PlannerRuntimeState = {
  mode: "dashboard" | "daily_briefing" | "external_activity" | "activity_review" | "summary"
  dailyPlan: PlannerDailyPlan | null
  activityIndex: number
  todaySessionCompleted: boolean
  sessionResults: PlannerSessionResults
  completedSessionResults: PlannerCompletedSessionResults
  activityDebriefs: PlannerActivityDebriefs
  moduleDebriefs: PlannerModuleDebriefs
  studyPlanDebrief: string
}

export default function Home() {
const { i18n } = useTranslation();
const pollingRef = useRef<any>(null)
const pollingRunRef = useRef(0)
const router = useRouter()



const [projectId,setProjectId]=useState("")
const [projectName,setProjectName]=useState("")
const [projects,setProjects]=useState<any[]>([])


useEffect(() => {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔐 AUTH EVENT:", event)

    if (!session) {
      console.log("❌ No session → redirect login")
      router.push("/login")
      return
    }

    console.log("✅ Session ready → loading projects")

    const token = session.access_token

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!res.ok) {
      console.log("❌ FETCH FAILED")
      setProjects([])
      return
    }

    const data = await res.json()
    const list = Array.isArray(data) ? data : data.projects || []

    console.log("📦 PROJECTS:", list)

    setProjects(list)
  })

  return () => subscription.unsubscribe()
}, [])

const [files,setFiles]=useState<FileList|null>(null)
const [documents,setDocuments]=useState<any[]>([])
const [topics,setTopics]=useState<any[]>([])
const [loadingTopics,setLoadingTopics]=useState(false)

const [quiz,setQuiz]=useState<any[]>([])
const [previousQuizzes,setPreviousQuizzes]=useState<any[]>([])
const [quizId,setQuizId]=useState("")

const [generatingQuiz,setGeneratingQuiz]=useState(false)

const [flashcards,setFlashcards]=useState<any[]>([])
const [studyFlashcards,setStudyFlashcards] = useState<any[]>([])
const [previousFlashcards,setPreviousFlashcards]=useState<any[]>([])
const [generatingFlashcards,setGeneratingFlashcards]=useState(false)

const [openCard,setOpenCard]=useState<number|null>(null)

const [askQuestion,setAskQuestion]=useState("")
const [askAnswer,setAskAnswer]=useState("")
const [chatMessages,setChatMessages]=useState<any[]>([])
const [asking,setAsking]=useState(false)
const [useGlobalKnowledge, setUseGlobalKnowledge] = useState(false)

const [answers,setAnswers]=useState<any>({})
const [score,setScore] = useState<number | null>(null)

const [status,setStatus]=useState("")
const [uploadStatus,setUploadStatus]=useState("")
const [uploading,setUploading]=useState(false)

const [numQuestions,setNumQuestions]=useState(10)
const [difficulty,setDifficulty]=useState("medium")
const [language,setLanguage]=useState("English")
  useEffect(() => {
    console.log("🌍 CURRENT LANGUAGE STATE:", language)
  }, [language])
const [timerMinutes,setTimerMinutes]=useState(0)

const [timeLeft,setTimeLeft]=useState(0)
const [started,setStarted]=useState(false)
const [finished,setFinished]=useState(false)

const [expanded,setExpanded]=useState<{[key:number]:boolean}>({})
const [activeView,setActiveView]=useState("project")

const [topicsOpen,setTopicsOpen]=useState(true)
const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
const [selectedTopics, setSelectedTopics] = useState<any[]>([])

const [availableFlashcards,setAvailableFlashcards]=useState(0)
const [studyCount,setStudyCount]=useState(10)

const [summaryStats,setSummaryStats]=useState<any>(null)


const [uploadLog, setUploadLog] = useState("")
const [loadingFlashcards, setLoadingFlashcards] = useState(false)
const [studyMode, setStudyMode] = useState<"generated" | "loaded" | null>(null)
const [isGenerating, setIsGenerating] = useState(false);
const [loaderStep, setLoaderStep] = useState(0);
const [loaderType, setLoaderType] = useState<"quiz" | "flashcards">("quiz");
const [resultsData, setResultsData] = useState(null);
const [toolMode, setToolMode] = useState("")
const [studyConfig, setStudyConfig] = useState({
  flashcards: 8,
  recall: 3,
  quiz: 5
})
const [questionStyle, setQuestionStyle] =
  useState("balanced")
const [plannerRuntime, setPlannerRuntime] =
  useState<PlannerRuntimeState>({
    mode: "dashboard",
    dailyPlan: null,
    activityIndex: 0,
    todaySessionCompleted: false,
    sessionResults: emptyPlannerSessionResults(),
    completedSessionResults: {},
    activityDebriefs: {},
    moduleDebriefs: {},
    studyPlanDebrief: ""
  })
const plannerReviewedFlashcardsRef = useRef<Set<string>>(new Set())
const plannerCompletedActivityIdsRef = useRef<Set<string>>(new Set())

const loaderMessages = {
  quiz: [
    "Analyzing learning materials...",
    "Identifying key concepts...",
    "Building high-quality questions...",
    "Creating answer options...",
    "Finalizing your quiz..."
  ],
  flashcards: [
    "Scanning study material...",
    "Extracting key concepts...",
    "Creating flashcards...",
    "Organizing your deck...",
    "Almost ready..."
  ]
}

useEffect(() => {

  console.log("🧠 GLOBAL selectedTopics:", selectedTopics)

}, [selectedTopics])

useEffect(() => {
    if (projectId) {
        loadQuizStats(projectId);
        loadResults(projectId);
    }
}, [projectId]);

useEffect(() => {
  console.log("INDEX uploadLog:", uploadLog)
}, [uploadLog])

useEffect(() => {
  if(activeView !== "project"){
    setStatus("")
  }
}, [activeView])

useEffect(()=>{
async function init(){
const { data } = await supabase.auth.getSession()
if(!data.session) return
await loadProjects()
}
init()
},[])

useEffect(() => {

  // 🔥 NON sovrascrivere le flashcards appena generate
  if (
    activeView === "flashcards" &&
    projectId &&
    studyMode !== "generated"
  ) {

    setStudyMode("loaded")

    loadFlashcards(projectId)

  }

}, [activeView, projectId, studyMode])

useEffect(() => {
  async function init() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    await loadProjects()
  }

  init()
}, [])

// Se l'utente seleziona un topic tramite checkbox, 
// impostiamo automaticamente l'ultimo selezionato come 'selectedTopic'
useEffect(() => {
  if (selectedTopics.length > 0) {
    // Prende l'ultimo topic spuntato e lo imposta come attivo per tutti
    setSelectedTopic(selectedTopics[selectedTopics.length - 1]);
  } else {
    setSelectedTopic(null);
  }
}, [selectedTopics]);

// Timer per il cambio messaggi del loader
useEffect(() => {
  let interval: NodeJS.Timeout;
  if (isGenerating) {
    setLoaderStep(0); 
    interval = setInterval(() => {
      setLoaderStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 5000);
  }
  return () => { if (interval) clearInterval(interval); };
}, [isGenerating]);

// Timer del Quiz (conto alla rovescia)
useEffect(() => {
  if (!started || timerMinutes === 0) return;

  if (timerMinutes > 0 && timeLeft === 0) {
    setTimeLeft(timerMinutes * 60);
  }

  const interval = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        submitQuiz();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [started, timerMinutes]);



function formatTime(){
const m=Math.floor(timeLeft/60)
const s=timeLeft%60
return `${m}:${s.toString().padStart(2,"0")}`
}

async function loadProjects(){

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token
if(!token) return

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects`,
{headers:{Authorization:`Bearer ${token}`}}
)

if(!res.ok) return

const data=await res.json()

setProjects(Array.isArray(data)?data:data.projects||[])

}

async function loadResults(projectId: string) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/results`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  if (!res.ok) return

  const dataRes = await res.json()
  console.log("🔥 FULL RESULTS RESPONSE:", dataRes)
  console.log("🔥 topic_mastery:", dataRes.topic_mastery)
  console.log("🔥 quiz_history:", dataRes.quiz_history)

  console.log("📊 RESULTS FROM API:", dataRes)

  setResultsData(dataRes)
  console.log("✅ RESULTS DATA SAVED:", dataRes)
}

async function createProject(){

if(!projectName.trim()) return

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body: JSON.stringify({
name: projectName
})
}
)

if(!res.ok) return

const data = await res.json()

setProjects([...projects,{
id:data.project_id,
name:data.name
}])

setProjectId(data.project_id)
setStatus("Project created")
//setProjectName("")

}

async function deleteProject(id:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
{
method:"DELETE",
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok){
setStatus("Error deleting project")
return
}

setProjects(projects.filter(p => p.id !== id))

if(projectId === id){
setProjectId("")
setProjectName("")
setDocuments([])
setTopics([])
setQuiz([])
setPreviousQuizzes([])
setPreviousFlashcards([])
setFlashcards([])
setSummaryStats(null)
setResultsData(null)
}

setStatus("Project deleted")
}

async function loadDocuments(projectId:string){

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token
if(!token) return

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents`,
{headers:{Authorization:`Bearer ${token}`}}
)

if(!res.ok) return

const data=await res.json()

setDocuments(data.documents||[])

}
async function uploadFiles(){
  console.log("UPLOAD CLICK");
  console.log("projectId:", projectId);
  console.log("files:", files);

  if(!projectId) return
  if(!files || files.length === 0) return

  setUploading(true)
  setUploadStatus("Uploading...")

  try{

  const docs = []

  for(const file of Array.from(files)){

  const base64 = await new Promise((resolve,reject)=>{

  const reader = new FileReader()

  reader.onload = () => {
  const result = reader.result.split(",")[1]
  resolve(result)
  }

  reader.onerror = reject

  reader.readAsDataURL(file)

  })

  docs.push({
  title:file.name,
  file_bytes:base64
  })

}

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/ingest_stream`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
        documents: docs
    })
  }
)

    const reader = res.body.getReader()

    const decoder = new TextDecoder();
    let fullText = "";

    // 1. Leggiamo lo streaming fino alla fine
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        console.log("STREAM FINITO");
        setStatus("Processing topics..."); 
        setUploading(false);
        break; 
      }

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      setUploadLog(fullText); 
    }

    // 2. Controllo finale: se la risposta NON era OK, fermati qui
    if (!res.ok) {
      setUploadStatus("Upload failed");
      setUploading(false);
      return;
    }

    // 3. Successo! Aggiorniamo la UI e facciamo partire i processi post-upload
    setUploading(false);
    setUploadStatus("Files uploaded successfully! Processing topics...");

    // Topic processing is the completion signal for upload ingestion.
    await pollTopicStatus(projectId);
    await loadDocuments(projectId);

    // Pulizia estetica del log dopo un po'
    setTimeout(() => {
      setUploadLog("");
    }, 2000);

  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    setUploadStatus("Upload error");
    setUploading(false);
  }
} // Chiusura finale della funzione uploadFiles

async function loadTopics(projectId:string){

  try {
    console.log("🧪 loadTopics RUNNING")

    setLoadingTopics(true)

    const { data:sessionData } = await supabase.auth.getSession()

    const token = sessionData.session?.access_token

    if(!token){

      setLoadingTopics(false)

      return
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics`,
      {
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      }
    )

    console.log("🟡 TOPICS RESPONSE STATUS:", res.status)

    if(!res.ok){
      console.error("❌ TOPICS FETCH FAILED")
      return
    }

    const data = await res.json()
    console.log("🧪 TOPICS RECEIVED:", data)
    console.log("🔥 RAW TOPICS FROM API:", data.topics)

    setTopics(data.topics || [])

    console.log(
      "✅ STATO TOPICS AGGIORNATO:",
      data.topics?.length
    )

  } catch(err){

    console.error("❌ LOAD TOPICS ERROR:", err)

  } finally {

    console.log("🔴 setLoadingTopics(false)")
    setLoadingTopics(false)

  }
}

async function pollTopicStatus(projectId:string): Promise<void>{
  console.log("🧨 pollTopicStatus CALLED")

  if (pollingRef.current) {

    console.log("🛑 CLEARING EXISTING POLL")

    clearTimeout(pollingRef.current)

    pollingRef.current = null
  }

  const pollRunId = pollingRunRef.current + 1
  pollingRunRef.current = pollRunId

  const { data:sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if(!token) return

  let attempts = 0
  const maxAttempts = 120

  let isPolling = false

  console.log("🚨 STARTING TOPIC POLLING")

  return new Promise((resolve) => {
  let resolved = false

  const resolvePolling = () => {
    if (resolved) return

    resolved = true
    resolve()
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  const checkTopicStatus = async () => {
    if (resolved || pollRunId !== pollingRunRef.current || isPolling) return
    isPolling = true

    attempts += 1
    console.log("🔢 POLLING ATTEMPT:", attempts)
    try {
    console.log("🧠 POLLING PROJECT ID:", projectId)
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topic_status?t=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )

    if(!res.ok){

      stopPolling()

      console.error("TOPIC STATUS FAILED")

      resolvePolling()
      return
    }

    const data = await res.json()

    console.log("🔥 FULL TOPIC RESPONSE:", data)
    console.log("🔥 STATUS TYPE:", typeof data.status)
    console.log("🔥 STATUS VALUE:", JSON.stringify(data.status))

    if(
      String(data.status)
        .trim()
        .toLowerCase() === "completed"
    ){

      stopPolling()
      pollingRunRef.current = pollRunId + 1

      console.log("🛑 POLLING STOPPED")

      console.log("🟢 TOPIC GENERATION COMPLETED")
      console.log("🧪 ENTERED COMPLETED BLOCK")

      try {

        console.log("🧪 STARTING loadTopics")

        setUploading(false)
        setUploadLog("")
        setUploadStatus("Topics ready!")

        await loadTopics(projectId)

        console.log("🧪 loadTopics FINISHED")
        console.log("✅ TOPICS LOADED")

        setStatus("Project upload completed")
        resolvePolling()

      } catch(err){

        console.error("❌ FINAL LOAD TOPICS FAILED:", err)
        setUploading(false)
        setUploadLog("")
        setUploadStatus("Topics ready, but loading topics failed")
        setStatus("")
        resolvePolling()

      }

      return
    }

    

    if(
      String(data.status)
        .trim()
        .toLowerCase() === "error"
    ){

      stopPolling()
      pollingRunRef.current = pollRunId + 1

      setActiveView("upload_error")
      resolvePolling()

      return
    }

    if(attempts >= maxAttempts){
      console.log("⏰ POLLING TIMEOUT REACHED")
      console.log("🔢 FINAL ATTEMPT:", attempts)
      stopPolling()

      setUploadStatus("Topic generation timeout")
      resolvePolling()
    }
    } catch(err){

      console.error("❌ POLLING LOOP ERROR:", err)

    } finally {
      isPolling = false
    }

    if (!resolved && pollRunId === pollingRunRef.current) {
      pollingRef.current = setTimeout(checkTopicStatus, 3000)
    }
  }

  pollingRef.current = setTimeout(checkTopicStatus, 0)
  })
}

async function loadPreviousQuizzes(projectId: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/quizzes`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  if (!res.ok) {
    console.error("❌ Errore loadPreviousQuizzes:", res.status)
    setPreviousQuizzes([])
    return
  }

  const data = await res.json()
  console.log("QUIZZES FROM API:", data)

  const quizzes = data.quizzes || data.data || []

  if (!Array.isArray(quizzes)) {
    console.warn("⚠️ Formato quiz inatteso:", data)
    setPreviousQuizzes([])
    return
  }

  setPreviousQuizzes(quizzes)
  console.log("✅ previousQuizzes caricati:", quizzes.length)
}

async function loadFlashcards(projectId:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

try{

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok){
console.error("Failed loading flashcards")
return
}

const data = await res.json()
const loadedCards = data.flashcards || [];

// --- LE RIGHE CHE RISOLVONO TUTTO ---
setFlashcards(loadedCards); // <--- AGGIUNGI QUESTA: Popola la vista Workspace
setPreviousFlashcards(loadedCards); 
// ------------------------------------



setAvailableFlashcards((data.flashcards || []).length)
setStudyMode("loaded")
}catch(e){

console.error("FLASHCARDS LOAD ERROR:",e)

}

}

async function loadQuizStats(id: string) {
    if (!id) return;
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        // 1. Chiamata per le statistiche dei muscoli
        const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const statsData = await resStats.json();

        // 2. Chiamata per la lista reale dei quiz
        const resHistory = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/quizzes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const historyData = await resHistory.json();
        
        // --- TRASFORMAZIONE E TRADUZIONE ---
        // Prima prendiamo i dati grezzi
        const tempHistory = Array.isArray(historyData) ? historyData : (historyData.quizzes || []);
        

        // Poi mappiamo i campi così la tabella vede 'date' e 'score'
        const realHistory = tempHistory.map((q: any) => {
            // Logghiamo un quiz per essere sicuri dei nomi (controlla la console!)
            console.log("Dati quiz singolo:", q);

            return {
                ...q,
                // Forza la data: se è una stringa strana, cerchiamo di pulirla
                date: q.date || q.created_at || q.timestamp, 
                
                // Forza lo score: cerchiamo TUTTI i nomi possibili che Python di solito usa
                score: q.score !== undefined ? q.score : 
                       q.percentage !== undefined ? q.percentage : 
                       q.result !== undefined ? q.result :
                       q.correct_answers_pct !== undefined ? q.correct_answers_pct : 0
            };
        });

        // Trasformiamo i dati dei muscoli
        console.log("🔥 STATS DATA RAW:", statsData);
        const topicsArray = Object.entries(statsData)
          .filter(([_, stats]: [string, any]) =>
            stats &&
            typeof stats === "object" &&
            "total" in stats
          )
          .map(([name, stats]: [string, any]) => ({
            topic: name,
            score:
              stats.total > 0
                ? Math.round((stats.correct / stats.total) * 100)
                : 0,
            correct: stats.correct || 0,
            total: stats.total || 0
          }));

        // 4. Prepariamo l'oggetto finale
        console.warn("⚠️ Legacy local analytics builder disabled. Use /results instead.");

        await loadResults(projectId);

    } catch (err) {
        console.error("❌ Errore:", err);
    }
}

async function loadQuizStatsByQuiz(projectId: string) {
  if (!projectId) return;

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    console.error("❌ Errore Supabase:", error.message);
    return;
  }

  if (!data) return;

  const map: any = {};

  data.forEach(row => {
    const qid = row.quiz_id;

    if (!map[qid]) {
      map[qid] = {
        attempts: 0,
        best_score: 0,
        last_score: 0
      };
    }

    map[qid].attempts += 1;

    const scorePercent = row.total_questions > 0
      ? Math.round((row.score / row.total_questions) * 100)
      : 0;

    if (scorePercent > map[qid].best_score) {
      map[qid].best_score = scorePercent;
    }

    // latest attempt (semplice: sovrascrive)
    map[qid].last_score = scorePercent;
  });

  console.log("🔥 QUIZ STATS MAP:", map);

  return map;
}

// Questo codice esegue il caricamento ogni volta che il progetto attivo cambia o la pagina viene ricaricata


async function loadStudyFlashcards() {

  console.log("📚 LOAD STUDY FLASHCARDS")

  if (!previousFlashcards || previousFlashcards.length === 0) {
    console.warn("No previous flashcards")
    return
  }

  let filtered = previousFlashcards

  // FILTER BY TOPICS
  if (selectedTopics && selectedTopics.length > 0) {

    const selectedTopicIds = extractTopicIds(selectedTopics)
    const selectedTopicNames = extractTopicNames(selectedTopics)
    const normalizedTopics = selectedTopicNames.map(topic =>
      normalizeTopic(topic)
    )

    console.log("PAYLOAD TOPIC_IDS COUNT:", selectedTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", selectedTopicNames.length)

    filtered = previousFlashcards.filter(card =>
      normalizedTopics.includes(
        normalizeTopic(card.topic)
      )
    )

  }

  const cards = filtered.slice(0, studyCount)

  console.log("✅ LOADED CARDS:", cards.length)

  // IMPORTANTISSIMO
  setStudyMode("loaded")

  // SOLO le card selezionate
  setFlashcards(cards)

  // VIEW corretta
  setActiveView("flashcards")

  // APRI prima card
  setOpenCard(0)
}


async function loadQuiz(id: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    console.error("❌ Token mancante in loadQuiz")
    return
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/quizzes/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!res.ok) {
    console.error("❌ Errore caricamento quiz:", res.status)
    return
  }

  const data = await res.json()
  console.log("✅ QUIZ LOADED:", data)

  setQuiz(data.questions || [])
  if (data.quiz_id) {
    setQuizId(data.quiz_id)
  }
  setAnswers({})
  setFinished(false)
  setStarted(true)
  setActiveView("quiz")
}

async function selectProject(id: string) {
  // Se il progetto cliccato è DIVERSO da quello attuale, allora resettiamo il topic
  if (id !== projectId) {
    setSelectedTopic(null);
    setSelectedTopics([]); // Puliamo anche la lista dei quiz per sicurezza
  }

  const project = projects.find(p => p.id === id);
  setProjectName(project?.name || "");
  setStatus("Loading project...");
  setProjectId(id);
  
  // Rimosso il setSelectedTopic(null) che era qui sotto fisso
  setDocuments([]);
    setTopics([]);
  setQuiz([])
  setAnswers({})
  setPreviousQuizzes([])
  setPreviousFlashcards([])

  try {
    await loadDocuments(id);
    await loadTopics(id);

    setStatus("Loading previous material...");

    await loadPreviousQuizzes(id);

    console.log("✅ Progetto selezionato:", id)
    console.log("✅ Topics caricati")
    console.log("✅ Quiz storici richiesti")
    
    // 1. COMMENTA QUESTA RIGA: 
    // await loadSummary(id); 
    
    // 2. ASSICURATI CHE CI SIA QUESTA:
    await loadQuizStats(id); 

    console.log("✅ Quiz stats richieste per project:", id)

    await loadFlashcards(id);
    setStatus("Project loaded successfully");

  } catch(e) {
    console.error("PROJECT LOAD ERROR:", e);
    setStatus("Error loading project");
  }
}

async function generateQuiz(overrides: LearningGenerationOverrides = {}) {

    console.log("🚨 GENERATE QUIZ CLICKED");
    console.log("GENERATE QUIZ FUNCTION RUNNING")
    if (!projectId) return

    setIsGenerating(true)
    setLoaderType("quiz")
    setGeneratingQuiz(true)

    setAnswers({})
    setExpanded({})
    setFinished(false)
    setStarted(false)
    setQuiz([])

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const user = sessionData.session?.user

    if (!token || !user) {
      setIsGenerating(false)
      setGeneratingQuiz(false)
      return
    }
    const effectiveSelectedTopics =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopics")
        ? overrides.selectedTopics || []
        : selectedTopics
    const effectiveSelectedTopic =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopic")
        ? overrides.selectedTopic
        : selectedTopic
    const effectiveNumQuestions =
      overrides.numQuestions ?? numQuestions
    const effectiveDifficulty =
      overrides.difficulty ?? difficulty
    const effectiveQuestionStyle =
      overrides.questionStyle ?? questionStyle

    console.log("🧠 SELECTED TOPICS RAW:", effectiveSelectedTopics)

    if (effectiveSelectedTopics?.length > 0) {
      console.log("🧠 FIRST TOPIC:", effectiveSelectedTopics[0])
      console.log("🧠 TYPE:", typeof effectiveSelectedTopics[0])
    }
    try {

      console.log("🌍 LANGUAGE SENT:", language)
      console.log("🌍 I18N LANGUAGE:", i18n.language)

      console.log(
        "🌍 LANGUAGE SENT:",
        i18n.language.startsWith("it")
          ? "Italian"
          : "English"
      )
      const payloadTopicIds =
        effectiveSelectedTopics && effectiveSelectedTopics.length > 0
          ? extractTopicIds(effectiveSelectedTopics)
          : effectiveSelectedTopic?.id
            ? [String(effectiveSelectedTopic.id)]
            : []
      const payloadTopicNames =
        effectiveSelectedTopics && effectiveSelectedTopics.length > 0
          ? extractTopicNames(effectiveSelectedTopics)
          : effectiveSelectedTopic?.topic
            ? [effectiveSelectedTopic.topic]
            : []

      console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
      console.log("PAYLOAD TOPICS COUNT:", payloadTopicNames.length)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            num_questions: effectiveNumQuestions,

            difficulty: effectiveDifficulty,
            
            language:
              i18n.language.startsWith("it")
                ? "Italian"
                : "English",

            question_style: effectiveQuestionStyle,

            topic_ids: payloadTopicIds,
            topics: payloadTopicNames,
          })
        }
      )

      if (!res.ok) throw new Error("Fetch failed")

      const data = await res.json()
      console.log("🔥 QUIZ RESPONSE:", data)
      console.log(
        JSON.stringify(data, null, 2)
      )

      const quizData = data.questions || data.quiz || []

      const normalizedQuizData = quizData.map((q:any) => ({
        ...q,
        topic:
          typeof q.topic === "string"
            ? q.topic
            : q.topic?.topic || "General"
      }))

      if (data.quiz_id) {
        setQuizId(data.quiz_id)
        console.log("✅ quizId salvato:", data.quiz_id)
      } else {
        console.warn("⚠️ Il backend non ha restituito quiz_id", data)
        setQuizId("")
      }

      if (quizData.length === 0) {
        console.warn("⚠️ Nessuna domanda ricevuta dal backend", data)
        setIsGenerating(false)
        setGeneratingQuiz(false)
        return
      }
      setActiveView("quiz") // Spostato qui per sicurezza
      setQuiz(normalizedQuizData)
      setTimeLeft(timerMinutes * 60)
      setStarted(true)
      setFinished(false)

      // ... resto del codice per il salvataggio su Supabase ...

    } catch (err) {
      console.error("QUIZ ERROR:", err)
    } finally {
      setIsGenerating(false)
      setGeneratingQuiz(false)
    }
}

  // --- ORA GENERATE FLASHCARDS È UNA FUNZIONE INDIPENDENTE ---
  async function generateFlashcards(overrides: LearningGenerationOverrides = {}) {
    console.log("GENERATE FLASHCARDS FUNCTION RUNNING");
    if (!projectId) return;

    // Inizializzazione stati di caricamento
    setIsGenerating(true);       
    setLoaderType("flashcards");
    setGeneratingFlashcards(true);
    setLoadingFlashcards(true);

    // Reset dati precedenti
    setFlashcards([]); 
    setOpenCard(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      console.error("❌ TOKEN MISSING");
      setGeneratingFlashcards(false);
      setLoadingFlashcards(false);
      setIsGenerating(false);
      return;
    }

    // LOGICA DI SELEZIONE TOPIC: 
    // Se c'è un topic selezionato nella dashboard (filtro attivo), usa solo quello.
    // Altrimenti usa la lista di topic selezionati manualmente.
    const effectiveSelectedTopics =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopics")
        ? overrides.selectedTopics || []
        : selectedTopics
    const effectiveSelectedTopic =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopic")
        ? overrides.selectedTopic
        : selectedTopic
    const effectiveNumCards =
      overrides.numCards ?? overrides.numQuestions ?? numQuestions

    const finalTopics =
      effectiveSelectedTopics && effectiveSelectedTopics.length > 0
        ? extractTopicNames(effectiveSelectedTopics)
        : (
            typeof effectiveSelectedTopic === "string"
              ? [effectiveSelectedTopic.trim()]
              : effectiveSelectedTopic?.topic
                ? [effectiveSelectedTopic.topic.trim()]
                : []
          );
    const payloadTopicIds =
      effectiveSelectedTopics && effectiveSelectedTopics.length > 0
        ? extractTopicIds(effectiveSelectedTopics)
        : effectiveSelectedTopic?.id
          ? [String(effectiveSelectedTopic.id)]
          : []

    console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", finalTopics.length)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_flashcards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({

            topic_ids: payloadTopicIds,

            topics: finalTopics,

            num_cards: effectiveNumCards || 10

          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Flashcards generation failed");
      }

      const data = await res.json();
      
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setStudyMode("generated");   
        setOpenCard(0);              // Apre subito la prima carta
        setActiveView("flashcards"); // Sposta la vista sulle flashcards

        await loadResults(projectId);

      } else {
        alert("L'IA non ha generato flashcards. Prova a selezionare altri argomenti o verifica che ci sia testo a sufficienza.");
      }
    } catch (e) {
      console.error("FLASHCARDS ERROR:", e);
      alert(`Errore: ${e.message}`);
    } finally {
      // Chiudiamo tutti i loader
      setLoadingFlashcards(false);
      setGeneratingFlashcards(false);
      setIsGenerating(false);
    }
}

  function openPlannerDailySession(dailyPlan: PlannerDailyPlan) {
    plannerReviewedFlashcardsRef.current = new Set()
    plannerCompletedActivityIdsRef.current = new Set()
    setPlannerRuntime(prev => ({
      ...prev,
      mode: "daily_briefing",
      dailyPlan,
      activityIndex: 0,
      todaySessionCompleted: false,
      sessionResults: emptyPlannerSessionResults()
    }))
    setActiveView("planner_view")
  }

  async function launchPlannerActivity(
    dailyPlan: PlannerDailyPlan,
    activityIndex: number
  ) {
    const activity = dailyPlan.activities[activityIndex]

    if (!activity) {
      return
    }

    setPlannerRuntime(prev => ({
      ...prev,
      mode: "external_activity",
      dailyPlan,
      activityIndex,
      sessionResults: {
        ...prev.sessionResults,
        startedAtMs: prev.sessionResults.startedAtMs || Date.now()
      }
    }))

    await dispatchPlannerActivity({
      activity,
      generateFlashcards,
      generateQuiz,
      onFlashcardsStart: () => {
        plannerReviewedFlashcardsRef.current = new Set()
      }
    })
  }

  async function requestPlannerActivityDebrief(
    dailyPlan: PlannerDailyPlan,
    activityIndex: number,
    activityResult: Record<string, unknown>
  ) {
    const activity = dailyPlan.activities[activityIndex]

    if (!projectId || !activity) {
      return ""
    }

    try {
      const debrief = await generatePlannerActivityDebrief(
        projectId,
        dailyPlan.sessionIndex + 1,
        activityResult,
        plannerStudyLanguage(i18n.language)
      )

      if (debrief) {
        setPlannerRuntime(prev => ({
          ...prev,
          activityDebriefs: {
            ...prev.activityDebriefs,
            [String(activity.id)]: debrief
          }
        }))
      }

      return debrief
    } catch (error) {
      console.error("PLANNER ACTIVITY DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function requestPlannerModuleDebrief(
    dailyPlan: PlannerDailyPlan,
    moduleResults: PlannerSessionResults
  ) {
    if (!projectId) {
      return ""
    }

    try {
      const debrief = await generatePlannerModuleDebrief(
        projectId,
        dailyPlan.sessionIndex + 1,
        {
          activity_results: moduleResults.activityResults || [],
          flashcards_reviewed: moduleResults.flashcardsReviewed,
          quizzes_completed: moduleResults.quizzesCompleted,
          quiz_questions: moduleResults.quizQuestions,
          quiz_correct: moduleResults.quizCorrect,
          accuracy: moduleResults.quizQuestions > 0
            ? moduleResults.quizCorrect / moduleResults.quizQuestions
            : null
        },
        plannerStudyLanguage(i18n.language)
      )

      return debrief
    } catch (error) {
      console.error("PLANNER MODULE DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function requestPlannerStudyPlanDebrief(
    completedSessionResults: PlannerCompletedSessionResults
  ) {
    if (!projectId) {
      return ""
    }

    try {
      const moduleResults = Object.entries(completedSessionResults)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, result]) => ({
          activity_results: result.activityResults || [],
          flashcards_reviewed: result.flashcardsReviewed,
          quizzes_completed: result.quizzesCompleted,
          quiz_questions: result.quizQuestions,
          quiz_correct: result.quizCorrect,
          accuracy: result.quizQuestions > 0
            ? result.quizCorrect / result.quizQuestions
            : null
        }))

      return await generatePlannerStudyPlanDebrief(
        projectId,
        { module_results: moduleResults },
        plannerStudyLanguage(i18n.language)
      )
    } catch (error) {
      console.error("PLANNER STUDY PLAN DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function completePlannerActivity() {
    const dailyPlan = plannerRuntime.dailyPlan

    if (!dailyPlan) {
      return
    }

    const nextActivityIndex = plannerRuntime.activityIndex + 1

    if (nextActivityIndex < dailyPlan.activities.length) {
      await launchPlannerActivity(dailyPlan, nextActivityIndex)
      return
    }

    const completedAtMs = Date.now()
    const completedResults = {
      ...plannerRuntime.sessionResults,
      completedAtMs
    }
    const completedSessionIndex = dailyPlan.sessionIndex
    const moduleDebrief = await requestPlannerModuleDebrief(
      dailyPlan,
      completedResults
    )
    const completedSessionResults = {
      ...plannerRuntime.completedSessionResults,
      [completedSessionIndex]: completedResults
    }
    const allModulesCompleted =
      Boolean(dailyPlan.studyPlanModuleCount)
      && Object.keys(completedSessionResults).length >= (dailyPlan.studyPlanModuleCount || 0)
    const studyPlanDebrief = allModulesCompleted
      ? await requestPlannerStudyPlanDebrief(completedSessionResults)
      : ""

    setPlannerRuntime(prev => ({
      ...prev,
      mode: "summary",
      todaySessionCompleted: true,
      sessionResults: completedResults,
      completedSessionResults,
      moduleDebriefs: moduleDebrief
        ? {
            ...prev.moduleDebriefs,
            [completedSessionIndex]: moduleDebrief
          }
        : prev.moduleDebriefs,
      studyPlanDebrief: studyPlanDebrief || prev.studyPlanDebrief
    }))
    setActiveView("planner_view")
  }

  async function handlePlannerFlashcardReview(
    flashcardId: string | number
  ) {
    const activity = plannerRuntime.dailyPlan
      ?.activities[plannerRuntime.activityIndex]

    if (
      plannerRuntime.mode !== "external_activity"
      || activity?.type !== "flashcards"
      || !flashcardId
    ) {
      return
    }

    plannerReviewedFlashcardsRef.current.add(String(flashcardId))

    if (
      plannerReviewedFlashcardsRef.current.size >= flashcards.length
      && flashcards.length > 0
    ) {
      const activityId = String(activity.id)
      if (!plannerCompletedActivityIdsRef.current.has(activityId)) {
        if (!plannerRuntime.dailyPlan) {
          return
        }

        plannerCompletedActivityIdsRef.current.add(activityId)
        const reviewedCount = plannerReviewedFlashcardsRef.current.size
        const activityResult = {
          activity_id: activity.id,
          activity_type: "flashcards",
          completed: true,
          cards: reviewedCount,
          num_cards: reviewedCount
        }
        await requestPlannerActivityDebrief(
          plannerRuntime.dailyPlan,
          plannerRuntime.activityIndex,
          activityResult
        )
        setPlannerRuntime(prev => ({
          ...prev,
          mode: "activity_review",
          sessionResults: {
            ...prev.sessionResults,
            flashcardsReviewed:
              prev.sessionResults.flashcardsReviewed
              + reviewedCount,
            activityResults: [
              ...(prev.sessionResults.activityResults || []),
              activityResult
            ]
          }
        }))
      }
    }
  }

  function returnToPlannerDashboard() {
    setPlannerRuntime(prev => ({
      ...prev,
      mode: "dashboard"
    }))
    setActiveView("planner_view")
  }

  function emptyPlannerSessionResults(): PlannerSessionResults {
    return {
      flashcardsReviewed: 0,
      quizzesCompleted: 0,
      quizQuestions: 0,
      quizCorrect: 0,
      activityResults: [],
      startedAtMs: null,
      completedAtMs: null
    }
  }

  async function askDocuments() {
    if (!projectId) return
    if (!askQuestion.trim()) return
    setAsking(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const payloadTopicIds = extractTopicIds(selectedTopics || [])
      const payloadTopicNames = extractTopicNames(selectedTopics || [])

      console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
      console.log("PAYLOAD TOPICS COUNT:", payloadTopicNames.length)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          question: askQuestion,
          topics: payloadTopicNames,
          history: chatMessages.slice(-6)
        })
      })

      if (!res.ok) return
      const data = await res.json()
      setChatMessages([
        ...chatMessages,
        { role: "user", content: askQuestion },
        { role: "assistant", content: data.answer }
      ])
      setAskQuestion("")
    } catch (e) {
      console.error("ASK ERROR:", e)
    } finally {
      setAsking(false)
    }
  }

  function selectAnswer(i: number, opt: string) {
    if (finished) return
    setAnswers({ ...answers, [i]: opt })
  }

  function calculateScore() {
    let s = 0
    quiz.forEach((q, i) => {
      const userAnswer = answers[i]
      q.options.forEach((opt: string, j: number) => {
        if (isCorrectQuizOption(q, j) && userAnswer === opt) s++
      })
    })
    return s
  }

  async function submitQuiz() {
    if (!quiz || !Array.isArray(quiz)) {
      console.error("❌ quiz non valido:", quiz)
      return
    }

    if (!answers || typeof answers !== "object") {
      console.error("❌ answers non valide:", answers)
      return
    }
    
    try {
        // 1. CALCOLO UNA VOLTA SOLA (answersArray e attemptsArray)
        
        const answersArray = quiz.map((q, index) => {
          
          const userAnswer = answers[index]

          let isCorrect = false
          
          console.log("🧩 OPTIONS:", q.options);

          ;(Array.isArray(q.options) ? q.options : []).forEach((opt: string, j: number) => {
            if (isCorrectQuizOption(q, j) && userAnswer === opt) {
              isCorrect = true
            }
          })

          const normalizedTopic =
            selectedTopic?.topic
              ? normalizeTopic(selectedTopic.topic)
              : normalizeTopic(q.topic || q.title)

          console.log("🔥 NORMALIZED TOPIC:", normalizedTopic)
          console.log("🔥 RAW q.topic:", q.topic)
          console.log("🔥 RAW q.title:", q.title)

          return {
            question_id: q.id,
            is_correct: isCorrect,
            topic: normalizedTopic
          }
        })

        // 🧠 genera un quiz_id consistente
        const quizId = quiz?.[0]?.quiz_id || projectId

        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const userId = data.session?.user?.id

        if (!userId) {
          console.error("❌ userId mancante")
          return
        }

        const topicsUsed = quiz
          .map(q => q.topic || q.title)
          .filter(Boolean)

        const mainTopic =
          topicsUsed.length === 1
            ? normalizeTopic(topicsUsed[0])
            : (
                extractTopicNames(selectedTopics).join(", ")
                || "General"
              )

        const attemptsArray = [
          {
            quiz_id: quizId,
            score: calculateScore(),
            user_id: userId, // 🔥 FIX
            total_questions: quiz.length, // 🔥 FIX
            project_id: projectId, // 🔥 FIX
            topic: mainTopic,
            answers: answersArray
          }
        ];

        // 2. INVIO A SUPABASE
        const { error } = await supabase.from("quiz_attempts").upsert(attemptsArray);

        if (error) {
          console.error("❌ Supabase error:", error);
          return;
        }

        await loadResults(projectId)

        

        

        // 🔍 debug
        console.log("🧪 QUIZ:", quiz);
        console.log("🧪 ANSWERS:", answers);
        console.log("🧪 ANSWERS ARRAY:", answersArray);
        console.log("📦 PAYLOAD:", {
          quiz_id: quizId,
          answers: answersArray
        });
        console.log("🧠 TOPICS USED:", topicsUsed);
        console.log("🧠 MAIN TOPIC:", mainTopic);

        // 🚀 invio al backend
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            quiz_id: quizId,
            answers: answersArray
          })
        });

        // 4. REFRESH
        
        console.log("✅ Submit e Refresh completati con successo");

        setFinished(true)
        await loadQuizStats(projectId) // 🔥 QUI

        const plannerActivity = plannerRuntime.dailyPlan
          ?.activities[plannerRuntime.activityIndex]

        if (
          plannerRuntime.mode === "external_activity"
          && plannerActivity?.type === "quiz"
        ) {
          const activityId = String(plannerActivity.id)
          if (!plannerCompletedActivityIdsRef.current.has(activityId)) {
            if (!plannerRuntime.dailyPlan) {
              return
            }

            plannerCompletedActivityIdsRef.current.add(activityId)
            const correctCount = calculateScore()
            const activityResult = {
              activity_id: plannerActivity.id,
              activity_type: "quiz",
              completed: true,
              correct: correctCount,
              total: quiz.length,
              questions: quiz.length,
              num_questions: quiz.length,
              accuracy: quiz.length > 0 ? correctCount / quiz.length : null
            }
            await requestPlannerActivityDebrief(
              plannerRuntime.dailyPlan,
              plannerRuntime.activityIndex,
              activityResult
            )
            setPlannerRuntime(prev => ({
              ...prev,
              mode: "activity_review",
              sessionResults: {
                ...prev.sessionResults,
                quizzesCompleted: prev.sessionResults.quizzesCompleted + 1,
                quizQuestions: prev.sessionResults.quizQuestions + quiz.length,
                quizCorrect: prev.sessionResults.quizCorrect + correctCount,
                activityResults: [
                  ...(prev.sessionResults.activityResults || []),
                  activityResult
                ]
              }
            }))
          }
        }
        
      } catch (err) {
          console.error("❌ CRASH nella funzione submitQuiz:", err);
      }
  }

  function plannerStudyLanguage(language: string): "English" | "Italian" {
    return language.toLowerCase().startsWith("it") ? "Italian" : "English"
  }
    
  return (
    <div style={{ display: "flex", height: "100vh", background: "#080a10" }}>
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        loadResults={loadResults}
        projectId={projectId}
        loadFlashcards={loadFlashcards}
        availableFlashcards={availableFlashcards}
        previousQuizzes={previousQuizzes}
        setStarted={setStarted}
        setFinished={setFinished}
        setAnswers={setAnswers}
        loadPreviousQuizzes={loadPreviousQuizzes}
        loadQuizStats={loadQuizStats}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        resultsData={resultsData} // AGGIUNGI QUESTA RIGA SE MANCA
        summaryStats={summaryStats} // AGGIUNGI ANCHE QUESTA
        topics={topics}
        setGeneratingFlashcards={setGeneratingFlashcards}
        setLanguage={setLanguage}
        
      />

      <ToolPanel
        activeView={activeView}
        setActiveView={setActiveView}
        projectName={projectName}
        projects={projects}
        createProject={createProject}
        selectProject={selectProject}
        deleteProject={deleteProject}
        projectId={projectId}
        numQuestions={numQuestions}
        setNumQuestions={setNumQuestions}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        language={language}
        setLanguage={setLanguage}
        timerMinutes={timerMinutes}
        setTimerMinutes={setTimerMinutes}
        generateQuiz={generateQuiz}
        generateFlashcards={generateFlashcards}
        generatingFlashcards={generatingFlashcards}
        flashcards={flashcards}
        openCard={openCard}
        setOpenCard={setOpenCard}
        files={files}
        setFiles={setFiles}
        documents={documents}
        topics={topics}
        loadingTopics={loadingTopics}
        previousFlashcards={previousFlashcards}
        topicsOpen={topicsOpen}
        setTopicsOpen={setTopicsOpen}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        availableFlashcards={availableFlashcards}
        studyCount={studyCount}
        setStudyCount={setStudyCount}
        status={status}
        uploadStatus={uploadStatus}
        setProjectName={setProjectName}
        uploadFiles={uploadFiles}
        loadStudyFlashcards={loadStudyFlashcards}
        studyMode={studyMode}
        setStudyMode={setStudyMode}
        loadingFlashcards={loadingFlashcards}
        studyConfig={studyConfig}
        setStudyConfig={setStudyConfig}
        questionStyle={questionStyle}
        setQuestionStyle={setQuestionStyle}
        plannerSessionActive={plannerRuntime.mode !== "dashboard"}
      />

      <Workspace
        key={quizId}
        activeView={activeView}
        setActiveView={setActiveView}
        summaryStats={summaryStats}
        quiz={quiz}
        answers={answers}
        askQuestion={askQuestion}
        setAskQuestion={setAskQuestion}
        askDocuments={askDocuments}
        chatMessages={chatMessages}
        asking={asking}
        selectAnswer={selectAnswer}
        finished={finished}
        started={started}
        submitQuiz={submitQuiz}
        generatingQuiz={generatingQuiz}
        expanded={expanded}
        setExpanded={setExpanded}
        formatTime={formatTime}
        answeredCount={Object.keys(answers).length}
        projectId={projectId}
        projects={projects}
        deleteProject={deleteProject}
        quizId={quizId}
        previousQuizzes={previousQuizzes}
        loadQuiz={loadQuiz}
        flashcards={flashcards}
        openCard={openCard}
        setOpenCard={setOpenCard}
        resultsData={resultsData}
        calculateScore={calculateScore}
        uploadLog={uploadLog}
        uploading={uploading}
        loadQuizStats={loadQuizStats}
        loadHistoryStats={loadQuizStatsByQuiz} // Opzionale: passa quella per i grafici con un altro nome
        loadPreviousQuizzes={loadPreviousQuizzes}
        status={status}
        loadingFlashcards={loadingFlashcards}
        generatingFlashcards={generatingFlashcards}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        documents={documents}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        topics={topics}
        loadingTopics={loadingTopics}
        isGenerating={isGenerating}      // Aggiungi questa
        loaderStep={loaderStep}          // Aggiungi questa
        loaderType={loaderType}          // Aggiungi questa
        loaderMessages={loaderMessages}  // Aggiungi questa
        useGlobalKnowledge={useGlobalKnowledge}
        setUseGlobalKnowledge={setUseGlobalKnowledge}
        toolMode={toolMode}
        setToolMode={setToolMode}
        generateQuiz={generateQuiz}
        generateFlashcards={generateFlashcards}
        plannerRuntime={plannerRuntime}
        openPlannerDailySession={openPlannerDailySession}
        launchPlannerActivity={launchPlannerActivity}
        onPlannerFlashcardReview={handlePlannerFlashcardReview}
        continuePlannerActivity={completePlannerActivity}
        returnToPlannerDashboard={returnToPlannerDashboard}
        plannerActivityDebriefs={plannerRuntime.activityDebriefs}
        
        
      />
    </div>
  )
}
