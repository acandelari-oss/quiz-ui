import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";
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
const [activeView,setActiveView] = useState("");
const [topicsOpen,setTopicsOpen] = useState(true);


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
async function loadDocuments(projectId:string){

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents`,{
    headers:{ Authorization:`Bearer ${token}` }
  });

  if(!res.ok) return;

  const data = await res.json();
  setDocuments(data.documents || []);
}
function selectProject(id:string){

  console.log("PROJECT SELECTED:", id);

  setProjectId(id);

  setQuiz([]);
  setAnswers({});
  setDocuments([]);
  setTopics([]);

  setStatus("Project loaded");

  loadDocuments(id);
  loadTopics(id);
  loadPreviousQuizzes(id);
  loadPreviousFlashcards(id);

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
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  if(!res.ok){
    setLoadingTopics(false);
    return;
  }

  const data = await res.json();
  console.log("TOPICS DATA:", data);

  setTopics(data.topics || []);
  setLoadingTopics(false);
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

if (!res.ok) {
  const text = await res.text();
  console.error("UPLOAD ERROR:", text);
  throw new Error("Upload failed");
}

}

    setUploadStatus("Upload successful ✅");
    await loadDocuments(projectId);

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
      difficulty,
      language
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
num_cards:numQuestions
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

  if(!projectId || !askQuestion) return;

  setAsking(true);
  setAskAnswer("");

  try{

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ask`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          project_id: projectId,
          question: askQuestion
        })
      }
    );

    const data = await res.json();

    setAskAnswer(data.answer || "No answer");

  }catch{
    setAskAnswer("Error contacting AI");
  }

  setAsking(false);
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

<div style={topBar}>
  <div style={{ fontWeight: 600 }}>
    StudyQuiz
  </div>

  <div style={{ display: "flex", gap: 15 }}>
    <button onClick={support} style={topButton}>
      Support
    </button>

    <button onClick={logout} style={topButtonPrimary}>
      Logout
    </button>
  </div>
</div>
<div style={logoRow}>
  <Image src="/logo.png" width={260} height={160} alt="logo"/>
</div>
 
  {/* WRAPPER CONTENUTO */}
  <div style={layout}>
    {/* SIDEBAR */}

    <div style={sidebar}>

    <div style={sidebarTitle}>Project</div>

    <select
    onChange={e=>selectProject(e.target.value)}
    style={sidebarSelect}
    >
    <option>Select project</option>
    {projects.map(p=>(
    <option key={p.id} value={p.id}>{p.name}</option>
    ))}
    </select>

    <input
    placeholder="New project name"
    value={projectName}
    onChange={e=>setProjectName(e.target.value)}
    style={sidebarInput}
    />

    <button onClick={createProject} style={sidebarButton}>
    Create project
    </button>

    <div style={sidebarDivider}/>
    <div style={box}>
    <h2>Upload Files</h2>

    <input
    type="file"
    multiple
    onChange={e=>setFiles(e.target.files)}
    style={input}
    />

    <button
    onClick={uploadFiles}
    disabled={uploading}
    style={button}
    >
    {uploading ? "Uploading..." : "Upload"}
    </button>
    {documents.length > 0 && (
      <div style={{marginTop:10}}>
        <strong>files already uploaded:</strong>
        {documents.map((doc,i)=>(
          <div key={i} style={{fontSize:14, marginTop:4}}>
            • {doc.title}
          </div>
        ))}
      </div>
    )}

    <div style={{marginTop:10,fontSize:14}}>
    {uploadStatus}
    </div>

    </div>
    <div style={sidebarDivider}/>

    <div style={sidebarSectionTitle}>
    <Brain size={18}/>
    Study
    </div>

    <button
