import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase"; // Il percorso potrebbe variare in base alla tua cartella
import { useTranslation } from 'react-i18next';
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
  resultsData,
  projectId
}: any) {
  const { t: translate } = useTranslation();
  const topicCounts: { [key: string]: number } = {};
  function normalizeTopic(t) {
  return (t || "")
    .toLowerCase()
    .replace(/\s+/g, "") // Rimuove tutti gli spazi
    .replace(/[^a-z0-9]/g, "") // Rimuove simboli speciali
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
  
  const [flashcardDetailedStats, setFlashcardDetailedStats] = React.useState<any>({});

  // --- AGGIUNGI QUESTO BLOCCO QUI ---
  React.useEffect(() => {
    const fetchDetailedStats = async () => {
      if (!projectId) return;

      try {
        // 1. Recuperiamo la sessione per avere il token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          console.warn("⚠️ Nessun token trovato");
          return;
        }

        // 2. Facciamo la fetch usando il token e l'URL del backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards_detailed_stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        console.log("🔍 DATI GREZZI DAL SERVER:", data);
        console.log("📋 TOPIC DA MAPPARE:", topics.map(t => t.topic));

        // Prova a forzare un match manuale per il primo topic per vedere se funziona
        const primoTopic = topics[0]?.topic;
        if (primoTopic) {
            console.log(`Test match per ${primoTopic}:`, 
                Object.keys(data).find(k => normalizeTopic(k) === normalizeTopic(primoTopic))
            );
        }
        setFlashcardDetailedStats(data);
      } catch (err) {
        console.error("❌ Errore critico fetch flashcard stats:", err);
      }
    };

    fetchDetailedStats();
  }, [projectId]);
  // ----------------------------------

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
          {translate('stats.Topics')}
          <span style={{ color: "#9ca3af", fontSize: 12 }}>
            {topicsOpen ? "▲" : "▼"}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400, marginTop: 4 }}>
          {translate('stats%.Select one or more topics to focus your study.')}
        </span>
      </h3>

      {topicsOpen && (
        <>
          {loadingTopics ? (
            <p style={{ color: "#9ca3af" }}>{translate('stats.Loading topics...')}</p>
          ) : topics.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>{translate('stats.No topics detected yet')}</p>
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
                        {translate('stats.Memory')}
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
                        {translate('stats.Ask')}
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map((t: any) => t.topic)
                          setSelectedTopics(topics)
                          setActiveView("study_session")
                        }}
                        style={macroBtn("#8b5cf6")}
                      >
                        {translate('stats.Study')}
                      </button>

                    </div>

                  </div>

                  {categoryTopics.map((t: any) => {
                      const value = typeof t === 'string' ? t : t.topic;
                      const isSelected = selectedTopics.includes(value);
                      
                      // --- LOGICA FLASHCARDS ---
                      const statsEntry = Object.entries(flashcardDetailedStats || {}).find(
                          ([key]) => normalizeTopic(key) === normalizeTopic(value)
                      );
                      const topicStats = statsEntry 
                          ? (statsEntry[1] as any) 
                          : { wrong: 0, hard: 0, good: 0, easy: 0, total: 0 };

                      // --- LOGICA QUIZ ---
                      const quizStats: any = Object.entries(resultsData || {}).find(
                          ([key]) => normalizeTopic(key) === normalizeTopic(value)
                      )?.[1];

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
                                <span style={{ fontSize: "14px", fontWeight: 500, color: "white" }}>
                                  {value}
                                </span>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                                
                                {/* RENDER FLASHCARDS */}
                                {topicStats.total > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "10px", color: "#60a5fa", fontWeight: "bold", minWidth: "65px" }}>
                                      FLASHCARDS:
                                    </span>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <span style={{ fontSize: "10px", color: "#ef4444" }}>{translate('stats.wrong')}: {topicStats.wrong}</span>
                                      <span style={{ fontSize: "10px", color: "#f97316" }}>{translate('stats.hard')}: {topicStats.hard}</span>
                                      <span style={{ fontSize: "10px", color: "#3b82f6" }}>{translate('stats.good')}: {topicStats.good}</span>
                                      <span style={{ fontSize: "10px", color: "#22c55e" }}>{translate('stats.easy')}: {topicStats.easy}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* RENDER QUIZ */}
                                {quizStats && quizStats.total > 0 && (() => {
                                    const percentage = (quizStats.correct / quizStats.total) * 100;
                                    let color = "#ef4444";
                                    if (percentage >= 80) color = "#22c55e";
                                    else if (percentage >= 50) color = "#eab308";

                                    return (
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "10px", color: color, fontWeight: "bold", minWidth: "65px" }}>
                                          QUIZ:
                                        </span>
                                        <span style={{ fontSize: "10px", color: "white" }}>
                                          {Math.round(percentage)}{translate('stats%.accuracy')} ({quizStats.total} {translate('stats.total')})
                                        </span>
                                      </div>
                                    );
                                })()}

                              </div>
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
        {translate('stats.Difficulty')}:
        <span style={{ color: "#22c55e", marginLeft: 8 }}>{translate('stats.Easy')}</span>
        <span style={{ color: "#eab308", marginLeft: 8 }}>{translate('stats.Medium')}</span>
        <span style={{ color: "#ef4444", marginLeft: 8 }}>{translate('stats.Hard')}</span>
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