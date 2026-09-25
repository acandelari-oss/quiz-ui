import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase"; // Il percorso potrebbe variare in base alla tua cartella
import { useTranslation } from 'react-i18next';
import { normalizeTopic } from "../../utils/topic";
import {
  logCategoryScope,
  resolveCategoryTopicObjects
} from "../../utils/topics";
import {
  EDUCATIONAL_UNIT_THRESHOLD,
  type EducationalUnitChapter
} from "../../utils/educationalUnitTitles";
import CategoryLabel from "@/components/ui/CategoryLabel";

type TopicNavigationGroup = {
  key: string
  title: string
  showTitle: boolean
  items: [string, any][]
}

function csvCell(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function downloadTaxonomyCsv(topics: any[] = [], projectId?: string) {
  const headers = [
    "module_name",
    "module_id",
    "macrocategory",
    "category",
    "topic",
    "description",
    "category_order_index",
    "topic_order_index"
  ]

  const rows = topics.map((topic: any) => [
    topic.module_name || "",
    topic.module_id || "",
    isStudentProvidedOrganizationMode(topic.organization_mode)
      ? ""
      : (topic.macrocategory || topic.source_section || ""),
    topic.category || "General",
    topic.topic || topic.title || "",
    topic.description || "",
    topic.category_order_index ?? "",
    topic.topic_order_index ?? ""
  ])

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(","))
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `douno-taxonomy-${projectId || "project"}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function isStudentProvidedOrganizationMode(mode: unknown) {
  const normalizedMode = String(mode || "").trim().toLowerCase()
  return normalizedMode === "manual" || normalizedMode === "syllabus"
}

function canMoveTopic(topic: any, taxonomyReviewEditable = true) {
  return Boolean(taxonomyReviewEditable)
    && !Boolean(topic?.taxonomy_locked || topic?.accepted_for_study)
}

function normalizePriorityCategoryResponse(
  responseBody: any,
  fallback: string[]
): string[] {
  const raw = Array.isArray(responseBody?.priorityCategories)
    ? responseBody.priorityCategories
    : Array.isArray(responseBody?.study_priority_categories)
      ? responseBody.study_priority_categories
      : fallback

  return Array.from(
    new Set(
      raw
        .map((category: any) => String(category || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3)
}

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
	  projectId,
	  projectStudyMode,
	  loadTopics,
	  priorityCategories = [],
	  setPriorityCategories = () => {},
	  onPriorityCategoriesSaved = (_projectId: string, _priorityCategories: string[]) => {}
	}: any) {
	  const { t: translate, i18n } = useTranslation();
	  const [priorityMessage, setPriorityMessage] = React.useState("")
	  const [movingTopicId, setMovingTopicId] = React.useState<string | null>(null)
	  const [editingTopicId, setEditingTopicId] = React.useState<string | null>(null)
	  const [editingTopicName, setEditingTopicName] = React.useState("")
	  const [editingCategoryKey, setEditingCategoryKey] = React.useState<string | null>(null)
	  const [editingCategoryName, setEditingCategoryName] = React.useState("")
	  const [mergingTopicId, setMergingTopicId] = React.useState<string | null>(null)
	  const [mergeTargetTopicId, setMergeTargetTopicId] = React.useState("")
	  const [mergeTopicName, setMergeTopicName] = React.useState("")
	  const [taxonomyEditBusy, setTaxonomyEditBusy] = React.useState<string | null>(null)
	  const taxonomyReviewEditable = String(projectStudyMode || "").toLowerCase() !== "learning"
      || topics.some((topic: any) => topic.module_id && !topic.accepted_for_study && !topic.taxonomy_locked)
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
  const [topicNavigationGroups, setTopicNavigationGroups] = React.useState<TopicNavigationGroup[]>([]);

  async function moveTopicToCategory(topic: any, nextCategory: string) {
    const topicId = topic?.id ? String(topic.id) : ""
    const category = String(nextCategory || "").trim()

    if (!projectId || !topicId || !category || category === topic?.category) {
      return
    }

    setMovingTopicId(topicId)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        throw new Error("Missing session")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics/${topicId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ category })
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || "Unable to move topic")
      }

      if (typeof loadTopics === "function") {
        await loadTopics(projectId)
      }
    } catch (error) {
      console.error("Topic category update failed", error)
      alert(translate('stats.Unable to move topic'))
    } finally {
      setMovingTopicId(null)
    }
  }

  async function getAuthToken() {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      throw new Error("Missing session")
    }

    return token
  }

  async function renameTopic(topic: any) {
    const topicId = topic?.id ? String(topic.id) : ""
    const nextName = editingTopicName.trim()

    if (!projectId || !topicId || !nextName) {
      alert(translate('stats.Topic name is required'))
      return
    }

    setTaxonomyEditBusy(`topic:${topicId}`)

    try {
      const token = await getAuthToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics/${topicId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ topic: nextName })
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || "Unable to rename topic")
      }

      setEditingTopicId(null)
      setEditingTopicName("")
      if (typeof loadTopics === "function") {
        await loadTopics(projectId)
      }
    } catch (error) {
      console.error("Topic rename failed", error)
      alert(translate('stats.Unable to update taxonomy'))
    } finally {
      setTaxonomyEditBusy(null)
    }
  }

  async function renameCategory(category: string, categoryTopics: any[]) {
    const nextName = editingCategoryName.trim()
    const firstTopic = Array.isArray(categoryTopics) ? categoryTopics[0] : null

    if (!projectId || !category || !nextName) {
      alert(translate('stats.Category name is required'))
      return
    }

    setTaxonomyEditBusy(`category:${category}`)

    try {
      const token = await getAuthToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topic-categories`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            current_category: category,
            new_category: nextName,
            module_id: firstTopic?.module_id || null
          })
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || "Unable to rename category")
      }

      setEditingCategoryKey(null)
      setEditingCategoryName("")
      if (typeof loadTopics === "function") {
        await loadTopics(projectId)
      }
    } catch (error) {
      console.error("Category rename failed", error)
      alert(translate('stats.Unable to update taxonomy'))
    } finally {
      setTaxonomyEditBusy(null)
    }
  }

  async function mergeTopicInto(topic: any) {
    const topicId = topic?.id ? String(topic.id) : ""
    const targetTopicId = mergeTargetTopicId.trim()
    const nextName = mergeTopicName.trim()

    if (!projectId || !topicId || !targetTopicId) {
      alert(translate('stats.Select topic to merge'))
      return
    }

    if (!nextName) {
      alert(translate('stats.Topic name is required'))
      return
    }

    setTaxonomyEditBusy(`merge:${topicId}`)

    try {
      const token = await getAuthToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics/merge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            source_topic_id: topicId,
            target_topic_id: targetTopicId,
            new_topic_name: nextName
          })
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || "Unable to merge topics")
      }

      setMergingTopicId(null)
      setMergeTargetTopicId("")
      setMergeTopicName("")
      if (typeof loadTopics === "function") {
        await loadTopics(projectId)
      }
    } catch (error) {
      console.error("Topic merge failed", error)
      alert(translate('stats.Unable to update taxonomy'))
    } finally {
      setTaxonomyEditBusy(null)
    }
  }

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

  const visibleCategorySet = React.useMemo(
    () => new Set(
      (topics || []).map((topic: any) => String(topic.category || "General"))
    ),
    [topics]
  )

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

  const togglePriorityCategory = (category: string) => {
    setPriorityMessage("")
    setPriorityCategories((current: string[]) => {
      const normalizedCurrent = Array.from(new Set(current || []))
      const selected = normalizedCurrent.includes(category)

      if (selected) {
        const nextPriorityCategories = normalizedCurrent.filter(item => item !== category)
        console.log("⭐ Study priority toggled", {
          projectId,
          category,
          selected: false,
          nextPriorityCategories
        })
        persistPriorityCategories(nextPriorityCategories)
        return nextPriorityCategories
      }

      const selectedVisibleCategories = normalizedCurrent.filter(item =>
        visibleCategorySet.has(item)
      )

      if (selectedVisibleCategories.length >= 3) {
        setPriorityMessage(translate("stats.You can select up to 3 study priorities."))
        return normalizedCurrent
      }

      const nextPriorityCategories = [...normalizedCurrent, category]
      console.log("⭐ Study priority toggled", {
        projectId,
        category,
        selected: true,
        nextPriorityCategories
      })
      persistPriorityCategories(nextPriorityCategories)
      return nextPriorityCategories
    })
  }

  const persistPriorityCategories = async (nextPriorityCategories: string[]) => {
    if (!projectId) {
      console.log("⭐ Study priorities not persisted because projectId is missing", {
        nextPriorityCategories
      })
      return
    }

    const normalizedPriorityCategories = Array.from(
      new Set(
        nextPriorityCategories
          .map(category => String(category || "").trim())
          .filter(Boolean)
      )
    ).slice(0, 3)

    console.log("⭐ Persisting study priorities", {
      projectId,
      priorityCategories: normalizedPriorityCategories
    })

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        console.warn("⭐ Study priorities not persisted because auth token is missing")
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/study_priorities`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            priority_categories: normalizedPriorityCategories
          })
        }
      )

      const responseBody = await response.json().catch(() => null)

      console.log("⭐ Study priorities save response", {
        projectId,
        httpStatus: response.status,
        ok: response.ok,
        responseBody
      })

      if (response.ok) {
        onPriorityCategoriesSaved(
          projectId,
          normalizePriorityCategoryResponse(responseBody, normalizedPriorityCategories)
        )
      }
    } catch (error) {
      console.error("⭐ Study priorities save failed", error)
    }
  }

  const categorizedTopicEntries = React.useMemo(
    () => Object.entries(
      (topics || []).reduce((acc: any, curr: any) => {
        const cat = curr.category || "General";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
      }, {})
    ),
    [topics]
  );
  const categoryOptions = React.useMemo(
    () => categorizedTopicEntries.map(([category]) => String(category)),
    [categorizedTopicEntries]
  )

  React.useEffect(() => {
    let cancelled = false

    async function fetchEducationalUnits() {
      const categories = categorizedTopicEntries.map(([category]) => String(category))
      const hasStudentProvidedOrganization = categorizedTopicEntries.some(([, categoryTopics]) =>
        (categoryTopics as any[]).some(topic =>
          isStudentProvidedOrganizationMode(topic?.organization_mode)
        )
      )

      if (categories.length < EDUCATIONAL_UNIT_THRESHOLD || hasStudentProvidedOrganization) {
        if (!cancelled) {
          setTopicNavigationGroups([
            {
              key: "categories",
              title: "Categories",
              showTitle: false,
              items: categorizedTopicEntries as [string, any][]
            }
          ])
        }

        return
      }

      try {
        const response = await fetch("/api/educational-units", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categories,
            language: translate("stats.study_language_value")
          })
        })
        const data = response.ok ? await response.json() : null
        const educationalUnits = Array.isArray(data?.educational_units)
          ? data.educational_units as EducationalUnitChapter[]
          : []

        if (!cancelled) {
          setTopicNavigationGroups(
            mapEducationalUnitsToTopicGroups(
              educationalUnits,
              categorizedTopicEntries as [string, any][]
            )
          )
        }
      } catch {
        if (!cancelled) {
          setTopicNavigationGroups([
            {
              key: "categories",
              title: "Categories",
              showTitle: false,
              items: categorizedTopicEntries as [string, any][]
            }
          ])
        }
      }
    }

    fetchEducationalUnits()

    return () => {
      cancelled = true
    }
  }, [categorizedTopicEntries, translate]);

  return (
    <div className="topics-view-mobile-root" style={box}>
      <div
        className="topics-view-mobile-toggle"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 6
        }}
      >
        <h3
          style={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 4,
            color: "white",
            margin: 0
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
            {translate('stats.Select one or more topics to focus your study.')}
          </span>
        </h3>

        <button
          type="button"
          onClick={() => downloadTaxonomyCsv(topics || [], projectId)}
          disabled={loadingTopics || !Array.isArray(topics) || topics.length === 0}
          style={{
            border: "1px solid rgba(96, 165, 250, 0.42)",
            borderRadius: 10,
            background: "rgba(37, 99, 235, 0.12)",
            color: "#93c5fd",
            cursor: loadingTopics || !Array.isArray(topics) || topics.length === 0
              ? "not-allowed"
              : "pointer",
            fontSize: 12,
            fontWeight: 800,
            padding: "8px 11px",
            opacity: loadingTopics || !Array.isArray(topics) || topics.length === 0 ? 0.55 : 1,
            whiteSpace: "nowrap"
          }}
        >
          Download CSV
        </button>
      </div>

	      {topicsOpen && (
	        <>
	          {loadingTopics ? (
	            <p style={{ color: "#9ca3af" }}>{translate('stats.Loading topics...')}</p>
	          ) : topics.length === 0 ? (
	            <p style={{ color: "#9ca3af" }}>{translate('stats.No topics detected yet')}</p>
	          ) : (
	            <>
	            {priorityMessage && (
	              <div style={priorityWarning}>
	                {priorityMessage}
	              </div>
	            )}
	            <div className="topics-mobile-category-list" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Categorization Logic */}
              {topicNavigationGroups.map(group => (
                <div
                  key={group.key}
                  className={group.showTitle ? "topics-mobile-educational-unit" : "topics-mobile-plain-group"}
                  style={group.showTitle ? educationalUnitCard : plainCategoryGroup}
                >
                  {group.showTitle && (
                    <div className="topics-mobile-educational-unit-title" style={educationalUnitTitle}>
                      {group.title}
                    </div>
                  )}

                  <div className="topics-mobile-category-stack" style={group.showTitle ? educationalUnitCategoryStack : plainCategoryStack}>
	                  {group.items.map(([category, categoryTopics]: [string, any]) => {
	                const isPriorityCategory = priorityCategories.includes(category)
	                const categoryEditable = Array.isArray(categoryTopics)
	                  && categoryTopics.some((topic: any) => canMoveTopic(topic, taxonomyReviewEditable))
	                const categoryEditKey = `${category}:${categoryTopics?.[0]?.module_id || "project"}`

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
                  <div className="topic-mobile-category-card" key={category} style={{
                    marginBottom: 24,
                    border: "1px solid #1f2937",
                    borderRadius: 16,
                    background: "#080a10",
                    overflow: "hidden",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.03)"
                  }}>

	                 <div
	                  className="topic-mobile-category-header"
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
		                      className="topic-mobile-category-title"
		                      style={{
	                        color: "#60a5fa",
	                        fontSize: "18px",
	                        fontWeight: 700,
	                        textTransform: "uppercase",
	                        margin: 0,
	                        display: "flex",
	                        alignItems: "center",
	                        gap: 8
	                      }}
	                    >
	                      <CategoryLabel
	                        category={category}
	                        isPriority={isPriorityCategory}
	                        onTogglePriority={() => togglePriorityCategory(category)}
	                        toggleLabel={translate(
	                          isPriorityCategory
	                            ? "stats.Remove Study Priority"
	                            : "stats.Mark as Study Priority"
	                        )}
	                        starStyle={{
	                          ...priorityStarButton,
	                          ...(isPriorityCategory ? selectedPriorityStarButton : {})
		                        }}
		                      />
		                      {categoryEditable && editingCategoryKey !== categoryEditKey && (
		                        <button
		                          type="button"
		                          onClick={() => {
		                            setEditingCategoryKey(categoryEditKey)
		                            setEditingCategoryName(category)
		                          }}
		                          style={taxonomyGhostButton}
		                        >
		                          {translate('stats.Rename category')}
		                        </button>
		                      )}
		                    </h4>
		                    {categoryEditable && editingCategoryKey === categoryEditKey && (
		                      <div style={taxonomyInlineEditor}>
		                        <input
		                          value={editingCategoryName}
		                          onChange={(event) => setEditingCategoryName(event.target.value)}
		                          style={taxonomyTextInput}
		                          placeholder={translate('stats.Category name')}
		                        />
		                        <button
		                          type="button"
		                          disabled={taxonomyEditBusy === `category:${category}`}
		                          onClick={() => renameCategory(category, categoryTopics)}
		                          style={taxonomyPrimaryButton}
		                        >
		                          {translate('stats.Save')}
		                        </button>
		                        <button
		                          type="button"
		                          onClick={() => {
		                            setEditingCategoryKey(null)
		                            setEditingCategoryName("")
		                          }}
		                          style={taxonomyGhostButton}
		                        >
		                          {translate('stats.Cancel')}
		                        </button>
		                      </div>
		                    )}

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

	                    <div style={categoryHeaderActions}>
	                    {/* 🔥 BOTTONI MACRO */}
	                    <div className="topic-desktop-action-row" style={{ display: "flex", gap: 10 }}>

                      <button
                        onClick={() => {
                          if (!categoryTopics || categoryTopics.length === 0) {
                            alert(translate('stats.No topics found'));
                            return;
                          }

                          launchCategoryFeature(category, "quiz")
                        }}
                        style={macroBtn("#2563eb")}
                      >
                        {translate('stats.Quiz')}
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
                        {translate('stats.Flashcards')}
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

	                  </div>
                  <div
                    className="topic-mobile-category-stats"
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
                      /> {totalFlashcards} {translate('stats.Flashcards')}
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
                      /> <span className="topic-stat-full-label">{translate('stats.Flashcard Mastery')}</span><span className="topic-stat-mobile-label">Flashc. Mastery</span> {flashcardMastery}%
                    </span>
                  </div>
                  <div
                    className="topic-mobile-table-header"
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
                    <div style={{ textAlign: "center" }}>{translate('stats.Quiz')}</div>

                    <div
                      style={{
                        gridColumn: "3 / span 4",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: 11
                      }}
                    >
                      {translate('stats.FLASHCARDS')}
                    </div>

                    <div style={{ textAlign: "center" }}>{translate('stats.Last Studied')}</div>
                    <div>{translate('stats.Topic')}</div>

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
	                    const topicId = topicObj.id ? String(topicObj.id) : ""
	                    const isTopicEditable = Boolean(topicId && canMoveTopic(topicObj, taxonomyReviewEditable))
	                    const mergeOptions = (categoryTopics || []).filter((candidate: any) =>
	                      candidate?.id
	                      && String(candidate.id) !== topicId
	                      && canMoveTopic(candidate, taxonomyReviewEditable)
	                    )
	                    console.log("🧪 TOPIC:", value);
	                    console.log("🧪 QUIZ STATS:", quizStats);
	                    return (
                      <div
                        className="topic-mobile-topic-row"
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
                          className="topic-mobile-topic-name"
                          style={{
                            color: "white",
                            fontSize: 14,
                            fontWeight: 500,
                            borderRight: "1px solid rgba(255,255,255,0.08)"
	                          }}
	                        >
	                          {editingTopicId === topicId ? (
	                            <div style={taxonomyInlineEditor}>
	                              <input
	                                value={editingTopicName}
	                                onChange={(event) => setEditingTopicName(event.target.value)}
	                                style={taxonomyTextInput}
	                                placeholder={translate('stats.Topic name')}
	                              />
	                              <button
	                                type="button"
	                                disabled={taxonomyEditBusy === `topic:${topicId}`}
	                                onClick={() => renameTopic(topicObj)}
	                                style={taxonomyPrimaryButton}
	                              >
	                                {translate('stats.Save')}
	                              </button>
	                              <button
	                                type="button"
	                                onClick={() => {
	                                  setEditingTopicId(null)
	                                  setEditingTopicName("")
	                                }}
	                                style={taxonomyGhostButton}
	                              >
	                                {translate('stats.Cancel')}
	                              </button>
	                            </div>
	                          ) : (
	                            <span>{value}</span>
	                          )}
	                          {isTopicEditable && editingTopicId !== topicId && (
	                            <div style={taxonomyTopicActions}>
	                              <button
	                                type="button"
	                                onClick={() => {
	                                  setEditingTopicId(topicId)
	                                  setEditingTopicName(value)
	                                  setMergingTopicId(null)
	                                }}
	                                style={taxonomyGhostButton}
	                              >
	                                {translate('stats.Rename topic')}
	                              </button>
	                              {mergeOptions.length > 0 && (
	                                <button
	                                  type="button"
	                                  onClick={() => {
	                                    setMergingTopicId(topicId)
	                                    setMergeTargetTopicId("")
	                                    setMergeTopicName(value)
	                                    setEditingTopicId(null)
	                                  }}
	                                  style={taxonomyGhostButton}
	                                >
	                                  {translate('stats.Merge')}
	                                </button>
	                              )}
	                            </div>
	                          )}
	                          {topicObj.id && categoryOptions.length > 1 && canMoveTopic(topicObj, taxonomyReviewEditable) && (
	                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 8,
                                color: "#9ca3af",
                                fontSize: 11,
                                fontWeight: 600
                              }}
                            >
                              <span>{translate('stats.Move to')}</span>
                              <select
                                value={category}
                                disabled={movingTopicId === String(topicObj.id)}
                                onChange={(event) => moveTopicToCategory(topicObj, event.target.value)}
                                style={{
                                  maxWidth: 260,
                                  minWidth: 160,
                                  border: "1px solid rgba(96, 165, 250, 0.28)",
                                  borderRadius: 8,
                                  background: "#0b1220",
                                  color: "#dbeafe",
                                  cursor: movingTopicId === String(topicObj.id)
                                    ? "wait"
                                    : "pointer",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "6px 8px"
                                }}
                              >
                                {categoryOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
	                              </select>
	                            </label>
	                          )}
	                          {isTopicEditable && mergingTopicId === topicId && (
	                            <div style={taxonomyMergePanel}>
	                              <label style={taxonomyMiniLabel}>
	                                {translate('stats.Merge with')}
	                                <select
	                                  value={mergeTargetTopicId}
	                                  onChange={(event) => setMergeTargetTopicId(event.target.value)}
	                                  style={taxonomySelect}
	                                >
	                                  <option value="">
	                                    {translate('stats.Select topic')}
	                                  </option>
	                                  {mergeOptions.map((candidate: any) => (
	                                    <option key={String(candidate.id)} value={String(candidate.id)}>
	                                      {candidate.topic || candidate.title}
	                                    </option>
	                                  ))}
	                                </select>
	                              </label>
	                              <label style={taxonomyMiniLabel}>
	                                {translate('stats.New topic name')}
	                                <input
	                                  value={mergeTopicName}
	                                  onChange={(event) => setMergeTopicName(event.target.value)}
	                                  style={taxonomyTextInput}
	                                />
	                              </label>
	                              <div style={taxonomyTopicActions}>
	                                <button
	                                  type="button"
	                                  disabled={taxonomyEditBusy === `merge:${topicId}`}
	                                  onClick={() => mergeTopicInto(topicObj)}
	                                  style={taxonomyPrimaryButton}
	                                >
	                                  {translate('stats.Merge topics')}
	                                </button>
	                                <button
	                                  type="button"
	                                  onClick={() => {
	                                    setMergingTopicId(null)
	                                    setMergeTargetTopicId("")
	                                    setMergeTopicName("")
	                                  }}
	                                  style={taxonomyGhostButton}
	                                >
	                                  {translate('stats.Cancel')}
	                                </button>
	                              </div>
	                              <div style={taxonomyHint}>
	                                {translate('stats.Source material from both topics is preserved.')}
	                              </div>
	                            </div>
	                          )}
	                        </div>

                        <div className="topic-mobile-stats-line">
                          <span className="topic-mobile-stat-label">Quiz: </span>
                          <span
                            className={
                              !hasQuizAttempts
                                ? "topic-mobile-quiz-value topic-mobile-empty-value"
                                : (quizStats?.accuracy || 0) >= 80
                                ? "topic-mobile-quiz-value topic-mobile-good-value"
                                : (quizStats?.accuracy || 0) >= 50
                                  ? "topic-mobile-quiz-value topic-mobile-hard-value"
                                  : "topic-mobile-quiz-value topic-mobile-wrong-value"
                            }
                          >
                            {hasQuizAttempts
                              ? `${Math.round(quizStats?.accuracy || 0)}%`
                              : "-"}
                          </span>
                          <span className="topic-mobile-stat-label"> Flashcards: </span>
                          <span className="topic-mobile-wrong-value">Wrong {topicStats.wrong || 0}</span>
                          <span className="topic-mobile-hard-value"> Hard {topicStats.hard || 0}</span>
                          <span className="topic-mobile-good-value"> Good {topicStats.good || 0}</span>
                          <span className="topic-mobile-easy-value"> Easy {topicStats.easy || 0}</span>
                        </div>

                        <div
                          className="topic-mobile-quiz-stat"
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
                          className="topic-mobile-flashcard-stat topic-mobile-flashcard-wrong"
                          style={{
                            textAlign: "center",
                            color: "#ef4444",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.wrong || 0}
                        </div>

                        <div
                          className="topic-mobile-flashcard-stat topic-mobile-flashcard-hard"
                          style={{
                            textAlign: "center",
                            color: "#f97316",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.hard || 0}
                        </div>

                        <div
                          className="topic-mobile-flashcard-stat topic-mobile-flashcard-good"
                          style={{
                            textAlign: "center",
                            color: "#3b82f6",
                            fontWeight: 600
                          }}
                        >
                          {topicStats.good || 0}
                        </div>

                        <div
                          className="topic-mobile-flashcard-stat topic-mobile-flashcard-easy"
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
                          className="topic-mobile-last-studied"
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
                    <div className="topic-mobile-action-row">
                      <button
                        onClick={() => {
                          if (!categoryTopics || categoryTopics.length === 0) {
                            alert(translate('stats.No topics found'));
                            return;
                          }

                          launchCategoryFeature(category, "quiz")
                        }}
                        style={macroBtn("#2563eb")}
                      >
                        {translate('stats.Quiz')}
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
                        Flashc.
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
              )
            })}
                  </div>
                </div>
              ))}
	            </div>
	            </>
	          )}
	        </>
      )}

      {/* Difficulty Footer */}
      <div className="topics-mobile-difficulty-footer" style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #374151", fontSize: 12, color: "#9ca3af" }}>
        {translate('stats.Difficulty')}:
        <span style={{ color: "#22c55e", marginLeft: 8 }}>{translate('stats.Easy')}</span>
        <span style={{ color: "#eab308", marginLeft: 8 }}>{translate('stats.Medium')}</span>
        <span style={{ color: "#ef4444", marginLeft: 8 }}>{translate('stats.Hard')}</span>
      </div>
      <style jsx global>{`
        .topic-mobile-action-row {
          display: none;
        }

        .topic-mobile-stats-line,
        .topic-stat-mobile-label {
          display: none;
        }

        @media (max-width: 900px) {
          .topics-view-mobile-root {
            margin-bottom: 0 !important;
          }

          .topics-view-mobile-toggle,
          .topics-mobile-difficulty-footer {
            display: none !important;
          }

          .topics-mobile-category-list,
          .topics-mobile-category-stack,
          .topics-mobile-plain-group {
            gap: 16px !important;
          }

          .topics-mobile-educational-unit {
            background: #080a10 !important;
            border: 1px solid rgba(47, 184, 255, 0.45) !important;
            border-radius: 8px !important;
            padding: 12px !important;
            gap: 12px !important;
          }

          .topics-mobile-educational-unit-title {
            font-size: 25px !important;
            color: #ffffff !important;
            margin: 2px 0 2px !important;
            line-height: 1.15 !important;
          }

          .topic-mobile-category-card {
            margin-bottom: 0 !important;
            border: 1px solid rgba(47, 184, 255, 0.55) !important;
            border-radius: 8px !important;
            background: #080a10 !important;
            box-shadow: none !important;
            padding: 10px 12px 12px !important;
          }

	          .topic-mobile-category-header {
	            display: flex !important;
	            align-items: flex-start !important;
	            justify-content: space-between !important;
	            gap: 8px !important;
	            padding: 0 0 8px !important;
	            border-bottom: none !important;
	            background: transparent !important;
	          }

	          .topic-priority-star {
	            min-width: 34px !important;
	            min-height: 34px !important;
	            font-size: 20px !important;
	          }

          .topic-mobile-category-title {
            color: #2fb8ff !important;
            font-size: 23px !important;
            line-height: 1.15 !important;
            font-weight: 800 !important;
            margin: 0 !important;
          }

          .topic-desktop-action-row {
            display: none !important;
          }

          .topic-mobile-category-stats {
            display: block !important;
            padding: 0 0 9px !important;
            border-bottom: none !important;
            color: #9ca3af !important;
            font-size: 12px !important;
            line-height: 1.25 !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 400 !important;
          }

          .topic-mobile-category-stats span {
            display: inline !important;
            color: #9ca3af !important;
            font-weight: 400 !important;
          }

          .topic-mobile-category-stats img {
            display: none !important;
          }

          .topic-stat-full-label {
            display: none !important;
          }

          .topic-stat-mobile-label {
            display: inline !important;
          }

          .topic-mobile-table-header {
            display: none !important;
          }

          .topic-mobile-topic-row {
            display: block !important;
            padding: 10px 0 !important;
            border-bottom: 1px solid rgba(47, 184, 255, 0.24) !important;
          }

          .topic-mobile-topic-name {
            border-right: none !important;
            color: #f8fafc !important;
            font-size: 15px !important;
            line-height: 1.25 !important;
            font-weight: 700 !important;
            margin-bottom: 6px;
          }

          .topic-mobile-quiz-stat,
          .topic-mobile-flashcard-stat,
          .topic-mobile-last-studied {
            display: none !important;
            border-right: none !important;
            text-align: left !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
            margin-right: 4px;
          }

          .topic-mobile-stats-line {
            display: block;
            font-size: 13px;
            line-height: 1.35;
            font-weight: 400;
            color: #f8fafc;
          }

          .topic-mobile-stat-label {
            color: #f8fafc;
            font-weight: 400;
          }

          .topic-mobile-wrong-value {
            color: #ef4444;
            font-weight: 400;
          }

          .topic-mobile-hard-value {
            color: #f97316;
            font-weight: 400;
          }

          .topic-mobile-good-value {
            color: #3b82f6;
            font-weight: 400;
          }

          .topic-mobile-easy-value {
            color: #22c55e;
            font-weight: 400;
          }

          .topic-mobile-empty-value {
            color: #9ca3af;
            font-weight: 400;
          }

          .topic-mobile-last-studied {
            display: none !important;
          }

          .topic-mobile-action-row {
            display: flex !important;
            gap: 6px;
            justify-content: center;
            align-items: center;
            flex-wrap: nowrap;
            padding: 10px 0 1px;
          }

          .topic-mobile-action-row button {
            min-height: 36px;
            padding: 7px 6px !important;
            border-radius: 8px !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            flex: 1 1 0;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  );
}

const box = {
  marginBottom: 20
};

const plainCategoryGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 20
};

