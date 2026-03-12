import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

import Sidebar from "../components/Sidebar";
import ToolPanel from "../components/ToolPanel";
import Workspace from "../components/Workspace";   

import { 
BookOpen,
Brain,
HelpCircle,
Layers,
FileText,
ClipboardList,
History,
BarChart3
} from "lucide-react";

export default function Home() {

  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
      }
    }

    checkSession();
  }, []);
 

const [projectId,setProjectId]=useState("");
const [projectName,setProjectName]=useState("");
const [projects,setProjects]=useState<any[]>([]);
const [files,setFiles]=useState<FileList|null>(null);
const [documents,setDocuments]=useState<any[]>([]);
const [topics,setTopics] = useState<any[]>([]);
const [loadingTopics,setLoadingTopics] = useState(false);
const [quiz,setQuiz]=useState<any[]>([]);
const [previousQuizzes,setPreviousQuizzes]=useState<any[]>([]);
const [quizId,setQuizId]=useState("");
const [generatingQuiz,setGeneratingQuiz]=useState(false);
const [flashcards,setFlashcards] = useState<any[]>([]);
const [previousFlashcards,setPreviousFlashcards] = useState<any[]>([]);
const [generatingFlashcards,setGeneratingFlashcards] = useState(false);
const [openCard,setOpenCard] = useState<number | null>(null);
const [askQuestion,setAskQuestion]=useState("");
const [askAnswer,setAskAnswer]=useState("");
const [chatMessages,setChatMessages] = useState<any[]>([])
const [asking,setAsking]=useState(false);
const [answers,setAnswers]=useState<any>({});
const [status,setStatus]=useState("");
const [uploadStatus, setUploadStatus] = useState("");
const [uploading, setUploading] = useState(false);

const [processing, setProcessing] = useState(false);

const [numQuestions,setNumQuestions]=useState(10);
const [difficulty,setDifficulty]=useState("medium");
const [language,setLanguage]=useState("English");
const [timerMinutes,setTimerMinutes]=useState(0);

const [timeLeft,setTimeLeft]=useState(0);
const [started,setStarted]=useState(false);
const [finished,setFinished]=useState(false);
const [expanded, setExpanded] = useState<{[key:number]: boolean}>({});
const [activeView,setActiveView] = useState("project")
const [topicsOpen,setTopicsOpen] = useState(true);
const [selectedTopics,setSelectedTopics] = useState<string[]>([]);

const [availableFlashcards,setAvailableFlashcards] = useState(0)
const [studyCount,setStudyCount] = useState(10)
const [summaryStats,setSummaryStats] = useState<any>(null)
const [resultsData,setResultsData] = useState<any>(null)



useEffect(() => {
  loadProjects();
}, []);

useEffect(() => {

  if (!started) return;
  if (timerMinutes === 0) return;

  const interval = setInterval(() => {

    setTimeLeft(prev => {

      if (prev <= 1) {
        clearInterval(interval);
        submitQuiz();
        return 0;
      }

      return prev - 1;

    });

  }, 1000);

  return () => clearInterval(interval);

}, [started]);

function formatTime(){
  const m=Math.floor(timeLeft/60);
  const s=timeLeft%60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

async function loadProjects() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return;

  const data = await res.json();
  console.log("CREATE PROJECT RESPONSE:", data);
 setProjects(Array.isArray(data) ? data : data.projects || []);
}

async function createProject() {
  setStatus("Creating...");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    setStatus("Not authenticated");
    return;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: projectName })
    }
  );

  const data = await res.json();
  console.log("CREATE PROJECT RESPONSE:", data);

  if (!res.ok) {
    setStatus(data.error || "Error creating project");
    return;
  }

  // 👇 FIX IMPORTANTE
  const newId = data.id || data.project_id;

  setProjectId(newId);
  setStatus(`Saved: ${projectName}`);

  // carica subito i documenti del nuovo progetto
  await loadDocuments(newId);

  // aggiorna la lista progetti
  loadProjects();
}