style={{
...sidebarItem,
background: activeView==="ask" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("ask")}
>
<HelpCircle size={16}/> Ask a question
</button>

    <button
style={sidebarItem}
onClick={()=>setActiveView("flashcards")}
>
<Layers size={16}/> Generate flashcards
</button>
<button
style={{
...sidebarItem,
background: activeView==="flashcards_history" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("flashcards_history")}
>
<History size={16}/> Flashcards history
</button>

    <button
style={{
...sidebarItem,
background: activeView==="summary" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("summary")}
>
<FileText size={16}/> Create summary
</button>

    <div style={sidebarDivider}/>

    <div style={sidebarSectionTitle}>
    <ClipboardList size={18}/>
    Quiz
    </div>

    <button
style={{
...sidebarItem,
background: activeView==="quiz" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("quiz")}
>
<ClipboardList size={16}/> Generate new quiz
</button>

    <button
style={{
...sidebarItem,
background: activeView==="previous" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("previous")}
>
<History size={16}/> Previous quizzes
</button>

    <button
style={{
...sidebarItem,
background: activeView==="results" ? "#eef6f7" : "transparent"
}}
onClick={()=>setActiveView("results")}
>
<BarChart3 size={16}/> Results history
</button>

    </div>

    <div style={contentWrapper}>
    
     
{/* ROW 1 */}


<div style={{...box, marginBottom:30}}>

  <h2
    style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8}}
    onClick={()=>setTopicsOpen(!topicsOpen)}
  >
    Main topics detected
    <span style={{color:"#9ca3af",fontSize:14,marginLeft:6}}>
    {topicsOpen ? "▲" : "▼"}
    </span>
  </h2>

  {topicsOpen && (
    <>
      {loadingTopics ? (
        <p>Loading topics...</p>
      ) : topics.length === 0 ? (
        <p>No topics detected yet</p>
      ) : null}

      <div
        style={{
          marginTop:10,
          display:"grid",
          gridTemplateColumns:"repeat(4, 1fr)",
          gap:"10px"
        }}
      >
        {topics.map((t,i)=>{

          let color = "#555";

          if(t.difficulty==="easy") color = "#22c55e";
          if(t.difficulty==="medium") color = "#eab308";
          if(t.difficulty==="hard") color = "#ef4444";

          return(
            <div
              key={i}
              style={{
                padding:8,
                background:"#f4f6f8",
                borderRadius:6,
                fontSize:14
              }}
            >
              <div style={{fontWeight:600,color}}>
                {t.topic}
              </div>

              <div style={{fontSize:13,marginTop:4,color:"#555"}}>
                Study page: {t.suggested_page}
              </div>
            </div>
          );

        })}
      </div>

      <div style={{
        marginTop:12,
        fontSize:13,
        color:"#555"
      }}>
        Topic performance based on quiz results:
        <span style={{color:"#22c55e",marginLeft:10}}>Strong</span>
        <span style={{color:"#eab308",marginLeft:10}}>Needs review</span>
        <span style={{color:"#ef4444",marginLeft:10}}>Difficult</span>
      </div>
    </>
  )}

</div>
{/* ROW 2 */}
<div style={topRow}>

{activeView === "ask" && (
<div style={box}>
<h2>Ask your documents</h2>

<input
placeholder="Ask something about your documents..."
value={askQuestion}
onChange={e=>setAskQuestion(e.target.value)}
style={input}
/>

<button
onClick={askDocuments}
disabled={asking}
style={button}
>
{asking ? "Thinking..." : "Ask"}
</button>

{askAnswer && (
<div style={{marginTop:15,lineHeight:1.6}}>
<strong>Answer:</strong>
<div style={{marginTop:8}}>
{askAnswer}
</div>
</div>
)}

</div>
)}

{activeView === "flashcards" && (
<div style={box}>

<h2>Generate Flashcards</h2>

<div style={{marginBottom:10}}>
Create study flashcards from your documents.
</div>

<label>Number of cards</label>

<input
type="number"
value={numQuestions}
onChange={e=>setNumQuestions(Number(e.target.value))}
style={input}
/>

<button
onClick={generateFlashcards}
style={button}
>
Generate flashcards
</button>

</div>
)}

{activeView === "quiz" && (
<div style={box}>
<h2>Generate Quiz</h2>

Questions
<input
type="number"
value={numQuestions}
onChange={e=>setNumQuestions(Number(e.target.value))}
style={input}
/>

Difficulty
<select
value={difficulty}
onChange={e=>setDifficulty(e.target.value)}
style={input}
>
<option>easy</option>
<option>medium</option>
<option>hard</option>
</select>

Language
<select
value={language}
onChange={e=>setLanguage(e.target.value)}
style={input}
>
<option>English</option>
<option>Italian</option>
</select>

Timer
<input
type="number"
value={timerMinutes}
onChange={e=>setTimerMinutes(Number(e.target.value))}
style={input}
/>

<button
onClick={generateQuiz}
style={button}
>
Start Quiz
</button>

</div>
)}

{activeView === "previous" && (
<div style={box}>
<h2>Previous quizzes</h2>

{previousQuizzes.length === 0 && (
  <div style={{marginTop:10,color:"#555"}}>
    No quizzes yet
  </div>
)}

{previousQuizzes.map((q,i)=>(
  <div
    key={i}
    style={{
      marginTop:10,
      padding:12,
      background:"#f4f6f8",
      borderRadius:8,
      cursor:"pointer"
    }}
    onClick={()=>loadQuiz(q.id)}
  >

    <div style={{fontWeight:600}}>
      Quiz {i+1}
    </div>

    <div style={{fontSize:13,color:"#555"}}>
      {q.num_questions} questions — {q.difficulty}
    </div>

  </div>
))}

</div>
)}

{activeView === "flashcards_history" && (

<div style={quizBox}>

{previousFlashcards.length === 0 && (
<div style={{color:"#555"}}>
No saved flashcards yet
</div>
)}

{previousFlashcards.map((card,i)=>(
<div
key={i}
onClick={()=>setOpenCard(openCard === i ? null : i)}
style={{
...question,
cursor:"pointer",
background:"#f4f6f8",
padding:20,
borderRadius:10
}}
>

<h3>{card.question}</h3>

{openCard === i && (
<div style={{marginTop:10,color:"#555"}}>
{card.answer}
</div>
)}

</div>
))}

</div>

)}

{activeView === "results" && (
<div style={box}>
<h2>Results history</h2>

<div style={{marginTop:10,color:"#555"}}>
Your quiz performance history will appear here.
</div>

</div>
)}

</div>


{/* FLASHCARDS OUTPUT */}
{activeView === "flashcards" && generatingFlashcards && (
  <div style={quizBox}>
    <div style={{fontWeight:600}}>
      🧠 Generating flashcards...
    </div>
  </div>
)}
{activeView === "flashcards" && flashcards.length > 0 && (

<div style={quizBox}>

{flashcards.map((card,i)=>(
<div
key={i}
onClick={()=>setOpenCard(openCard === i ? null : i)}
style={{
...question,
cursor:"pointer",
background:"#f4f6f8",
padding:20,
borderRadius:10
}}
>

<h3>{card.question}</h3>

{openCard === i && (
<div style={{marginTop:10,color:"#555"}}>
{card.answer}
</div>
)}

</div>
))}

</div>

)}

{activeView === "quiz" && (
<div style={quizBox}>

{generatingQuiz && (
  <div style={{
    display:"flex",
    alignItems:"center",
    gap:10,
    marginBottom:20,
    fontWeight:600
  }}>
    
    <div style={{
      width:18,
      height:18,
      border:"3px solid #e5e7eb",
      borderTop:"3px solid #2FA4A9",
      borderRadius:"50%",
      animation:"spin 1s linear infinite"
    }}/>

    Generating quiz...
  </div>
)}

{started &&(
  <div style={timer}>
    Time Left: {formatTime()}
  </div>
)}

<div style={{
  height:8,
  background:"#e5e7eb",
  borderRadius:4,
  marginBottom:20
}}>
  <div style={{
    width:`${quiz.length ? (answeredCount/quiz.length)*100 : 0}%`,
    height:"100%",
    background:"#2FA4A9",
    borderRadius:4,
    transition:"width 0.3s"
  }}/>
</div>

{quiz.map((q,i)=>{

  return (
    <div key={i} style={question}>

      <h3>{i+1}. {q.question}</h3>

      {(q.options || []).map((opt:string,j:number)=>{

        const selected = answers[i] === opt;

        const correctRaw = (q.correct ?? "").toString().trim();
        const optTextNorm = opt?.toString().trim().toLowerCase();
        const correctTextNorm = correctRaw.toLowerCase();
        const optLetter = String.fromCharCode(65 + j);

        const correct =
          correctTextNorm === optTextNorm ||
          correctRaw === optLetter ||
          String(Number(correctRaw)) === String(j);

        let color = "#eee";

        if (finished) {
          if (correct) color = "#2FA4A9";
          if (selected && !correct) color = "#ff6b6b";
        } else {
          if (selected) color = "#2FA4A9";
        }

        return(
          <div
            key={j}
            onClick={()=>selectAnswer(i,opt)}
            style={{
              background:color,
              padding:10,
              marginTop:6,
              cursor:"pointer",
              borderRadius:6
            }}
          >
            {String.fromCharCode(65+j)}. {opt}
          </div>
        );
      })}

      {finished && (
        <div style={{
          marginTop: 15,
          padding: 15,
          background: "#f4f6f8",
          borderRadius: 8
        }}>

          {(() => {

  const userAnswer = answers[i];
  const correctRaw = (q.correct ?? "").toString().trim();

  let isCorrect = false;

  q.options.forEach((opt:string,j:number)=>{
    const optTextNorm = opt?.toString().trim().toLowerCase();
    const correctTextNorm = correctRaw.toLowerCase();
    const optLetter = String.fromCharCode(65 + j);

    const correct =
      correctTextNorm === optTextNorm ||
      correctRaw === optLetter ||
      String(Number(correctRaw)) === String(j);

    if (correct && userAnswer === opt) {
      isCorrect = true;
    }
  });

  return isCorrect ? (
    <div style={{color:"#2FA4A9",fontWeight:600}}>
      ✅ Correct answer
    </div>
  ) : (
    <div style={{color:"#ff6b6b",fontWeight:600}}>
      ❌ Wrong answer
    </div>
  );

})()}

          <div style={{marginTop:10}}>
            {q.explanation ? q.explanation : "No explanation provided."}
          </div>

          {q.explanation_long && (
            <div style={{marginTop:10}}>
              <button
                onClick={() =>
                  setExpanded(prev => ({
                    ...prev,
                    [i]: !prev[i]
                  }))
                }
                style={{
                  background:"none",
                  border:"none",
                  color:"#2FA4A9",
                  cursor:"pointer",
                  padding:0
                }}
              >
                {expanded[i] ? "Hide details ▲" : "Extend ▼"}
              </button>
            </div>
          )}

          {expanded[i] && q.explanation_long && (
            <div style={{marginTop:10,lineHeight:1.5}}>
              {q.explanation_long}
            </div>
          )}

          {q.source_document && (
            <div style={{
              marginTop:12,
              fontSize:14,
              color:"#555"
            }}>
              📄 📄 Source: <strong>{q.source_document}</strong>
              {q.source_page ? <> — Page <strong>{q.source_page}</strong></> : null}
            </div>
          )}

        </div>
      )}

    </div>
  );
})}

{started && !finished && (
  <button
    onClick={submitQuiz}
    style={{ ...button, marginTop: 20 }}
  >
    Submit Quiz
  </button>
)}

{finished && (
  <div style={{ marginTop: 20 }}>
    <h2>Score: {score()} / {quiz.length}</h2>
  </div>
)}

</div>
)}


<div style={statusBox}>{status}</div>

</div>  
</div>  

</div>  
</>
);
}
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
  background: "#111827",   // grigio/blu scuro moderno
  color: "white",
  padding: "15px 10%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxSizing: "border-box" as const
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
  padding: "40px 10%",
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

