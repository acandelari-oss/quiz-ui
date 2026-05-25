import { useTranslation } from 'react-i18next';

export default function ResultsView({ resultsData }) {
  // Se resultsData non è ancora arrivato, mostriamo un caricamento
  if (!resultsData) {
    return <div style={{ color: "white", padding: 20 }}>Loading results...</div>;
  }
console.log("DEBUG ResultsView...", resultsData)
console.log("TEST DIO")
  const { t: translate } = useTranslation();
  // Estraiamo i dati con dei fallback (array vuoti) per evitare crash .map()
  const topicMastery = resultsData?.topic_mastery || [];
  

  return (
    <div>
      <h2 style={title}>{translate('stats.Results')}</h2>

      

      {/* TOPIC MASTERY in ResultsView.tsx */}
    <div style={section}>
    <h3 style={{ marginBottom: 15 }}>{translate('stats.Topic Mastery')}</h3>
    {topicMastery.length > 0 ? (
        topicMastery.map((t, i) => (
        <div key={i} style={topicRow}>
            <div style={{ color: "white" }}>{t.topic}</div>
            <div style={{ fontWeight: "bold", display: "flex", gap: 6 }}>
              <span style={{ color: "#22c55e" }}>
                {t.correct}
              </span>

              <span style={{ color: "#9ca3af" }}>/</span>

              <span style={{ color: "#ef4444" }}>
                {t.total - t.correct}
              </span>
            </div>
        </div>
        ))
    ) : (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>{translate('stats.No topic data available.')}</p>
    )}
    </div>
    </div>
  );
}

// ... i tuoi stili const rimangono identici ...
const title = { color: "white", marginBottom: 30 };
const section = { background: "#111827", border: "1px solid #374151", padding: 20, borderRadius: 12, marginBottom: 30, color: "white" };
const table = { width: "100%", borderCollapse: "collapse" as const };
const topicRow = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1f2937" };
const th = { textAlign: "left" as const, padding: "10px 0", borderBottom: "1px solid #374151", color: "#9ca3af", fontWeight: 500, fontSize: 14 };
const td = { padding: "12px 0", borderBottom: "1px solid #1f2937", fontSize: 14 };