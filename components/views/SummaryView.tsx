import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useTranslation } from 'react-i18next';


export default function SummaryView({ summaryStats, projectId }){
  console.log("DATI RICEVUTI DAL BACKEND:", summaryStats);

const [flashcardResults, setFlashcardResults] = useState(null)
const { t: translate } = useTranslation();
// 1. PRIMA controlliamo se summaryStats esiste
if (!summaryStats) {
  return (
    <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
      <p>{translate('stats.Loading topics...')}</p>
    </div>
  );
}

// 2. DOPO che siamo sicuri che esiste, dichiariamo topics
const topics = summaryStats?.topics_detail || [];

console.log("Valore di topics calcolato:", topics);

// 3. Poi controlliamo se topics è vuoto
if (topics.length === 0) {
  return (
    <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
      <p>{translate('stats.No topics analyzed yet. Complete a quiz to see your mastery!')}</p>
    </div>
  );
}

// Suddivisione nelle 3 categorie per le colonne
const strongTopics = topics.filter(t => t.score >= 80);
const improvingTopics = topics.filter(t => t.score >= 50 && t.score < 80);
const weakTopics = topics.filter(t => t.score < 50);

useEffect(() => {

  async function loadFlashcardResults() {

    if (!projectId) return

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) return

    try {

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcard_results`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!res.ok) {
        console.log("Error loading flashcard results")
        return
      }

      const dataJson = await res.json()

      console.log("FLASHCARD RESULTS:", dataJson)

      setFlashcardResults(dataJson)

    } catch (err) {
      console.error("Error loading flashcard results", err)
    }
  }

  loadFlashcardResults()

}, [projectId])

if(!summaryStats || Object.keys(summaryStats).length === 0){
return (
<div style={{color:"white"}}>
No data yet
</div>
)
}
console.log("🔍 DEBUG SUMMARY STATS:", summaryStats);
return(

<div>

<h2 style={title}>{translate('stats.Study Summary')}</h2>

<div>

{/* ================= PERFORMANCE ================= */}
<h3 style={sectionTitle}>{translate('stats.Performance')}</h3>

<div style={grid}>

  {flashcardResults && (
    <>
      <div style={card}>
        <h3>{translate('stats.Flashcard Accuracy')}</h3>
        <p>{flashcardResults.accuracy}%</p>
      </div>

      <div style={card}>
        <h3>{translate('stats.Avg Response Time')}</h3>
        <p>{flashcardResults.avg_time}s</p>
      </div>

      <div style={card}>
        <h3>{translate('stats.Total Reviews')}</h3>
        <p>{flashcardResults.total_reviews}</p>
      </div>
    </>
  )}

</div>

{/* ================= COLONNE TOPIC ================= */}
<h3 style={sectionTitle}>{translate('stats.Topic Breakdown')}</h3>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
  
  {/* COLONNA CRITICAL */}
  <div style={columnStyle}>
    <h4 style={{ color: "#ef4444", fontSize: "12px" }}>
      {translate('stats.Critical')} {"(< 50%)"}
    </h4>
    {summaryStats.topics_detail?.filter(t => t.score < 50).map(t => (
      <div key={t.topic} style={miniCardStyle}>{t.topic} ({t.score}%)</div>
    ))}
  </div>

  {/* COLONNA IMPROVING */}
  <div style={columnStyle}>
    <h4 style={{ color: "#eab308", fontSize: "12px" }}>
      {translate('stats.Improving')} {"(50-80%)"}
    </h4>
    {summaryStats.topics_detail?.filter(t => t.score >= 50 && t.score < 80).map(t => (
      <div key={t.topic} style={miniCardStyle}>{t.topic} ({t.score}%)</div>
    ))}
  </div>

  {/* Colonna MASTERED */}
  {/* In SummaryView.tsx */}
<div style={columnStyle}>
  <h4 style={{ color: "#22c55e", fontSize: "12px" }}>{translate('stats.Mastered')} {"> 80%"}</h4>
  {summaryStats.topics_detail?.filter(t => t.score >= 80).map((t, i) => (
    <div key={i} style={miniCardStyle}>
       {t.topic}
       <span style={{ display: 'block', fontSize: '12px' }}>{t.score}% accuracy</span>
    </div>
  ))}
</div>
</div>


{/* ================= STUDY PROGRESS ================= */}
<h3 style={sectionTitle}>{translate('stats.Study Progress')}</h3>

<div style={grid}>

  <div style={card}>
    <h3>{translate('stats.Flashcards Reviewed')}</h3>
    <p>{summaryStats.flashcards_reviewed ?? 0}</p>
  </div>

  <div style={card}>
    <h3>{translate('stats.Topics Studied')}</h3>
    <p>{summaryStats.topics_count ?? 0}</p>
  </div>

</div>


{/* ================= QUIZ ================= */}
<h3 style={sectionTitle}>Quiz</h3>

<div style={grid}>

  <div style={card}>
    <h3>{translate('stats.Quiz Attempts')}</h3>
    <p>{summaryStats.quiz_attempts ?? 0}</p>
  </div>

  <div style={card}>
    <h3>{translate('stats.Average Score')}</h3>
    <p>{summaryStats.avg_score ?? 0}%</p>
  </div>

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

const sectionTitle = {
  color: "#9ca3af",
  marginTop: 30,
  marginBottom: 10,
  fontSize: 14,
  textTransform: "uppercase",
  letterSpacing: 1
}

const columnStyle = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "12px",
  padding: "15px",
  minHeight: "300px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px"
};

const miniCardStyle = {
  background: "#1f2937",
  padding: "12px",
  borderRadius: "8px",
  fontSize: "13px",
  color: "white",
  borderLeft: "4px solid #374151",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
};



