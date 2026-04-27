import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

import Sidebar from "../components/Sidebar";
import ToolPanel from "../components/ToolPanel";
import Workspace from "../components/Workspace";

export default function Home() {

const router = useRouter()

useEffect(()=>{
async function checkSession(){
const { data } = await supabase.auth.getSession()
if(!data.session){
router.push("/login")
}
}
checkSession()
},[])

const [projectId,setProjectId]=useState("")
const [projectName,setProjectName]=useState("")
const [projects,setProjects]=useState<any[]>([])
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

const [answers,setAnswers]=useState<any>({})
const [score,setScore] = useState<number | null>(null)

const [status,setStatus]=useState("")
const [uploadStatus,setUploadStatus]=useState("")
const [uploading,setUploading]=useState(false)

const [numQuestions,setNumQuestions]=useState(10)
const [difficulty,setDifficulty]=useState("medium")
const [language,setLanguage]=useState("English")
const [timerMinutes,setTimerMinutes]=useState(0)

const [timeLeft,setTimeLeft]=useState(0)
const [started,setStarted]=useState(false)
const [finished,setFinished]=useState(false)

const [expanded,setExpanded]=useState<{[key:number]:boolean}>({})
const [activeView,setActiveView]=useState("project")

const [topicsOpen,setTopicsOpen]=useState(true)
const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
const [selectedTopics, setSelectedTopics] = useState<string[]>([])

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

const loaderMessages = {
  quiz: [
    "Analyzing study material...",
    "Extracting key concepts...",
    "Formulating questions...",
    "Generating options and explanations...",
    "Finalizing your quiz..."
  ],
  flashcards: [
    "Scanning documents...",
    "Identifying core definitions...",
    "Creating flashcards...",
    "Polishing content...",
    "Almost ready..."
  ]
};

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

  if (activeView === "flashcards" && projectId) {

    setStudyMode("loaded")

   

    loadFlashcards(projectId)

  }

}, [activeView, projectId])

useEffect(()=>{

async function init(){

await loadProjects()

}

init()

},[])

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
    }, 3500);
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

  console.log("📊 RESULTS FROM API:", dataRes)

  setResultsData(dataRes.topic_mastery)   // 🔥 QUESTA È LA CHIAVE
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

    // Carichiamo i documenti e i topic (in ordine)
    await loadDocuments(projectId);
    await pollTopicStatus(projectId); 

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

setLoadingTopics(true)

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token

