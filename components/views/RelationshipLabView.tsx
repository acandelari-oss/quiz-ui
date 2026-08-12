import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import {
  fetchTopicRelationships,
  TOPIC_RELATIONSHIP_DEFAULT_FILTERS,
  type TopicRelationshipEdge,
  type TopicRelationshipGraph,
  type TopicRelationshipNode
} from "../../services/topicRelationships"
import {
  classifyRelationship,
  DEFAULT_RELATIONSHIP_CLASSIFICATION_THRESHOLDS,
  relationshipClassificationLabel,
  type RelationshipClassification,
  type RelationshipClassificationThresholds
} from "../../utils/topicRelationshipClassification"
import KnowledgeSphere from "./relationship-lab/KnowledgeSphere"

type RelationshipLabViewProps = {
  projectId: string
  projectName?: string
}

type AppliedFilters = {
  minSemanticSimilarity: number
  minSharedChunks: number
  topKPerTopic: number
}

type ClassifiedRelationshipEdge = TopicRelationshipEdge & {
  classification: RelationshipClassification
}

type RelationshipLabMode = "list" | "sphere"

const SPHERE_PROJECT_WIDE_TOP_K = 50

export default function RelationshipLabView({
  projectId,
  projectName
}: RelationshipLabViewProps) {
  const { t } = useTranslation()
  const tr = (key: string, options?: Record<string, unknown>) => t(`stats.${key}`, options)
  const [filters, setFilters] = useState<AppliedFilters>({
    ...TOPIC_RELATIONSHIP_DEFAULT_FILTERS
  })
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>({
    ...TOPIC_RELATIONSHIP_DEFAULT_FILTERS
  })
  const [overviewGraph, setOverviewGraph] =
    useState<TopicRelationshipGraph | null>(null)
  const [focusedGraph, setFocusedGraph] =
    useState<TopicRelationshipGraph | null>(null)
  const [sphereGraph, setSphereGraph] =
    useState<TopicRelationshipGraph | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string>("")
  const [topicSearch, setTopicSearch] = useState("")
  const [activeMode, setActiveMode] = useState<RelationshipLabMode>("list")
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingFocus, setLoadingFocus] = useState(false)
  const [loadingSphere, setLoadingSphere] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sphereError, setSphereError] = useState<string | null>(null)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [classificationThresholds, setClassificationThresholds] =
    useState<RelationshipClassificationThresholds>({
      ...DEFAULT_RELATIONSHIP_CLASSIFICATION_THRESHOLDS
    })
  const [visibleClassifications, setVisibleClassifications] =
    useState<Record<RelationshipClassification, boolean>>({
      core: true,
      conceptual: true,
      contextual: true,
      borderline_core: true,
      borderline_conceptual: true,
      borderline_contextual: true,
      unclassified: true
    })
  const requestRunRef = useRef(0)

  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    setLoadingOverview(true)
    setError(null)

    fetchTopicRelationships(projectId, {
      ...filters,
      focusTopicId: null
    })
      .then(graph => {
        if (cancelled) return
        setOverviewGraph(graph)

        if (!selectedTopicId && graph.nodes.length > 0) {
          setSelectedTopicId(graph.nodes[0].id)
        }
      })
      .catch(error => {
        if (cancelled) return
        setError(readableError(error))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOverview(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId || !selectedTopicId) {
      setFocusedGraph(null)
      return
    }

    const runId = requestRunRef.current + 1
    requestRunRef.current = runId
    setLoadingFocus(true)
    setError(null)

    fetchTopicRelationships(projectId, {
      ...filters,
      focusTopicId: selectedTopicId
    })
      .then(graph => {
        if (requestRunRef.current !== runId) return
        setFocusedGraph(graph)
      })
      .catch(error => {
        if (requestRunRef.current !== runId) return
        setError(readableError(error))
      })
      .finally(() => {
        if (requestRunRef.current === runId) {
          setLoadingFocus(false)
        }
      })
  }, [projectId, selectedTopicId, filters])

  useEffect(() => {
    if (!projectId || activeMode !== "sphere" || sphereGraph || loadingSphere) return

    loadSphereGraph()
  }, [projectId, activeMode, sphereGraph, loadingSphere])

  const nodes = overviewGraph?.nodes || focusedGraph?.nodes || []
  const selectedTopic = useMemo(
    () => nodes.find(node => node.id === selectedTopicId) || null,
    [nodes, selectedTopicId]
  )
  const nodesById = useMemo(() => {
    const map = new Map<string, TopicRelationshipNode>()
    nodes.forEach(node => map.set(node.id, node))
    focusedGraph?.nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes, focusedGraph])
  const filteredTopics = useMemo(() => {
    const query = topicSearch.trim().toLowerCase()

    if (!query) return nodes

    return nodes.filter(node =>
      node.topic.toLowerCase().includes(query)
      || (node.category || "").toLowerCase().includes(query)
    )
  }, [nodes, topicSearch])
  const relatedEdges = focusedGraph?.edges || []
  const classifiedEdges: ClassifiedRelationshipEdge[] = useMemo(
    () =>
      relatedEdges.map(edge => ({
        ...edge,
        classification: classifyRelationship(edge, classificationThresholds)
      })),
    [relatedEdges, classificationThresholds]
  )
  const classificationSummary = useMemo(
    () =>
      classifiedEdges.reduce<Record<RelationshipClassification, number>>(
        (summary, edge) => {
          summary[edge.classification] += 1
          return summary
        },
        {
          core: 0,
          conceptual: 0,
          contextual: 0,
          borderline_core: 0,
          borderline_conceptual: 0,
          borderline_contextual: 0,
          unclassified: 0
        }
      ),
    [classifiedEdges]
  )
  const visibleEdges = classifiedEdges.filter(
    edge => visibleClassifications[edge.classification]
  )

  function applyFilters() {
    const validation = validateFilters(draftFilters, tr)

    if (validation) {
      setFilterError(validation)
      return
    }

    setFilterError(null)
    setFilters({
      minSemanticSimilarity: clamp(draftFilters.minSemanticSimilarity, -1, 1),
      minSharedChunks: Math.max(0, Math.floor(draftFilters.minSharedChunks)),
      topKPerTopic: Math.min(
        50,
        Math.max(1, Math.floor(draftFilters.topKPerTopic))
      )
    })
  }

  function resetFilters() {
    const defaults = { ...TOPIC_RELATIONSHIP_DEFAULT_FILTERS }
    setDraftFilters(defaults)
    setFilters(defaults)
    setFilterError(null)
  }

  function resetClassificationThresholds() {
    setClassificationThresholds({
      ...DEFAULT_RELATIONSHIP_CLASSIFICATION_THRESHOLDS
    })
  }

  function updateClassificationThreshold(
    key: keyof RelationshipClassificationThresholds,
    value: number
  ) {
    setClassificationThresholds(current => ({
      ...current,
      [key]: Number.isFinite(value) ? value : current[key]
    }))
  }

  function toggleClassificationVisibility(
    classification: RelationshipClassification
  ) {
    setVisibleClassifications(current => ({
      ...current,
      [classification]: !current[classification]
    }))
  }

  function openSphereMode() {
    setActiveMode("sphere")

    if (!sphereGraph && !loadingSphere) {
      loadSphereGraph()
    }
  }

  function loadSphereGraph() {
    if (!projectId) return

    setLoadingSphere(true)
    setSphereError(null)
    setSphereGraph(null)

    fetchTopicRelationships(projectId, {
      minSemanticSimilarity: TOPIC_RELATIONSHIP_DEFAULT_FILTERS.minSemanticSimilarity,
      minSharedChunks: TOPIC_RELATIONSHIP_DEFAULT_FILTERS.minSharedChunks,
      topKPerTopic: SPHERE_PROJECT_WIDE_TOP_K,
      focusTopicId: null
    })
      .then(graph => {
        setSphereGraph(graph)
      })
      .catch(error => {
        setSphereError(readableError(error))
      })
      .finally(() => {
        setLoadingSphere(false)
      })
  }

  return (
    <div style={labShell}>
      <section style={heroCard}>
        <div>
          <div style={eyebrow}>{tr("Internal diagnostic tool")}</div>
          <h1 style={title}>{tr("Topic Relationship Lab")}</h1>
          <p style={subtitle}>
            {tr("Diagnostic view — raw relationship evidence for project", {
              project: projectName || tr("the selected project")
            })}
          </p>
        </div>
        <div style={statsGrid}>
          <Stat label={tr("Nodes")} value={focusedGraph?.node_count ?? overviewGraph?.node_count ?? "—"} />
          <Stat label={tr("Edges")} value={focusedGraph?.edge_count ?? "—"} />
          <Stat label={tr("Pairs evaluated")} value={focusedGraph?.candidate_pairs_evaluated ?? overviewGraph?.candidate_pairs_evaluated ?? "—"} />
          <Stat label={tr("Isolated nodes")} value={focusedGraph?.isolated_node_count ?? overviewGraph?.isolated_node_count ?? "—"} />
          <Stat label={tr("Execution")} value={formatMs(focusedGraph?.execution_time_ms)} />
        </div>
      </section>

      <section style={modeSwitchCard}>
        <button
          type="button"
          onClick={() => setActiveMode("list")}
          style={{
            ...modeButton,
            ...(activeMode === "list" ? activeModeButton : {})
          }}
        >
          {tr("Relationship list")}
        </button>
        <button
          type="button"
          onClick={openSphereMode}
          style={{
            ...modeButton,
            ...(activeMode === "sphere" ? activeModeButton : {})
          }}
        >
          {tr("Knowledge Sphere")}
        </button>
      </section>

      {activeMode === "sphere" ? (
        <KnowledgeSphere
          projectId={projectId}
          graph={sphereGraph}
          loading={loadingSphere}
          error={sphereError}
          thresholds={classificationThresholds}
          onReload={loadSphereGraph}
        />
      ) : (
        <>

      <section style={controlGrid}>
        <div style={panelCard}>
          <h2 style={sectionTitle}>{tr("Topic")}</h2>
          <input
            value={topicSearch}
            onChange={event => setTopicSearch(event.target.value)}
            placeholder={tr("Search by topic or category...")}
            style={inputStyle}
          />
          <select
            value={selectedTopicId}
            onChange={event => setSelectedTopicId(event.target.value)}
            style={{ ...inputStyle, marginTop: 12 }}
            disabled={loadingOverview || nodes.length === 0}
          >
            {nodes.length === 0 && <option value="">{tr("No topics available")}</option>}
            {filteredTopics.map(node => (
              <option key={node.id} value={node.id}>
                {node.topic} {node.category ? `— ${node.category}` : ""}
              </option>
            ))}
          </select>

          {loadingOverview && (
            <div style={mutedText}>{tr("Loading topic list...")}</div>
          )}
        </div>

        <div style={panelCard}>
          <h2 style={sectionTitle}>{tr("Candidate discovery")}</h2>
          <div style={filterGrid}>
            <FilterInput
              label={tr("Min semantic similarity")}
              value={draftFilters.minSemanticSimilarity}
              step="0.01"
              min={-1}
              max={1}
              onChange={value =>
                setDraftFilters(current => ({
                  ...current,
                  minSemanticSimilarity: value
                }))
              }
            />
            <FilterInput
              label={tr("Min shared chunks")}
              value={draftFilters.minSharedChunks}
              step="1"
              min={0}
              onChange={value =>
                setDraftFilters(current => ({
                  ...current,
                  minSharedChunks: value
                }))
              }
            />
            <FilterInput
              label={tr("Top relationships")}
              value={draftFilters.topKPerTopic}
              step="1"
              min={1}
              max={50}
              onChange={value =>
                setDraftFilters(current => ({
                  ...current,
                  topKPerTopic: value
                }))
              }
            />
          </div>
          {filterError && <div style={errorText}>{filterError}</div>}
          <div style={actionsRow}>
            <button type="button" onClick={applyFilters} style={primaryButton}>
              {tr("Apply filters")}
            </button>
            <button type="button" onClick={resetFilters} style={secondaryButton}>
              {tr("Reset to defaults")}
            </button>
          </div>
          <div style={mutedText}>
            {tr("Applied relationship filters", {
              semantic: filters.minSemanticSimilarity,
              chunks: filters.minSharedChunks,
              top: filters.topKPerTopic
            })}
          </div>
        </div>
      </section>

      <section style={panelCard}>
        <div style={classificationHeader}>
          <div>
            <h2 style={sectionTitle}>{tr("Relationship classification")}</h2>
            <p style={classificationDescription}>
              {tr("Experimental frontend-only labels. These thresholds do not change candidate discovery, backend filtering, ranking or top-K.")}
            </p>
          </div>
          <button
            type="button"
            onClick={resetClassificationThresholds}
            style={secondaryButton}
          >
            {tr("Reset classification defaults")}
          </button>
        </div>

        <div style={classificationControlsGrid}>
          <FilterInput
            label={tr("Core minimum semantic")}
            value={classificationThresholds.coreMinSemantic}
            step="0.01"
            min={-1}
            max={1}
            onChange={value => updateClassificationThreshold("coreMinSemantic", value)}
          />
          <FilterInput
            label={tr("Core minimum Jaccard")}
            value={classificationThresholds.coreMinJaccard}
            step="0.01"
            min={0}
            max={1}
            onChange={value => updateClassificationThreshold("coreMinJaccard", value)}
          />
          <FilterInput
            label={tr("Conceptual minimum semantic")}
            value={classificationThresholds.conceptualMinSemantic}
            step="0.01"
            min={-1}
            max={1}
            onChange={value => updateClassificationThreshold("conceptualMinSemantic", value)}
          />
          <FilterInput
            label={tr("Contextual minimum semantic")}
            value={classificationThresholds.contextualMinSemantic}
            step="0.01"
            min={-1}
            max={1}
            onChange={value => updateClassificationThreshold("contextualMinSemantic", value)}
          />
          <FilterInput
            label={tr("Contextual maximum semantic")}
            value={classificationThresholds.contextualMaxSemantic}
            step="0.01"
            min={-1}
            max={1}
            onChange={value => updateClassificationThreshold("contextualMaxSemantic", value)}
          />
          <FilterInput
            label={tr("Contextual minimum Jaccard")}
            value={classificationThresholds.contextualMinJaccard}
            step="0.01"
            min={0}
            max={1}
            onChange={value => updateClassificationThreshold("contextualMinJaccard", value)}
          />
          <FilterInput
            label={tr("Tolerance buffer")}
            value={classificationThresholds.toleranceBuffer}
            step="0.01"
            min={0}
            max={1}
            onChange={value => updateClassificationThreshold("toleranceBuffer", value)}
          />
        </div>

        <div style={classificationSummaryGrid}>
          {([
            "core",
            "conceptual",
            "contextual",
            "borderline_core",
            "borderline_conceptual",
            "borderline_contextual",
            "unclassified"
          ] as RelationshipClassification[]).map(classification => (
            <button
              type="button"
              key={classification}
              onClick={() => toggleClassificationVisibility(classification)}
              style={{
                ...classificationSummaryCard,
                opacity: visibleClassifications[classification] ? 1 : 0.45
              }}
            >
              <span style={classificationSummaryLabel}>
                <input
                  type="checkbox"
                  checked={visibleClassifications[classification]}
                  readOnly
                  style={{ pointerEvents: "none" }}
                />
                {tr(relationshipClassificationLabel(classification))}
              </span>
              <span style={classificationSummaryValue}>
                {classificationSummary[classification]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section style={errorPanel}>
          <strong>{tr("Relationship Lab error")}</strong>
          <p>{error}</p>
        </section>
      )}

      {!selectedTopic && !loadingOverview && (
        <section style={panelCard}>
          <h2 style={sectionTitle}>{tr("No topic selected")}</h2>
          <p style={mutedText}>{tr("Select a topic to inspect its relationships.")}</p>
        </section>
      )}

      {selectedTopic && (
        <section style={panelCard}>
          <div style={topicHeader}>
            <div>
              <div style={eyebrow}>{tr("Selected topic")}</div>
              <h2 style={topicTitle}>{selectedTopic.topic}</h2>
              <div style={categoryLine}>
                {tr("Category")}: {selectedTopic.category || tr("Uncategorized")}
              </div>
            </div>
            <div style={evidenceGrid}>
              <Stat label={tr("Associated chunks")} value={selectedTopic.associated_chunk_count} />
              <Stat label={tr("Documents")} value={selectedTopic.document_count} />
              <Stat label={tr("Sections")} value={selectedTopic.section_count} />
              <Stat
                label={tr("Text length")}
                value={selectedTopic.total_associated_text_length.toLocaleString()}
              />
            </div>
          </div>
        </section>
      )}

      <section style={panelCard}>
        <div style={relationshipHeader}>
          <h2 style={sectionTitle}>{tr("Related topics")}</h2>
          {loadingFocus && <span style={loadingPill}>{tr("Loading relationships...")}</span>}
        </div>

        {!loadingFocus && selectedTopic && relatedEdges.length === 0 && (
          <div style={emptyState}>
            <strong>{tr("No relationships with current filters")}</strong>
            <p>{tr("No relationships match the current filters. Try reducing the thresholds.")}</p>
          </div>
        )}

        <div style={edgeList}>
          {visibleEdges.map((edge, index) => (
            <RelationshipRow
              key={`${edge.topic_a_id}-${edge.topic_b_id}`}
              edge={edge}
              index={index}
              selectedTopicId={selectedTopicId}
              selectedTopic={selectedTopic}
              nodesById={nodesById}
              tr={tr}
            />
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  )
}

function RelationshipRow({
  edge,
  index,
  selectedTopicId,
  selectedTopic,
  nodesById,
  tr
}: {
  edge: ClassifiedRelationshipEdge
  index: number
  selectedTopicId: string
  selectedTopic: TopicRelationshipNode | null
  nodesById: Map<string, TopicRelationshipNode>
  tr: (key: string, options?: Record<string, unknown>) => string
}) {
  const relatedId =
    edge.topic_a_id === selectedTopicId
      ? edge.topic_b_id
      : edge.topic_b_id === selectedTopicId
        ? edge.topic_a_id
        : edge.topic_b_id
  const related = nodesById.get(relatedId)
  const relatedTopic =
    related?.topic
    || (edge.topic_a_id === selectedTopicId ? edge.topic_b : edge.topic_a)
    || tr("Unknown related topic")
  const relatedCategory =
    related?.category
    || (edge.topic_a_id === selectedTopicId ? edge.category_b : edge.category_a)
  const selectedCategory = selectedTopic?.category || null
  const crossCategory =
    Boolean(selectedCategory && relatedCategory)
    && selectedCategory !== relatedCategory

  return (
    <article style={edgeCard}>
      <div style={edgeTopRow}>
        <div style={edgeRank}>{String(index + 1).padStart(2, "0")}</div>
        <div>
          <h3 style={edgeTitle}>{relatedTopic}</h3>
          <div style={categoryLine}>
            <span style={classificationBadgeStyles[edge.classification]}>
              {tr(relationshipClassificationLabel(edge.classification))}
            </span>
            {tr("Category")}: {relatedCategory || tr("Uncategorized")}
            {crossCategory && <span style={crossBadge}>{tr("Cross-category")}</span>}
          </div>
        </div>
      </div>

      <div style={metricsGrid}>
        <Metric label={tr("Semantic similarity")} value={formatNumber(edge.semantic_similarity)} barValue={edge.semantic_similarity ?? 0} />
        <Metric label={tr("Shared chunks")} value={edge.shared_chunks} />
        <Metric label={tr("Chunks A")} value={edge.chunks_a} />
        <Metric label={tr("Chunks B")} value={edge.chunks_b} />
        <Metric label={tr("Chunk Jaccard")} value={formatNumber(edge.chunk_jaccard)} barValue={edge.chunk_jaccard} />
        <Metric label={tr("Shared sections")} value={edge.shared_sections} />
        <Metric label={tr("Shared documents")} value={edge.shared_documents} />
      </div>
    </article>
  )
}

function FilterInput({
  label,
  value,
  onChange,
  min,
  max,
  step
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: string
}) {
  return (
    <label style={filterLabel}>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={event => onChange(Number(event.target.value))}
        style={inputStyle}
      />
    </label>
  )
}

function Metric({
  label,
  value,
  barValue
}: {
  label: string
  value: string | number
  barValue?: number
}) {
  const normalizedBar = Math.max(0, Math.min(1, barValue ?? 0))

  return (
    <div style={metricCard}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
      {barValue !== undefined && (
        <div style={miniBarTrack}>
          <div style={{ ...miniBarFill, width: `${normalizedBar * 100}%` }} />
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  )
}

function validateFilters(
  filters: AppliedFilters,
  tr: (key: string, options?: Record<string, unknown>) => string
) {
  if (!Number.isFinite(filters.minSemanticSimilarity)) {
    return tr("Min semantic similarity must be a number.")
  }

  if (filters.minSemanticSimilarity < -1 || filters.minSemanticSimilarity > 1) {
    return tr("Min semantic similarity must be between -1 and 1.")
  }

  if (!Number.isFinite(filters.minSharedChunks) || filters.minSharedChunks < 0) {
    return tr("Min shared chunks cannot be negative.")
  }

  if (!Number.isFinite(filters.topKPerTopic) || filters.topKPerTopic < 1) {
    return tr("Top relationships must be at least 1.")
  }

  if (filters.topKPerTopic > 50) {
    return tr("Top relationships cannot exceed 50.")
  }

  return null
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown relationship lab error"
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—"
  }

  return value.toFixed(3)
}

function formatMs(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—"
  }

  return `${Math.round(value)} ms`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

const labShell: CSSProperties = {
  padding: 28,
  maxWidth: 1320,
  margin: "0 auto",
  color: "#e5e7eb"
}

const heroCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
  gap: 24,
  padding: 26,
  borderRadius: 24,
  background:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.78))",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.28)"
}

const eyebrow: CSSProperties = {
  color: "#36f2ed",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 800,
  marginBottom: 10
}

const title: CSSProperties = {
  color: "white",
  margin: 0,
  fontSize: 36,
  letterSpacing: "-0.035em"
}

const subtitle: CSSProperties = {
  color: "#a7b3c7",
  fontSize: 16,
  lineHeight: 1.6,
  maxWidth: 760,
  margin: "10px 0 0"
}

const modeSwitchCard: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  padding: 8,
  marginTop: 18,
  borderRadius: 18,
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.16)"
}

const modeButton: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 13,
  padding: "11px 16px",
  background: "transparent",
  color: "#94a3b8",
  fontWeight: 900,
  cursor: "pointer"
}

const activeModeButton: CSSProperties = {
  color: "white",
  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.72), rgba(37, 99, 235, 0.58))",
  border: "1px solid rgba(167, 139, 250, 0.3)",
  boxShadow: "0 12px 40px rgba(37, 99, 235, 0.18)"
}

const controlGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 0.9fr) minmax(380px, 1.1fr)",
  gap: 18,
  marginTop: 18
}

const panelCard: CSSProperties = {
  padding: 22,
  borderRadius: 20,
  background: "rgba(15, 23, 42, 0.86)",
  border: "1px solid rgba(148, 163, 184, 0.18)"
}

const sectionTitle: CSSProperties = {
  color: "white",
  fontSize: 18,
  margin: "0 0 14px"
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(2, 6, 23, 0.6)",
  color: "#e5e7eb",
  padding: "11px 12px",
  outline: "none"
}

const filterGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12
}

const classificationHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap"
}

const classificationDescription: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  lineHeight: 1.55,
  margin: "-6px 0 16px",
  maxWidth: 760
}

const classificationControlsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12
}

const classificationSummaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  marginTop: 16
}

const classificationSummaryCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(2, 6, 23, 0.38)",
  color: "#e5e7eb",
  cursor: "pointer"
}

const classificationSummaryLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#a7b3c7",
  fontSize: 12,
  fontWeight: 850,
  letterSpacing: "0.04em"
}

const classificationSummaryValue: CSSProperties = {
  color: "white",
  fontSize: 18,
  fontWeight: 900
}

const filterLabel: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#a7b3c7",
  fontSize: 13,
  fontWeight: 700
}

