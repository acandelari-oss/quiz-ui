import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {

const [projectId,setProjectId]=useState("");
const [projectName,setProjectName]=useState("");

const [projects,setProjects]=useState<any[]>([]);

const [files,setFiles]=useState<FileList|null>(null);

const [documents,setDocuments]=useState<any[]>([]);

const [quiz,setQuiz]=useState<any[]>([]);

const [answers,setAnswers]=useState<any>({});

const [status,setStatus]=useState("");


// SETTINGS

const [numQuestions,setNumQuestions]=useState(10);
const [difficulty,setDifficulty]=useState("medium");
const [language,setLanguage]=useState("English");
const [timerMinutes,setTimerMinutes]=useState(0);


// TIMER

const [timeLeft,setTimeLeft]=useState(0);
const [started,setStarted]=useState(false);
const [finished,setFinished]=useState(false);



useEffect(()=>{

loadProjects();

},[]);



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



// PROJECTS


async function loadProjects(){

const res=await fetch("/api/list-projects");

const data=await res.json();

setProjects(data.projects||[]);

}



async function createProject(){

setStatus("Creating...");

const res=await fetch("/api/create-project",{

method:"POST",

headers:{"Content-Type":"application/json"},

body:JSON.stringify({

name:projectName

})

});

const data=await res.json();

setProjectId(data.project_id);

setStatus(`Saved: ${data.name}`);

loadProjects();

}



function selectProject(id:string){

setProjectId(id);

setStatus("Project loaded");

}



// FILES


async function uploadFiles(){

if(!files) return;

setStatus("Uploading...");

const form=new FormData();

form.append("project_id",projectId);

Array.from(files).forEach(f=>form.append("file",f));

await fetch("/api/upload-files",{

method:"POST",

body:form

});

setStatus("Uploaded");

}



// QUIZ


async function generateQuiz(){

setStatus("Generating...");

const res=await fetch("/api/generate-quiz",{

method:"POST",

headers:{"Content-Type":"application/json"},

body:JSON.stringify({

project_id:projectId,

num_questions:numQuestions,

difficulty,

language

})

});

const data=await res.json();

const parsed=typeof data.quiz==="string"

? JSON.parse(data.quiz)

: data.quiz;

setQuiz(parsed);

setStarted(true);

setFinished(false);

setTimeLeft(timerMinutes*60);

setStatus("Quiz started");

}



function selectAnswer(i:number,opt:string){

if(finished) return;

setAnswers({

...answers,

[i]:opt

});

}



function submitQuiz(){

setStarted(false);

setFinished(true);

setStatus("Finished");

}



function score(){

let s=0;

quiz.forEach((q,i)=>{

if(answers[i]===q.correct){

s++;

}

});

return s;

}



// ======================
// RENDER
// ======================


return(

<div style={page}>



<header style={header as React.CSSProperties}>

<Image src="/logo.png" width={260} height={160} alt="logo"/>

</header>



{/* TOP ROW */}



<div style={topRow}>


{/* CREATE */}


<div style={box}>

<h2 style={title}>Create Project</h2>

<input

placeholder="Project name"

value={projectName}

onChange={e=>setProjectName(e.target.value)}

style={input}

/>

<button onClick={createProject} style={button}>Create</button>

</div>



{/* LOAD */}


<div style={box}>

<h2 style={title}>Load Existing</h2>

<select

onChange={e=>selectProject(e.target.value)}

style={input}

>

<option>Select</option>

{projects.map(p=>(

<option key={p.id} value={p.id}>

{p.name}

</option>

))}

</select>

</div>



{/* UPLOAD */}


<div style={box}>

<h2 style={title}>Upload Files</h2>

<input type="file" multiple

onChange={e=>setFiles(e.target.files)}

style={input}

/>

<button onClick={uploadFiles} style={button}>Upload</button>

</div>



{/* SETTINGS */}


<div style={box}>

<h2 style={title}>Generate Quiz</h2>


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



<button onClick={generateQuiz} style={button}>

Start Quiz

</button>


</div>



</div>



{/* QUIZ */}



<div style={quizBox}>



{started &&(

<div style={timer}>

Time Left: {formatTime()}

</div>

)}



{quiz.map((q,i)=>(

<div key={i} style={question}>


<h3>

{i+1}. {q.question}

</h3>



{q.options.map((opt:string,j:number)=>{

const correct=q.correct===opt;

const selected=answers[i]===opt;

let color="#eee";

if(finished){

if(correct) color="#2FA4A9";

else if(selected) color="#ff6b6b";

}

else if(selected) color="#2FA4A9";


return(

<div key={j}

onClick={()=>selectAnswer(i,opt)}

style={{

background:color,

padding:10,

marginTop:6,

cursor:"pointer"

}}

>

{String.fromCharCode(65+j)}. {opt}

</div>

);

})}


</div>

))}



{finished &&(

<div>

<h2>

Score: {score()} / {quiz.length}

</h2>

</div>

)}



</div>



<div style={statusBox}>

{status}

</div>



</div>

);

}



// ======================
// STYLES
// ======================


const page={

padding:"0 10%",

minHeight:"100vh",

background:"linear-gradient(to bottom,#9acfce,#073055)"

};



const header={

textAlign:"center" as const,

marginBottom:20

};



const topRow={

display:"grid",

gridTemplateColumns:"repeat(4,1fr)",

gap:20,

marginBottom:30

};



const box={

background:"white",

padding:20,

borderRadius:10

};



const title={

color:"white",

fontWeight:"bold",

marginBottom:6

};



const quizBox={

background:"white",

padding:30,

borderRadius:10

};



const question={

marginBottom:20

};



const button={

marginTop:10,

background:"#2FA4A9",

color:"white",

padding:10,

border:"none",

borderRadius:6,

cursor:"pointer"

};



const input={

width:"100%",

padding:8,

marginTop:6,

marginBottom:10

};



const timer={

fontSize:22,

marginBottom:20

};



const statusBox={

marginTop:20,

color:"white"

};
