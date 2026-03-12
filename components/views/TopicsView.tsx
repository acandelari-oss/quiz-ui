export default function TopicsView({
topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics,
setAskQuestion,
activeView
}) {

return (

<div style={box}>

<h3
style={{
cursor:"pointer",
display:"flex",
alignItems:"center",
gap:8,
color:"white",
marginBottom:6
}}
onClick={()=>setTopicsOpen(!topicsOpen)}
>
Topics
<span style={{color:"#9ca3af",fontSize:12,marginLeft:6}}>
{topicsOpen ? "▲" : "▼"}
</span>
</h3>

{topicsOpen && (

<>

{loadingTopics ? (
<p style={{color:"#9ca3af"}}>Loading topics...</p>
) : topics.length === 0 ? (
<p style={{color:"#9ca3af"}}>No topics detected yet</p>
) : null}

<div
style={{
marginTop:10,
display:"flex",
flexDirection:"column",
gap:6,
width:"100%"
}}
>

{topics.map((t,i)=>{

let color="#9ca3af"

if(t.difficulty==="easy") color="#22c55e"
if(t.difficulty==="medium") color="#eab308"
if(t.difficulty==="hard") color="#ef4444"

const checked=selectedTopics.includes(t.topic)

return(

<div
key={i}
style={{
display:"flex",
alignItems:"center",
gap:6,
fontSize:13,
color:"white"
}}
>

<input
type="checkbox"
checked={checked}
onChange={(e)=>{

// comportamento speciale per ASK
if(activeView === "ask"){
setAskQuestion(`Explain ${t.topic}`)
return
}

// comportamento normale quiz/flashcards
if(e.target.checked){

setSelectedTopics([...selectedTopics,t.topic])

}else{

setSelectedTopics(
selectedTopics.filter(x=>x!==t.topic)
)

}

}}
/>

<div>

<div style={{fontWeight:600,color}}>
{t.topic}
</div>

<div style={{fontSize:12,marginTop:2,color:"#9ca3af"}}>
Page: {t.suggested_page}
</div>

</div>

</div>

)

})}

</div>

<div
style={{
marginTop:12,
fontSize:12,
color:"#9ca3af"
}}
>
Difficulty:
<span style={{color:"#22c55e",marginLeft:8}}>Easy</span>
<span style={{color:"#eab308",marginLeft:8}}>Medium</span>
<span style={{color:"#ef4444",marginLeft:8}}>Hard</span>
</div>

</>

)}

</div>

)

}

const box = {
marginBottom:20
}