const actionsRow: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16
}

const primaryButton: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "11px 16px",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  background: "linear-gradient(135deg, #7c3aed, #2563eb)"
}

const secondaryButton: CSSProperties = {
  ...primaryButton,
  color: "#d8b4fe",
  background: "rgba(124, 58, 237, 0.13)",
  border: "1px solid rgba(168, 85, 247, 0.26)"
}

const mutedText: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  marginTop: 12
}

const errorText: CSSProperties = {
  color: "#fca5a5",
  fontSize: 13,
  marginTop: 10
}

const errorPanel: CSSProperties = {
  ...panelCard,
  marginTop: 18,
  borderColor: "rgba(248, 113, 113, 0.36)",
  color: "#fecaca"
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
}

const statCard: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(2, 6, 23, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.14)"
}

const statLabel: CSSProperties = {
  color: "#8ea1bd",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
}

const statValue: CSSProperties = {
  color: "white",
  fontSize: 19,
  fontWeight: 900,
  marginTop: 5
}

const topicHeader: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.9fr)",
  gap: 18,
  alignItems: "start"
}

const topicTitle: CSSProperties = {
  color: "white",
  margin: 0,
  fontSize: 26,
  letterSpacing: "-0.02em"
}

const categoryLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  color: "#9ca3af",
  fontSize: 13,
  marginTop: 8
}

const evidenceGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
}

const relationshipHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
}

const loadingPill: CSSProperties = {
  color: "#bfdbfe",
  background: "rgba(37, 99, 235, 0.14)",
  border: "1px solid rgba(96, 165, 250, 0.22)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800
}

const emptyState: CSSProperties = {
  color: "#cbd5e1",
  padding: 18,
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.7)",
  border: "1px dashed rgba(148, 163, 184, 0.24)"
}

const edgeList: CSSProperties = {
  display: "grid",
  gap: 14
}

const edgeCard: CSSProperties = {
  padding: 18,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.74))",
  border: "1px solid rgba(148, 163, 184, 0.16)"
}

const edgeTopRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  gap: 12,
  alignItems: "start",
  marginBottom: 14
}

const edgeRank: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#c4b5fd",
  background: "rgba(124, 58, 237, 0.16)",
  border: "1px solid rgba(167, 139, 250, 0.22)",
  fontWeight: 900
}

const edgeTitle: CSSProperties = {
  color: "white",
  margin: 0,
  fontSize: 18
}

const crossBadge: CSSProperties = {
  color: "#22d3ee",
  background: "rgba(8, 145, 178, 0.16)",
  border: "1px solid rgba(34, 211, 238, 0.28)",
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase"
}

const baseClassificationBadge: CSSProperties = {
  borderRadius: 999,
  padding: "3px 8px",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em"
}

