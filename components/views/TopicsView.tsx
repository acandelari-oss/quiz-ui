export default function TopicsView({
  topics,
  loadingTopics,
  topicsOpen,
  setTopicsOpen,
  selectedTopics,
  setSelectedTopics,
  previousFlashcards,
  setSelectedTopic,
  setActiveView,
  summaryStats,
  resultsData
}: any) {
  const topicCounts: { [key: string]: number } = {};
  function normalizeTopic(t?: string) {
  return (t || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  }
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
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 4,
          color: "white",
          marginBottom: 6
        }}
        onClick={() => setTopicsOpen(!topicsOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Topics
          <span style={{ color: "#9ca3af", fontSize: 12 }}>
            {topicsOpen ? "▲" : "▼"}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400, marginTop: 4 }}>
          Select one or more topics to focus your study.
        </span>
      </h3>

      {topicsOpen && (
        <>
          {loadingTopics ? (
            <p style={{ color: "#9ca3af" }}>Loading topics...</p>
          ) : topics.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No topics detected yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Categorization Logic */}
              {Object.entries(
                topics.reduce((acc: any, curr: any) => {
                  const cat = curr.category || "General";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(curr);
                  return acc;
                }, {})
              ).map(([category, categoryTopics]: [string, any]) => (
                <div key={category} style={{ marginBottom: "10px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    borderBottom: "1px solid #374151",
                    paddingBottom: "4px",
                    marginBottom: "10px"
                  }}>

                    <h4 style={{ 
                      color: "#60a5fa", 
                      fontSize: "16px", 
                      textTransform: "uppercase"
                    }}>
                      {category}
                    </h4>

                    {/* 🔥 BOTTONI MACRO */}
                    <div style={{ display: "flex", gap: 6 }}>
                      
                      <button
                        onClick={() => {
                          setSelectedTopics(categoryTopics)
                          setSelectedTopic(null)
                          setActiveView("quiz")
                        }}
                        style={macroBtn("#2563eb")}
                      >
                        Quiz
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map((t: any) => t.topic)

                          console.log("🧠 MEMORY TOPICS:", topics)   // 👈 AGGIUNGI QUESTO

                          setSelectedTopics(topics)
                          setSelectedTopic(null)
                          setActiveView("active_recall")
                        }}
                        style={macroBtn("#f4970c")}
                      >
                        Memory
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map((t: any) => t.topic)
                          setSelectedTopics(topics)
                          setSelectedTopic(null)
                          setActiveView("ask")
                        }}
                        style={macroBtn("#059669")}
                      >
                        Ask
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map((t: any) => t.topic)
                          setSelectedTopics(topics)
                          setActiveView("study_session")
                        }}
                        style={macroBtn("#8b5cf6")}
                      >
                        Study
                      </button>

                    </div>

                  </div>

                  {categoryTopics.map((t: any) => {
                    const value = t.topic;
                    const isSelected = selectedTopics.includes(value);
                    const count = topicCounts[value.toLowerCase()] || 0;

                    return (
                      <div key={value} style={{ marginBottom: "12px", paddingLeft: "4px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedTopics(selectedTopics.filter((x: string) => x !== value));
                              } else {
                                setSelectedTopics([...selectedTopics, value]);
                              }
                            }}
                            style={{ marginTop: "4px", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                              {/* --- QUESTO È LO SPAN MODIFICATO PER I COLORI --- */}
                              <span style={{ 
                                
                                fontSize: "14px", 
                                fontWeight: 500,
                                color: (() => {

                                  console.log("🔥 resultsData RAW:", resultsData)
                                  
                                  const stats = Object.entries(resultsData || {}).find(
                                    ([key]) => {
                                      const cleanKey = normalizeTopic(key)
                                      const cleanValue = normalizeTopic(value)

                                      return cleanKey === cleanValue
                                    }
                                  )?.[1];
                                  console.log("TOPIC:", value, "→ stats:", stats);

                                  if (!stats || stats.total === 0) return "white";

                                  const percentage = (stats.correct / stats.total) * 100;

                                  if (percentage >= 80) return "#22c55e";
                                  if (percentage >= 50) return "#eab308";
                                  return "#ef4444";
                                  console.log("TOPIC:", value)
                                  console.log("RESULTS DATA:", resultsData)
                                })()
                              }}>
                                {value}
                              </span>
                              
                              {/* --- FINE MODIFICA --- */}

                              {count > 0 && (
                                <span style={{ fontSize: 10, color: "#60a5fa", background: "#1e3a8a", padding: "1px 6px", borderRadius: 10 }}>
                                  {count} cards
                                </span>
                              )}
                            </div>
                            
                            {/* Topic Description */}
                            {t.description && (
                              <p style={{ color: "#9ca3af", fontSize: "12px", margin: "4px 0", lineHeight: "1.4" }}>
                                {t.description}
                              </p>
                            )}
                            
                            
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Difficulty Footer */}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #374151", fontSize: 12, color: "#9ca3af" }}>
        Difficulty:
        <span style={{ color: "#22c55e", marginLeft: 8 }}>Easy</span>
        <span style={{ color: "#eab308", marginLeft: 8 }}>Medium</span>
        <span style={{ color: "#ef4444", marginLeft: 8 }}>Hard</span>
      </div>
    </div>
  );
}

const box = {
  marginBottom: 20
};

const macroBtn = (color: string) => ({
  padding: "4px 10px",
  fontSize: "11px",
  background: color,
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer"
})