if(!token){
setLoadingTopics(false)
return
}

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics`,
{
headers:{
Authorization:`Bearer ${token}`,
"Content-Type":"application/json"
}
}
)

if(!res.ok){
setLoadingTopics(false)
return
}

const data=await res.json()

setTopics(data.topics||[])

console.log("DATI ARRIVATI DAL SERVER:", data); // <--- TEST 1


setTopics(data.topics || []);


console.log("STATO TOPICS AGGIORNATO CON:", data.topics?.length, "elementi"); // <--- TEST 2

setLoadingTopics(false)

}

async function pollTopicStatus(projectId:string){

  const { data:sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if(!token) return

  let attempts = 0
  const maxAttempts = 40

  const interval = setInterval(async () => {
    attempts += 1

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topic_status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )

    if(!res.ok){
      clearInterval(interval)
      console.error("TOPIC STATUS FAILED")
      return
    }

    const data = await res.json()
    console.log("TOPIC STATUS:", data.status)

    if(data.status === "completed"){
      clearInterval(interval)
      await loadTopics(projectId)
      setStatus("Project loaded successfully"); 
      setUploadStatus("Topics ready!"); 
      

      console.log("WORKSPACE SBLOCCATA!");
      return
    }

    if(data.status === "error"){
      clearInterval(interval)
      setUploadStatus("Topic generation failed")
      return
    }

    if(attempts >= maxAttempts){
      clearInterval(interval)
      setUploadStatus("Topic generation timeout")
    }

  }, 3000)
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

setPreviousFlashcards(data.flashcards || [])

setAvailableFlashcards((data.flashcards || []).length)
setStudyMode("loaded")
}catch(e){

console.error("FLASHCARDS LOAD ERROR:",e)

}

}

async function loadQuizStats(id: string, quizId?: string) {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("project_id", id);

    if (error) {
      console.error("❌ Errore Supabase:", error.message);
      return;
    }

    if (data && data.length > 0) {
      const performance: any = {};
      let totalQuestions = 0;
      let totalCorrect = 0;

      data.forEach(row => {
          const tName = row.topic ? row.topic.trim() : "General";
          if (!performance[tName]) performance[tName] = { correct: 0, total: 0 };
          
          performance[tName].correct += (row.score || 0);
          performance[tName].total += (row.total_questions || 0);
          
          totalCorrect += (row.score || 0);
          totalQuestions += (row.total_questions || 0);
      });

      setResultsData({...performance});
      
      // Definiamo correttamente summary prima di usarlo
      const summary = {
          quiz_attempts: data.length,
          avg_score: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
          topics_count: Object.keys(performance).length,
          flashcards_reviewed: 0
      };

      setSummaryStats(summary);
      console.log("✅ Stats caricate correttamente", performance);

    } else {
      setResultsData({});
      setSummaryStats({ quiz_attempts: 0, avg_score: 0, topics_count: 0, flashcards_reviewed: 0 });
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


async function loadStudyFlashcards(){
  console.log("SELECTED TOPICS:", selectedTopics)
  console.log("FLASHCARDS:", previousFlashcards)

  if(previousFlashcards.length === 0) return

  let filtered = previousFlashcards

  // 🔥 FILTRO PER TOPIC
  if(selectedTopics && selectedTopics.length > 0){

    filtered = previousFlashcards.filter(card =>
      selectedTopics.includes(card.topic)
    )

  }

  // fallback se niente match
  if(filtered.length === 0){
    console.warn("No flashcards match selected topics")
    filtered = previousFlashcards
  }

  const cards = filtered.slice(0, studyCount)

  setFlashcards(cards)

  setStudyMode("loaded")
  setActiveView("study_session")

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
  setQuizId(id)
  setAnswers({})
  setFinished(false)
  setStarted(true)
  setActiveView("quiz")
}



async function loadResults(projectId:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if(!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/results`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok) return

const data = await res.json()

setResultsData(data)

}

