export default function TopicsView({



topics,
loadingTopics,
topicsOpen,
setTopicsOpen,
selectedTopics,
setSelectedTopics,
previousFlashcards,
studyMode
}) {

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
  const id = t.topic + "_" + i
  const value = t.topic
  console.log("TOPIC:", t)

  let color = "#9ca3af"

  if (t.accuracy !== undefined) {
    if (t.accuracy > 70) color = "#22c55e"   // verde
    else if (t.accuracy > 40) color = "#eab308" // giallo
    else color = "#ef4444"   // rosso
  }

  const checked = selectedTopics.includes(value)
  const topicCounts = {}

  if (studyMode === "loaded" && Array.isArray(previousFlashcards)) {
    previousFlashcards.forEach(card => {

      const key = (card.topic || "").trim().toLowerCase()

      if (!key) return

      topicCounts[key] = (topicCounts[key] || 0) + 1

    })
  }

  return (
    <div
      key={id}
      style={{
        padding: "6px 8px",
        background: "#111827",
        border: "1px solid #374151",
        borderRadius: 6,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        color: "white"
      }}
    >

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {

          if (e.target.checked) {
            setSelectedTopics(prev => [...prev, value])
          } else {
            setSelectedTopics(prev =>
              prev.filter(x => x !== value)
            )
          }

        }}
      />

      <div>

        <div style={{ flex: 1 }}>

        <div style={{
          fontWeight: 600,
          color,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{t.topic}</span>

          {studyMode === "loaded" && (
            <span style={{
              marginLeft: 6,
              fontSize: 12,
              color: "#9ca3af"
            }}>
              ({topicCounts[t.topic?.trim().toLowerCase()] || 0})
            </span>
          )}

          {/* 🔥 ACCURACY */}
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color
          }}>
            {t.accuracy ?? 50}%
          </span>
        </div>

        <div style={{ fontSize: 12, marginTop: 2, color: "#9ca3af" }}>
          Page: {t.suggested_page}
        </div>

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