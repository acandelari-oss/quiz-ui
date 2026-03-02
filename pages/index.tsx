import { useState, useEffect } from "react"
import Image from "next/image"

export default function Home(){

// CORE

const [projectId,setProjectId]=useState("")
const [projectName,setProjectName]=useState("")
const [projects,setProjects]=useState<any[]>([])

const [files,setFiles]=useState<FileList|null>(null)
const [documents,setDocuments]=useState<any[]>([])

const [quiz,setQuiz]=useState<any[]>([])


// STATUS

const [statusProject,setStatusProject]=useState("")
const [statusUpload,setStatusUpload]=useState("")
const [statusQuiz,setStatusQuiz]=useState("")


// OPTIONS

const [numQuestions,setNumQuestions]=useState(10)
const [difficulty,setDifficulty]=useState("medium")
const [language,setLanguage]=useState("English")
const [timerMinutes,setTimerMinutes]=useState(0)


// TIMER

const [timeLeft,setTimeLeft]=useState(0)
const [started,setStarted]=useState(false)
const [finished,setFinished]=useState(false)


// ANSWERS

const [answers,setAnswers]=useState<{[key:number]:string}>({})
const [expanded,setExpanded]=useState<{[key:number]:boolean}>({})



// LOAD PROJECTS ON START

useEffect(()=>{

loadProjects()

},[])



// TIMER


useEffect(()=>{

if(!started)return

if(timeLeft<=0){

submitQuiz()

return

}

const i=setInterval(()=>{

setTimeLeft(t=>t-1)

},1000)

return()=>clearInterval(i)

},[started,timeLeft])




// LOAD PROJECTS


async function loadProjects(){

try{

const res=await fetch("/api/list-projects")

const data=await res.json()

setProjects(data.projects || [])

}catch{

setProjects([])

}

}



// CREATE PROJECT


async function createProject(){

setStatusProject("Creating...")

const res=await fetch("/api/create-project",{

method:"POST",

headers:{ "Content-Type":"application/json" },

body:JSON.stringify({

name:projectName || "My Project"

})

})

const data=await res.json()

if(!data.project_id){

setStatusProject("Error")

return

}

setProjectId(data.project_id)

setProjectName(data.project_name)

setStatusProject("Saved: "+data.project_name)

loadProjects()

}



// SELECT PROJECT


function selectProject(e:any){

const id=e.target.value

setProjectId(id)

loadDocuments(id)

}



// LOAD DOCUMENTS


async function loadDocuments(pid:string){

const res=await fetch(`/api/list-documents?project_id=${pid}`)

const data=await res.json()

setDocuments(data.documents || [])

}



// UPLOAD FILES


async function uploadFiles(){

if(!files || !projectId){

setStatusUpload("Select project first")

return

}

setStatusUpload("Uploading...")

const formData=new FormData()

formData.append("project_id",projectId)

Array.from(files).forEach(f=>formData.append("file",f))

const res=await fetch("/api/upload-files",{

method:"POST",

body:formData

})

if(res.ok){

setStatusUpload("Uploaded")

loadDocuments(projectId)

}else{

setStatusUpload("Failed")

}

}



// GENERATE QUIZ


async function generateQuiz(){

if(!projectId){

setStatusQuiz("Select project first")

return

}

setStatusQuiz("Generating...")

const res=await fetch("/api/generate-quiz",{

method:"POST",

headers:{ "Content-Type":"application/json" },

body:JSON.stringify({

project_id:projectId,

num_questions:numQuestions,

difficulty,

language

})

})

const data=await res.json()

let parsed:any[]=[]


if(Array.isArray(data.quiz)) parsed=data.quiz

else if(typeof data.quiz==="string"){

try{

parsed=JSON.parse(data.quiz)

}catch{}

}

else if(Array.isArray(data)) parsed=data


if(!parsed.length){

setStatusQuiz("Backend returned no quiz")

return

}


setQuiz(parsed)

setStarted(true)

setFinished(false)

setTimeLeft(timerMinutes*60)

setStatusQuiz("Started")

}



// SELECT ANSWER


function selectAnswer(i:number,opt:string){

if(finished)return

setAnswers({

...answers,

[i]:opt

})

}



// SUBMIT


function submitQuiz(){

setFinished(true)

setStarted(false)

setStatusQuiz("Finished")

}



// SCORE


function score(){

let c=0

quiz.forEach((q,i)=>{

if(answers[i]===q.correct) c++

})

return c

}



// TIME FORMAT


function formatTime(){

const m=Math.floor(timeLeft/60)

const s=timeLeft%60

return `${m}:${s.toString().padStart(2,"0")}`

}



// ================= UI =================


return(

<div style={page}>


<header style={header}>

<Image src="/logo.png" width={260} height={160} alt="logo"/>

</header>


<div style={row}>


{/* CREATE PROJECT */}


<div style={box}>


<h3 style={title}>Create Project</h3>


<input

placeholder="Project name"

value={projectName}

onChange={(e)=>setProjectName(e.target.value)}

/>


<button onClick={createProject} style={button}>

Save

</button>


<p>{statusProject}</p>


<select onChange={selectProject} value={projectId}>


<option value="">Load existing</option>


{projects.map(p=>(

<option key={p.id} value={p.id}>

{p.name}

</option>

))}


</select>


</div>



{/* UPLOAD */}


<div style={box}>


<h3 style={title}>Upload</h3>


<input type="file" multiple

onChange={(e)=>setFiles(e.target.files)}

/>


<button onClick={uploadFiles} style={button}>

Upload

</button>


<p>{statusUpload}</p>


<ul>

{documents.map(d=>(

<li key={d.id}>{d.title}</li>

))}

</ul>


</div>



{/* SETTINGS */}


<div style={box}>


<h3 style={title}>Generate Quiz</h3>


Questions

<input type="number"

value={numQuestions}

onChange={(e)=>setNumQuestions(Number(e.target.value))}

/>


Difficulty

<select value={difficulty}

onChange={(e)=>setDifficulty(e.target.value)}>

<option>easy</option>

<option>medium</option>

<option>hard</option>

</select>


Language

<select value={language}

onChange={(e)=>setLanguage(e.target.value)}>

<option>English</option>

<option>Italian</option>

</select>


Timer

<input type="number"

value={timerMinutes}

onChange={(e)=>setTimerMinutes(Number(e.target.value))}

/>


<button onClick={generateQuiz} style={button}>

Start

</button>


<p>{statusQuiz}</p>


</div>


</div>



{/* TIMER */}


{started &&

<div style={timer}>

Time: {formatTime()}

</div>

}



{/* QUIZ */}


{quiz.map((q,i)=>(

<div key={i} style={question}>


<b>

{i+1}. {q.question}

</b>


{q.options?.map((opt:string,j:number)=>{


const letter=String.fromCharCode(65+j)

const correct=q.correct===opt

const selected=answers[i]===opt


let bg="#eee"


if(finished && selected && correct)

bg="#2FA4A9"


if(finished && selected && !correct)

bg="#ffb3b3"


return(

<div key={j}

onClick={()=>selectAnswer(i,opt)}

style={{background:bg,padding:10,marginTop:5,cursor:"pointer"}}>

{letter}. {opt}

</div>

)

})}



{finished &&

<button

onClick={()=>setExpanded({

...expanded,

[i]:!expanded[i]

})}>

Extended explanation

</button>

}


{expanded[i] &&

<div style={explanation}>

{q.explanation}

</div>

}


</div>

))}



{finished &&

<div>

Score: {score()} / {quiz.length}

</div>

}


</div>

)

}



// ================= STYLES =================


const page={

padding:"5%",

background:"linear-gradient(#9acfce,#073055)",

minHeight:"100vh",

fontFamily:"Nunito"

}

const header={

textAlign:"center",

marginBottom:30

}

const row={

display:"grid",

gridTemplateColumns:"1fr 1fr 1fr",

gap:20

}

const box={

background:"white",

padding:20,

borderRadius:12

}

const title={

color:"#073055"

}

const button={

marginTop:10,

background:"#2FA4A9",

color:"white",

border:"none",

padding:10,

borderRadius:6

}

const question={

marginTop:30,

background:"white",

padding:20,

borderRadius:12

}

const explanation={

background:"#dff0d8",

padding:10,

marginTop:10

}

const timer={

color:"white",

fontSize:22,

marginTop:20

}