async function loadSummary(projectId:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

try{

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/summary`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok){
console.error("Summary fetch failed")
return
}

const data = await res.json()
console.log("SUMMARY DATA:", data)
setSummaryStats(data)

}catch(e){

console.error("SUMMARY ERROR:",e)

}

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

async function generateQuiz() {
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

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            num_questions: numQuestions,
            difficulty: difficulty,
            topics: selectedTopics && selectedTopics.length > 0 ? selectedTopics : null,
            language: language
          })
        }
      )

      if (!res.ok) throw new Error("Fetch failed")

      const data = await res.json()
      console.log("🔥 QUIZ RESPONSE:", data)

      const quizData = data.questions || data.quiz || []

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
      setQuiz(quizData)
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
  async function generateFlashcards() {
    console.log("GENERATE FLASHCARDS FUNCTION RUNNING")
    if (!projectId) return

    setIsGenerating(true);       
    setLoaderType("flashcards");

    setGeneratingFlashcards(true)
    setLoadingFlashcards(true)

    setFlashcards([]) 
    setOpenCard(null)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      console.error("❌ TOKEN MISSING")
      setGeneratingFlashcards(false)
      setLoadingFlashcards(false)
      return
    }

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
            topics: selectedTopics,
            num_cards: numQuestions || 5
          })
        }
      )

      if (!res.ok) throw new Error("Flashcards generation failed")

      const data = await res.json()
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards)
        setStudyMode("generated")   // Diciamo al sistema: "Queste sono nuove!"
        setOpenCard(0)              // <--- CAMBIATO DA null A 0: apre subito la prima carta
        setActiveView("flashcards") // Sposta la vista sulle flashcards
      } else {
        alert("L'IA non ha generato flashcards. Prova a selezionare altri argomenti.")
      }
    } catch (e) {
      console.error("FLASHCARDS ERROR:", e)
    } finally {
      setLoadingFlashcards(false)
      setGeneratingFlashcards(false)
    }
  }

  async function askDocuments() {
    if (!projectId) return
    if (!askQuestion.trim()) return
    setAsking(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          question: askQuestion,
          topics: (selectedTopics || []).map((t) =>
            typeof t === "string" ? t : t.topic
          ),
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
      const correctRaw = (q.correct ?? "").toString().trim()
      q.options.forEach((opt: string, j: number) => {
        const optTextNorm = opt.toLowerCase()
        const correctTextNorm = correctRaw.toLowerCase()
        const optLetter = String.fromCharCode(65 + j)
        const correct =
          correctTextNorm === optTextNorm ||
          correctRaw === optLetter ||
          String(Number(correctRaw)) === String(j)
        if (correct && userAnswer === opt) s++
      })
    })
    return s
  }

  async function submitQuiz() {
    console.log("--- INIZIO SUBMIT ---");
    console.log("🧠 QUIZ[0]:", quiz[0]);   // 👈 AGGIUNGI QUESTA
    
    // Rimuoviamo il blocco su quizId per testare se è lui il colpevole
    if (!projectId || quiz.length === 0) {
        console.error("❌ Mancano dati: projectId o quiz vuoto", { projectId, quizLength: quiz.length });
        return;
    }

    try {
        setFinished(true);
        setStarted(false);

        

    

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        
        if (!user) {
            console.error("❌ Utente non loggato");
            return;
        }

        // Se quizId non esiste, usiamo un fallback per non bloccare tutto
        const isUUID = quizId && quizId.length === 36;
        // ... (codice precedente invariato fino a finalQuizId)

        if (!quizId || quizId.length !== 36) {
          console.error("❌ quizId non valido, impossibile salvare il tentativo", { quizId })
          return
        }

        const finalQuizId = quizId

        // Prepariamo l'array unico FUORI dal ciclo
        const attemptsArray = quiz.map((q, index) => {
            const topicName = (q.topic || "General").trim();

            const userAnswer = answers[index];
            const correctIdx = q.correct_answer !== undefined ? q.correct_answer : q.correct;
            const correctText = q.options && q.options[correctIdx];

            const isCorrect =
                userAnswer === correctText ||
                String(userAnswer) === String(correctIdx);

            return {
                project_id: projectId,
                user_id: user.id,
                quiz_id: finalQuizId,
                topic: topicName,
                question_index: index,
                score: isCorrect ? 1 : 0,
                total_questions: 1
            };
        });
        const answersArray = quiz.map((q, index) => {
          const userAnswer = answers[index];
          const correctIdx = q.correct_answer !== undefined ? q.correct_answer : q.correct;
          const correctText = q.options && q.options[correctIdx];

          const isCorrect =
            userAnswer === correctText ||
            String(userAnswer) === String(correctIdx);

          return {
            question_id: q.id,      // 👈 IMPORTANTISSIMO
            is_correct: isCorrect
          };
        });

        console.log("Invio massivo al DB:", attemptsArray);

        // Una sola chiamata UPSERT
        const { error: upsertError } = await supabase
          .from("quiz_attempts")
          .upsert(attemptsArray, { 
            onConflict: 'project_id,quiz_id,question_index'
          });

        if (upsertError) {
          console.error("❌ Errore durante il salvataggio:", upsertError.message);
        } else {
          console.log("✅ Salvataggio completato!");

          // 🔥 AGGIUNGI QUESTO BLOCCO QUI
          const answersArray = quiz.map((q, index) => {
            const userAnswer = answers[index];
            const correctIdx = q.correct_answer !== undefined ? q.correct_answer : q.correct;
            const correctText = q.options && q.options[correctIdx];

            const isCorrect =
              userAnswer === correctText ||
              String(userAnswer) === String(correctIdx);

            return {
              question_id: q.id,   // ⚠️ IMPORTANTE
              is_correct: isCorrect
            };
          });
          
          console.log("🚀 PROJECT ID:", projectId)

          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token}`
            },
            body: JSON.stringify({
              project_id: projectId,   // 👈 QUESTA È LA RIGA CHE TI MANCA
              quiz_id: finalQuizId,
              score: attemptsArray.reduce((acc, a) => acc + a.score, 0),
              total_questions: quiz.length,
              answers: answersArray
            })
          });

          // 🔁 poi ricarichi i dati
          await loadQuizStats(projectId);
        }

        console.log("✅ Submit completato con successo");
        
    } catch (err) {
        console.error("❌ CRASH nella funzione submitQuiz:", err);
    }
}
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a" }}>
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        loadResults={loadResults}
        loadSummary={loadSummary}
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
        loadQuizStats={loadQuizStatsByQuiz}
        
      />
    </div>
  )
}