const plainCategoryStack = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 20
};

const educationalUnitCard = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  flexDirection: "column" as const,
  gap: 18
};

const educationalUnitCategoryStack = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 16
};

const educationalUnitTitle = {
  color: "#36F2ED",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.2,
  margin: "2px 0 4px"
};

const categoryHeaderActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "flex-end",
  marginLeft: "auto"
};

const priorityStarButton = {
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 999,
  border: "1px solid #374151",
  background: "#0b111d",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 19,
  lineHeight: "1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "0.18s ease"
};

const selectedPriorityStarButton = {
  border: "1px solid #fbbf24",
  background: "rgba(251, 191, 36, 0.14)",
  color: "#fbbf24",
  boxShadow: "0 0 0 1px rgba(251, 191, 36, 0.16)"
};

const priorityWarning = {
  color: "#fbbf24",
  background: "rgba(251, 191, 36, 0.08)",
  border: "1px solid rgba(251, 191, 36, 0.22)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 12
};

const taxonomyInlineEditor = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: 8
};

const taxonomyTopicActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: 8
};

const taxonomyMergePanel = {
  marginTop: 10,
  padding: 10,
  border: "1px solid rgba(96, 165, 250, 0.18)",
  borderRadius: 10,
  background: "rgba(15, 23, 42, 0.72)",
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  maxWidth: 420
};