async function deleteProject(id:string){

const { data: sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if (!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
{
method:"DELETE",
headers:{
Authorization:`Bearer ${token}`
}
}
)

const text = await res.text()

console.log("DELETE RESPONSE:", res.status, text)

if(!res.ok){
setStatus("Delete failed")
return
}

loadProjects()
setProjectId("")
setDocuments([])
setTopics([])

setStatus("Project deleted")

}

/* POI CONTINUA COME PRIMA */
async function loadDocuments(projectId:string){

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents`,
    {
      headers:{ Authorization:`Bearer ${token}` }
    }
  );

  if(!res.ok){
    console.error("LOAD DOCUMENTS FAILED:", projectId);
    return;
  }

  const data = await res.json();

  console.log("DOCUMENTS:", data.documents);

  setDocuments(data.documents || []);
}
async function selectProject(id:string){

  const project = projects.find(p => p.id === id);
  setProjectName(project?.name || "");

  console.log("PROJECT SELECTED:", id);

  setStatus("Loading project...");

  setProjectId(id);

  // reset dati vecchio progetto
  setDocuments([]);
  setTopics([]);
  setQuiz([]);
  setAnswers({});
  setPreviousQuizzes([]);
  setPreviousFlashcards([]);

  try {

    await loadDocuments(id);
    await loadTopics(id);
    await loadPreviousQuizzes(id);
    await loadPreviousFlashcards(id);
    await loadFlashcardsCount(id);
    await loadSummaryStats(id)
    await loadResults(id)

    setStatus("Project loaded");

  } catch (e) {

    console.error("PROJECT LOAD ERROR:", e);
    setStatus("Error loading project");

  }
}

  async function loadTopics(projectId:string){

  setLoadingTopics(true);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    setLoadingTopics(false);
    return;
  }

  console.log("LOAD TOPICS PROJECT:", projectId);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if(!res.ok){
    setLoadingTopics(false);
    return;
  }

  const data = await res.json();

  setTopics(data.topics || []);
  setLoadingTopics(false);
}
async function loadFlashcardsCount(projectId:string){

const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData.session?.access_token;

if (!token) return;

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards_count`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

if(!res.ok) return

const data = await res.json()

setAvailableFlashcards(data.count)

}
async function loadStudyFlashcards(){

if(!projectId) return

const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData.session?.access_token;

if (!token) return;

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/study_flashcards?limit=${studyCount}`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

if(!res.ok) return

const data = await res.json()

setFlashcards(data.flashcards || [])

setOpenCard(false)

}
async function loadSummaryStats(projectId:string){

const { data: sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if (!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/summary`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

if(!res.ok){
console.error("SUMMARY ERROR:", await res.text())
return
}

const data = await res.json()

setSummaryStats(data)

}
async function loadResults(projectId:string){

const { data: sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if (!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/results`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

if(!res.ok){
console.error("RESULTS ERROR:", await res.text())
return
}

const data = await res.json()

setResultsData(data)

}
async function loadPreviousQuizzes(projectId:string){

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/quizzes`,
    {
      headers:{ Authorization:`Bearer ${token}` }
    }
  );

  if(!res.ok) return;

  const data = await res.json();

  setPreviousQuizzes(data.quizzes || []);
}
async function loadQuiz(quizId:string){

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/quizzes/${quizId}`
  );

  if(!res.ok) return;

  const data = await res.json();

  setQuiz(data.questions || []);
  setActiveView("quiz");
}

async function loadPreviousFlashcards(projectId:string){

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards`,
    {
      headers:{ Authorization:`Bearer ${token}` }
    }
  );

  if(!res.ok) return;
  console.log("Flashcards fetch failed");
  const data = await res.json();

  setPreviousFlashcards(data.flashcards || []);
}

async function uploadFiles(){
  console.log("UPLOAD PROJECT ID:", projectId);
  console.log("FILES:", files);
  if (!files || !projectId) {
    setUploadStatus("Select a project and files first.");
    return;
  }

  setUploading(true);
  setUploadStatus("Uploading...");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    setUploading(false);
    setUploadStatus("Not authenticated");
    return;
  }

  try {

    for (const file of Array.from(files)) {

  const buffer = await file.arrayBuffer();

  const bytes = new Uint8Array(buffer);
let binary = "";
for (let i = 0; i < bytes.length; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const base64 = btoa(binary);

  const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/ingest`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      documents: [
        {
          title: file.name,
          file_bytes: base64
        }
      ]
    })
  }
);

console.log("UPLOAD RESPONSE STATUS:", res.status);

if (!res.ok) {
  const text = await res.text();
  console.error("UPLOAD ERROR:", text);
  throw new Error("Upload failed");
}


}

    setUploadStatus("Upload successful ✅");
    await loadDocuments(projectId);
    await loadTopics(projectId);

  } catch {
    setUploadStatus("Upload error ❌");
  }

  setUploading(false);
}
async function generateQuiz(){
  console.log("QUIZ USING PROJECT:", projectId);

  setGeneratingQuiz(true);

  if(!projectId) return;

  setStatus("Generating...");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    setStatus("Not authenticated");
    return;
  }

  const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz_stream`,
  {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization: `Bearer ${token}`
    },
    body:JSON.stringify({
      num_questions:numQuestions,
      difficulty:difficulty,
      language:language,
      topics:selectedTopics
    })
  }
);

if(!res.ok){
  setGeneratingQuiz(false);
  const text = await res.text();
  console.error("QUIZ ERROR:", text);
  setStatus("Quiz generation failed");
  return;
}

const data = await res.json();

setQuizId(data.quiz_id);

const questions = Array.isArray(data.questions) ? data.questions : [];

setQuiz(questions);
loadPreviousQuizzes(projectId);

setStarted(true);
setFinished(false);
setTimeLeft(timerMinutes*60);

setGeneratingQuiz(false);

setStatus("Quiz started");
}
async function generateFlashcards(){

if(!projectId) return;


setGeneratingFlashcards(true);
setFlashcards([]);
setStatus("Generating flashcards...");

const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData.session?.access_token;

console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("PROJECT ID:", projectId);
console.log("TOKEN:", token);

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_flashcards`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
num_cards:numQuestions,
topics:selectedTopics
})
}
);
if(!res.ok){
  const text = await res.text();
  console.error("FLASHCARDS ERROR:", text);
  setStatus("Flashcards generation failed");
  return;
}

if(!res.ok){
setStatus("Flashcards generation failed");
return;
}

const data = await res.json();

setFlashcards(data.flashcards || []);
setGeneratingFlashcards(false);
console.log("FLASHCARDS:", data.flashcards);

setStatus("Flashcards ready");

}

function selectAnswer(i:number,opt:string){
  if(finished) return;
  setAnswers({...answers,[i]:opt});
}

async function submitQuiz(){
  setStarted(false);
  setFinished(true);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  try{

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`
        },
        body:JSON.stringify({
          quiz_id: quizId,
          score: score(),
          total_questions: quiz.length,
          answers: answers
        })
      }
    );

  }catch(e){
    console.error("SAVE ATTEMPT ERROR:", e);
  }
  setStatus("Finished");
}

