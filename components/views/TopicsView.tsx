import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase"; // Il percorso potrebbe variare in base alla tua cartella
import { useTranslation } from 'react-i18next';
import { normalizeTopic } from "../../utils/topic";
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
        console.log(
          "📋 TOPIC DA MAPPARE:",
          topics.map(t => t.title || t.topic)
        );

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
  console.log("🧠 TOPICS RAW:", topics);
  console.log("🔥 RESULTS DATA:", resultsData)
  console.log("🔑 RESULTS KEYS:", Object.keys(resultsData || {}))
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
                          if (!categoryTopics || categoryTopics.length === 0) {
                            alert("No topics found");
                            return;
                          }

                          console.log("🧠 QUIZ CATEGORY TOPICS:", categoryTopics)

                          setSelectedTopics(categoryTopics);
                          
                          // 3. Prendiamo il nome della categoria dal primo topic disponibile
                          // Invece di categoryName che non esiste, usiamo categoryTopics[0].category
                          const currentCat = categoryTopics[0].category;
                             

                          setActiveView("quiz");
                        }}
                        style={macroBtn("#2563eb")}
                      >
                        Quiz
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map(
                            (t: any) => t.title || t.topic
                          )

                          setSelectedTopics(categoryTopics)

                          setSelectedTopic(null)

                          setActiveView("generate_flashcards")

                        }}
                        style={macroBtn("#0b9280")}
                      >
                        Flashcards
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map(
                            (t: any) => t.title || t.topic
                          )

                          console.log("🧠 MEMORY TOPICS:", topics)   // 👈 AGGIUNGI QUESTO

                          setSelectedTopics(categoryTopics)
                          setSelectedTopic(null)
                          setActiveView("active_recall_setup")
                        }}
                        style={macroBtn("#f4970c")}
                      >
                        {translate('stats.Memory')}
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map(
                            (t: any) => t.title || t.topic
                          )
                          setSelectedTopics(categoryTopics)
                          setSelectedTopic(null)
                          setActiveView("ask_setup")
                        }}
                        style={macroBtn("#0a6610")}
                      >
                        {translate('stats.Ask')}
                      </button>

                      <button
                        onClick={() => {
                          const topics = categoryTopics.map(
                            (t: any) => t.title || t.topic
                          )
                          setSelectedTopics(categoryTopics)
                          setActiveView("study_session_setup")
                        }}
                        style={macroBtn("#8b5cf6")}
                      >
                        {translate('stats.Study')}
                      </button>

                    </div>

                  </div>
                  

                  {categoryTopics.map((t: any) => {
                    const topicObj = t;

                    const value = topicObj.topic || topicObj.title;

                    const isSelected = selectedTopics?.some(
                      (x: any) => x.id === t.id
                    )

                    // --- LOG DI EMERGENZA (Apri la console F12 per vederli) ---
                    console.log("🔍 Verifico topic:", value);
                    console.log("📊 Dati Quiz disponibili:", resultsData?.topic_mastery?.length || 0, "elementi");

                    // --- LOGICA FLASHCARDS ---
                    // Cerchiamo il match normalizzando entrambi i lati
                    const statsEntry = Object.entries(flashcardDetailedStats || {}).find(
                      ([key]) =>
                        (key || "")
                          .trim()
                          .toLowerCase() === value.trim().toLowerCase()
                    );
                    
                    const topicStats = statsEntry 
                      ? (statsEntry[1] as any) 
                      : { wrong: 0, hard: 0, good: 0, easy: 0, total: 0 };

                    // --- LOGICA QUIZ ---
                    // Se resultsData.topic_mastery è vuoto, quizStats sarà undefined
                    const quizStats = resultsData?.topic_mastery?.find(
                      (q: any) =>
                        normalizeTopic(q.topic || q.title) ===
                        normalizeTopic(value)
                    );
                    return (
                      <div key={value} style={{ marginBottom: "12px", paddingLeft: "4px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {

                              if (isSelected) {

                                setSelectedTopics(
                                  selectedTopics.filter((x: any) => x.id !== t.id)
                                )

                              } else {

                                setSelectedTopics([
                                  ...selectedTopics,
                                  t
                                ])

                              }

                            }}
                            style={{ marginTop: "4px", cursor: "pointer" }}
                          />

                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "14px", fontWeight: 500, color: "white" }}>
                              {value}
                            </span>

                            <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                              
                              {/* DEBUG: Se vuoi vedere se i dati esistono ma il nome è sbagliato, 
                                  togli il commento alla riga sotto temporarily: */}
                              {/* <span style={{fontSize: '8px', color: 'gray'}}>Debug: {topicStats.total} cards found</span> */}

                              {topicStats.total > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: "bold", minWidth: "80px" }}>
                                    FLASHCARDS:
                                  </span>
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    <span style={{ fontSize: "11px", color: "#ef4444" }}>wrong: {topicStats.wrong}</span>
                                    <span style={{ fontSize: "11px", color: "#f97316" }}>hard: {topicStats.hard}</span>
                                    <span style={{ fontSize: "11px", color: "#3b82f6" }}>good: {topicStats.good}</span>
                                    <span style={{ fontSize: "11px", color: "#22c55e" }}>easy: {topicStats.easy}</span>
                                  </div>
                                </div>
                              )}

                              {quizStats && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ 
                                    fontSize: "11px", 
                                    color:
                                      (quizStats.accuracy || 0) >= 80
                                        ? "#22c55e"
                                        : (quizStats.accuracy || 0) >= 50
                                          ? "#eab308"
                                          : "#ef4444", 
                                    fontWeight: "bold", 
                                    minWidth: "80px" 
                                  }}>
                                    QUIZ:
                                  </span>
                                  <span style={{ fontSize: "11px", color: "white" }}>
                                    {Math.round(quizStats.accuracy || 0)}%
                                  </span>
                                </div>
                              )}
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