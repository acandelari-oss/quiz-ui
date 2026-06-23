import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase"; // Il percorso potrebbe variare in base alla tua cartella
import { useTranslation } from 'react-i18next';
import { normalizeTopic } from "../../utils/topic";
import {
  logCategoryScope,
  resolveCategoryTopicObjects
} from "../../utils/topics";
export default function TopicsView({
  
  topics,
  loadingTopics,
  topicsOpen,
  setTopicsOpen,
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

  const launchCategoryFeature = (
    category: string,
    destination: string
  ) => {
    const resolvedTopics = resolveCategoryTopicObjects(
      category,
      topics || []
    )

    logCategoryScope(category, resolvedTopics)
    setSelectedTopics(resolvedTopics)
    setSelectedTopic(null)
    setActiveView(destination)
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
              ).map(([category, categoryTopics]: [string, any]) => {

                const totalQuizQuestions = categoryTopics.reduce(
                  (sum: number, topic: any) => {
                    const stats = resultsData?.topic_mastery?.find(
                      (q: any) =>
                        normalizeTopic(q.topic || q.title) ===
                        normalizeTopic(topic.topic || topic.title)
                    )

                    return sum + (stats?.total || 0)
                  },
                  0
                )
                const quizTotals = categoryTopics.reduce(
                  (acc: any, topic: any) => {

                    const stats = resultsData?.topic_mastery?.find(
                      (q: any) =>
                        normalizeTopic(q.topic || q.title) ===
                        normalizeTopic(topic.topic || topic.title)
                    )

                    if (!stats) return acc

                    acc.correct += stats.correct || 0
                    acc.total += stats.total || 0

                    return acc

                  },
                  {
                    correct: 0,
                    total: 0
                  }
                )
                const quizAverage =
                  quizTotals.total > 0
                    ? Math.round(
                        (quizTotals.correct / quizTotals.total) * 100
                      )
                    : 0

                const totalFlashcards = categoryTopics.reduce(
                  (sum: number, topic: any) => {
                    const value = topic.topic || topic.title

                    const statsEntry = Object.entries(
                      flashcardDetailedStats || {}
                    ).find(
                      ([key]) =>
                        key.trim().toLowerCase() ===
                        value.trim().toLowerCase()
                    )

                    const stats = statsEntry
                      ? (statsEntry[1] as any)
                      : null

                    return sum + (stats?.total || 0)
                  },
                  0
                )

                const flashcardTotals = categoryTopics.reduce(
                  (acc: any, topic: any) => {

                    const value = topic.topic || topic.title

                    const statsEntry = Object.entries(
                      flashcardDetailedStats || {}
                    ).find(
                      ([key]) =>
                        key.trim().toLowerCase() ===
                        value.trim().toLowerCase()
                    )

                    const stats = statsEntry
                      ? (statsEntry[1] as any)
                      : null

                    if (!stats) return acc

                    acc.wrong += stats.wrong || 0
                    acc.hard += stats.hard || 0
                    acc.good += stats.good || 0
                    acc.easy += stats.easy || 0

                    return acc

                  },
                  {
                    wrong: 0,
                    hard: 0,
                    good: 0,
                    easy: 0
                  }
                )
                const totalReviews =
                  flashcardTotals.wrong +
                  flashcardTotals.hard +
                  flashcardTotals.good +
                  flashcardTotals.easy

                const flashcardMastery =
                  totalReviews > 0
                    ? Math.round(
                        (
                          (
                            flashcardTotals.hard +
                            flashcardTotals.good +
                            flashcardTotals.easy
                          ) /
                          totalReviews
                        ) * 100
                      )
                    : 0

                return (
                  <div key={category} style={{
                    marginBottom: 24,
                    border: "1px solid #1f2937",
                    borderRadius: 16,
                    background: "#080a10",
                    overflow: "hidden",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.03)"
                  }}>
                
                 <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderBottom: "1px solid #1f2937",
                    background: "rgba(255,255,255,0.02)"
                  }}
                >

                    <h4
                      style={{
                        color: "#60a5fa",
                        fontSize: "18px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        margin: 0
                      }}
                    >
                      {category}
                    </h4>
                    
                    <div
                      style={{
                        display: "flex",
                        gap: 24,
                        marginTop: 10,
                        fontSize: 12,
                        color: "#9ca3af"
                      }}
                    >
                     

                      
                    </div>

                    {/* 🔥 BOTTONI MACRO */}
                    <div style={{ display: "flex", gap: 10 }}>
                      
                      <button
                        onClick={() => {
                          if (!categoryTopics || categoryTopics.length === 0) {
                            alert("No topics found");
                            return;
                          }

                          launchCategoryFeature(category, "quiz")
                        }}
                        style={macroBtn("#2563eb")}
                      >
                        Quiz
                      </button>

                      <button
                        onClick={() => {
                          launchCategoryFeature(
                            category,
                            "generate_flashcards"
                          )

                        }}
                        style={macroBtn("#0b9280")}
                      >
                        Flashcards
                      </button>

                      <button
                        onClick={() => {
                          launchCategoryFeature(
                            category,
                            "active_recall_setup"
                          )
                        }}
                        style={macroBtn("#f4970c")}
                      >
                        {translate('stats.Memory')}
                      </button>

                      <button
                        onClick={() => {
                          launchCategoryFeature(
                            category,
                            "ask_setup"
                          )
                        }}
                        style={macroBtn("#0a6610")}
                      >
                        {translate('stats.Ask')}
                      </button>

                      <button
                        onClick={() => {
                          launchCategoryFeature(
                            category,
                            "study_session_setup"
                          )
                        }}
                        style={macroBtn("#8b5cf6")}
                      >
                        {translate('stats.Study')}
                      </button>

                    </div>

                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      alignItems: "center",
                      padding: "12px 20px",
                      borderBottom: "1px solid #1f2937",
                      color: "#9ca3af",
                      fontSize: 15
                    }}
                  >
                    <span>
                      <img
                        src="/icons/category-topic-side.svg"
                        alt=""
                        width={24}
                        height={24}
                      /> {categoryTopics.length} {translate('stats.Topics')}
                    </span>

                    <span>
                      <img
                        src="/icons/quiz-side.svg"
                        alt=""
                        width={24}
                        height={24}
                      /> {totalQuizQuestions} {translate('stats.Quiz')}
                    </span>

                    <span>
                      <img
                        src="/icons/flashcards-side.svg"
                        alt=""
                        width={24}
                        height={24}
                      /> {totalFlashcards} Flashcards
                    </span>

                    <span
                      style={{
                        color:
                          quizAverage >= 80
                            ? "#22c55e"
                            : quizAverage >= 50
                              ? "#eab308"
                              : "#ef4444",
                        fontWeight: 700
                      }}
                    >
                      <img
                        src="/icons/quiz_avg-side.svg"
                        alt=""
                        width={24}
                        height={24}
                      /> {translate('stats.Quiz Avg')} {quizAverage}%
                    </span>

                    <span
                      style={{
                        color:
                          flashcardMastery >= 80
                            ? "#22c55e"
                            : flashcardMastery >= 50
                              ? "#eab308"
                              : "#ef4444",
                        fontWeight: 700
                      }}
                    >
                      <img
                        src="/icons/flashcard_mastery-side.svg"
                        alt=""
                        width={24}
                        height={24}
                      /> {translate('stats.Flashcard Mastery')} {flashcardMastery}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 70px 70px 70px 70px 120px",
                      gap: 12,
                      padding: "14px 20px",
                      borderBottom: "1px solid #1f2937",
                      color: "#9ca3af",
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "uppercase"
                    }}
                  >
                    <div></div>
                    <div style={{ textAlign: "center" }}>Quiz</div>

                    <div
                      style={{
                        gridColumn: "3 / span 4",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: 11
                      }}
                    >
                      FLASHCARDS
                    </div>

                    <div style={{ textAlign: "center" }}>{translate('stats.Last Studied')}</div>
                    <div>Topic</div>
                    
                    <div></div>
                    <div style={{ textAlign: "center" }}>{translate('stats.Wrong')}</div>
                    <div style={{ textAlign: "center" }}>{translate('stats.Hard')}</div>
                    <div style={{ textAlign: "center" }}>{translate('stats.Good')}</div>
                    <div style={{ textAlign: "center" }}>{translate('stats.Easy')}</div>
                    <div></div>
                  </div>
                  {categoryTopics.map((t: any) => {
                    const topicObj = t;

                    const value = topicObj.topic || topicObj.title;

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
                    const hasQuizAttempts = (quizStats?.total || 0) > 0;
                    console.log("🧪 TOPIC:", value);
                    console.log("🧪 QUIZ STATS:", quizStats);
                    return (
                      <div
                        key={value}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 90px 70px 70px 70px 70px 120px",
                          gap: 12,
                          alignItems: "center",
                          padding: "14px 20px",
                          borderBottom: "1px solid rgba(255,255,255,0.05)"
                        }}
                      >
                        <div
                          style={{
                            color: "white",
                            fontSize: 14,
                            fontWeight: 500,
                            borderRight: "1px solid rgba(255,255,255,0.08)"
                          }}
                        >
                          {value}
                        </div>

                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            textAlign: "center",
                            borderRight: "1px solid rgba(255,255,255,0.08)",
                            color:
                              !hasQuizAttempts
                                ? "#9ca3af"
                                : (quizStats?.accuracy || 0) >= 80
                                ? "#22c55e"
                                : (quizStats?.accuracy || 0) >= 50
                                  ? "#eab308"
                                  : "#ef4444"
                          }}
                        >
                          {hasQuizAttempts
                            ? `${Math.round(quizStats?.accuracy || 0)}%`
                            : "-"}
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            color: "#ef4444",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.wrong || 0}
                        </div>

                        <div
                          style={{
                            textAlign: "center",  
                            color: "#f97316",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.hard || 0}
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            color: "#3b82f6",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.good || 0}
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            color: "#22c55e",
                            
                            fontWeight: 600,
                            borderRight: "1px solid rgba(255,255,255,0.08)"
                          }}
                        >
                          {topicStats.easy || 0}
                        </div>

                        <div
                          style={{
                            textAlign: "center",
                            color: "#9ca3af",
                            fontSize: 13
                          }}
                        >
                          -
                        </div>
                      </div>
                    );
                    })}
                </div>
              )
            })}
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
  padding: "10px 10px",
  fontSize: "13px",
  background: color,
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
})
