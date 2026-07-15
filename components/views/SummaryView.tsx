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
  const focusTopics = [...topics]
    .filter(t => t.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)

  const improvingTopics = [...topics]
    .filter(t => t.accuracy >= 50 && t.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)

  const masteredTopics = [...topics]
    .filter(t => t.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)

  return (
    <div className="summary-mobile-root" style={{ padding: 20,  }}>
    

      {/* ================= QUIZ PERFORMANCE ================= */}

      <h3 style={sectionTitle}>
        <img
            src="/icons/quiz-side.svg"
            alt=""
            width={24}
            height={24}
          /> {translate('stats.Quiz Performance')}
      </h3>

      <div
        className="summary-mobile-quiz-performance-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 2fr",
          gap: 15
        }}
      >

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
          <div className="summary-mobile-wide-card" style={card}>
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
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                      color: "white"
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {t.topic}
                    </span>

                    <span
                      style={{
                        color: "#ef4444",
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0
                      }}
                    >
                      {t.accuracy}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
      </div>
      {/* ================= FLASHCARD PERFORMANCE ================= */}

      <h3 style={sectionTitle}>
        <img
            src="/icons/flashcards-side.svg"
            alt=""
            width={24}
            height={24}
          /> {translate('stats.Flashcard Performance')}
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
            {translate('stats.Due Today')}
          </h3>

          <p style={cardValue}>
            {resultsData.due_today ?? 0}
          </p>
        </div>

      </div>
      <h3 style={sectionTitle}>
        <img
            src="/icons/summary-side.svg"
            alt=""
            width={24}
            height={24}
          /> Learning Insights
      </h3>
      <div
        className="summary-mobile-insights-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
          marginTop: 20
        }}
      >
      <div style={columnStyle}>
        <h4
          style={{
            color: "#ef4444",
            marginBottom: 15
          }}
        >
          <img
            src="/icons/focus-side.svg"
            alt=""
            width={24}
            height={24}
          /> {translate('stats.Topics You Should Focus On')}
        </h4>

        {focusTopics.map((t, i) => (
          <div key={i} className="learning-insight-mini-row" style={miniCardStyle}>
            <span className="learning-insight-topic-text">{t.topic}</span>

            <span
              className="learning-insight-percentage"
              style={{
                float: "right",
                color: "#ef4444"
              }}
            >
              {t.accuracy}%
            </span>
          </div>
        ))}
      </div>
      <div style={columnStyle}>
        <h4
          style={{
            color: "#eab308",
            marginBottom: 15
          }}
        >
          <img
            src="/icons/doubt-side.svg"
            alt=""
            width={24}
            height={24}
          /> {translate('stats.Topics You Still Have Some Doubts')}
        </h4>

        {improvingTopics.map((t, i) => (
          <div key={i} className="learning-insight-mini-row" style={miniCardStyle}>
            <span className="learning-insight-topic-text">{t.topic}</span>

            <span
              className="learning-insight-percentage"
              style={{
                float: "right",
                color: "#eab308"
              }}
            >
              {t.accuracy}%
            </span>
          </div>
        ))}
      </div>
      <div style={columnStyle}>
        <h4
          style={{
            color: "#22c55e",
            marginBottom: 15
          }}
        >
          <img
            src="/icons/master-side.svg"
            alt=""
            width={24}
            height={24}
          /> {translate('stats.Wow, You Master This Topic')}
        </h4>

        {masteredTopics.map((t, i) => (
          <div key={i} className="learning-insight-mini-row" style={miniCardStyle}>
            <span className="learning-insight-topic-text">{t.topic}</span>

            <span
              className="learning-insight-percentage"
              style={{
                float: "right",
                color: "#22c55e"
              }}
            >
              {t.accuracy}%
            </span>
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
            <h3 style={cardLabel}>
              Topics Requiring Attention
            </h3>

            <p style={cardValue}>
              {focusTopics.length}
            </p>
          </div>
      </div>
      <style jsx global>{`
        @media (max-width: 900px) {
          .summary-mobile-root {
            padding: 12px !important;
          }

          .summary-mobile-quiz-performance-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .summary-mobile-wide-card {
            grid-column: 1 / -1;
            text-align: left !important;
          }

          .summary-mobile-quiz-performance-grid > div:not(.summary-mobile-wide-card) p {
            font-size: 16px !important;
          }

          .summary-mobile-wide-card h3 {
            text-align: left !important;
          }

          .summary-mobile-insights-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            margin-top: 12px !important;
          }

          .learning-insight-mini-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 8px !important;
            border-left: none !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
          }

          .learning-insight-topic-text {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .learning-insight-percentage {
            float: none !important;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}

// STILI
const title = { color: "white", marginBottom: 20, fontSize: "24px" };
const section = { background: "#111827", border: "1px solid #374151", padding: 20, borderRadius: 12, marginBottom: 30 };
const topicRow = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1f2937" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15 };
const card = { background: "#080a10", border: "1px solid #374151", padding: 20, borderRadius: 12, textAlign: "center" as const };
const cardLabel = { color: "#9ca3af", fontSize: "12px", marginBottom: 8, textTransform: "uppercase" as const };
const cardValue = { color: "white", fontSize: "20px", fontWeight: "bold" };
const sectionTitle = { color: "#9ca3af", marginTop: 30, marginBottom: 15, fontSize: "13px", textTransform: "uppercase" as const, letterSpacing: 1 };
const columnStyle = { background: "#080a10", border: "1px solid #374151", borderRadius: "12px", padding: "15px", minHeight: "200px" };
const miniCardStyle = { background: "#1f2937", padding: "10px", borderRadius: "8px", fontSize: "14px", color: "white", marginBottom: "8px", borderLeft: "3px solid #3b82f6" };