const classificationBadgeStyles: Record<RelationshipClassification, CSSProperties> = {
  core: {
    ...baseClassificationBadge,
    color: "#bbf7d0",
    background: "rgba(34, 197, 94, 0.16)",
    border: "1px solid rgba(74, 222, 128, 0.3)"
  },
  conceptual: {
    ...baseClassificationBadge,
    color: "#bfdbfe",
    background: "rgba(37, 99, 235, 0.16)",
    border: "1px solid rgba(96, 165, 250, 0.3)"
  },
  contextual: {
    ...baseClassificationBadge,
    color: "#fde68a",
    background: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(251, 191, 36, 0.28)"
  },
  borderline_core: {
    ...baseClassificationBadge,
    color: "#dcfce7",
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px dashed rgba(74, 222, 128, 0.34)"
  },
  borderline_conceptual: {
    ...baseClassificationBadge,
    color: "#dbeafe",
    background: "rgba(37, 99, 235, 0.08)",
    border: "1px dashed rgba(96, 165, 250, 0.34)"
  },
  borderline_contextual: {
    ...baseClassificationBadge,
    color: "#fef3c7",
    background: "rgba(245, 158, 11, 0.08)",
    border: "1px dashed rgba(251, 191, 36, 0.34)"
  },
  unclassified: {
    ...baseClassificationBadge,
    color: "#cbd5e1",
    background: "rgba(100, 116, 139, 0.15)",
    border: "1px solid rgba(148, 163, 184, 0.22)"
  }
}

const metricsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10
}

const metricCard: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(2, 6, 23, 0.4)",
  border: "1px solid rgba(148, 163, 184, 0.12)"
}

const metricLabel: CSSProperties = {
  color: "#93a4bd",
  fontSize: 12,
  marginBottom: 4
}

const metricValue: CSSProperties = {
  color: "white",
  fontSize: 17,
  fontWeight: 850
}

const miniBarTrack: CSSProperties = {
  marginTop: 8,
  height: 5,
  borderRadius: 999,
  background: "rgba(148, 163, 184, 0.16)",
  overflow: "hidden"
}

const miniBarFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #7c3aed, #36f2ed)"
}
