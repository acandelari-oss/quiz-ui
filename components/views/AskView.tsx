export default function AskView({
askQuestion,
setAskQuestion,
askDocuments,
asking,
chatMessages
}){

return(

<div style={container}>

<h3>Ask your documents</h3>

<div style={chatBox}>

{chatMessages.map((m,i)=>(
<div
key={i}
style={{
display:"flex",
justifyContent: m.role==="user" ? "flex-end":"flex-start",
marginBottom:10
}}
>

<div
style={{
background: m.role==="user" ? "#2563eb":"#1f2937",
padding:"10px 12px",
borderRadius:8,
maxWidth:"70%",
color:"white"
}}
>
{m.content}
</div>

</div>
))}

</div>

<div style={{marginTop:15}}>

<input
placeholder="Ask something about your documents..."
value={askQuestion}
onChange={(e)=>setAskQuestion(e.target.value)}
style={input}
/>

<button onClick={askDocuments} style={button}>
{asking ? "Thinking..." : "Ask"}
</button>

</div>

</div>

)

}

const container={
display:"flex",
flexDirection:"column" as const,
height:"100%"
}

const chatBox={
flex:1,
overflowY:"auto" as const,
marginBottom:10
}

const input={
width:"100%",
padding:"10px",
background:"#111827",
border:"1px solid #374151",
color:"white"
}

const button={
marginTop:8,
padding:"10px",
background:"#2563eb",
color:"white",
border:"none",
cursor:"pointer"
}