function score(){
  let s=0;

  quiz.forEach((q,i)=>{

    const userAnswer = answers[i];
    const correctRaw = (q.correct ?? "").toString().trim();

    q.options.forEach((opt:string,j:number)=>{
      const optTextNorm = opt?.toString().trim().toLowerCase();
      const correctTextNorm = correctRaw.toLowerCase();
      const optLetter = String.fromCharCode(65 + j);

      const correct =
        correctTextNorm === optTextNorm ||
        correctRaw === optLetter ||
        String(Number(correctRaw)) === String(j);

      if(correct && userAnswer === opt){
        s++;
      }
    });

  });

  return s;
}
async function askDocuments(){

  if(!askQuestion.trim()) return

  setAsking(true)

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/ask`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        project_id: projectId,
        question: askQuestion
      })
    }
  )

  const data = await res.json()

  setChatMessages([
    ...chatMessages,
    {role:"user",content:askQuestion},
    {role:"assistant",content:data.answer}
  ])

  setAskQuestion("")
  setAsking(false)

}
const answeredCount = quiz.reduce((acc, _q, i) => {
  return acc + (answers[i] ? 1 : 0);
}, 0);

const allAnswered = quiz.length > 0 && answeredCount === quiz.length;
async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/login";
} 
function support() {
  window.location.href = "mailto:studio@mokadv.com";
}
return(
<>
<style>{spinKeyframes}</style>

<div style={page}>
{/* ====================== */}
{/* TOP BAR */}
{/* ====================== */}



 
  {/* WRAPPER CONTENUTO */}
  <div style={{display:"flex",height:"100vh"}}>

  <Sidebar 
    activeView={activeView}
    setActiveView={setActiveView}
  />

  <ToolPanel
    activeView={activeView}
    projectName={projectName}

    askQuestion={askQuestion}
    setAskQuestion={setAskQuestion}
    askDocuments={askDocuments}
    asking={asking}

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

    projects={projects}
    projectName={projectName}
    setProjectName={setProjectName}
    createProject={createProject}
    selectProject={selectProject}
    projectId={projectId}
    deleteProject={deleteProject}

    files={files}
    setFiles={setFiles}
    uploadFiles={uploadFiles}
    documents={documents}

    topics={topics}
    loadingTopics={loadingTopics}
    topicsOpen={topicsOpen}
    setTopicsOpen={setTopicsOpen}
    selectedTopics={selectedTopics}
    setSelectedTopics={setSelectedTopics}

    status={status}
    uploadStatus={uploadStatus}

    availableFlashcards={availableFlashcards}
    studyCount={studyCount}
    setStudyCount={setStudyCount}
    loadStudyFlashcards={loadStudyFlashcards}
  />
  <Workspace
  activeView={activeView}
  askAnswer={askAnswer}
  flashcards={flashcards}
  openCard={openCard}
  setOpenCard={setOpenCard}
  quiz={quiz}
  answers={answers}
  selectAnswer={selectAnswer}
  finished={finished}
  started={started}
  submitQuiz={submitQuiz}
  score={score}
  generatingQuiz={generatingQuiz}
  expanded={expanded}
  setExpanded={setExpanded}
  formatTime={formatTime}
  answeredCount={answeredCount}
  askQuestion={askQuestion}
  setAskQuestion={setAskQuestion}
  askDocuments={askDocuments}
  asking={asking}
  chatMessages={chatMessages}
  askAnswer={askAnswer}
  summaryStats={summaryStats}
  resultsData={resultsData}
/>

</div>

</div>

</>
);
}

// ======================
// STYLES
// ======================
// ======================
// STYLES
// ======================

const page = {
  
  minHeight: "100vh",
  background: "linear-gradient(#ffffff,#88bcbf,#203a43,#2c5364)"
};
const contentWrapper = {
  flex: 1,
  
};

const globalText = {
  color: "#1a1a1a"
};

const header = {
  textAlign: "center" as const,
  marginBottom: 20
};

const topRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 20,
  marginBottom: 30
};

const box = {
  background: "white",
  padding: "25px",
  borderRadius: 14,
  boxShadow: "0 8px 25px rgba(0,0,0,0.12)"
};
const quizBox = {
  background: "white",
  padding: 35,
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
};

const question = {
  marginBottom: 20
};

const button = {
  marginTop: 10,
  background: "#2FA4A9",
  color: "white",
  padding: "10px 14px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  width: "100%",
  boxSizing: "border-box" as const
};

const input = {
  width: "100%",
  padding: "12px",
  marginTop: 6,
  marginBottom: 14,
  borderRadius: 8,
  border: "1px solid #d0d7de",
  boxSizing: "border-box" as const
};

const timer = {
  fontSize: 22,
  marginBottom: 20
};

const statusBox = {
  marginTop: 20,
  color: "white"
};
const spinKeyframes = `
@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}
`;

const topBar = {
  width: "100%",
  background: "#111827",
  color: "white",
  padding: "8px 20px",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  zIndex: 10
};


const topButton = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "white",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 500
};

const topButtonPrimary = {
  background: "#88bcbf",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600
};

const layout = {
  display: "flex",
  gap: 30,
  padding: "0 10%",
  alignItems: "flex-start"
};

const sidebar = {
  width: 260,
  background: "white",
  borderRadius: 14,
  padding: 20,
  boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
  height: "fit-content",
  position: "sticky" as const,
  top: 20
};

const sidebarTitle = {
  fontWeight: 600,
  marginBottom: 10,
  marginTop: 10
};

const sidebarDivider = {
  height: 1,
  background: "#e5e7eb",
  margin: "15px 0"
};

const sidebarItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left" as const,
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 8,
  marginBottom: 4,
  fontSize: 14
};

const sidebarButton = {
  marginTop: 8,
  background: "#2FA4A9",
  color: "white",
  border: "none",
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  width: "100%"
};

const sidebarSelect = {
  width: "100%",
  padding: 8,
  marginBottom: 10,
  borderRadius: 6,
  border: "1px solid #d0d7de"
};

const sidebarInput = {
  width: "100%",
  padding: 8,
  marginBottom: 8,
  borderRadius: 6,
  border: "1px solid #d0d7de"
};

const logoRow = {
  display: "flex",
  justifyContent: "center",
  marginTop: 20,
  marginBottom: 20
};

const sidebarSectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
  marginTop: 20,
  marginBottom: 10,
  fontSize: 15,
  color: "#1f2937"
};

