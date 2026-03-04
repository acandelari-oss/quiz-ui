import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

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
const [quiz,setQuiz]=useState<any[]>([]);
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


useEffect(() => {
  loadProjects();
}, []);

useEffect(()=>{
  if(!started) return;
  if(timeLeft<=0){
    submitQuiz();
    return;
  }
  const interval=setInterval(()=>{
    setTimeLeft(t=>t-1);
  },1000);
  return ()=>clearInterval(interval);
},[started,timeLeft]);

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
  setProjectId(id);
  setStatus("Project loaded");
  loadDocuments(id);
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
  if(!projectId) return;

  setStatus("Generating...");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    setStatus("Not authenticated");
    return;
  }

  const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz`,
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
    setStatus("Quiz generation failed");
    return;
  }

  const data = await res.json();

let rawQuiz = data.quiz;

if (typeof rawQuiz === "string") {

  rawQuiz = rawQuiz
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    rawQuiz = JSON.parse(rawQuiz);
  } catch (err) {
    console.error("JSON parse error:", rawQuiz);
    setStatus("Quiz format error");
    return;
  }
}

setQuiz(rawQuiz);
console.log("QUIZ DATA:", rawQuiz);
  setStarted(true);
  setFinished(false);
  setTimeLeft(timerMinutes*60);
  setStatus("Quiz started");
}

function selectAnswer(i:number,opt:string){
  if(finished) return;
  setAnswers({...answers,[i]:opt});
}

function submitQuiz(){
  setStarted(false);
  setFinished(true);
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
 
  {/* WRAPPER CONTENUTO */}
  <div style={contentWrapper}>
<header style={header as React.CSSProperties}>
    <style>{spinKeyframes}</style>
<Image src="/logo.png" width={260} height={160} alt="logo"/>
</header>

<div style={topRow}>

<div style={box}>
<h2>Create Project</h2>
<input
placeholder="Project name"
value={projectName}
onChange={e=>setProjectName(e.target.value)}
style={input}
/>
<button onClick={createProject} style={button}>Create</button>
</div>

<div style={box}>
<h2>Load Existing</h2>
<select onChange={e=>selectProject(e.target.value)} style={input}>
<option>Select</option>
{projects.map(p=>(
<option key={p.id} value={p.id}>{p.name}</option>
))}
</select>
</div>

<div style={box}>
<h2>Upload Files</h2>

<input type="file" multiple
onChange={e=>setFiles(e.target.files)}
style={input}
/>

<button
    onClick={() => {
    console.log("UPLOAD CLICKED");
    uploadFiles();
  }}
  disabled={uploading}
  style={{
    ...button,
    opacity: uploading ? 0.6 : 1,
    cursor: uploading ? "not-allowed" : "pointer"
  }}
>
  {uploading ? "Uploading..." : "Upload"}
</button>

<div style={{ marginTop: 10, fontSize: 14, color: "black" }}>
  {uploadStatus}
</div>

{uploading && (
  <div style={{ marginTop: 10 }}>
    <div style={{
      width: 18,
      height: 18,
      border: "3px solid #ddd",
      borderTop: "3px solid #2FA4A9",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      display: "inline-block",
      marginRight: 10
    }} />
    <span>{uploadStatus}</span>
  </div>
)}

{processing && (
  <div style={{ marginTop: 10 }}>
    <div style={{
      width: 18,
      height: 18,
      border: "3px solid #ddd",
      borderTop: "3px solid orange",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      display: "inline-block",
      marginRight: 10
    }} />
    <span>Processing document...</span>
  </div>
)}

{documents.length > 0 && (
  <div style={{marginTop:10}}>
    <strong>Uploaded files:</strong>
    {documents.map((doc,i)=>(
      <div key={i} style={{fontSize:14, marginTop:4}}>
        • {doc.title}
      </div>
    ))}
  </div>
)}

</div>

<div style={box}>
<h2>Generate Quiz</h2>

Questions
<input type="number"
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
  disabled={uploading}
  style={{
    ...button,
    opacity: uploading ? 0.6 : 1,
    cursor: uploading ? "not-allowed" : "pointer"
  }}
>
  {uploading ? "Please wait..." : "Start Quiz"}
</button>

</div>
</div>

<div style={quizBox}>
    {quiz.length > 0 && (
  <div style={{ marginBottom: 15 }}>
    <div style={{ fontSize: 14, marginBottom: 6 }}>
      Answered: <strong>{answeredCount}</strong> / <strong>{quiz.length}</strong>
    </div>
    <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.round((answeredCount / quiz.length) * 100)}%`,
        background: "#2FA4A9",
        transition: "width 0.2s"
      }} />
    </div>
  </div>
)}

{started &&(
  <div style={timer}>
    Time Left: {formatTime()}
  </div>
)}

{quiz.map((q,i)=>{

  return (
    <div key={i} style={question}>

      <h3>{i+1}. {q.question}</h3>

      {q.options.map((opt:string,j:number)=>{

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

      {/* ====================== */}
      {/* SPIEGAZIONE DOPO SUBMIT */}
      {/* ====================== */}

      {finished && (
        <div style={{
          marginTop: 15,
          padding: 15,
          background: "#f4f6f8",
          borderRadius: 8
        }}>

          {/* Messaggio corretto / errato */}
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

          {/* Spiegazione breve */}
          <div style={{marginTop:10}}>
            {q.explanation ? q.explanation : "No explanation provided."}
          </div>

          {/* Bottone Extend */}
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

          {/* Spiegazione lunga */}
          {expanded[i] && q.explanation_long && (
            <div style={{marginTop:10,lineHeight:1.5}}>
              {q.explanation_long}
            </div>
          )}

          {/* Fonte */}
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

</div>  {/* chiusura quizBox */}

<div style={statusBox}>{status}</div>

</div>  {/* chiusura contentWrapper */}

</div>  
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
  padding: "40px 10%"
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