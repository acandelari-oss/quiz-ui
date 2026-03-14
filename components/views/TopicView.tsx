export default function TopicsView({



topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics
}) {

return (

<div style={box}>
<div style={{color:"red",fontSize:14}}>
TOPICS VIEW DEBUG
</div>

<h3
style={{
cursor:"pointer",
display:"flex",
flexDirection:"column",
alignItems:"flex-start",
gap:4,
color:"white",
marginBottom:6
}}
onClick={()=>setTopicsOpen(!topicsOpen)}
>
<div style={{display:"flex",alignItems:"center",gap:6}}>
Topics
<span style={{color:"#9ca3af",fontSize:12}}>
{topicsOpen ? "▲" : "▼"}
</span>
</div>

<span style={{
fontSize:11,
color:"#9ca3af",
fontWeight:400,
marginTop:4,
lineHeight:1.3
}}>
Select one or more topics to focus your study.
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

<div style={{color:"red",marginBottom:10}}>
TOPICS TEST TEXT
</div>

<div
key={i}
style={{
padding:"6px 8px",
background:"#111827",
border:"1px solid #374151",
borderRadius:6,
fontSize:13,
display:"flex",
alignItems:"center",
gap:8,
width:"100%",
color:"white"
}}
>

<input
type="checkbox"
checked={checked}
onChange={(e)=>{

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