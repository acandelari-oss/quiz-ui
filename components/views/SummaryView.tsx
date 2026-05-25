import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useTranslation } from 'react-i18next';

// Nota: Ho aggiunto resultsData tra le props perché lo useremo per la Topic Mastery
export default function SummaryView({ summaryStats, projectId, resultsData }) {
  const { t: translate } = useTranslation();
  const [flashcardResults, setFlashcardResults] = useState(null);

  // 🕵️ LOG DI CONTROLLO INIZIALE
  console.log("%c--- 🔎 DEBUG SUMMARY VIEW ---", "color: #3b82f6; font-weight: bold; font-size: 14px;");
  console.log("1. Project ID:", projectId);
  console.log("2. summaryStats ricevuti:", summaryStats);
  console.log("3. resultsData ricevuti:", resultsData);

  const topicMastery = resultsData?.topic_mastery || [];

  useEffect(() => {
    async function loadFlashcardResults() {
      if (!projectId) return;
      console.log("🔄 Caricamento flashcard_results per progetto:", projectId);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcard_results`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.ok) {
          const dataJson = await res.json();
          console.log("✅ FLASHCARD RESULTS CARICATI:", dataJson);
          setFlashcardResults(dataJson);
        }
      } catch (err) {
        console.error("❌ Errore caricamento flashcard results:", err);
      }
    }
    loadFlashcardResults();
  }, [projectId]);

  // 1. Validazione dati
  if (
    !resultsData ||
    Object.keys(resultsData).length === 0
  ) {
    console.log(
      "%c⚠️ ATTENZIONE: resultsData è vuoto o null",
      "color: #f59e0b; font-weight: bold;"
    );

    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#9ca3af"
        }}
      >
        <p>{translate('stats.Loading topics...')}</p>
      </div>
    );
  }

  const topics = resultsData?.topics_detail || [];

  return (
    <div style={{ padding: 20,  }}>
    

      <h2 style={title}>{translate('stats.Study Summary')}</h2>

      {/* ================= SEZIONE TOPIC MASTERY (Ex ResultsView) ================= */}
      <div style={section}>
        <h3 style={{ marginBottom: 15, color: "#22c55e" }}>🎯 {translate('stats.Topic Mastery')}</h3>
        {topicMastery.length > 0 ? (
          topicMastery.map((t, i) => (
            <div key={i} style={topicRow}>
              <div style={{ color: "white" }}>{t.topic}</div>
              <div style={{ fontWeight: "bold", display: "flex", gap: 6 }}>
                <span style={{ color: "#22c55e" }}>{t.correct}</span>
                <span style={{ color: "#9ca3af" }}>/</span>
                <span style={{ color: "#ef4444" }}>{t.total - t.correct}</span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>{translate('stats.No topic data available.')}</p>
        )}
      </div>

      {/* ================= QUIZ PERFORMANCE ================= */}

      <h3 style={sectionTitle}>
        🧠 {translate('stats.Quiz Performance')}
      </h3>

      <div style={grid}>

        {/* QUIZ TAKEN */}
        <div style={card}>
          <h3 style={cardLabel}>
            {translate('stats.Quiz Taken')}
          </h3>

          <p style={cardValue}>
            {resultsData.quiz_attempts ?? 0}
          </p>
        </div>

        {/* CORRECT / WRONG */}
        <div style={card}>
          <h3 style={cardLabel}>
            {translate('stats.Correct / Wrong')}
          </h3>

          <p style={cardValue}>
            <span style={{ color: "#22c55e" }}>
              {resultsData.total_correct ?? 0}
            </span>

            {" / "}

            <span style={{ color: "#ef4444" }}>
              {resultsData.total_wrong ?? 0}
            </span>
          </p>
        </div>

        {/* AVG ACCURACY */}
        <div style={card}>
          <h3 style={cardLabel}>
            {translate('stats.Average Accuracy')}
          </h3>

          <p style={cardValue}>
            {resultsData.average_accuracy ?? 0}%
          </p>
        </div>

        {/* WEAK AREAS */}
        <div style={card}>
          <h3 style={cardLabel}>
            ⚠️ {translate('stats.Weak Areas')}
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 10
            }}
          >
            {(resultsData.weak_areas || [])
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 3)
                .map((t, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: "white"
                }}
              >
                <div>{t.topic}</div>

                <div
                  style={{
                    color: "#ef4444",
                    fontSize: 11
                  }}
                >
                  {t.accuracy}%
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
      {/* ================= FLASHCARD PERFORMANCE ================= */}

      <h3 style={sectionTitle}>
        📚 {translate('stats.Flashcard Performance')}
      </h3>

      <div style={grid}>

        {/* TOTAL REVIEWS */}
        <div style={card}>
          <h3 style={cardLabel}>
            {translate('stats.Total Reviews')}
          </h3>

          <p style={cardValue}>
            {resultsData.flashcard_reviews ?? 0}
          </p>
        </div>

        {/* FLASHCARD ACCURACY */}
        <div style={card}>
          <h3 style={cardLabel}>
            {translate('stats.Recall Accuracy')}
          </h3>

          <p style={cardValue}>
            {resultsData.flashcard_accuracy ?? 0}%
          </p>
        </div>

        <div style={card}>
          <h3 style={cardLabel}>
            Due Today
          </h3>

          <p style={cardValue}>
            {resultsData.due_today ?? 0}
          </p>
        </div>

      </div>

      <h3 style={sectionTitle}>
  🧠 Weak Retention Topics
      </h3>

      <div style={section}>

        {(resultsData.forgotten_topics || []).length > 0 ? (

          resultsData.forgotten_topics.map((t, i) => (

            <div
              key={i}
              style={topicRow}
            >
              <div style={{ color: "white" }}>
                {t.topic}
              </div>

              <div style={{
                color: "#ef4444",
                fontWeight: "bold"
              }}>
                {t.accuracy}%
              </div>
            </div>

          ))

        ) : (

          <p style={{ color: "#9ca3af" }}>
            No weak retention topics yet.
          </p>

        )}

      </div>

      {/* ================= TOPIC BREAKDOWN (Colonne) ================= */}
      <h3 style={sectionTitle}>{translate('stats.Topic Breakdown')}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
        
        {/* COLONNA CRITICAL */}
        <div style={columnStyle}>
          <h4 style={{ color: "#ef4444", fontSize: "12px", marginBottom: 10 }}>{translate('stats.Critical')} {"(< 50%)"}</h4>
          {topics.filter(t => t.accuracy < 50).map((t, i) => (
            <div key={i} style={miniCardStyle}>{t.topic} ({t.accuracy}%)</div>
          ))}
        </div>

        {/* COLONNA IMPROVING */}
        <div style={columnStyle}>
          <h4 style={{ color: "#eab308", fontSize: "12px", marginBottom: 10 }}>{translate('stats.Improving')} {"(50-80%)"}</h4>
          {topics.filter(t => t.accuracy >= 50 && t.accuracy < 80).map((t, i) => (
            <div key={i} style={miniCardStyle}>{t.topic} ({t.accuracy}%)</div>
          ))}
        </div>

        {/* COLONNA MASTERED */}
        <div style={columnStyle}>
          <h4 style={{ color: "#22c55e", fontSize: "12px", marginBottom: 10 }}>{translate('stats.Mastered')} {"> 80%"}</h4>
          {topics.filter(t => t.accuracy >= 80).map((t, i) => (
            <div key={i} style={miniCardStyle}>
               {t.topic}
               <span style={{ display: 'block', fontSize: '11px', opacity: 0.7 }}>{t.accuracy}% accuracy</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= PROGRESS & QUIZ ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <div style={card}>
            <h3 style={cardLabel}>{translate('stats.Topics Studied')}</h3>
            <p style={cardValue}>{resultsData.topics_count ?? 0}</p>
          </div>
          <div style={card}>
            <h3 style={cardLabel}>{translate('stats.Average Score')}</h3>
            <p style={cardValue}>{resultsData.avg_score ?? 0}%%</p>
          </div>
      </div>
    </div>
  );
}

// STILI
const title = { color: "white", marginBottom: 20, fontSize: "24px" };
const section = { background: "#111827", border: "1px solid #374151", padding: 20, borderRadius: 12, marginBottom: 30 };
const topicRow = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1f2937" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15 };
const card = { background: "#111827", border: "1px solid #374151", padding: 20, borderRadius: 12, textAlign: "center" as const };
const cardLabel = { color: "#9ca3af", fontSize: "12px", marginBottom: 8, textTransform: "uppercase" as const };
const cardValue = { color: "white", fontSize: "20px", fontWeight: "bold" };
const sectionTitle = { color: "#9ca3af", marginTop: 30, marginBottom: 15, fontSize: "13px", textTransform: "uppercase" as const, letterSpacing: 1 };
const columnStyle = { background: "#111827", border: "1px solid #374151", borderRadius: "12px", padding: "15px", minHeight: "200px" };
const miniCardStyle = { background: "#1f2937", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "white", marginBottom: "8px", borderLeft: "3px solid #3b82f6" };