export default function ResultsView({resultsData}){

if(!resultsData){
return <div style={{color:"white"}}>No results yet</div>
}

return(

<div>

<h2 style={title}>Results</h2>

{/* QUIZ HISTORY */}

<div style={section}>

<h3>Quiz History</h3>

<table style={table}>

<thead>
<tr>
<th style={th}>Date</th>
<th style={th}>Score</th>
<th style={th}>Difficulty</th>
</tr>
</thead>

<tbody>

{resultsData.quiz_history.map((q,i)=>(
<tr key={i}>
<td style={td}>{new Date(q.date).toLocaleDateString()}</td>
<td style={td}>{q.score}/{q.total}</td>
<td style={td}>{q.difficulty}</td>
</tr>
))}

</tbody>

</table>

</div>

{/* TOPIC MASTERY */}

<div style={section}>

<h3>Topic Mastery</h3>

{resultsData.topic_mastery.map((t,i)=>(

<div key={i} style={topicRow}>

<div>{t.topic}</div>

<div>{t.accuracy}%</div>

</div>

))}

</div>

</div>

)

}

const title={
color:"white",
marginBottom:30
}

const section={
background:"#111827",
border:"1px solid #374151",
padding:20,
borderRadius:12,
marginBottom:30,
color:"white"
}

const table={
width:"100%",
borderCollapse:"collapse"
}

const topicRow={
display:"flex",
justifyContent:"space-between",
padding:"10px 0",
borderBottom:"1px solid #1f2937"
}

const th={
textAlign:"left",
padding:"10px 0",
borderBottom:"1px solid #374151",
color:"#9ca3af",
fontWeight:500,
fontSize:14
}

const td={
padding:"12px 0",
borderBottom:"1px solid #1f2937",
fontSize:14
}