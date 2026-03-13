export default function SummaryView({ summaryStats }){

if(!summaryStats || Object.keys(summaryStats).length === 0){
return (
<div style={{color:"white"}}>
No data yet
</div>
)
}

return(

<div>

<h2 style={title}>Study Summary</h2>

<div style={grid}>

<div style={card}>
<h3>Quiz Attempts</h3>
<p>{summaryStats.quiz_attempts ?? 0}</p>
</div>

<div style={card}>
<h3>Average Score</h3>
<p>{summaryStats.avg_score ?? 0}%</p>
</div>

<div style={card}>
<h3>Flashcards Reviewed</h3>
<p>{summaryStats.flashcards_reviewed ?? 0}</p>
</div>

<div style={card}>
<h3>Topics Studied</h3>
<p>{summaryStats.topics_count ?? 0}</p>
</div>

</div>

</div>

)
}

const title={
color:"white",
marginBottom:30
}

const grid={
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
gap:20
}

const card={
background:"#111827",
border:"1px solid #374151",
padding:25,
borderRadius:12,
color:"white",
textAlign:"center"
}