export default function TopicsView({



topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics,
previousFlashcards,
studyMode,
setSelectedTopic,
setActiveView

}: any) {

const topicCounts: { [key: string]: number } = {};
  if (Array.isArray(previousFlashcards)) {
    previousFlashcards.forEach((f) => {
      const t = f.topic?.trim().toLowerCase();
      if (t) {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      }
    });
  }

return (

<div style={box}>


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
fontSize:12,
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

{topics.map((t, i) => {
  const value = t.topic;
  const checked = Array.isArray(selectedTopics) && selectedTopics.includes(value);
  const count = topicCounts[value?.trim().toLowerCase()] || 0;

  return (
    <div
      key={i}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        marginBottom: "10px"
      }}
    >
      {/* SINISTRA: Checkbox e Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTopics((prev: string[]) => [...prev, value]);
            } else {
              setSelectedTopics((prev: string[]) => prev.filter((x) => x !== value));
            }
          }}
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: 500, color: "white" }}>{value}</p>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
            Pagina: {t.suggested_page} 
            {count > 0 && <span style={{ color: "#60a5fa", marginLeft: "8px" }}>• {count} Flashcards</span>}
          </div>
        </div>
      </div>

      {/* DESTRA: Bottoni Azione Rapida */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => {
            setSelectedTopic(value);
            setActiveView("quiz");
          }}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Quiz
        </button>
        <button
          onClick={() => {
            setSelectedTopic(value);
            setActiveView("ask");
          }}
          style={{
            padding: "6px 12px",
            fontSize: "11px",
            background: "#059669",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Ask
        </button>

        {/* Bottone STUDY SESSION */}
        <button
          onClick={() => {
            setSelectedTopic(value);
            setActiveView("study_session");
          }}
          style={{
            padding: "6px 12px",
            backgroundColor: "#8b5cf6", // Viola
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
          }}
        >
          Study
        </button>
      </div>
    </div>
  );
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