const taxonomyMiniLabel = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 5,
  color: "#9ca3af",
  fontSize: 11,
  fontWeight: 700
};

const taxonomyTextInput = {
  border: "1px solid rgba(96, 165, 250, 0.28)",
  borderRadius: 8,
  background: "#0b1220",
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 700,
  padding: "7px 9px",
  minWidth: 180,
  outline: "none"
};

const taxonomySelect = {
  ...taxonomyTextInput,
  cursor: "pointer"
};

const taxonomyGhostButton = {
  border: "1px solid rgba(96, 165, 250, 0.26)",
  borderRadius: 8,
  background: "rgba(37, 99, 235, 0.08)",
  color: "#93c5fd",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 800,
  padding: "6px 8px"
};

const taxonomyPrimaryButton = {
  border: "1px solid rgba(54, 242, 237, 0.32)",
  borderRadius: 8,
  background: "rgba(20, 184, 166, 0.22)",
  color: "#ccfbf1",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 900,
  padding: "6px 9px"
};

const taxonomyHint = {
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.35
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

function mapEducationalUnitsToTopicGroups(
  educationalUnits: EducationalUnitChapter[],
  categoryEntries: [string, any][]
): TopicNavigationGroup[] {
  const entriesByCategory = new Map(
    categoryEntries.map(entry => [String(entry[0]), entry])
  )
  const usedCategories = new Set<string>()
  const groups = educationalUnits
    .map((unit, index) => {
      const items = unit.categories
        .map(category => entriesByCategory.get(category))
        .filter((entry): entry is [string, any] => Boolean(entry))

      items.forEach(([category]) => usedCategories.add(String(category)))

      return {
        key: `${index + 1}:${unit.title}:${unit.categories.join("|")}`,
        title: unit.title,
        showTitle: true,
        items
      }
    })
    .filter(group => group.items.length > 0)

  const remainingItems = categoryEntries.filter(
    ([category]) => !usedCategories.has(String(category))
  )

  if (remainingItems.length > 0) {
    groups.push({
      key: "remaining-categories",
      title: "Categories",
      showTitle: false,
      items: remainingItems
    })
  }

  return groups.length > 0
    ? groups
    : [
      {
        key: "categories",
        title: "Categories",
        showTitle: false,
        items: categoryEntries
      }
    ]
}
