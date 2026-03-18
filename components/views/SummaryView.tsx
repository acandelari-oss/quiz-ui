import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function SummaryView({ summaryStats, projectId }){

const [flashcardResults, setFlashcardResults] = useState(null)

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

return(

<div>

<h2 style={title}>Study Summary</h2>

<div>

{/* ================= PERFORMANCE ================= */}
<h3 style={sectionTitle}>Performance</h3>

<div style={grid}>

  {flashcardResults && (
    <>
      <div style={card}>
        <h3>Flashcard Accuracy</h3>
        <p>{flashcardResults.accuracy}%</p>
      </div>

      <div style={card}>
        <h3>Avg Response Time</h3>
        <p>{flashcardResults.avg_time}s</p>
      </div>

      <div style={card}>
        <h3>Total Reviews</h3>
        <p>{flashcardResults.total_reviews}</p>
      </div>
    </>
  )}

</div>


{/* ================= STUDY PROGRESS ================= */}
<h3 style={sectionTitle}>Study Progress</h3>

<div style={grid}>

  <div style={card}>
    <h3>Flashcards Reviewed</h3>
    <p>{summaryStats.flashcards_reviewed ?? 0}</p>
  </div>

  <div style={card}>
    <h3>Topics Studied</h3>
    <p>{summaryStats.topics_count ?? 0}</p>
  </div>

</div>


{/* ================= QUIZ ================= */}
<h3 style={sectionTitle}>Quiz</h3>

<div style={grid}>

  <div style={card}>
    <h3>Quiz Attempts</h3>
    <p>{summaryStats.quiz_attempts ?? 0}</p>
  </div>

  <div style={card}>
    <h3>Average Score</h3>
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
