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
const [selectedTopics,setSelectedTopics]=useState<string[]>([])

const [availableFlashcards,setAvailableFlashcards]=useState(0)
const [studyCount,setStudyCount]=useState(10)

const [summaryStats,setSummaryStats]=useState<any>(null)
const [resultsData,setResultsData]=useState<any>(null)

useEffect(()=>{
async function init(){
const { data } = await supabase.auth.getSession()
if(!data.session) return
await loadProjects()
}
init()
},[])

useEffect(()=>{

if(activeView !== "flashcards") return
if(!projectId) return

setFlashcards([])        // reset sessione di studio
loadFlashcards(projectId)

},[activeView])

useEffect(()=>{

async function init(){

await loadProjects()

}

init()

},[])

useEffect(()=>{
if(!started) return
if(timerMinutes===0) return

const interval=setInterval(()=>{
setTimeLeft(prev=>{
if(prev<=1){
clearInterval(interval)
submitQuiz()
return 0
}
return prev-1
})
},1000)

return()=>clearInterval(interval)

},[started])

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
setLoadingTopics(false)

}

async function loadPreviousQuizzes(projectId:string){

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token
if(!token) return

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/quizzes`,
{headers:{Authorization:`Bearer ${token}`}}
)

if(!res.ok) return

const data=await res.json()

console.log("QUIZZES FROM API:",data)

setPreviousQuizzes(data.quizzes||[])

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

}catch(e){

console.error("FLASHCARDS LOAD ERROR:",e)

}

}

async function loadStudyFlashcards(){

if(previousFlashcards.length === 0) return

const cards = previousFlashcards.slice(0,studyCount)

setFlashcards(cards)
setFlashcards([])
setActiveView("flashcards")

setOpenCard(false)

}


async function loadQuiz(id:string){

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/quizzes/${id}`
)

if(!res.ok) return

const data=await res.json()

setQuiz(data.questions||[])
setAnswers({})
setFinished(false)
setStarted(true)

setActiveView("quiz")

}

async function loadFlashcards(projectId:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if(!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok) return

const data = await res.json()

setFlashcards(data.flashcards || [])

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

async function selectProject(id:string){

const project=projects.find(p=>p.id===id)
setProjectName(project?.name||"")

setStatus("Loading project...")

setProjectId(id)

setDocuments([])
setTopics([])
setQuiz([])
setAnswers({})
setPreviousQuizzes([])
setPreviousFlashcards([])

try{

await loadDocuments(id)
await loadTopics(id)
await loadPreviousQuizzes(id)
//await loadFlashcards(id)
await loadSummary(id)



setStatus("Project loaded")

}catch(e){

console.error("PROJECT LOAD ERROR:",e)
setStatus("Error loading project")

}

}

async function generateQuiz(){

if(!projectId) return

setGeneratingQuiz(true)
setQuiz([])

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz_stream`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
num_questions:numQuestions,
difficulty:difficulty,
language:language
})
}
)

if(!res.ok){
setGeneratingQuiz(false)
return
}

const data=await res.json()

console.log("QUIZ API RESPONSE:", data)
console.log("QUESTIONS LENGTH:", data.questions?.length)

setQuizId(data.quiz_id)

setQuiz(data.questions||[])

await loadPreviousQuizzes(projectId)

setStarted(true)
setFinished(false)

setGeneratingQuiz(false)

setActiveView("quiz")

}

async function generateFlashcards(){

console.log("GENERATE FLASHCARDS FUNCTION RUNNING")

if(!projectId) return

setGeneratingFlashcards(true)

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token

if(!token){
setGeneratingFlashcards(false)
return
}

try{

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_flashcards`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body: JSON.stringify({
num_cards: numQuestions,
topics: selectedTopics
})
}
)

if(!res.ok){
console.error("Flashcards generation failed")
setGeneratingFlashcards(false)
return
}

const data = await res.json()

setFlashcards(data.flashcards || [])
await loadFlashcards(projectId)

setActiveView("flashcards")

}catch(e){

console.error("FLASHCARDS ERROR:",e)

}

setGeneratingFlashcards(false)

}

async function askDocuments(){

if(!projectId) return
if(!askQuestion.trim()) return

setAsking(true)

try{

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/ask`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify({
project_id: projectId,
question: askQuestion,
topics: selectedTopics
})
}
)

if(!res.ok){
setAsking(false)
return
}

const data = await res.json()

setChatMessages([
...chatMessages,
{role:"user",content:askQuestion},
{role:"assistant",content:data.answer}
])

setAskQuestion("")

}catch(e){

console.error("ASK ERROR:",e)

}

setAsking(false)

}

function selectAnswer(i:number,opt:string){

if(finished) return

setAnswers({...answers,[i]:opt})

}

function score(){

let s=0

quiz.forEach((q,i)=>{

const userAnswer=answers[i]
const correctRaw=(q.correct??"").toString().trim()

q.options.forEach((opt:string,j:number)=>{

const optTextNorm=opt.toLowerCase()
const correctTextNorm=correctRaw.toLowerCase()
const optLetter=String.fromCharCode(65+j)

const correct=
correctTextNorm===optTextNorm||
correctRaw===optLetter||
String(Number(correctRaw))===String(j)

if(correct && userAnswer===opt) s++

})

})

return s

}

async function submitQuiz(){

setStarted(false)
setFinished(true)

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token

if(!token) return

await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
quiz_id:quizId,
score:score(),
total_questions:quiz.length
})
}
)

setStatus("Finished")

}

return(

<div style={{display:"flex",height:"100vh"}}>

<Sidebar
activeView={activeView}
setActiveView={setActiveView}
loadResults={loadResults}
projectId={projectId}
/>

<ToolPanel
activeView={activeView}
projectName={projectName}

projects={projects}

createProject={createProject}
selectProject={selectProject}
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
flashcards={flashcards}
openCard={openCard}
setOpenCard={setOpenCard}

files={files}
setFiles={setFiles}
documents={documents}

topics={topics}
loadingTopics={loadingTopics}
topicsOpen={topicsOpen}
setTopicsOpen={setTopicsOpen}
selectedTopics={selectedTopics}
setSelectedTopics={setSelectedTopics}

availableFlashcards={availableFlashcards}
studyCount={studyCount}
setStudyCount={setStudyCount}

status={status}
uploadStatus={uploadStatus}

/>

<Workspace
activeView={activeView}
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
answeredCount={quiz.length}
projectId={projectId}
quizId={quizId}
previousQuizzes={previousQuizzes}
loadQuiz={loadQuiz}
flashcards={flashcards}
openCard={openCard}
setOpenCard={setOpenCard}
summaryStats={summaryStats}
resultsData={resultsData}
/>

</div>

)

}
