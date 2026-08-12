import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent
} from "react"
import { useTranslation } from "react-i18next"
import {
  GitBranch,
  Hand,
  MousePointerClick,
  Move,
  RotateCw,
  Search
} from "lucide-react"
import type {
  TopicRelationshipExplanation,
  TopicRelationshipEdge,
  TopicRelationshipGraph,
  TopicRelationshipNode
} from "../../../services/topicRelationships"
import { fetchTopicRelationshipExplanation } from "../../../services/topicRelationships"
import {
  classifyRelationship,
  type RelationshipClassification,
  type RelationshipClassificationThresholds
} from "../../../utils/topicRelationshipClassification"

type RelationshipFamily = "core" | "conceptual" | "contextual"
type FamilyVisibility = Record<RelationshipFamily, boolean>
type UniverseMode = "universe" | "galaxy" | "topic"

type GalaxyDust = {
  x: number
  y: number
  z: number
  radius: number
  alpha: number
}

type GalaxyStar = TopicRelationshipNode & {
  galaxyId: string
  galaxyName: string
  localX: number
  localY: number
  localZ: number
  universeX: number
  universeY: number
  universeZ: number
  explodedX: number
  explodedY: number
  explodedZ: number
  radius: number
  luminosity: number
  color: string
}

type UniverseEdge = TopicRelationshipEdge & {
  classification: RelationshipClassification
  family: RelationshipFamily
  borderline: boolean
  source: string
  target: string
  weight: number
  sourceGalaxyId: string
  targetGalaxyId: string
  internal: boolean
}

type GalaxyBridge = {
  id: string
  sourceGalaxyId: string
  targetGalaxyId: string
  sourceGalaxy: string
  targetGalaxy: string
  family: RelationshipFamily
  familyStrengths: Record<RelationshipFamily, number>
  strength: number
  edgeCount: number
}

type Galaxy = {
  id: string
  name: string
  color: string
  topicCount: number
  aggregateChunks: number
  radius: number
  x: number
  y: number
  z: number
  stars: GalaxyStar[]
  internalEdges: number
  bridgeEdges: number
  bridgeStrength: number
  strongestTopics: GalaxyStar[]
  dust: GalaxyDust[]
}

type ExternalCategorySummary = {
  galaxy: Galaxy
  connectionCount: number
  strength: number
  family: RelationshipFamily
  familyStrengths: Record<RelationshipFamily, number>
  internalTopicIds: Set<string>
}

type ProjectedRelationship = {
  key: string
  edge: UniverseEdge
  x1: number
  y1: number
  x2: number
  y2: number
  external: boolean
}

type UniverseModel = {
  galaxies: Galaxy[]
  stars: GalaxyStar[]
  edges: UniverseEdge[]
  bridges: GalaxyBridge[]
  familyCounts: Record<RelationshipFamily, number>
  isolatedGalaxies: Galaxy[]
  largestGalaxy: Galaxy | null
  smallestGalaxy: Galaxy | null
}

type KnowledgeSphereProps = {
  projectId: string
  graph: TopicRelationshipGraph | null
  loading: boolean
  error: string | null
  thresholds: RelationshipClassificationThresholds
  onReload: () => void
}

type KnowledgeSphereLabels = {
  topics: string
  topicStars: string
  chunks: string
  associatedChunks: string
  connections: string
  strength: string
  internal: string
  bridges: string
  externalRelationships: string
  directQualifiedRelationships: string
  selectedTopic: string
  focusedTopic: string
  unknownSource: string
}

const FAMILY_COLORS: Record<RelationshipFamily, string> = {
  core: "#34d399",
  conceptual: "#60a5fa",
  contextual: "#fbbf24"
}

const EDGE_WEIGHTS: Record<RelationshipClassification, number> = {
  core: 1,
  borderline_core: 0.85,
  conceptual: 0.7,
  borderline_conceptual: 0.55,
  contextual: 0.45,
  borderline_contextual: 0.3,
  unclassified: 0
}

const CENTRALITY_WEIGHTS: Record<RelationshipFamily, number> = {
  core: 1,
  conceptual: 0.65,
  contextual: 0.4
}

const UNIVERSE_POSITION_COMPRESSION = 0.52
const MAX_UNIVERSE_WORLD_EXTENT = 940
const CATEGORY_COLLISION_GAP = 18

const CATEGORY_PALETTE = [
  "#36f2ed",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
  "#a3e635",
  "#fb7185",
  "#c084fc",
  "#06b6d4",
  "#f97316",
  "#2dd4bf",
  "#818cf8",
  "#e879f9"
]

export default function KnowledgeSphere({
  projectId,
  graph,
  loading,
  error,
  thresholds,
  onReload
}: KnowledgeSphereProps) {
  const { t, i18n } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const detailsPanelRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0, button: 0 })
  const viewRef = useRef({ panX: 0, panY: 0, rotationX: -0.18, rotationY: 0.42, zoom: 1 })
  const projectedStarsRef = useRef<
    Array<{ id: string; x: number; y: number; radius: number; depth?: number }>
  >([])
  const projectedGalaxiesRef = useRef<
    Array<{ id: string; x: number; y: number; radius: number; depth?: number }>
  >([])
  const projectedRelationshipsRef = useRef<ProjectedRelationship[]>([])

  const [mode, setMode] = useState<UniverseMode>("universe")
  const [selectedGalaxyId, setSelectedGalaxyId] = useState<string | null>(null)
  const [hoveredGalaxyId, setHoveredGalaxyId] = useState<string | null>(null)
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null)
  const [focusedStarId, setFocusedStarId] = useState<string | null>(null)
  const [hoveredRelationshipKey, setHoveredRelationshipKey] = useState<string | null>(null)
  const [selectedRelationshipKey, setSelectedRelationshipKey] = useState<string | null>(null)
  const [familyVisibility, setFamilyVisibility] = useState<FamilyVisibility>({
    core: true,
    conceptual: true,
    contextual: true
  })
  const [includeBorderline, setIncludeBorderline] = useState(true)
  const [viewVersion, setViewVersion] = useState(0)
  const [relationshipExplanation, setRelationshipExplanation] =
    useState<TopicRelationshipExplanation | null>(null)
  const [relationshipExplanationLoading, setRelationshipExplanationLoading] = useState(false)
  const [relationshipExplanationError, setRelationshipExplanationError] =
    useState<string | null>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  const universe = useMemo(
    () => buildUniverseModel(graph, thresholds),
    [graph, thresholds]
  )
  const galaxyMap = useMemo(
    () => new Map(universe.galaxies.map(galaxy => [galaxy.id, galaxy])),
    [universe.galaxies]
  )
  const starMap = useMemo(
    () => new Map(universe.stars.map(star => [star.id, star])),
    [universe.stars]
  )
  const selectedGalaxy = selectedGalaxyId
    ? galaxyMap.get(selectedGalaxyId) || null
    : null
  const hoveredGalaxy = hoveredGalaxyId
    ? galaxyMap.get(hoveredGalaxyId) || null
    : null
  const hoveredStar = hoveredStarId ? starMap.get(hoveredStarId) || null : null
  const focusedStar = focusedStarId ? starMap.get(focusedStarId) || null : null
  const visibleEdges = useMemo(
    () =>
      universe.edges.filter(edge =>
        familyVisibility[edge.family] && (includeBorderline || !edge.borderline)
      ),
    [universe.edges, familyVisibility, includeBorderline]
  )
  const selectedGalaxyEdges = useMemo(
    () =>
      selectedGalaxy
        ? visibleEdges.filter(edge =>
            edge.sourceGalaxyId === selectedGalaxy.id
            || edge.targetGalaxyId === selectedGalaxy.id
          )
        : [],
    [selectedGalaxy, visibleEdges]
  )
  const focusedNeighbors = useMemo(() => {
    if (!focusedStarId) return new Set<string>()
    const neighbors = new Set<string>()
    selectedGalaxyEdges.forEach(edge => {
      if (edge.source === focusedStarId) neighbors.add(edge.target)
      if (edge.target === focusedStarId) neighbors.add(edge.source)
    })
    return neighbors
  }, [focusedStarId, selectedGalaxyEdges])
  const hoveredFocusedEdge = useMemo(() => {
    if (!focusedStarId || !hoveredStarId || focusedStarId === hoveredStarId) return null
    return selectedGalaxyEdges.find(edge =>
      (edge.source === focusedStarId && edge.target === hoveredStarId)
      || (edge.target === focusedStarId && edge.source === hoveredStarId)
    ) || null
  }, [focusedStarId, hoveredStarId, selectedGalaxyEdges])
  const selectedRelationshipEdge = useMemo(() => {
    if (!selectedRelationshipKey) return null
    return selectedGalaxyEdges.find(edge => relationshipEdgeKey(edge) === selectedRelationshipKey) || null
  }, [selectedGalaxyEdges, selectedRelationshipKey])
  const hoveredRelationshipEdge = useMemo(() => {
    if (!hoveredRelationshipKey) return null
    return selectedGalaxyEdges.find(edge => relationshipEdgeKey(edge) === hoveredRelationshipKey) || null
  }, [hoveredRelationshipKey, selectedGalaxyEdges])
  const focusedRelatedStars = useMemo(() => {
    if (!focusedStarId) return []
    return Array.from(focusedNeighbors)
      .map(id => starMap.get(id))
      .filter((star): star is GalaxyStar => Boolean(star))
      .sort((a, b) => {
        if (b.luminosity !== a.luminosity) return b.luminosity - a.luminosity
        return a.topic.localeCompare(b.topic)
      })
  }, [focusedNeighbors, focusedStarId, starMap])
  const focusedRelationshipItems = useMemo(() => {
    if (!focusedStarId) return []
    return selectedGalaxyEdges
      .filter(edge => edge.source === focusedStarId || edge.target === focusedStarId)
      .map(edge => {
        const relatedId = edge.source === focusedStarId ? edge.target : edge.source
        const star = starMap.get(relatedId)
        if (!star) return null
        return { edge, star, key: relationshipEdgeKey(edge) }
      })
      .filter((item): item is { edge: UniverseEdge; star: GalaxyStar; key: string } => Boolean(item))
      .sort((a, b) => {
        if (b.edge.weight !== a.edge.weight) return b.edge.weight - a.edge.weight
        if (b.star.associated_chunk_count !== a.star.associated_chunk_count) {
          return b.star.associated_chunk_count - a.star.associated_chunk_count
        }
        return a.star.topic.localeCompare(b.star.topic)
      })
  }, [focusedStarId, selectedGalaxyEdges, starMap])
  const selectedExternalSummaries = useMemo(
    () =>
      selectedGalaxy
        ? externalCategorySummaries(selectedGalaxy, selectedGalaxyEdges, galaxyMap)
        : [],
    [selectedGalaxy, selectedGalaxyEdges, galaxyMap]
  )
  const activeRelationshipEdge = hoveredRelationshipEdge || selectedRelationshipEdge
  const activeRelationshipSource = activeRelationshipEdge ? starMap.get(activeRelationshipEdge.source) || null : null
  const activeRelationshipTarget = activeRelationshipEdge ? starMap.get(activeRelationshipEdge.target) || null : null
  const selectedRelationshipSource = selectedRelationshipEdge
    ? starMap.get(selectedRelationshipEdge.source) || null
    : null
  const selectedRelationshipTarget = selectedRelationshipEdge
    ? starMap.get(selectedRelationshipEdge.target) || null
    : null
  const explanationStudyLanguage: "English" | "Italian" = i18n.language.toLowerCase().startsWith("it")
    ? "Italian"
    : "English"
  const ts = (key: string, options?: Record<string, unknown>) => t(`stats.${key}`, options)
  const categoryFallback = ts("Uncategorized")
  const labels = useMemo(() => ({
    topics: ts("topics"),
    topicStars: ts("topic stars"),
    chunks: ts("chunks"),
    associatedChunks: ts("associated chunks"),
    connections: ts("connections"),
    strength: ts("strength"),
    internal: ts("internal"),
    bridges: ts("bridges"),
    externalRelationships: ts("external relationships"),
    directQualifiedRelationships: ts("direct qualified relationships"),
    selectedTopic: ts("selected topic"),
    focusedTopic: ts("FOCUSED TOPIC"),
    unknownSource: ts("Unknown source")
  }), [i18n.language])
  const relationshipFamilyText = (family: RelationshipFamily) =>
    ts(`relationship_family_${family}`)

  const mobileUniverseGrid: CSSProperties = isMobileLayout
    ? {
      gridTemplateColumns: "1fr",
      height: "auto",
      alignItems: "stretch"
    }
    : {}
  const mobileOrientationPanel: CSSProperties = isMobileLayout
    ? {
      height: "auto",
      maxHeight: "none",
      overflowY: "visible"
    }
    : {}
  const mobileCanvasWrap: CSSProperties = isMobileLayout
    ? {
      height: "min(70vh, 620px)",
      minHeight: 460,
      borderRadius: 22
    }
    : {}
  const mobileDiagnosticPanel: CSSProperties = isMobileLayout
    ? {
      height: "auto",
      maxHeight: "none",
      overflow: "visible"
    }
    : {}
  const mobileRelationshipSidebarPanel: CSSProperties = isMobileLayout
    ? {
      height: "auto",
      maxHeight: "none",
      overflowY: "visible"
    }
    : {}
  const mobileHoverCard: CSSProperties = isMobileLayout
    ? {
      left: 12,
      right: 12,
      bottom: 12,
      maxWidth: "none"
    }
    : {}

  function loadSelectedRelationshipExplanation(edge: UniverseEdge | null) {
    if (!projectId || !edge) {
      setRelationshipExplanation(null)
      setRelationshipExplanationError(null)
      setRelationshipExplanationLoading(false)
      return
    }

    setRelationshipExplanation(null)
    setRelationshipExplanationError(null)
    setRelationshipExplanationLoading(true)

    fetchTopicRelationshipExplanation(
      projectId,
      edge.source,
      edge.target,
      explanationStudyLanguage
    )
      .then(data => {
        setRelationshipExplanation(data)
      })
      .catch(error => {
        setRelationshipExplanationError(readableRelationshipError(
          error,
          ts("The relationship explanation could not be generated. Please try again.")
        ))
      })
      .finally(() => {
        setRelationshipExplanationLoading(false)
      })
  }

  function lineSample(color: string, dashed = false, width = 3, opacity = 0.88): CSSProperties {
    return {
      width: 34,
      height: 0,
      borderTop: `${width}px ${dashed ? "dashed" : "solid"} ${color}`,
      opacity,
      borderRadius: 999,
      boxShadow: `0 0 ${Math.max(4, width * 3)}px ${color}`
    }
  }

  function doubleLineSample(color: string): CSSProperties {
    return {
      position: "relative",
      width: 34,
      height: 8,
      opacity: 0.88,
      background: `linear-gradient(to bottom, transparent 0 1px, ${color} 1px 3px, transparent 3px 5px, ${color} 5px 7px, transparent 7px 100%)`,
      filter: `drop-shadow(0 0 5px ${color})`
    }
  }

  function currentStageInfo() {
    if (mode === "topic") {
      return {
        stage: ts("STAGE 3"),
        title: ts("FOCUSED TOPIC"),
        description: ts("Explore one topic and its direct qualified relationships."),
        clickHint: ts("Click topic to refocus")
      }
    }
    if (mode === "galaxy") {
      return {
        stage: ts("STAGE 2"),
        title: ts("SELECTED GALAXY"),
        description: ts("Explore the topics inside the selected category and its connections to other categories."),
        clickHint: ts("Click topic to open")
      }
    }
    return {
      stage: ts("STAGE 1"),
      title: ts("UNIVERSE VIEW"),
      description: ts("Overview of the project's categories and their relationships."),
      clickHint: ts("Click to explore")
    }
  }

  function renderOrientationPanel() {
    const stage = currentStageInfo()
    const navigationItems = [
      { label: ts("Drag to rotate"), icon: <RotateCw size={14} /> },
      { label: ts("Scroll to zoom"), icon: <Search size={14} /> },
      { label: ts("Right drag to move"), icon: <Move size={14} /> },
      { label: ts("Hover for details"), icon: <Hand size={14} /> },
      { label: stage.clickHint, icon: <MousePointerClick size={14} /> },
      ...(mode === "galaxy" || mode === "topic"
        ? [{ label: ts("Click connection to explain"), icon: <GitBranch size={14} /> }]
        : [])
    ]
    return (
      <aside
        className="knowledge-sphere-scrollbar"
        style={{ ...orientationPanel, ...mobileOrientationPanel }}
      >
        <div>
          <div style={stageLabel}>{stage.stage}</div>
          <h3 style={orientationTitle}>{stage.title}</h3>
          <p style={orientationText}>{stage.description}</p>
        </div>

        <div style={orientationCard}>
          <h4 style={orientationCardTitle}>{ts("Relationship")}</h4>
          {(["core", "conceptual", "contextual"] as RelationshipFamily[]).map(family => (
            <div key={family} style={legendRow}>
              <span style={lineSample(FAMILY_COLORS[family])} />
              <span>{relationshipFamilyText(family)}</span>
            </div>
          ))}
          <div style={legendRow}>
            <span style={lineSample("#94a3b8", true)} />
            <span>{ts("BORDERLINE")}</span>
          </div>
        </div>

        <div style={orientationCard}>
          <h4 style={orientationCardTitle}>{ts("Structure")}</h4>
          <div style={legendRow}>
            <span style={lineSample("#94a3b8")} />
            <span>{ts("Within this category")}</span>
          </div>
          <div style={legendRow}>
            <span style={doubleLineSample("#94a3b8")} />
            <span>{ts("Bridge to another category")}</span>
          </div>
        </div>

        <div style={orientationCard}>
          <h4 style={orientationCardTitle}>{ts("Strength")}</h4>
          <div style={legendRow}>
            <span style={lineSample("#94a3b8", false, 1, 0.46)} />
            <span>{ts("Weaker")}</span>
          </div>
          <div style={legendRow}>
            <span style={lineSample("#36f2ed", false, 4, 0.92)} />
            <span>{ts("Stronger")}</span>
          </div>
        </div>

        <div style={orientationCard}>
          <h4 style={orientationCardTitle}>{ts("How to read")}</h4>
          <div style={grammarList}>
            {mode === "topic" && (
              <>
                <span>{ts("Node color = category membership")}</span>
                <span>{ts("Node size = associated source material")}</span>
                <span>{ts("Node luminosity = direct relationship relevance")}</span>
              </>
            )}
            {mode === "universe" && (
              <>
                <span>{ts("Galaxy size = topics and associated chunks")}</span>
                <span>{ts("Galaxy luminosity = relationship connectivity")}</span>
              </>
            )}
            {mode === "galaxy" && (
              <>
                <span>{ts("Topic size = associated source material")}</span>
                <span>{ts("Topic luminosity = structural importance")}</span>
                <span>{ts("External galaxies summarize real bridge relationships")}</span>
              </>
            )}
          </div>
        </div>

        <div style={orientationCard}>
          <h4 style={orientationCardTitle}>{ts("Navigation")}</h4>
          <div style={navigationList}>
            {navigationItems.map(item => (
              <div key={item.label} style={navigationRow}>
                <span style={navigationIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  function renderSelectedRelationshipSidebar() {
    if (!selectedRelationshipEdge || !selectedRelationshipSource || !selectedRelationshipTarget) {
      return null
    }
    const bridge = selectedRelationshipEdge.sourceGalaxyId !== selectedRelationshipEdge.targetGalaxyId
    const familyLabel = relationshipFamilyText(selectedRelationshipEdge.family)
    const classificationLabel = selectedRelationshipEdge.classification.replace("_", " ").toUpperCase()
    const typeLabel = [
      familyLabel,
      selectedRelationshipEdge.borderline ? ts("Borderline") : null,
      bridge ? ts("Bridge to another category") : ts("Within this category")
    ].filter(Boolean).join(" · ")
    return (
      <div
        className="knowledge-sphere-scrollbar"
        style={{ ...relationshipSidebarPanel, ...mobileRelationshipSidebarPanel }}
      >
        <button
          type="button"
          onClick={() => setSelectedRelationshipKey(null)}
          style={relationshipBackButton}
        >
          {ts("← Back")}
        </button>

        <div>
          <div style={stageLabel}>{ts("RELATIONSHIP EXPLANATION")}</div>
          <h3 style={panelTitle}>{ts("Why these concepts are connected")}</h3>
        </div>

        <div style={relationshipEntityCard}>
          <strong>{selectedRelationshipSource.topic}</strong>
          <span style={relationshipEntityCategory}>{selectedRelationshipSource.category || categoryFallback}</span>
          <span style={relationshipArrow}>↕</span>
          <strong>{selectedRelationshipTarget.topic}</strong>
          <span style={relationshipEntityCategory}>{selectedRelationshipTarget.category || categoryFallback}</span>
          <span style={{
            ...relationshipEntityMeta,
            color: FAMILY_COLORS[selectedRelationshipEdge.family]
          }}>
            {typeLabel || classificationLabel}
          </span>
        </div>

        {relationshipExplanationLoading && (
          <div style={relationshipStateCard}>
            {ts("Generating grounded explanation from the project material…")}
          </div>
        )}

        {relationshipExplanationError && (
          <div style={relationshipErrorCard}>
            <strong>{ts("Explanation unavailable")}</strong>
            <span>{relationshipExplanationError}</span>
            <button
              type="button"
              onClick={() => loadSelectedRelationshipExplanation(selectedRelationshipEdge)}
              style={relationshipRetryButton}
            >
              {ts("Retry")}
            </button>
          </div>
        )}

        {relationshipExplanation && (
          <>
            <div style={evidenceBlock}>
              <h4 style={orientationCardTitle}>{ts("Why they are connected")}</h4>
              <p style={relationshipExplanationText}>{relationshipExplanation.why_connected}</p>
            </div>

            <div style={evidenceBlock}>
              <h4 style={orientationCardTitle}>{ts("Why this matters for studying")}</h4>
              <p style={relationshipExplanationText}>{relationshipExplanation.study_relevance}</p>
            </div>

            <div style={evidenceBlock}>
              <h4 style={orientationCardTitle}>{ts("Sources")}</h4>
              {relationshipExplanation.evidence.length > 0 ? (
                <div style={evidencePreviewList}>
                  {relationshipExplanation.evidence.slice(0, 4).map(item => (
                    <div key={item.chunk_id} style={evidencePreviewCard}>
                      <strong>{formatEvidenceSource(item.document, item.page, ts("page"), labels.unknownSource)}</strong>
                      {item.section && <span>{item.section}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={panelText}>{ts("No source metadata is available for this relationship.")}</p>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  function renderUniverseInstructionPanel() {
    return (
      <div style={explanationPanel}>
        <h4 style={orientationCardTitle}>{ts("How to read this universe")}</h4>
        <div style={grammarList}>
          <span>{ts("Each galaxy represents one category from the project taxonomy.")}</span>
          <span>{ts("Galaxy size combines topic count and associated source chunks.")}</span>
          <span>{ts("Luminosity reflects real relationship connectivity.")}</span>
          <span>{ts("Connections show qualified relationships between categories.")}</span>
          <span>{ts("Click a galaxy to explore its internal topics.")}</span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!projectId || !selectedRelationshipEdge) {
      setRelationshipExplanation(null)
      setRelationshipExplanationError(null)
      setRelationshipExplanationLoading(false)
      return
    }

    let cancelled = false
    setRelationshipExplanation(null)
    setRelationshipExplanationError(null)
    setRelationshipExplanationLoading(true)

    fetchTopicRelationshipExplanation(
      projectId,
      selectedRelationshipEdge.source,
      selectedRelationshipEdge.target,
      explanationStudyLanguage
    )
      .then(data => {
        if (!cancelled) {
          setRelationshipExplanation(data)
        }
      })
      .catch(error => {
        if (!cancelled) {
          setRelationshipExplanationError(readableRelationshipError(
            error,
            ts("The relationship explanation could not be generated. Please try again.")
          ))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRelationshipExplanationLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    projectId,
    selectedRelationshipKey,
    selectedRelationshipEdge?.source,
    selectedRelationshipEdge?.target,
    explanationStudyLanguage
  ])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const resize = () => {
      const rect = wrapper.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      drawUniverse()
    }

    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  useEffect(() => {
    const updateLayoutMode = () => {
      setIsMobileLayout(window.innerWidth <= 900)
    }

    updateLayoutMode()
    window.addEventListener("resize", updateLayoutMode)
    return () => window.removeEventListener("resize", updateLayoutMode)
  }, [])

  useEffect(() => {
    if (!isMobileLayout || !selectedRelationshipKey) return
    window.setTimeout(() => {
      detailsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 80)
  }, [isMobileLayout, selectedRelationshipKey])

  useEffect(() => {
    if (!isMobileLayout || mode !== "topic" || !focusedStarId || selectedRelationshipKey) return
    window.setTimeout(() => {
      detailsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 80)
  }, [isMobileLayout, mode, focusedStarId, selectedRelationshipKey])

  useEffect(() => {
    drawUniverse()
  }, [
    universe,
    visibleEdges,
    selectedGalaxyId,
    hoveredGalaxyId,
    hoveredStarId,
    focusedStarId,
    hoveredRelationshipKey,
    selectedRelationshipKey,
    mode,
    selectedExternalSummaries,
    viewVersion
  ])

  function drawUniverse() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width
    const height = canvas.height
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.scale(dpr, dpr)

    const logicalWidth = width / dpr
    const logicalHeight = height / dpr
    drawBackground(ctx, logicalWidth, logicalHeight)

    if (mode === "topic" && selectedGalaxy && focusedStar) {
      drawFocusedTopicView(ctx, logicalWidth, logicalHeight, selectedGalaxy, focusedStar)
    } else if (mode === "galaxy" && selectedGalaxy) {
      drawExplodedGalaxy(ctx, logicalWidth, logicalHeight, selectedGalaxy)
    } else {
      drawUniverseView(ctx, logicalWidth, logicalHeight)
    }
  }

  function drawUniverseView(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const transform = makeUniverseTransform(width, height, universe.galaxies, viewRef.current)
    const projectedGalaxies = universe.galaxies.map(galaxy => {
      const projected = transform(galaxy.x, galaxy.y, galaxy.z)
      return {
        id: galaxy.id,
        x: projected.x,
        y: projected.y,
        radius: galaxy.radius * projected.scale,
        depth: projected.depth
      }
    })
    projectedGalaxiesRef.current = projectedGalaxies
    projectedStarsRef.current = []
    projectedRelationshipsRef.current = []
    const projectedGalaxyMap = new Map(projectedGalaxies.map(item => [item.id, item]))
    const visibleBridges = universe.bridges
      .slice()
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.max(8, Math.min(26, Math.ceil(universe.galaxies.length * 1.18))))
    const maxBridgeStrength = Math.max(1, ...visibleBridges.map(bridge => bridge.strength))

    const hoverRelatedGalaxyIds = hoveredGalaxyId
      ? relatedGalaxyIds(hoveredGalaxyId, universe.bridges)
      : new Set<string>()
    const maxGalaxyBridgeStrength = Math.max(
      1,
      ...universe.galaxies.map(galaxy => galaxy.bridgeStrength)
    )

    visibleBridges.forEach(bridge => {
      const source = projectedGalaxyMap.get(bridge.sourceGalaxyId)
      const target = projectedGalaxyMap.get(bridge.targetGalaxyId)
      if (!source || !target) return
      const relatedToHover = Boolean(
        hoveredGalaxyId
        && (
          bridge.sourceGalaxyId === hoveredGalaxyId
          || bridge.targetGalaxyId === hoveredGalaxyId
        )
      )
      const faded = Boolean(hoveredGalaxyId && !relatedToHover)
      const familyColor = FAMILY_COLORS[bridge.family]
      const bridgeRank = bridge.strength / maxBridgeStrength
      ctx.save()
      ctx.globalAlpha = faded
        ? 0.02
        : clamp(0.045 + bridgeRank * (relatedToHover ? 0.48 : 0.24), 0.045, relatedToHover ? 0.58 : 0.28)
      ctx.strokeStyle = familyColor
      ctx.lineWidth = clamp(0.5 + Math.sqrt(bridgeRank) * (relatedToHover ? 2.8 : 1.75), 0.58, relatedToHover ? 3.5 : 2.2)
      ctx.shadowColor = familyColor
      ctx.shadowBlur = relatedToHover ? 12 : bridgeRank > 0.62 ? 5 : 0
      const midX = (source.x + target.x) / 2
      const midY = (source.y + target.y) / 2 - 18 - Math.min(42, bridge.edgeCount * 0.8)
      drawDoubleQuadraticLine(ctx, source.x, source.y, midX, midY, target.x, target.y, ctx.lineWidth, [])
      ctx.restore()
    })

    universe.galaxies
      .slice()
      .sort((a, b) => {
        const pa = projectedGalaxyMap.get(a.id)
        const pb = projectedGalaxyMap.get(b.id)
        return (pa?.depth || 0) - (pb?.depth || 0)
      })
      .forEach(galaxy => {
      const projectedGalaxy = projectedGalaxyMap.get(galaxy.id)
      if (!projectedGalaxy) return
      const hovered = hoveredGalaxyId === galaxy.id
      const related = hoverRelatedGalaxyIds.has(galaxy.id)
      const faded = Boolean(hoveredGalaxyId && !hovered && !related)
      const depthOpacity = depthOpacityFromProjected(projectedGalaxy.depth || 0)
      drawCategoryMass(
        ctx,
        galaxy,
        projectedGalaxy.x,
        projectedGalaxy.y,
        projectedGalaxy.radius,
        hovered,
        (faded ? 0.22 : related ? 0.78 : 1) * depthOpacity,
        galaxy.bridgeStrength / maxGalaxyBridgeStrength
      )
    })

    projectedStarsRef.current = []
    projectedRelationshipsRef.current = []

    drawUniverseCategoryLabels(ctx, universe.galaxies, projectedGalaxyMap, hoveredGalaxyId, hoverRelatedGalaxyIds, labels)

    ctx.globalAlpha = 1
  }

  function drawExplodedGalaxy(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    galaxy: Galaxy
  ) {
    const centerX = width * 0.46 + viewRef.current.panX
    const centerY = height / 2 + viewRef.current.panY
    const usefulSize = Math.min(width, height)
    const galaxyRadius = usefulSize * 0.39 * viewRef.current.zoom
    const scale = galaxyRadius / 250
    const project = makeExplodedTransform(centerX, centerY, scale, viewRef.current)
    const externalSummaries = selectedExternalSummaries.slice(0, 8)
    const projectedStars: Array<{ id: string; x: number; y: number; radius: number; depth?: number }> = []
    const projectedRelationships: ProjectedRelationship[] = []
    const projectedGalaxyMap = new Map<string, { x: number; y: number; radius: number }>()
    const externalProjectedMap = new Map<string, { x: number; y: number; radius: number }>()

    projectedGalaxyMap.set(galaxy.id, {
      x: centerX,
      y: centerY,
      radius: galaxyRadius
    })

    drawExplodedGalaxyAtmosphere(ctx, galaxy, centerX, centerY, galaxyRadius)

    const strongestExternal = Math.max(1, ...externalSummaries.map(summary => summary.strength))
    externalSummaries.forEach((summary, index) => {
      const angle = externalCategoryAngle(summary.galaxy.id, index, externalSummaries.length)
      const rank = summary.strength / strongestExternal
      const distance = galaxyRadius * (1.02 + (1 - rank) * 0.42 + normalizedHash(hashString(`${summary.galaxy.id}:corona:distance`)) * 0.08)
      const radius = clamp(
        18 + Math.sqrt(summary.galaxy.topicCount) * 4.2 + Math.sqrt(summary.connectionCount) * 2.2 + rank * 8,
        24,
        56
      ) * viewRef.current.zoom
      const shellDistance = distance / Math.max(0.001, scale)
      const shellHash = normalizedHash(hashString(`${galaxy.id}:${summary.galaxy.id}:external:z`))
      const verticalHash = normalizedHash(hashString(`${summary.galaxy.id}:external:vertical`))
      const localX = Math.cos(angle) * shellDistance
      const localY = Math.sin(angle) * shellDistance * (0.72 + verticalHash * 0.24)
      const localZ = Math.sin(angle * 1.37 + shellHash * Math.PI * 2) * shellDistance * 0.58
      const positioned = project(localX, localY, localZ)
      const projected = {
        x: positioned.x,
        y: positioned.y,
        radius: radius * positioned.scale
      }
      projectedGalaxyMap.set(summary.galaxy.id, projected)
      externalProjectedMap.set(summary.galaxy.id, projected)
    })

    const selectedStarIds = new Set(galaxy.stars.map(star => star.id))
    const chunkRadiusScale = topicChunkRadiusScale(galaxy.stars)
    const projectedById = new Map<string, { x: number; y: number; radius: number; depth?: number }>()
    galaxy.stars.forEach(star => {
      const projected = project(star.explodedX, star.explodedY, star.explodedZ)
      const depthScale = depthScaleFromProjected(projected.depth)
      const depthOpacity = depthOpacityFromProjected(projected.depth)
      const radius = topicChunkRadius(star, chunkRadiusScale, scale, depthScale, projected.scale)
      projectedById.set(star.id, {
        x: projected.x,
        y: projected.y,
        radius,
        depth: projected.depth
      })
      projectedStars.push({
        id: star.id,
        x: projected.x,
        y: projected.y,
        radius,
        depth: projected.depth * depthOpacity
      })
    })

    stateTwoExternalEdges(selectedGalaxyEdges, selectedStarIds)
      .filter(edge => selectedStarIds.has(edge.source) !== selectedStarIds.has(edge.target))
      .sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight
        return relationshipEdgeKey(a).localeCompare(relationshipEdgeKey(b))
      })
      .forEach(edge => {
        const sourceInternal = selectedStarIds.has(edge.source)
        const targetInternal = selectedStarIds.has(edge.target)
        const internalTopicId = sourceInternal ? edge.source : targetInternal ? edge.target : null
        const externalGalaxyId = sourceInternal ? edge.targetGalaxyId : edge.sourceGalaxyId
        const internalProjected = internalTopicId ? projectedById.get(internalTopicId) : null
        const externalProjected = externalProjectedMap.get(externalGalaxyId)
        if (!internalProjected || !externalProjected) return
        const key = relationshipEdgeKey(edge)
        const emphasized = key === hoveredRelationshipKey || key === selectedRelationshipKey
        const faded = Boolean(
          focusedStarId
          && edge.source !== focusedStarId
          && edge.target !== focusedStarId
        )
        drawExplodedExternalEdge(
          ctx,
          internalProjected.x,
          internalProjected.y,
          externalProjected.x,
          externalProjected.y,
          edge,
          faded,
          emphasized
        )
        projectedRelationships.push({
          key,
          edge,
          x1: internalProjected.x,
          y1: internalProjected.y,
          x2: externalProjected.x,
          y2: externalProjected.y,
          external: true
        })
      })

    stateTwoInternalEdges(selectedGalaxyEdges, selectedStarIds).forEach(edge => {
      const source = projectedById.get(edge.source)
      const target = projectedById.get(edge.target)
      const sourceInternal = selectedStarIds.has(edge.source)
      const targetInternal = selectedStarIds.has(edge.target)
      if (sourceInternal && targetInternal && source && target) {
        const key = relationshipEdgeKey(edge)
        const emphasized = key === hoveredRelationshipKey || key === selectedRelationshipKey
        const faded = Boolean(
          focusedStarId
          && edge.source !== focusedStarId
          && edge.target !== focusedStarId
        )
        drawExplodedTopicEdge(ctx, source.x, source.y, target.x, target.y, edge, faded, emphasized)
        projectedRelationships.push({
          key,
          edge,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          external: false
        })
        return
      }
    })

    drawGalaxyBarycenterGlow(ctx, centerX, centerY, galaxyRadius * 0.34, galaxy.color, true, 0.9)

    galaxy.stars
      .slice()
      .sort((a, b) => (projectedById.get(a.id)?.depth || 0) - (projectedById.get(b.id)?.depth || 0))
      .forEach(star => {
        const projected = projectedById.get(star.id)
        if (!projected) return
        const focused = focusedStarId === star.id
        const neighbor = focusedNeighbors.has(star.id)
        const hovered = hoveredStarId === star.id
        const faded = Boolean(focusedStarId && !focused && !neighbor)
        const depthOpacity = depthOpacityFromProjected(projected.depth || 0)
        ctx.globalAlpha = faded ? 0.18 : 1
        drawStar(
          ctx,
          projected.x,
          projected.y,
          projected.radius * (focused ? 1.45 : hovered ? 1.24 : 1),
          star.color,
          star.luminosity,
          focused || hovered,
          (faded ? 0.28 : 1) * depthOpacity
        )
      })

    externalSummaries.forEach(summary => {
      const projected = externalProjectedMap.get(summary.galaxy.id)
      if (!projected) return
      drawExternalCategoryNode(
        ctx,
        summary,
        projected.x,
        projected.y,
        projected.radius,
        hoveredGalaxyId === summary.galaxy.id,
        labels
      )
    })

    drawExplodedTopicLabels(
      ctx,
      galaxy,
      projectedById,
      focusedStarId,
      hoveredStarId,
      focusedNeighbors,
      viewRef.current.zoom
    )
    projectedStarsRef.current = projectedStars
    projectedRelationshipsRef.current = projectedRelationships
    projectedGalaxiesRef.current = Array.from(projectedGalaxyMap.entries()).map(([id, projected]) => ({
      id,
      ...projected
    }))

    drawExplodedHeader(ctx, galaxy, 24, 26, labels)
    ctx.globalAlpha = 1
  }

  function drawFocusedTopicView(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    galaxy: Galaxy,
    focus: GalaxyStar
  ) {
    const centerX = width / 2 + viewRef.current.panX
    const centerY = height / 2 + viewRef.current.panY
    const usefulSize = Math.min(width, height)
    const focusWorldRadius = 250
    const scale = usefulSize * 0.42 * viewRef.current.zoom / focusWorldRadius
    const project = makeExplodedTransform(centerX, centerY, scale, viewRef.current)
    const directEdges = selectedGalaxyEdges
      .filter(edge => edge.source === focus.id || edge.target === focus.id)
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight
        return relationshipEdgeKey(a).localeCompare(relationshipEdgeKey(b))
      })
    const directTopicIds = Array.from(new Set(directEdges.map(edge =>
      edge.source === focus.id ? edge.target : edge.source
    )))
    const directStars = directTopicIds
      .map(id => starMap.get(id))
      .filter((star): star is GalaxyStar => Boolean(star))

    const projectedStars: Array<{ id: string; x: number; y: number; radius: number; depth?: number }> = []
    const projectedRelationships: ProjectedRelationship[] = []
    const projectedById = new Map<string, { x: number; y: number; radius: number; depth?: number }>()
    const directEdgeByTopicId = new Map<string, UniverseEdge>()
    directEdges.forEach(edge => {
      const relatedId = edge.source === focus.id ? edge.target : edge.source
      const current = directEdgeByTopicId.get(relatedId)
      if (!current || edge.weight > current.weight) {
        directEdgeByTopicId.set(relatedId, edge)
      }
    })

    const focusProjection = project(0, 0, 0)
    const focusRadius = clamp(20 + focus.radius * 1.75, 24, 38) * focusProjection.scale
    projectedById.set(focus.id, {
      x: focusProjection.x,
      y: focusProjection.y,
      radius: focusRadius,
      depth: focusProjection.depth
    })
    projectedStars.push({
      id: focus.id,
      x: focusProjection.x,
      y: focusProjection.y,
      radius: focusRadius,
      depth: focusProjection.depth
    })

    drawGalaxyNebula(ctx, centerX, centerY, usefulSize * 0.34, galaxy.color, true, 0.72)

    const chunkRadiusScale = topicChunkRadiusScale(directStars.length > 0 ? directStars : [focus])
    directStars.forEach((star, index) => {
      const edge = directEdgeByTopicId.get(star.id)
      const weight = edge?.weight || 0
      const sameCategory = star.galaxyId === focus.galaxyId
      const local = focusedTopicPosition(focus, star, edge, index, directStars.length, sameCategory)
      const projected = project(local.x, local.y, local.z)
      const depthScale = depthScaleFromProjected(projected.depth)
      const radius = focusedRelatedTopicRadius(
        star,
        chunkRadiusScale,
        scale,
        depthScale,
        projected.scale,
        focusRadius
      )
      projectedById.set(star.id, {
        x: projected.x,
        y: projected.y,
        radius,
        depth: projected.depth
      })
      projectedStars.push({
        id: star.id,
        x: projected.x,
        y: projected.y,
        radius,
        depth: projected.depth
      })
    })

    directEdges.forEach(edge => {
      const relatedId = edge.source === focus.id ? edge.target : edge.source
      const target = projectedById.get(relatedId)
      const source = projectedById.get(focus.id)
      if (!source || !target) return
      const key = relationshipEdgeKey(edge)
      const emphasized = key === hoveredRelationshipKey || key === selectedRelationshipKey
      const faded = Boolean(
        (hoveredRelationshipKey || selectedRelationshipKey)
        && !emphasized
      )
      drawFocusedRelationshipEdge(ctx, source.x, source.y, target.x, target.y, edge, faded, emphasized)
      projectedRelationships.push({
        key,
        edge,
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        external: edge.sourceGalaxyId !== edge.targetGalaxyId
      })
    })

    directStars
      .slice()
      .sort((a, b) => (projectedById.get(a.id)?.depth || 0) - (projectedById.get(b.id)?.depth || 0))
      .forEach(star => {
        const projected = projectedById.get(star.id)
        if (!projected) return
        const hovered = hoveredStarId === star.id
        const edge = directEdgeByTopicId.get(star.id)
        const key = edge ? relationshipEdgeKey(edge) : null
        const selected = key === selectedRelationshipKey
        const relationshipHovered = key === hoveredRelationshipKey
        const unrelated = Boolean((hoveredRelationshipKey || selectedRelationshipKey) && !selected && !relationshipHovered)
        const connectionLuminosity = focusedConnectionLuminosity(edge)
        const opacity = unrelated ? 0.28 : hovered || selected || relationshipHovered ? 1 : 0.84
        drawStar(
          ctx,
          projected.x,
          projected.y,
          projected.radius * (hovered || selected || relationshipHovered ? 1.26 : 1),
          star.color,
          connectionLuminosity,
          hovered || selected || relationshipHovered,
          opacity
        )
      })

    drawFocusedTopicAnchor(ctx, focusProjection.x, focusProjection.y, focusRadius, focus.color)
    drawStar(ctx, focusProjection.x, focusProjection.y, focusRadius, focus.color, 1, true, 1)
    drawFocusedTopicLabels(
      ctx,
      focus,
      directStars,
      projectedById,
      directEdgeByTopicId,
      hoveredStarId,
      selectedRelationshipKey,
      hoveredRelationshipKey,
      labels,
      categoryFallback
    )
    drawFocusedHeader(ctx, focus, directEdges.length, 24, 26, labels)

    projectedStarsRef.current = projectedStars
    projectedGalaxiesRef.current = []
    projectedRelationshipsRef.current = projectedRelationships
    ctx.globalAlpha = 1
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLCanvasElement>) {
    dragRef.current = {
      dragging: true,
      lastX: event.clientX,
      lastY: event.clientY,
      button: event.button
    }
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLCanvasElement>) {
    if (dragRef.current.dragging) {
      const deltaX = event.clientX - dragRef.current.lastX
      const deltaY = event.clientY - dragRef.current.lastY
      dragRef.current.lastX = event.clientX
      dragRef.current.lastY = event.clientY
      if (dragRef.current.button === 2 || event.shiftKey || event.altKey) {
        viewRef.current.panX += deltaX
        viewRef.current.panY += deltaY
      } else if (mode === "universe" || mode === "galaxy" || mode === "topic") {
        viewRef.current.rotationY += deltaX * 0.006
        viewRef.current.rotationX = clamp(
          viewRef.current.rotationX + deltaY * 0.005,
          -1.1,
          1.1
        )
      } else {
        viewRef.current.panX += deltaX
        viewRef.current.panY += deltaY
      }
      setViewVersion(version => version + 1)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const starHit = findProjectedStar(x, y, projectedStarsRef.current)
    setHoveredStarId(starHit)
    const galaxyHit = findProjectedGalaxy(x, y, projectedGalaxiesRef.current)
    setHoveredGalaxyId(galaxyHit)
    const relationshipHit = (mode === "galaxy" || mode === "topic") && !starHit && !galaxyHit
      ? findProjectedRelationship(x, y, projectedRelationshipsRef.current)
      : null
    setHoveredRelationshipKey(relationshipHit)
  }

  function handleMouseUp() {
    dragRef.current.dragging = false
  }

  function handleWheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault()
    const minZoom = mode === "universe"
      ? minimumUniverseZoomForCanvas(canvasRef.current, universe.galaxies)
      : 0.58
    viewRef.current.zoom = clamp(
      viewRef.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08),
      minZoom,
      2.6
    )
    setViewVersion(version => version + 1)
  }

  function handleClick(event: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (mode === "topic") {
      const starHit = findProjectedStar(x, y, projectedStarsRef.current)
      if (starHit && focusedNeighbors.has(starHit)) {
        setFocusedStarId(starHit)
        setSelectedRelationshipKey(null)
        return
      }
      const relationshipHit = findProjectedRelationship(x, y, projectedRelationshipsRef.current)
      if (relationshipHit) {
        setSelectedRelationshipKey(relationshipHit)
        return
      }
      setSelectedRelationshipKey(null)
      return
    }

    if (mode === "galaxy") {
      const starHit = findProjectedStar(x, y, projectedStarsRef.current)
      if (starHit) {
        setSelectedRelationshipKey(null)
        setFocusedStarId(starHit)
        setMode("topic")
        return
      }
      const relationshipHit = findProjectedRelationship(x, y, projectedRelationshipsRef.current)
      if (relationshipHit) {
        setSelectedRelationshipKey(relationshipHit)
        return
      }
      const galaxyHit = findProjectedGalaxy(x, y, projectedGalaxiesRef.current)
      if (galaxyHit && galaxyHit !== selectedGalaxyId && galaxyMap.has(galaxyHit)) {
        setSelectedRelationshipKey(null)
        enterGalaxy(galaxyHit)
      }
      return
    }

    const galaxyHit = findProjectedGalaxy(x, y, projectedGalaxiesRef.current)
    if (galaxyHit) {
      setSelectedRelationshipKey(null)
      enterGalaxy(galaxyHit)
    }
  }

  function enterGalaxy(galaxyId: string) {
    setSelectedGalaxyId(galaxyId)
    setMode("galaxy")
    setFocusedStarId(null)
    setHoveredStarId(null)
    setHoveredRelationshipKey(null)
    setSelectedRelationshipKey(null)
    viewRef.current = {
      ...viewRef.current,
      panX: 0,
      panY: 0,
      zoom: 1
    }
    setViewVersion(version => version + 1)
  }

  function resetView() {
    setMode("universe")
    setSelectedGalaxyId(null)
    setFocusedStarId(null)
    setHoveredStarId(null)
    setHoveredGalaxyId(null)
    setHoveredRelationshipKey(null)
    setSelectedRelationshipKey(null)
    viewRef.current = {
      ...viewRef.current,
      panX: 0,
      panY: 0,
      zoom: 1
    }
    setViewVersion(version => version + 1)
  }

  function exitTopicFocus() {
    setMode("galaxy")
    setFocusedStarId(null)
    setHoveredStarId(null)
    setHoveredRelationshipKey(null)
    setSelectedRelationshipKey(null)
    viewRef.current = {
      ...viewRef.current,
      panX: 0,
      panY: 0,
      zoom: 1
    }
    setViewVersion(version => version + 1)
  }

  return (
    <section style={sphereShell}>
      <div style={sphereHeader}>
        <div>
          <div style={eyebrow}>{ts("Knowledge Universe v0.1")}</div>
          <h2 style={sectionTitle}>{ts("Galaxy → exploded galaxy prototype")}</h2>
          <p style={subtleText}>
            {ts("Categories are rendered as galaxies made from real topic stars. Qualified relationships shape the galaxy internals and sparse galaxy-to-galaxy bridges.")}
          </p>
        </div>
        <div style={sphereActions}>
          {mode !== "universe" && (
            <button
              type="button"
              onClick={mode === "topic" ? exitTopicFocus : resetView}
              style={primaryButton}
            >
              {mode === "topic" ? ts("← Galaxy") : ts("← All galaxies")}
            </button>
          )}
          <button type="button" onClick={onReload} style={secondaryButton}>
            {ts("Reload graph")}
          </button>
        </div>
      </div>

      <div style={controlRow}>
        {(["core", "conceptual", "contextual"] as RelationshipFamily[]).map(family => (
          <label key={family} style={toggleLabel}>
            <input
              type="checkbox"
              checked={familyVisibility[family]}
              onChange={() =>
                setFamilyVisibility(current => ({
                  ...current,
                  [family]: !current[family]
                }))
              }
            />
            <span style={{ color: FAMILY_COLORS[family] }}>
              {relationshipFamilyText(family)}
            </span>
          </label>
        ))}
        <label style={toggleLabel}>
          <input
            type="checkbox"
            checked={includeBorderline}
            onChange={() => setIncludeBorderline(value => !value)}
          />
          {ts("Include borderline")}
        </label>
      </div>

      <div style={{ ...universeGrid, ...mobileUniverseGrid }}>
        {renderOrientationPanel()}

        <div ref={wrapperRef} style={{ ...canvasWrap, ...mobileCanvasWrap }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp()
              setHoveredStarId(null)
              setHoveredGalaxyId(null)
              setHoveredRelationshipKey(null)
            }}
            onClick={handleClick}
            onContextMenu={event => event.preventDefault()}
            onWheel={handleWheel}
            style={canvasStyle}
          />

          {loading && (
            <div style={overlayPanel}>{ts("Loading project-wide relationship graph...")}</div>
          )}

          {error && (
            <div style={overlayPanel}>
              <strong>{ts("Knowledge Universe error")}</strong>
              <p>{error}</p>
            </div>
          )}

          {mode !== "universe" && selectedGalaxy && (
            <button
              type="button"
              onClick={mode === "topic" ? exitTopicFocus : resetView}
              style={canvasBackButton}
            >
              {mode === "topic" ? ts("← Galaxy") : ts("← All galaxies")}
            </button>
          )}

          {(hoveredStar || hoveredGalaxy || focusedStar || activeRelationshipEdge) && (
            <div style={{ ...hoverCard, ...mobileHoverCard }}>
              {activeRelationshipEdge && activeRelationshipSource && activeRelationshipTarget ? (
                <>
                  <div style={eyebrow}>
                    {hoveredRelationshipEdge ? ts("Relationship") : ts("Selected relationship")}
                  </div>
                  <strong>
                    {activeRelationshipSource.topic} ↔ {activeRelationshipTarget.topic}
                  </strong>
                  <span>
                    {relationshipFamilyText(activeRelationshipEdge.family)}
                    {activeRelationshipEdge.borderline ? ` · ${ts("Borderline")}` : ""}
                    {activeRelationshipEdge.sourceGalaxyId !== activeRelationshipEdge.targetGalaxyId
                      ? ` · ${ts("Bridge")}`
                      : ""}
                  </span>
                </>
              ) : hoveredStar && hoveredFocusedEdge ? (
                <>
                  <div style={eyebrow}>{ts("Direct relationship")}</div>
                  <strong>{hoveredStar.topic}</strong>
                  <span>{hoveredStar.category || categoryFallback}</span>
                  <span>
                    {hoveredFocusedEdge.classification.replace("_", " ").toUpperCase()}
                  </span>
                </>
              ) : focusedStar ? (
                <>
                  <div style={eyebrow}>{ts("Selected topic")}</div>
                  <strong>{focusedStar.topic}</strong>
                  <span>{focusedStar.category || categoryFallback}</span>
                  <span>{ts("direct relationships count", { count: focusedNeighbors.size })}</span>
                </>
              ) : hoveredStar ? (
                <>
                  <div style={eyebrow}>{ts("Topic star")}</div>
                  <strong>{hoveredStar.topic}</strong>
                  <span>{hoveredStar.category || categoryFallback}</span>
                  <span>{ts("associated chunks count", { count: hoveredStar.associated_chunk_count })}</span>
                  <span>{ts("Luminosity percent", { percent: Math.round(hoveredStar.luminosity * 100) })}</span>
                  {hoveredFocusedEdge && (
                    <>
                      <span>
                        {ts("Relationship")}: {hoveredFocusedEdge.classification.replace("_", " ").toUpperCase()}
                      </span>
                      <span>
                        {ts("Semantic")} {formatMetric(hoveredFocusedEdge.semantic_similarity)} · {ts("shared chunks")} {hoveredFocusedEdge.shared_chunks}
                      </span>
                    </>
                  )}
                </>
              ) : hoveredGalaxy ? (
                <>
                  <div style={eyebrow}>{ts("Galaxy")}</div>
                  <strong>{hoveredGalaxy.name}</strong>
                  <span>{ts("topic stars count", { count: hoveredGalaxy.topicCount })}</span>
                  <span>{ts("associated chunks count", { count: hoveredGalaxy.aggregateChunks })}</span>
                  <span>{ts("external bridge edges count", { count: hoveredGalaxy.bridgeEdges })}</span>
                </>
              ) : null}
            </div>
          )}
        </div>

        <aside ref={detailsPanelRef} style={{ ...diagnosticPanel, ...mobileDiagnosticPanel }}>
          {selectedRelationshipEdge
            ? renderSelectedRelationshipSidebar()
            : (
              <>
                <div style={panelTopRow}>
                  <div>
                    <h3 style={panelTitle}>
                      {mode === "topic" && focusedStar
                        ? ts("Focused topic")
                        : mode === "galaxy" && selectedGalaxy
                          ? ts("Connected categories")
                          : ts("Knowledge galaxies")}
                    </h3>
                    <p style={panelText}>
                      {mode === "topic" && focusedStar
                        ? ts("Only direct qualified relationships are shown around the selected topic.")
                        : mode === "galaxy" && selectedGalaxy
                          ? ts("External categories are ranked by real qualified relationships with this galaxy.")
                          : ts("Each category is rendered as a luminous galaxy made from real project topics.")}
                    </p>
                  </div>
                  <button type="button" onClick={resetView} style={miniButton}>
                    {ts("All")}
                  </button>
                </div>

                <div className="knowledge-sphere-scrollbar" style={galaxyList}>
                  {mode === "topic" && focusedStar
                    ? focusedRelationshipItems.map(({ edge, star, key }) => (
                      <button
                        key={key}
                        type="button"
                        onMouseEnter={() => setHoveredRelationshipKey(key)}
                        onMouseLeave={() => setHoveredRelationshipKey(null)}
                        onClick={() => setSelectedRelationshipKey(key)}
                        style={{
                          ...galaxyCard,
                          borderColor:
                            hoveredRelationshipKey === key || selectedRelationshipKey === key
                              ? `${star.color}99`
                              : "rgba(148, 163, 184, 0.14)"
                        }}
                      >
                        <strong style={{ color: star.color }}>{star.topic}</strong>
                        <span>{star.category || categoryFallback}</span>
                        <span>
                          {ts("chunks weight", { chunks: star.associated_chunk_count, weight: edge.weight.toFixed(2) })}
                        </span>
                        <small>
                          {edge.classification.replace("_", " ").toUpperCase()} · {ts("semantic metric", { value: formatMetric(edge.semantic_similarity) })}
                        </small>
                      </button>
                    ))
                    : mode === "galaxy" && selectedGalaxy
                      ? selectedExternalSummaries.length > 0
                        ? selectedExternalSummaries.map(summary => (
                          <button
                            key={summary.galaxy.id}
                            type="button"
                            onClick={() => enterGalaxy(summary.galaxy.id)}
                            style={{
                              ...galaxyCard,
                              borderColor:
                                hoveredGalaxyId === summary.galaxy.id
                                  ? `${summary.galaxy.color}99`
                                  : "rgba(148, 163, 184, 0.14)"
                            }}
                          >
                            <strong style={{ color: summary.galaxy.color }}>
                              {summary.galaxy.name}
                            </strong>
                            <span>
                              {ts("topics chunks", { topics: summary.galaxy.topicCount, chunks: summary.galaxy.aggregateChunks })}
                            </span>
                            <span>
                              {ts("connections strength", { connections: summary.connectionCount, strength: summary.strength.toFixed(2) })}
                            </span>
                            <small>
                              {ts("Dominant family")}: {relationshipFamilyText(summary.family)}
                            </small>
                          </button>
                        ))
                        : (
                          <div style={emptyPanelCard}>
                            {ts("No external category relationships are visible with the current filters.")}
                          </div>
                        )
                      : universe.galaxies.map(galaxy => (
                        <button
                          key={galaxy.id}
                          type="button"
                          onClick={() => enterGalaxy(galaxy.id)}
                          style={{
                            ...galaxyCard,
                            borderColor:
                              selectedGalaxyId === galaxy.id
                                ? `${galaxy.color}99`
                                : "rgba(148, 163, 184, 0.14)"
                          }}
                        >
                          <strong style={{ color: galaxy.color }}>{galaxy.name}</strong>
                          <span>
                            {ts("topics chunks", { topics: galaxy.topicCount, chunks: galaxy.aggregateChunks })}
                          </span>
                          <span>
                            {ts("internal bridges", { internal: galaxy.internalEdges, bridges: galaxy.bridgeEdges })}
                          </span>
                          <small>
                            {galaxy.strongestTopics.map(topic => topic.topic).join(" · ") || ts("No luminous topic")}
                          </small>
                        </button>
                      ))}
                </div>

              </>
            )}
        </aside>
      </div>

      <style jsx global>{`
        .knowledge-sphere-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.34) rgba(2, 6, 23, 0.08);
        }

        .knowledge-sphere-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .knowledge-sphere-scrollbar::-webkit-scrollbar-track {
          background: rgba(2, 6, 23, 0.08);
          border-radius: 999px;
        }

        .knowledge-sphere-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.32);
          border-radius: 999px;
          border: 2px solid rgba(2, 6, 23, 0.14);
        }

        .knowledge-sphere-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.48);
        }
      `}</style>

    </section>
  )
}

function buildUniverseModel(
  graph: TopicRelationshipGraph | null,
  thresholds: RelationshipClassificationThresholds
): UniverseModel {
  if (!graph) return emptyUniverseModel()

  const categoryNames = Array.from(
    new Set(graph.nodes.map(node => node.category || "Uncategorized"))
  ).sort((a, b) => a.localeCompare(b))
  const categoryIds = new Map(
    categoryNames.map(name => [name, `galaxy-${hashString(name).toString(16)}`])
  )
  const categoryColors = new Map(
    categoryNames.map((name, index) => [
      name,
      CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
    ])
  )
  const nodeMap = new Map(graph.nodes.map(node => [node.id, node]))
  const nodeIds = new Set(graph.nodes.map(node => node.id))
  const weightedDegree = new Map(graph.nodes.map(node => [node.id, 0]))

  const edges = graph.edges
    .map(edge => {
      const classification = classifyRelationship(edge, thresholds)
      const family = relationshipFamily(classification)
      const sourceNode = nodeMap.get(edge.topic_a_id)
      const targetNode = nodeMap.get(edge.topic_b_id)
      if (!family || !sourceNode || !targetNode) return null
      const sourceGalaxyName = sourceNode.category || "Uncategorized"
      const targetGalaxyName = targetNode.category || "Uncategorized"
      const sourceGalaxyId = categoryIds.get(sourceGalaxyName) || sourceGalaxyName
      const targetGalaxyId = categoryIds.get(targetGalaxyName) || targetGalaxyName
      return {
        ...edge,
        classification,
        family,
        borderline: classification.startsWith("borderline_"),
        source: edge.topic_a_id,
        target: edge.topic_b_id,
        weight: EDGE_WEIGHTS[classification],
        sourceGalaxyId,
        targetGalaxyId,
        internal: sourceGalaxyId === targetGalaxyId
      }
    })
    .filter((edge): edge is UniverseEdge =>
      Boolean(edge && nodeIds.has(edge.source) && nodeIds.has(edge.target))
    )

  edges.forEach(edge => {
    if (!edge.internal) return
    const degreeWeight = centralityWeight(edge)
    weightedDegree.set(edge.source, (weightedDegree.get(edge.source) || 0) + degreeWeight)
    weightedDegree.set(edge.target, (weightedDegree.get(edge.target) || 0) + degreeWeight)
  })
  const maxDegree = Math.max(1, ...Array.from(weightedDegree.values()))
  const starsByGalaxy = new Map<string, GalaxyStar[]>()

  graph.nodes.forEach(node => {
    const galaxyName = node.category || "Uncategorized"
    const galaxyId = categoryIds.get(galaxyName) || galaxyName
    const color = categoryColors.get(galaxyName) || CATEGORY_PALETTE[0]
    const luminosity = Math.sqrt((weightedDegree.get(node.id) || 0) / maxDegree)
    const star: GalaxyStar = {
      ...node,
      galaxyId,
      galaxyName,
      localX: 0,
      localY: 0,
      localZ: 0,
      universeX: 0,
      universeY: 0,
      universeZ: 0,
      explodedX: 0,
      explodedY: 0,
      explodedZ: 0,
      radius: clamp(
        1.15 + Math.pow(Math.max(1, node.associated_chunk_count), 0.38) * 0.58,
        1.45,
        6.8
      ),
      luminosity,
      color
    }
    starsByGalaxy.set(galaxyId, [...(starsByGalaxy.get(galaxyId) || []), star])
  })

  const bridgeMap = new Map<string, GalaxyBridge>()
  edges.forEach(edge => {
    if (edge.internal) return
    const [a, b] = [edge.sourceGalaxyId, edge.targetGalaxyId].sort()
    const key = `${a}:${b}`
    const sourceGalaxy = categoryNames.find(name => categoryIds.get(name) === a) || a
    const targetGalaxy = categoryNames.find(name => categoryIds.get(name) === b) || b
    const current = bridgeMap.get(key)
    const familyStrengths = current?.familyStrengths || { core: 0, conceptual: 0, contextual: 0 }
    const nextFamilyStrengths = {
      ...familyStrengths,
      [edge.family]: familyStrengths[edge.family] + edge.weight
    }
    bridgeMap.set(key, {
      id: key,
      sourceGalaxyId: a,
      targetGalaxyId: b,
      sourceGalaxy,
      targetGalaxy,
      family: dominantFamily(nextFamilyStrengths),
      familyStrengths: nextFamilyStrengths,
      strength: (current?.strength || 0) + edge.weight,
      edgeCount: (current?.edgeCount || 0) + 1
    })
  })
  const bridges = Array.from(bridgeMap.values()).sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength
    return a.id.localeCompare(b.id)
  })

  const categoryStats = categoryNames.map(name => {
    const id = categoryIds.get(name) || name
    const stars = starsByGalaxy.get(id) || []
    return {
      id,
      topicCount: stars.length,
      aggregateChunks: stars.reduce(
        (sum, star) => sum + Math.max(0, Number(star.associated_chunk_count || 0)),
        0
      )
    }
  })
  const maxTopicCount = Math.max(1, ...categoryStats.map(item => item.topicCount))
  const maxChunkCount = Math.max(1, ...categoryStats.map(item => item.aggregateChunks))

  const galaxyDrafts = categoryNames.map(name => {
    const id = categoryIds.get(name) || name
    const stars = starsByGalaxy.get(id) || []
    const aggregateChunks = stars.reduce(
      (sum, star) => sum + Math.max(0, Number(star.associated_chunk_count || 0)),
      0
    )
    const internalEdges = edges.filter(edge =>
      edge.internal && edge.sourceGalaxyId === id
    ).length
	    const bridgeEdges = edges.filter(edge =>
	      !edge.internal && (edge.sourceGalaxyId === id || edge.targetGalaxyId === id)
	    ).length
	    const bridgeStrength = bridges
	      .filter(bridge => bridge.sourceGalaxyId === id || bridge.targetGalaxyId === id)
	      .reduce((sum, bridge) => sum + bridge.strength, 0)
	    const topicMass = Math.sqrt(stars.length / maxTopicCount)
	    const chunkMass = Math.sqrt(aggregateChunks / maxChunkCount)
	    const radius = clamp(30 + topicMass * 76 + chunkMass * 20, 34, 128)
	    return {
      id,
      name,
      color: categoryColors.get(name) || CATEGORY_PALETTE[0],
      topicCount: stars.length,
      aggregateChunks,
      radius,
      x: 0,
      y: 0,
      z: 0,
	      stars,
	      internalEdges,
	      bridgeEdges,
	      bridgeStrength,
	      strongestTopics: [] as GalaxyStar[],
      dust: buildGalaxyDust(id, stars.length, aggregateChunks, internalEdges, radius)
    }
  })

  const galaxyPositions = layoutGalaxies(galaxyDrafts, bridges)
  const galaxies = galaxyDrafts.map(galaxy => {
    const position = galaxyPositions.get(galaxy.id) || { x: 0, y: 0, z: 0 }
    const localStars = layoutStars(galaxy, edges, false)
    const explodedStars = layoutStars(galaxy, edges, true)
    const stars = galaxy.stars.map(star => ({
      ...star,
      universeX: position.x,
      universeY: position.y,
      universeZ: position.z,
      localX: localStars.get(star.id)?.x || 0,
      localY: localStars.get(star.id)?.y || 0,
      localZ: localStars.get(star.id)?.z || 0,
      explodedX: explodedStars.get(star.id)?.x || 0,
      explodedY: explodedStars.get(star.id)?.y || 0,
      explodedZ: explodedStars.get(star.id)?.z || 0
    }))
    return {
      ...galaxy,
      x: position.x,
      y: position.y,
      z: position.z,
      stars,
      strongestTopics: stars
        .slice()
        .sort((a, b) => {
          if (b.luminosity !== a.luminosity) return b.luminosity - a.luminosity
          return a.topic.localeCompare(b.topic)
        })
        .slice(0, 3)
    }
  }).sort((a, b) => {
    if (b.topicCount !== a.topicCount) return b.topicCount - a.topicCount
    return a.name.localeCompare(b.name)
  })

  const stars = galaxies.flatMap(galaxy => galaxy.stars)
  const connectedGalaxyIds = new Set<string>()
  bridges.forEach(bridge => {
    connectedGalaxyIds.add(bridge.sourceGalaxyId)
    connectedGalaxyIds.add(bridge.targetGalaxyId)
  })
  const sortedBySize = galaxies.slice().sort((a, b) => {
    if (b.topicCount !== a.topicCount) return b.topicCount - a.topicCount
    return b.aggregateChunks - a.aggregateChunks
  })

  return {
    galaxies,
    stars,
    edges,
    bridges,
    familyCounts: {
      core: edges.filter(edge => edge.family === "core").length,
      conceptual: edges.filter(edge => edge.family === "conceptual").length,
      contextual: edges.filter(edge => edge.family === "contextual").length
    },
    isolatedGalaxies: galaxies.filter(galaxy => !connectedGalaxyIds.has(galaxy.id)),
    largestGalaxy: sortedBySize[0] || null,
    smallestGalaxy: sortedBySize[sortedBySize.length - 1] || null
  }
}

function emptyUniverseModel(): UniverseModel {
  return {
    galaxies: [],
    stars: [],
    edges: [],
    bridges: [],
    familyCounts: { core: 0, conceptual: 0, contextual: 0 },
    isolatedGalaxies: [],
    largestGalaxy: null,
    smallestGalaxy: null
  }
}

function layoutGalaxies(galaxies: Galaxy[], bridges: GalaxyBridge[]) {
  const positions = new Map<string, { x: number; y: number; z: number }>()
  const velocities = new Map<string, { x: number; y: number; z: number }>()
  const ordered = galaxies.slice().sort((a, b) => {
    const bp = categoryLabelPriority(b)
    const ap = categoryLabelPriority(a)
    if (bp !== ap) return bp - ap
    return a.name.localeCompare(b.name)
  })
  ordered.forEach((galaxy, index) => {
    if (index === 0) {
      positions.set(galaxy.id, { x: 0, y: 0, z: 0 })
      velocities.set(galaxy.id, { x: 0, y: 0, z: 0 })
      return
    }
    const seed = deterministicAngle(galaxy.id)
	    const ring = Math.sqrt(index) * 96
    positions.set(galaxy.id, {
      x: Math.cos(seed + index * 1.71) * ring,
      y: Math.sin(seed + index * 1.71) * ring * 0.76,
      z: (normalizedHash(hashString(`${galaxy.id}:z`)) * 2 - 1) * 160
    })
    velocities.set(galaxy.id, { x: 0, y: 0, z: 0 })
  })

  for (let pass = 0; pass < 260; pass += 1) {
    for (let i = 0; i < ordered.length; i += 1) {
      const a = ordered[i]
      const pa = positions.get(a.id)
      const va = velocities.get(a.id)
      if (!pa || !va) continue
      for (let j = i + 1; j < ordered.length; j += 1) {
        const b = ordered[j]
        const pb = positions.get(b.id)
        const vb = velocities.get(b.id)
        if (!pb || !vb) continue
        const dx = pa.x - pb.x
        const dy = pa.y - pb.y
        const dz = pa.z - pb.z
	        const distanceSq = Math.max(700, dx * dx + dy * dy + dz * dz * 0.45)
	        const minDistance = a.radius + b.radius + 38
	        const repulsion = (minDistance * minDistance) / distanceSq * 0.018
        va.x += dx * repulsion
        va.y += dy * repulsion
        va.z += dz * repulsion * 0.45
        vb.x -= dx * repulsion
        vb.y -= dy * repulsion
        vb.z -= dz * repulsion * 0.45
      }
    }

    bridges.forEach(bridge => {
      const source = positions.get(bridge.sourceGalaxyId)
      const target = positions.get(bridge.targetGalaxyId)
      const vs = velocities.get(bridge.sourceGalaxyId)
      const vt = velocities.get(bridge.targetGalaxyId)
      if (!source || !target || !vs || !vt) return
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dz = target.z - source.z
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz * 0.35))
	      const attraction = Math.min(bridge.strength, 12) * 0.0034
	      const desired = 184 - Math.min(bridge.strength, 10) * 6.2
      const force = (distance - desired) * attraction
      const fx = dx / distance * force
      const fy = dy / distance * force
      const fz = dz / distance * force * 0.35
      vs.x += fx
      vs.y += fy
      vs.z += fz
      vt.x -= fx
      vt.y -= fy
      vt.z -= fz
    })

    ordered.forEach(galaxy => {
      const position = positions.get(galaxy.id)
      const velocity = velocities.get(galaxy.id)
      if (!position || !velocity) return
	      velocity.x += -position.x * 0.0028
	      velocity.y += -position.y * 0.0028
	      velocity.z += -position.z * 0.0017
      velocity.x *= 0.82
      velocity.y *= 0.82
      velocity.z *= 0.84
      position.x += velocity.x
      position.y += velocity.y
      position.z += velocity.z
    })
  }

  return compactUniversePositions(positions, ordered)
}

function compactUniversePositions(
  positions: Map<string, { x: number; y: number; z: number }>,
  galaxies: Galaxy[]
) {
  const compacted = new Map<string, { x: number; y: number; z: number }>()
  const center = worldCenter(positions)

  positions.forEach((position, id) => {
    compacted.set(id, {
      x: center.x + (position.x - center.x) * UNIVERSE_POSITION_COMPRESSION,
      y: center.y + (position.y - center.y) * UNIVERSE_POSITION_COMPRESSION,
      z: center.z + (position.z - center.z) * UNIVERSE_POSITION_COMPRESSION
    })
  })

  normalizeWorldExtent(compacted, MAX_UNIVERSE_WORLD_EXTENT)
  resolveCategoryOverlaps(compacted, galaxies)
  normalizeWorldExtent(compacted, MAX_UNIVERSE_WORLD_EXTENT)

  return compacted
}

function worldCenter(positions: Map<string, { x: number; y: number; z: number }>) {
  const values = Array.from(positions.values())
  if (values.length === 0) return { x: 0, y: 0, z: 0 }
  return values.reduce(
    (acc, position) => ({
      x: acc.x + position.x / values.length,
      y: acc.y + position.y / values.length,
      z: acc.z + position.z / values.length
    }),
    { x: 0, y: 0, z: 0 }
  )
}

function normalizeWorldExtent(
  positions: Map<string, { x: number; y: number; z: number }>,
  maximumExtent: number
) {
  const center = worldCenter(positions)
  const bounds = positionBounds(positions)
  const extent = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    (bounds.maxZ - bounds.minZ) * 1.2
  )
  if (extent <= maximumExtent) return
  const factor = maximumExtent / extent
  positions.forEach((position, id) => {
    positions.set(id, {
      x: center.x + (position.x - center.x) * factor,
      y: center.y + (position.y - center.y) * factor,
      z: center.z + (position.z - center.z) * factor
    })
  })
}

function resolveCategoryOverlaps(
  positions: Map<string, { x: number; y: number; z: number }>,
  galaxies: Galaxy[]
) {
  const sorted = galaxies.slice().sort((a, b) => {
    if (b.radius !== a.radius) return b.radius - a.radius
    return a.name.localeCompare(b.name)
  })

  for (let pass = 0; pass < 18; pass += 1) {
    let moved = false
    for (let i = 0; i < sorted.length; i += 1) {
      const a = sorted[i]
      const pa = positions.get(a.id)
      if (!pa) continue
      for (let j = i + 1; j < sorted.length; j += 1) {
        const b = sorted[j]
        const pb = positions.get(b.id)
        if (!pb) continue
        const dx = pb.x - pa.x
        const dy = pb.y - pa.y
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const minimum = a.radius + b.radius + CATEGORY_COLLISION_GAP
        if (distance >= minimum) continue
        const push = (minimum - distance) * 0.5
        const ux = dx / distance
        const uy = dy / distance
        positions.set(a.id, {
          ...pa,
          x: pa.x - ux * push * 0.42,
          y: pa.y - uy * push * 0.42
        })
        positions.set(b.id, {
          ...pb,
          x: pb.x + ux * push * 0.58,
          y: pb.y + uy * push * 0.58
        })
        moved = true
      }
    }
    if (!moved) break
  }
}

function positionBounds(positions: Map<string, { x: number; y: number; z: number }>) {
  return Array.from(positions.values()).reduce(
    (acc, position) => ({
      minX: Math.min(acc.minX, position.x),
      maxX: Math.max(acc.maxX, position.x),
      minY: Math.min(acc.minY, position.y),
      maxY: Math.max(acc.maxY, position.y),
      minZ: Math.min(acc.minZ, position.z),
      maxZ: Math.max(acc.maxZ, position.z)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY
    }
  )
}

function layoutStars(galaxy: Galaxy, allEdges: UniverseEdge[], exploded: boolean) {
  const positions = new Map<string, { x: number; y: number; z: number }>()
  const velocities = new Map<string, { x: number; y: number; z: number }>()
  const stars = galaxy.stars.slice().sort((a, b) => a.topic.localeCompare(b.topic))
  const radius = exploded ? 250 : galaxy.radius * 1.05
  stars.forEach((star, index) => {
    const angle = deterministicAngle(star.id) + index * 0.68
    const structuralPull = exploded ? 1 - star.luminosity * 0.38 : 1
    const radial = radius * (0.18 + normalizedHash(hashString(`${star.id}:r`)) * 0.74) * structuralPull
    const squash = 0.62 + normalizedHash(hashString(`${galaxy.id}:squash`)) * 0.28
    positions.set(star.id, {
      x: Math.cos(angle) * radial,
      y: Math.sin(angle) * radial * squash,
      z: (normalizedHash(hashString(`${star.id}:z`)) - 0.5) * radius * (exploded ? 0.62 : 0.42)
    })
    velocities.set(star.id, { x: 0, y: 0, z: 0 })
  })

  const starIds = new Set(stars.map(star => star.id))
  const localEdges = allEdges.filter(edge =>
    edge.internal && starIds.has(edge.source) && starIds.has(edge.target)
  )

  for (let pass = 0; pass < (exploded ? 180 : 110); pass += 1) {
    for (let i = 0; i < stars.length; i += 1) {
      const a = stars[i]
      const pa = positions.get(a.id)
      const va = velocities.get(a.id)
      if (!pa || !va) continue
      for (let j = i + 1; j < stars.length; j += 1) {
        const b = stars[j]
        const pb = positions.get(b.id)
        const vb = velocities.get(b.id)
        if (!pb || !vb) continue
        const dx = pa.x - pb.x
        const dy = pa.y - pb.y
        const dz = pa.z - pb.z
        const zWeight = exploded ? 0.72 : 0.35
        const distanceSq = Math.max(36, dx * dx + dy * dy + dz * dz * zWeight)
        const repulsion = (exploded ? 56 : 16) / distanceSq
        va.x += dx * repulsion
        va.y += dy * repulsion
        va.z += dz * repulsion * zWeight
        vb.x -= dx * repulsion
        vb.y -= dy * repulsion
        vb.z -= dz * repulsion * zWeight
      }
    }

    localEdges.forEach(edge => {
      const source = positions.get(edge.source)
      const target = positions.get(edge.target)
      const vs = velocities.get(edge.source)
      const vt = velocities.get(edge.target)
      if (!source || !target || !vs || !vt) return
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dz = target.z - source.z
      const zWeight = exploded ? 0.72 : 0.35
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz * zWeight))
      const desired = exploded
        ? 68 + (1 - edge.weight) * 92
        : 12 + (1 - edge.weight) * 28
      const force = (distance - desired) * edge.weight * (exploded ? 0.018 : 0.024)
      const fx = dx / distance * force
      const fy = dy / distance * force
      const fz = dz / distance * force * zWeight
      vs.x += fx
      vs.y += fy
      vs.z += fz
      vt.x -= fx
      vt.y -= fy
      vt.z -= fz
    })

    stars.forEach(star => {
      const position = positions.get(star.id)
      const velocity = velocities.get(star.id)
      if (!position || !velocity) return
      const centralPull = exploded
        ? 0.01 + star.luminosity * 0.019
        : 0.005 + star.luminosity * 0.006
      velocity.x += -position.x * centralPull
      velocity.y += -position.y * centralPull
      velocity.z += -position.z * centralPull * (exploded ? 0.48 : 0.72)
      velocity.x *= 0.84
      velocity.y *= 0.84
      velocity.z *= 0.86
      position.x += velocity.x
      position.y += velocity.y
      position.z += velocity.z
    })
  }

  if (exploded) {
    applyExplodedDepthVolume(galaxy, positions, radius)
  }

  return positions
}

function applyExplodedDepthVolume(
  galaxy: Galaxy,
  positions: Map<string, { x: number; y: number; z: number }>,
  radius: number
) {
  const stars = galaxy.stars
  if (stars.length === 0) return

  let maxRadial = 1
  stars.forEach(star => {
    const position = positions.get(star.id)
    if (!position) return
    maxRadial = Math.max(maxRadial, Math.sqrt(position.x * position.x + position.y * position.y))
  })

  stars.forEach(star => {
    const position = positions.get(star.id)
    if (!position) return
    const radial = Math.sqrt(position.x * position.x + position.y * position.y)
    const radialRank = clamp(radial / maxRadial, 0, 1)
    const angle = Math.atan2(position.y, position.x)
    const hashPhase = normalizedHash(hashString(`${star.id}:exploded:depth-phase`)) * Math.PI * 2
    const layerSignal = Math.sin(angle * 1.72 + hashPhase)
    const centralFactor = clamp(0.32 + radialRank * 0.72 - star.luminosity * 0.18, 0.24, 0.95)
    const targetZ = layerSignal * radius * 0.62 * centralFactor
    position.z = position.z * 0.48 + targetZ * 0.52
  })

  const zValues = stars
    .map(star => positions.get(star.id)?.z)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  if (zValues.length === 0) return

  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)
  const currentSpan = maxZ - minZ
  const targetSpan = radius * 1.05
  if (currentSpan >= targetSpan || currentSpan <= 0.001) return

  const midpoint = (minZ + maxZ) / 2
  const multiplier = targetSpan / currentSpan
  stars.forEach(star => {
    const position = positions.get(star.id)
    if (!position) return
    position.z = (position.z - midpoint) * multiplier
  })
}

function makeUniverseTransform(
  width: number,
  height: number,
  galaxies: Galaxy[],
  view: { panX: number; panY: number; rotationX: number; rotationY: number; zoom: number }
) {
  if (galaxies.length === 0) {
    return (_x: number, _y: number, _z = 0) => ({
      x: width / 2,
      y: height / 2,
      scale: 1,
      depth: 0
    })
  }

  const anchor = strongestGalaxy(galaxies)
  const contentCenterX = anchor?.x || 0
  const contentCenterY = anchor?.y || 0
  const baseScale = universeBaseScale(width, height, anchor)
  const scale = baseScale * view.zoom
  const cosY = Math.cos(view.rotationY)
  const sinY = Math.sin(view.rotationY)
  const cosX = Math.cos(view.rotationX)
  const sinX = Math.sin(view.rotationX)

  return (x: number, y: number, z = 0) => {
    const centeredX = x - contentCenterX
    const centeredY = y - contentCenterY
    const x1 = centeredX * cosY - z * sinY
    const z1 = centeredX * sinY + z * cosY
    const y1 = centeredY * cosX - z1 * sinX
    const z2 = centeredY * sinX + z1 * cosX
    const perspective = clamp(980 / Math.max(620, 980 + z2), 0.82, 1.14)
    const projectedScale = scale * perspective

    return {
      x: width / 2 + view.panX + x1 * projectedScale,
      y: height / 2 + view.panY + y1 * projectedScale,
      scale: projectedScale,
      depth: z2
    }
  }
}

function makeExplodedTransform(
  centerX: number,
  centerY: number,
  scale: number,
  view: { rotationX: number; rotationY: number }
) {
  const cosY = Math.cos(view.rotationY)
  const sinY = Math.sin(view.rotationY)
  const cosX = Math.cos(view.rotationX)
  const sinX = Math.sin(view.rotationX)

  return (x: number, y: number, z = 0) => {
    const x1 = x * cosY - z * sinY
    const z1 = x * sinY + z * cosY
    const y1 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX
    const perspective = clamp(860 / Math.max(520, 860 + z2), 0.76, 1.22)

    return {
      x: centerX + x1 * scale * perspective,
      y: centerY + y1 * scale * perspective,
      scale: perspective,
      depth: z2
    }
  }
}

function minimumUniverseZoomForCanvas(
  canvas: HTMLCanvasElement | null,
  galaxies: Galaxy[]
) {
  if (!canvas || galaxies.length === 0) return 0.32
  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const anchor = strongestGalaxy(galaxies)
  const baseScale = universeBaseScale(width, height, anchor)
  const bounds = galaxies.reduce(
    (acc, galaxy) => ({
      minX: Math.min(acc.minX, galaxy.x - galaxy.radius * 1.12),
      maxX: Math.max(acc.maxX, galaxy.x + galaxy.radius * 1.12),
      minY: Math.min(acc.minY, galaxy.y - galaxy.radius * 1.12),
      maxY: Math.max(acc.maxY, galaxy.y + galaxy.radius * 1.12)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  )
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX)
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY)
  const fitScale = Math.min((width * 0.9) / contentWidth, (height * 0.9) / contentHeight)
  return clamp(fitScale / Math.max(0.001, baseScale), 0.22, 0.58)
}

function strongestGalaxy(galaxies: Galaxy[]) {
  return galaxies
    .slice()
    .sort((a, b) => {
      const bp = categoryLabelPriority(b)
      const ap = categoryLabelPriority(a)
      if (bp !== ap) return bp - ap
      return a.name.localeCompare(b.name)
    })[0]
}

function universeBaseScale(width: number, height: number, anchor: Galaxy | undefined) {
  return clamp(
    Math.min(width, height) / Math.max(1, (anchor?.radius || 92) * 4.05),
    1.12,
    2.55
  )
}

function depthOpacityFromProjected(depth: number) {
  return clamp(0.72 + (-depth / 900) * 0.22, 0.56, 1.06)
}

function depthScaleFromProjected(depth: number) {
  return clamp(1 + (-depth / 1300) * 0.12, 0.9, 1.12)
}

function topicChunkRadiusScale(stars: GalaxyStar[]) {
  const counts = stars.map(star => Math.max(1, Number(star.associated_chunk_count || 0)))
  return {
    min: Math.min(...counts, 1),
    max: Math.max(...counts, 1)
  }
}

function topicChunkRadius(
  star: GalaxyStar,
  chunkScale: { min: number; max: number },
  viewScale: number,
  depthScale: number,
  perspectiveScale: number
) {
  const chunks = Math.max(1, Number(star.associated_chunk_count || 0))
  const minRoot = Math.sqrt(Math.max(1, chunkScale.min))
  const maxRoot = Math.sqrt(Math.max(1, chunkScale.max))
  const chunkRoot = Math.sqrt(chunks)
  const normalized = maxRoot > minRoot
    ? clamp((chunkRoot - minRoot) / (maxRoot - minRoot), 0, 1)
    : 0.42
  const coreRadius = 4.1 + Math.pow(normalized, 0.68) * 12.9
  return clamp(coreRadius * viewScale * depthScale * perspectiveScale, 3.8, 25)
}

function focusedRelatedTopicRadius(
  star: GalaxyStar,
  chunkScale: { min: number; max: number },
  viewScale: number,
  depthScale: number,
  perspectiveScale: number,
  focusRadius: number
) {
  const rawRadius = topicChunkRadius(star, chunkScale, viewScale, depthScale, perspectiveScale)
  return clamp(rawRadius * 0.88, 6.4, Math.max(7.2, focusRadius * 0.68))
}

function focusedConnectionLuminosity(edge: UniverseEdge | undefined) {
  if (!edge) return 0.35
  return clamp(0.28 + edge.weight * 0.78, 0.32, 1)
}

function focusedTopicPosition(
  focus: GalaxyStar,
  star: GalaxyStar,
  edge: UniverseEdge | undefined,
  index: number,
  total: number,
  sameCategory: boolean
) {
  const weight = edge?.weight || 0
  const baseAngle = deterministicAngle(`${focus.id}:${star.id}:focused-neighborhood`)
  const angle = baseAngle + index * 2.399963229728653
  const distance = (
    sameCategory
      ? 104 + (1 - weight) * 82
      : 156 + (1 - weight) * 112
  ) + normalizedHash(hashString(`${star.id}:focused:distance`)) * 24
  const verticalScale = sameCategory ? 0.76 : 0.88
  const depthScale = sameCategory ? 0.46 : 0.64
  const layerPhase = normalizedHash(hashString(`${focus.id}:${star.id}:focused:z`)) * Math.PI * 2
  const crowdOffset = total > 8 ? (index % 3 - 1) * 18 : 0

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * verticalScale + crowdOffset,
    z: Math.sin(angle * 1.53 + layerPhase) * distance * depthScale
  }
}

function externalCategoryAngle(galaxyId: string, index: number, total: number) {
  if (total <= 1) return 0
  const slots = [
    -Math.PI * 0.48,
    Math.PI * 0.04,
    Math.PI * 0.48,
    Math.PI * 0.92,
    -Math.PI * 0.92,
    -Math.PI * 0.12,
    Math.PI * 0.72,
    -Math.PI * 0.72
  ]
  const base = slots[index % slots.length]
  const jitter = (normalizedHash(hashString(`${galaxyId}:corona:angle`)) - 0.5) * 0.18
  return base + jitter
}

function connectedExternalGalaxies(
  galaxy: Galaxy,
  bridges: GalaxyBridge[],
  galaxyMap: Map<string, Galaxy>
) {
  return bridges
    .filter(bridge =>
      bridge.sourceGalaxyId === galaxy.id || bridge.targetGalaxyId === galaxy.id
    )
    .map(bridge => {
      const id = bridge.sourceGalaxyId === galaxy.id
        ? bridge.targetGalaxyId
        : bridge.sourceGalaxyId
      return galaxyMap.get(id)
    })
    .filter((item): item is Galaxy => Boolean(item))
}

function externalCategorySummaries(
  galaxy: Galaxy,
  edges: UniverseEdge[],
  galaxyMap: Map<string, Galaxy>
): ExternalCategorySummary[] {
  const selectedStarIds = new Set(galaxy.stars.map(star => star.id))
  const summaries = new Map<string, ExternalCategorySummary>()

  edges.forEach(edge => {
    const sourceInternal = selectedStarIds.has(edge.source)
    const targetInternal = selectedStarIds.has(edge.target)
    if (sourceInternal === targetInternal) return

    const externalGalaxyId = sourceInternal ? edge.targetGalaxyId : edge.sourceGalaxyId
    const internalTopicId = sourceInternal ? edge.source : edge.target
    const externalGalaxy = galaxyMap.get(externalGalaxyId)
    if (!externalGalaxy) return

    const current = summaries.get(externalGalaxyId)
    const familyStrengths = current?.familyStrengths || {
      core: 0,
      conceptual: 0,
      contextual: 0
    }
    const nextFamilyStrengths = {
      ...familyStrengths,
      [edge.family]: familyStrengths[edge.family] + edge.weight
    }
    const internalTopicIds = new Set(current?.internalTopicIds || [])
    internalTopicIds.add(internalTopicId)

    summaries.set(externalGalaxyId, {
      galaxy: externalGalaxy,
      connectionCount: (current?.connectionCount || 0) + 1,
      strength: (current?.strength || 0) + edge.weight,
      family: dominantFamily(nextFamilyStrengths),
      familyStrengths: nextFamilyStrengths,
      internalTopicIds
    })
  })

  return Array.from(summaries.values()).sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength
    if (b.connectionCount !== a.connectionCount) return b.connectionCount - a.connectionCount
    return a.galaxy.name.localeCompare(b.galaxy.name)
  })
}

function relatedGalaxyIds(galaxyId: string, bridges: GalaxyBridge[]) {
  const ids = new Set<string>()
  bridges.forEach(bridge => {
    if (bridge.sourceGalaxyId === galaxyId) ids.add(bridge.targetGalaxyId)
    if (bridge.targetGalaxyId === galaxyId) ids.add(bridge.sourceGalaxyId)
  })
  return ids
}

function relationshipFamily(
  classification: RelationshipClassification
): RelationshipFamily | null {
  if (classification === "core" || classification === "borderline_core") return "core"
  if (
    classification === "conceptual"
    || classification === "borderline_conceptual"
  ) return "conceptual"
  if (
    classification === "contextual"
    || classification === "borderline_contextual"
  ) return "contextual"
  return null
}

function centralityWeight(edge: Pick<UniverseEdge, "family" | "borderline">) {
  const base = CENTRALITY_WEIGHTS[edge.family]
  return edge.borderline ? base * 0.6 : base
}

function relationshipEdgeKey(edge: Pick<UniverseEdge, "source" | "target">) {
  return [edge.source, edge.target].sort().join("::")
}

function stateTwoInternalEdges(edges: UniverseEdge[], selectedStarIds: Set<string>) {
  return edges
    .filter(edge => selectedStarIds.has(edge.source) && selectedStarIds.has(edge.target))
    .slice()
    .sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight
      return relationshipEdgeKey(a).localeCompare(relationshipEdgeKey(b))
    })
}

function stateTwoExternalEdges(edges: UniverseEdge[], selectedStarIds: Set<string>) {
  const byExternalGalaxy = new Map<string, UniverseEdge[]>()
  edges.forEach(edge => {
    const sourceInternal = selectedStarIds.has(edge.source)
    const targetInternal = selectedStarIds.has(edge.target)
    if (sourceInternal === targetInternal) return
    const externalGalaxyId = sourceInternal ? edge.targetGalaxyId : edge.sourceGalaxyId
    byExternalGalaxy.set(externalGalaxyId, [...(byExternalGalaxy.get(externalGalaxyId) || []), edge])
  })

  return Array.from(byExternalGalaxy.values())
    .flatMap(group =>
      group
        .slice()
        .sort((a, b) => {
          if (b.weight !== a.weight) return b.weight - a.weight
          return relationshipEdgeKey(a).localeCompare(relationshipEdgeKey(b))
        })
        .slice(0, 7)
    )
    .sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight
      return relationshipEdgeKey(a).localeCompare(relationshipEdgeKey(b))
    })
}

function dominantFamily(strengths: Record<RelationshipFamily, number>): RelationshipFamily {
  return (["core", "conceptual", "contextual"] as RelationshipFamily[]).sort((a, b) => {
    if (strengths[b] !== strengths[a]) return strengths[b] - strengths[a]
    return a.localeCompare(b)
  })[0]
}

function buildGalaxyDust(
  galaxyId: string,
  topicCount: number,
  aggregateChunks: number,
  internalEdges: number,
  radius: number
): GalaxyDust[] {
  const density = clamp(
    Math.round(18 + topicCount * 2.4 + Math.sqrt(Math.max(1, aggregateChunks)) * 0.65 + internalEdges * 0.24),
    22,
    120
  )
  const squash = 0.54 + normalizedHash(hashString(`${galaxyId}:dust:squash`)) * 0.28
  const twist = normalizedHash(hashString(`${galaxyId}:dust:twist`)) * Math.PI

  return Array.from({ length: density }, (_, index) => {
    const seed = `${galaxyId}:dust:${index}`
    const angle = deterministicAngle(seed) + twist + index * 0.21
    const radial = radius * Math.pow(normalizedHash(hashString(`${seed}:r`)), 0.62) * 1.15
    return {
      x: Math.cos(angle) * radial,
      y: Math.sin(angle) * radial * squash,
      z: (normalizedHash(hashString(`${seed}:z`)) - 0.5) * radius * 0.7,
      radius: 0.45 + normalizedHash(hashString(`${seed}:size`)) * 1.15,
      alpha: 0.12 + normalizedHash(hashString(`${seed}:alpha`)) * 0.3
    }
  })
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    80,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78
  )
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.98)")
  gradient.addColorStop(0.58, "rgba(3, 10, 28, 0.98)")
  gradient.addColorStop(1, "rgba(2, 6, 23, 1)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = 0.08
  ctx.strokeStyle = "rgba(96, 165, 250, 0.18)"
  ctx.lineWidth = 1
  for (let index = 0; index < 18; index += 1) {
    const y = normalizedHash(hashString(`grid:${index}:y`)) * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y + Math.sin(index) * 22)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.1
  ctx.fillStyle = "#94a3b8"
  for (let index = 0; index < 34; index += 1) {
    const x = normalizedHash(hashString(`bg:${index}:x`)) * width
    const y = normalizedHash(hashString(`bg:${index}:y`)) * height
    const r = normalizedHash(hashString(`bg:${index}:r`)) * 0.75
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawGalaxyNebula(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  emphasized: boolean,
  opacity = 1
) {
  const safeRadius = Math.max(1, Math.abs(radius))
  const gradient = ctx.createRadialGradient(x, y, safeRadius * 0.08, x, y, safeRadius * 1.22)
  gradient.addColorStop(0, hexToRgba(color, (emphasized ? 0.24 : 0.16) * opacity))
  gradient.addColorStop(0.44, hexToRgba(color, (emphasized ? 0.11 : 0.07) * opacity))
  gradient.addColorStop(1, hexToRgba(color, 0))
  ctx.globalAlpha = 1
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(
    x,
    y,
    safeRadius * 1.28,
    safeRadius * 0.82,
    normalizedHash(hashString(`${x}:${y}`)) * Math.PI,
    0,
    Math.PI * 2
  )
  ctx.fill()
}

function drawExplodedGalaxyAtmosphere(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  centerX: number,
  centerY: number,
  radius: number
) {
  const safeRadius = Math.max(80, Math.abs(radius))
  drawGalaxyNebula(ctx, centerX, centerY, safeRadius * 1.12, galaxy.color, true, 0.88)

  ctx.save()
  ;[0.46, 0.68, 0.88, 1.08].forEach((factor, index) => {
    ctx.globalAlpha = 0.16 - index * 0.026
    ctx.strokeStyle = galaxy.color
    ctx.lineWidth = index === 0 ? 1.2 : 0.8
    ctx.setLineDash(index > 1 ? [3, 8] : [])
    ctx.beginPath()
    ctx.ellipse(
      centerX,
      centerY,
      safeRadius * factor,
      safeRadius * factor * 0.72,
      -0.18,
      0,
      Math.PI * 2
    )
    ctx.stroke()
  })
  ctx.restore()

  galaxy.dust.forEach(dust => {
    const x = centerX + dust.x * (safeRadius / Math.max(1, galaxy.radius * 1.15))
    const y = centerY + dust.y * (safeRadius / Math.max(1, galaxy.radius * 1.15))
    drawDustParticle(
      ctx,
      x,
      y,
      dust.radius * 0.72,
      galaxy.color,
      dust.alpha * 0.34
    )
  })
}

function drawGalaxyBarycenterGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  emphasized: boolean,
  opacity = 1
) {
  const coreRadius = clamp(radius * 0.18, 5, 34)
  const gradient = ctx.createRadialGradient(x, y, 1, x, y, coreRadius * 2.2)
  gradient.addColorStop(0, hexToRgba(color, (emphasized ? 0.34 : 0.2) * opacity))
  gradient.addColorStop(0.42, hexToRgba(color, (emphasized ? 0.16 : 0.09) * opacity))
  gradient.addColorStop(1, hexToRgba(color, 0))

  ctx.save()
  ctx.fillStyle = gradient
  ctx.shadowColor = color
  ctx.shadowBlur = emphasized ? 18 : 8
  ctx.beginPath()
  ctx.arc(x, y, coreRadius * 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCategoryMass(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number,
  radius: number,
  emphasized: boolean,
  opacity = 1,
  connectivity = 0
) {
  const safeRadius = Math.max(8, Math.abs(radius))
  const coreRadius = clamp(safeRadius * 0.32, 14, 52)
  const outerRadius = safeRadius * 1.18
  const color = galaxy.color

  ctx.save()

  const glow = ctx.createRadialGradient(x, y, coreRadius * 0.3, x, y, outerRadius)
  const connectivityGlow = clamp(connectivity, 0, 1)
  glow.addColorStop(0, hexToRgba(color, (emphasized ? 0.34 : 0.2 + connectivityGlow * 0.12) * opacity))
  glow.addColorStop(0.45, hexToRgba(color, (emphasized ? 0.16 : 0.075 + connectivityGlow * 0.075) * opacity))
  glow.addColorStop(1, hexToRgba(color, 0))
  ctx.fillStyle = glow
  ctx.shadowColor = color
  ctx.shadowBlur = emphasized ? 24 : 6 + connectivityGlow * 18
  ctx.beginPath()
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ;[0.62, 0.88, 1.08].forEach((factor, index) => {
    ctx.globalAlpha = (emphasized ? 0.24 : 0.09 + connectivityGlow * 0.08) * opacity * (1 - index * 0.18)
    ctx.strokeStyle = color
    ctx.lineWidth = index === 0 ? 1.4 : 0.85
    ctx.beginPath()
    ctx.arc(x, y, safeRadius * factor, 0, Math.PI * 2)
    ctx.stroke()
  })

  const core = ctx.createRadialGradient(x, y, 1, x, y, coreRadius)
  core.addColorStop(0, hexToRgba("#ffffff", (emphasized ? 0.82 : 0.66) * opacity))
  core.addColorStop(0.18, hexToRgba(color, (emphasized ? 0.7 : 0.52) * opacity))
  core.addColorStop(1, hexToRgba(color, (emphasized ? 0.18 : 0.1) * opacity))
  ctx.shadowColor = color
  ctx.shadowBlur = emphasized ? 20 : 10
  ctx.fillStyle = core
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  if (coreRadius >= 21) {
    ctx.globalAlpha = 0.95 * opacity
    ctx.fillStyle = "#ffffff"
    ctx.font = `900 ${clamp(coreRadius * 0.43, 11, 18)}px Nunito, system-ui, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(galaxy.topicCount), x, y)
  }

  ctx.restore()
}

function drawExternalCategoryNode(
  ctx: CanvasRenderingContext2D,
  summary: ExternalCategorySummary,
  x: number,
  y: number,
  radius: number,
  hovered: boolean,
  labels: KnowledgeSphereLabels
) {
  const galaxy = summary.galaxy
  const safeRadius = Math.max(16, Math.abs(radius))
  drawGalaxyNebula(ctx, x, y, safeRadius * 1.22, galaxy.color, hovered, hovered ? 0.7 : 0.42)
  drawCategoryMass(ctx, galaxy, x, y, safeRadius, hovered, hovered ? 0.9 : 0.62)

  const label = galaxy.name.length > 30 ? `${galaxy.name.slice(0, 27)}...` : galaxy.name
  const subtitle = `${galaxy.topicCount} ${labels.topics} · ${galaxy.aggregateChunks} ${labels.chunks}`
  const connections = `${summary.connectionCount} ${labels.connections}`

  ctx.save()
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.shadowColor = "rgba(2, 6, 23, 0.98)"
  ctx.shadowBlur = 8
  ctx.globalAlpha = hovered ? 1 : 0.86
  ctx.fillStyle = galaxy.color
  ctx.font = `${hovered ? 950 : 900} 12px Nunito, system-ui, sans-serif`
  ctx.fillText(label.toUpperCase(), x + safeRadius + 12, y - 10)
  ctx.globalAlpha = hovered ? 0.9 : 0.66
  ctx.fillStyle = "#dbeafe"
  ctx.font = "760 10.5px Nunito, system-ui, sans-serif"
  ctx.fillText(subtitle, x + safeRadius + 12, y + 7)
  ctx.globalAlpha = hovered ? 0.86 : 0.58
  ctx.fillStyle = FAMILY_COLORS[summary.family]
  ctx.fillText(connections, x + safeRadius + 12, y + 23)
  ctx.restore()
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  luminosity: number,
  highlighted: boolean,
  opacity = 1
) {
  ctx.save()
  ctx.globalAlpha = clamp(0.34 + luminosity * 0.62, 0.25, 1) * opacity
  if (luminosity > 0.38 || highlighted) {
    ctx.shadowColor = color
    ctx.shadowBlur = highlighted ? 18 : 5 + luminosity * 10
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  if (highlighted) {
    ctx.globalAlpha = 0.42 * opacity
    ctx.strokeStyle = color
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(x, y, radius + 7 + luminosity * 7, 0, Math.PI * 2)
    ctx.stroke()
  } else if (luminosity > 0.55) {
    ctx.globalAlpha = luminosity * 0.08 * opacity
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius + 4 + luminosity * 7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawDustParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number
) {
  const safeRadius = Math.max(0.35, Math.abs(radius))
  ctx.save()
  ctx.globalAlpha = clamp(opacity, 0, 0.62)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 3 + safeRadius * 2
  ctx.beginPath()
  ctx.arc(x, y, safeRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawGalaxyLabel(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number,
  emphasized: boolean,
  opacity = 1
) {
  const label = galaxy.name.length > 32 ? `${galaxy.name.slice(0, 29)}...` : galaxy.name
  ctx.save()
  ctx.globalAlpha = (emphasized ? 0.98 : 0.82) * opacity
  ctx.font = "950 13px Nunito, system-ui, sans-serif"
  ctx.fillStyle = "#e5e7eb"
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(2, 6, 23, 0.95)"
  ctx.shadowBlur = 8
  ctx.fillText(label.toUpperCase(), x, y)
  ctx.globalAlpha = (emphasized ? 0.9 : 0.64) * opacity
  ctx.font = "700 11px Nunito, system-ui, sans-serif"
  ctx.fillStyle = galaxy.color
  ctx.fillText(`${galaxy.topicCount} topics`, x, y + 16)
  ctx.restore()
}

function drawUniverseCategoryLabels(
  ctx: CanvasRenderingContext2D,
  galaxies: Galaxy[],
  projectedGalaxyMap: Map<string, { x: number; y: number; radius: number; depth?: number }>,
  hoveredGalaxyId: string | null,
  hoverRelatedGalaxyIds: Set<string>,
  labels: KnowledgeSphereLabels
) {
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = []
  galaxies
    .slice()
    .sort((a, b) => {
      const ap = categoryLabelPriority(a)
      const bp = categoryLabelPriority(b)
      if (bp !== ap) return bp - ap
      return a.name.localeCompare(b.name)
    })
	    .forEach(galaxy => {
	      const projected = projectedGalaxyMap.get(galaxy.id)
	      if (!projected) return
	      const hovered = hoveredGalaxyId === galaxy.id
	      const related = hoverRelatedGalaxyIds.has(galaxy.id)
	      const faded = Boolean(hoveredGalaxyId && !hovered && !related)

	      const title = galaxy.name.length > 30 ? `${galaxy.name.slice(0, 27)}...` : galaxy.name
	      const subtitle = `${galaxy.topicCount} ${labels.topics} · ${galaxy.aggregateChunks} ${labels.chunks}`
	      ctx.save()
	      ctx.font = `${hovered ? 950 : 900} ${hovered ? 13 : 12}px Nunito, system-ui, sans-serif`
	      const titleWidth = ctx.measureText(title.toUpperCase()).width
	      ctx.font = "750 10.5px Nunito, system-ui, sans-serif"
	      const subtitleWidth = ctx.measureText(subtitle).width
	      const width = Math.max(titleWidth, subtitleWidth) + 14
	      const height = 31
	      const gap = clamp(12 + projected.radius * 0.025, 10, 25)
	      const candidates = universeLabelCandidates(projected.x, projected.y, projected.radius, width, height, gap)
	      const otherGalaxyTerritories = galaxies
	        .filter(other => other.id !== galaxy.id)
	        .map(other => {
	          const otherProjected = projectedGalaxyMap.get(other.id)
	          if (!otherProjected) return null
	          return {
	            x: otherProjected.x,
	            y: otherProjected.y,
	            radius: otherProjected.radius + 12
	          }
	        })
	        .filter((item): item is { x: number; y: number; radius: number } => Boolean(item))
	      const cleanCandidate = candidates.find(candidate =>
	        !occupied.some(item => rectsOverlap(item, candidate.rect))
	        && !otherGalaxyTerritories.some(territory => rectOverlapsCircle(candidate.rect, territory))
	      )
	      const territorySafeCandidate = cleanCandidate || candidates.find(candidate =>
	        !otherGalaxyTerritories.some(territory => rectOverlapsCircle(candidate.rect, territory))
	      )
	      const chosen = territorySafeCandidate || candidates[0]
	      const forcedFallback = !cleanCandidate
	      const showSubtitle = Boolean(cleanCandidate || hovered || related || projected.radius > 42)
	      occupied.push(chosen.rect)
	      if (forcedFallback) {
	        drawUniverseLabelLeader(ctx, projected.x, projected.y, projected.radius, chosen.rect, galaxy.color, faded)
	      }
	      ctx.textAlign = "center"
	      ctx.textBaseline = "alphabetic"
	      ctx.shadowColor = "rgba(2, 6, 23, 0.98)"
      ctx.shadowBlur = 8
      ctx.globalAlpha = faded ? 0.25 : hovered ? 1 : related ? 0.8 : 0.88
      ctx.fillStyle = "#e5e7eb"
      ctx.font = `${hovered ? 950 : 900} ${hovered ? 13 : 12}px Nunito, system-ui, sans-serif`
      ctx.fillText(title.toUpperCase(), chosen.x, chosen.y)
      if (showSubtitle) {
        ctx.globalAlpha = faded ? 0.18 : hovered ? 0.88 : 0.58
        ctx.fillStyle = galaxy.color
        ctx.font = "750 10.5px Nunito, system-ui, sans-serif"
        ctx.fillText(subtitle, chosen.x, chosen.y + 15)
      }
      ctx.restore()
	    })
}

function drawUniverseLabelLeader(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  rect: { x: number; y: number; width: number; height: number },
  color: string,
  faded: boolean
) {
  const labelCenterX = rect.x + rect.width / 2
  const labelCenterY = rect.y + rect.height / 2
  const dx = labelCenterX - centerX
  const dy = labelCenterY - centerY
  const length = Math.max(1, Math.hypot(dx, dy))
  const startX = centerX + (dx / length) * (radius + 3)
  const startY = centerY + (dy / length) * (radius + 3)
  const endX = clamp(centerX + dx * 0.82, rect.x, rect.x + rect.width)
  const endY = clamp(centerY + dy * 0.82, rect.y, rect.y + rect.height)

  ctx.save()
  ctx.globalAlpha = faded ? 0.12 : 0.34
  ctx.strokeStyle = color
  ctx.lineWidth = 0.75
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.restore()
}

function categoryLabelPriority(galaxy: Galaxy) {
  return Math.sqrt(Math.max(1, galaxy.topicCount)) * 0.72
    + Math.pow(Math.max(1, galaxy.aggregateChunks), 0.24) * 0.22
    + Math.sqrt(Math.max(0, galaxy.bridgeEdges)) * 0.2
}

function drawHoverGalaxyLabel(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number
) {
  const title = galaxy.name.length > 36 ? `${galaxy.name.slice(0, 33)}...` : galaxy.name
  const subtitle = `${galaxy.topicCount} topics · ${galaxy.aggregateChunks} chunks · ${galaxy.bridgeEdges} external relationships`

  ctx.save()
  ctx.font = "900 12px Nunito, system-ui, sans-serif"
  const width = Math.max(ctx.measureText(title).width, ctx.measureText(subtitle).width) + 24
  const height = 48
  const labelX = x - width / 2
  const labelY = y - height / 2

  ctx.globalAlpha = 0.9
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)"
  roundRect(ctx, labelX, labelY, width, height, 14)
  ctx.fill()
  ctx.globalAlpha = 0.48
  ctx.strokeStyle = galaxy.color
  ctx.lineWidth = 1
  roundRect(ctx, labelX, labelY, width, height, 14)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.textAlign = "center"
  ctx.fillStyle = galaxy.color
  ctx.font = "900 12px Nunito, system-ui, sans-serif"
  ctx.fillText(title.toUpperCase(), x, labelY + 19)
  ctx.fillStyle = "#cbd5e1"
  ctx.font = "750 11px Nunito, system-ui, sans-serif"
  ctx.fillText(subtitle, x, labelY + 36)
  ctx.restore()
}

function drawGalaxyCore(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number,
  radius: number,
  emphasized: boolean
) {
  if (radius < 24) return

  const coreRadius = clamp(radius * 0.34, 18, 72)
  const gradient = ctx.createRadialGradient(x, y, 2, x, y, coreRadius)
  gradient.addColorStop(0, hexToRgba(galaxy.color, emphasized ? 0.72 : 0.5))
  gradient.addColorStop(0.45, hexToRgba(galaxy.color, emphasized ? 0.32 : 0.22))
  gradient.addColorStop(1, hexToRgba(galaxy.color, 0.02))

  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.shadowColor = galaxy.color
  ctx.shadowBlur = emphasized ? 28 : 18
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, coreRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  if (radius >= 34) {
    const label = galaxy.name.length > 24 ? `${galaxy.name.slice(0, 21)}...` : galaxy.name
    ctx.textAlign = "center"
    ctx.fillStyle = "#ffffff"
    ctx.font = `${radius > 58 ? 900 : 850} ${clamp(radius * 0.095, 10, 18)}px Nunito, system-ui, sans-serif`
    wrapCanvasLabel(ctx, label.toUpperCase(), x, y - 3, coreRadius * 1.42, clamp(radius * 0.13, 11, 18))
    ctx.globalAlpha = emphasized ? 0.92 : 0.76
    ctx.fillStyle = "#dbeafe"
    ctx.font = `800 ${clamp(radius * 0.07, 9, 12)}px Nunito, system-ui, sans-serif`
    ctx.fillText(`${galaxy.topicCount} topics`, x, y + coreRadius * 0.42)
  }

  ctx.restore()
}

function drawProminentTopicLabels(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  projectedStarMap: Map<string, { x: number; y: number; radius: number }>,
  projectedGalaxyRadius: number
) {
  if (projectedGalaxyRadius < 46) return

  galaxy.stars
    .slice()
    .sort((a, b) => {
      if (b.luminosity !== a.luminosity) return b.luminosity - a.luminosity
      return b.associated_chunk_count - a.associated_chunk_count
    })
    .slice(0, projectedGalaxyRadius > 72 ? 3 : 2)
    .forEach(star => {
      const projected = projectedStarMap.get(star.id)
      if (!projected) return
      const label = star.topic.length > 32 ? `${star.topic.slice(0, 29)}...` : star.topic
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.font = "800 10px Nunito, system-ui, sans-serif"
      ctx.textAlign = projected.x < 120 ? "left" : "center"
      ctx.fillStyle = "#e5e7eb"
      ctx.shadowColor = "rgba(2, 6, 23, 0.9)"
      ctx.shadowBlur = 5
      ctx.fillText(label, projected.x, projected.y - projected.radius - 8)
      ctx.restore()
    })
}

function drawUniverseInternalEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  color: string,
  opacity = 1
) {
  const style = relationshipLineStyle(edge, false)
  ctx.save()
  ctx.globalAlpha = style.opacity * 0.46 * opacity
  ctx.strokeStyle = edge.family === "core" ? color : style.color
  ctx.lineWidth = style.width * 0.48
  ctx.setLineDash(style.dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawUniverseLegend(
  ctx: CanvasRenderingContext2D,
  galaxies: Galaxy[],
  width: number,
  height: number
) {
  const legendGalaxies = galaxies
    .slice()
    .sort((a, b) => {
      if (b.topicCount !== a.topicCount) return b.topicCount - a.topicCount
      return a.name.localeCompare(b.name)
    })
    .slice(0, 8)
  if (legendGalaxies.length === 0) return

  const x = 18
  const y = height - 44
  const itemGap = 20
  ctx.save()
  ctx.globalAlpha = 0.86
  ctx.fillStyle = "rgba(2, 6, 23, 0.64)"
  roundRect(ctx, x, y - 16, Math.min(width - 36, 900), 36, 12)
  ctx.fill()
  ctx.font = "800 11px Nunito, system-ui, sans-serif"
  ctx.textAlign = "left"
  let cursorX = x + 18
  legendGalaxies.forEach(galaxy => {
    const label = galaxy.name.length > 22 ? `${galaxy.name.slice(0, 19)}...` : galaxy.name
    const labelWidth = ctx.measureText(label).width
    if (cursorX + labelWidth + 32 > width - 28) return
    ctx.globalAlpha = 0.95
    ctx.fillStyle = galaxy.color
    ctx.beginPath()
    ctx.arc(cursorX, y + 2, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#cbd5e1"
    ctx.globalAlpha = 0.82
    ctx.fillText(label, cursorX + 12, y + 6)
    cursorX += labelWidth + itemGap + 18
  })
  ctx.restore()
}

function wrapCanvasLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = label.split(/\s+/)
  const lines: string[] = []
  let currentLine = ""
  words.forEach(word => {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate
      return
    }
    lines.push(currentLine)
    currentLine = word
  })
  if (currentLine) lines.push(currentLine)
  const offset = -((lines.length - 1) * lineHeight) / 2
  lines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, x, y + offset + index * lineHeight)
  })
}

function drawSmallExternalLabel(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number
) {
  ctx.save()
  ctx.globalAlpha = 0.42
  ctx.font = "800 10px Nunito, system-ui, sans-serif"
  ctx.fillStyle = galaxy.color
  ctx.textAlign = "center"
  ctx.fillText(galaxy.name.slice(0, 28).toUpperCase(), x, y)
  ctx.restore()
}

function drawExplodedTopicLabels(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  projectedStarMap: Map<string, { x: number; y: number; radius: number; depth?: number }>,
  focusedStarId: string | null,
  hoveredStarId: string | null,
  focusedNeighbors: Set<string>,
  zoom: number
) {
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = []
  const starsByPriority = galaxy.stars.slice().sort((a, b) => {
    if (b.luminosity !== a.luminosity) return b.luminosity - a.luminosity
    if (b.associated_chunk_count !== a.associated_chunk_count) {
      return b.associated_chunk_count - a.associated_chunk_count
    }
    return a.topic.localeCompare(b.topic)
  })
  const permanentLabelCount = permanentTopicLabelCount(galaxy.stars.length, zoom)
  const permanentLabelIds = new Set(
    starsByPriority.slice(0, permanentLabelCount).map(star => star.id)
  )

  starsByPriority.forEach(star => {
    const projected = projectedStarMap.get(star.id)
    if (!projected) return
    const focused = focusedStarId === star.id
    const hovered = hoveredStarId === star.id
    const neighbor = focusedNeighbors.has(star.id)
    const unrelated = Boolean(focusedStarId && !focused && !neighbor)
    const permanent = permanentLabelIds.has(star.id)
    const forced = focused || hovered
    const visible = permanent || forced || neighbor
    if (!visible) return

    const label = star.topic.length > 42 ? `${star.topic.slice(0, 39)}...` : star.topic
    const fontSize = clamp(10 + star.luminosity * 2.4, 10, 13)

    ctx.save()
    ctx.font = `850 ${fontSize}px Nunito, system-ui, sans-serif`
    const width = ctx.measureText(label).width
    const height = fontSize + 5
    const gap = projected.radius + 8
    const candidates = [
      { x: projected.x + gap, y: projected.y - 4, align: "left" as CanvasTextAlign },
      { x: projected.x - gap, y: projected.y - 4, align: "right" as CanvasTextAlign },
      { x: projected.x, y: projected.y - gap, align: "center" as CanvasTextAlign },
      { x: projected.x, y: projected.y + gap + fontSize, align: "center" as CanvasTextAlign }
    ]
    let chosen: typeof candidates[number] | null = null
    const canPlace = (candidate: typeof chosen) => {
      if (!candidate) return false
      const candidateRect = labelRect(candidate.x, candidate.y, width, height, candidate.align)
      return !occupied.some(item => rectsOverlap(item, candidateRect))
    }
    const collisionFree = candidates.find(canPlace)
    if (collisionFree) {
      chosen = collisionFree
      const rect = labelRect(chosen.x, chosen.y, width, height, chosen.align)
      occupied.push(rect)
    } else if (forced) {
      chosen = candidates[0]
    } else {
      ctx.restore()
      return
    }

    ctx.globalAlpha = unrelated
      ? 0.2
      : focused || hovered || neighbor
        ? 0.96
        : clamp(0.46 + star.luminosity * 0.28, 0.46, 0.78)
    ctx.textAlign = chosen.align
    ctx.fillStyle = focused || hovered ? "#ffffff" : "#dbeafe"
    ctx.shadowColor = "rgba(2, 6, 23, 0.95)"
    ctx.shadowBlur = 7
    ctx.fillText(label, chosen.x, chosen.y)
    ctx.restore()
  })
}

function permanentTopicLabelCount(topicCount: number, zoom = 1) {
  const base = topicCount <= 8
    ? Math.min(topicCount, 4)
    : topicCount <= 14
      ? Math.min(topicCount, 5)
      : topicCount <= 28
        ? Math.min(topicCount, 7)
        : Math.min(topicCount, 8)
  const zoomBonus = zoom >= 2.05
    ? 6
    : zoom >= 1.65
      ? 4
      : zoom >= 1.25
        ? 2
        : 0
  return Math.min(topicCount, base + zoomBonus, 14)
}

function drawFocusedTopicLabels(
  ctx: CanvasRenderingContext2D,
  focus: GalaxyStar,
  relatedStars: GalaxyStar[],
  projectedStarMap: Map<string, { x: number; y: number; radius: number; depth?: number }>,
  directEdgeByTopicId: Map<string, UniverseEdge>,
  hoveredStarId: string | null,
  selectedRelationshipKey: string | null,
  hoveredRelationshipKey: string | null,
  labels: KnowledgeSphereLabels,
  categoryFallback: string
) {
  const focusProjected = projectedStarMap.get(focus.id)
  if (!focusProjected) return

  ctx.save()
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(2, 6, 23, 0.96)"
  ctx.shadowBlur = 9
  ctx.globalAlpha = 0.98
  ctx.fillStyle = "#ffffff"
  ctx.font = "950 18px Nunito, system-ui, sans-serif"
  wrapCanvasLabel(ctx, focus.topic, focusProjected.x, focusProjected.y + focusProjected.radius + 30, 310, 20)
  ctx.globalAlpha = 0.78
  ctx.fillStyle = focus.color
  ctx.font = "800 12px Nunito, system-ui, sans-serif"
  ctx.fillText(labels.selectedTopic, focusProjected.x, focusProjected.y - focusProjected.radius - 18)
  ctx.restore()

  const occupied: Array<{ x: number; y: number; width: number; height: number }> = [
    {
      x: focusProjected.x - 170,
      y: focusProjected.y + focusProjected.radius + 8,
      width: 340,
      height: 64
    }
  ]
  const maxDefaultLabels = relatedStars.length <= 6 ? relatedStars.length : relatedStars.length <= 10 ? 8 : 9
  const priorityStars = relatedStars.slice().sort((a, b) => {
    const edgeA = directEdgeByTopicId.get(a.id)
    const edgeB = directEdgeByTopicId.get(b.id)
    const weightA = edgeA?.weight || 0
    const weightB = edgeB?.weight || 0
    if (weightB !== weightA) return weightB - weightA
    if (b.associated_chunk_count !== a.associated_chunk_count) {
      return b.associated_chunk_count - a.associated_chunk_count
    }
    return a.topic.localeCompare(b.topic)
  })
  const defaultLabelIds = new Set(priorityStars.slice(0, maxDefaultLabels).map(star => star.id))

  priorityStars.forEach(star => {
    const projected = projectedStarMap.get(star.id)
    if (!projected) return
    const edge = directEdgeByTopicId.get(star.id)
    const relationshipKey = edge ? relationshipEdgeKey(edge) : null
    const hovered = hoveredStarId === star.id
    const relationshipSelected = relationshipKey === selectedRelationshipKey
    const relationshipHovered = relationshipKey === hoveredRelationshipKey
    const forced = hovered || relationshipSelected || relationshipHovered
    if (!forced && !defaultLabelIds.has(star.id)) return

    const label = star.topic.length > 46 ? `${star.topic.slice(0, 43)}...` : star.topic
    ctx.save()
    const connectionLuminosity = focusedConnectionLuminosity(edge)
    const fontSize = clamp(10.5 + connectionLuminosity * 2.6, 10.5, forced ? 14 : 12.8)
    ctx.font = `${forced ? 920 : 820} ${fontSize}px Nunito, system-ui, sans-serif`
    const width = Math.min(230, ctx.measureText(label).width + 12)
    const height = star.galaxyId === focus.galaxyId ? fontSize + 7 : fontSize + 21
    const gap = projected.radius + 10
    const preferredAlign: CanvasTextAlign = projected.x < focusProjected.x ? "right" : "left"
    const candidates = focusedLabelCandidates(projected.x, projected.y, gap, width, height, preferredAlign)
    const chosen = candidates.find(candidate => {
      const rect = labelRect(candidate.x, candidate.y, width, height, candidate.align)
      return !occupied.some(item => rectsOverlap(item, rect))
    })
    if (!chosen && !forced) {
      ctx.restore()
      return
    }
    const finalCandidate = chosen || candidates[0]
    const rect = labelRect(finalCandidate.x, finalCandidate.y, width, height, finalCandidate.align)
    occupied.push(rect)
    ctx.globalAlpha = forced ? 1 : clamp(0.52 + connectionLuminosity * 0.34, 0.56, 0.88)
    ctx.textAlign = finalCandidate.align
    ctx.fillStyle = forced ? "#ffffff" : "#dbeafe"
    ctx.shadowColor = "rgba(2, 6, 23, 0.95)"
    ctx.shadowBlur = 7
    ctx.fillText(label, finalCandidate.x, finalCandidate.y)
    if (star.galaxyId !== focus.galaxyId) {
      ctx.globalAlpha = forced ? 0.82 : 0.58
      ctx.fillStyle = star.color
      ctx.font = "800 9.5px Nunito, system-ui, sans-serif"
      ctx.fillText((star.category || categoryFallback).toUpperCase(), finalCandidate.x, finalCandidate.y + fontSize + 10)
    }
    ctx.restore()
  })
}

function drawFocusedHeader(
  ctx: CanvasRenderingContext2D,
  focus: GalaxyStar,
  relationshipCount: number,
  x: number,
  y: number,
  labels: KnowledgeSphereLabels
) {
  ctx.save()
  ctx.globalAlpha = 0.76
  ctx.fillStyle = "rgba(2, 6, 23, 0.58)"
  roundRect(ctx, x, y, 330, 78, 18)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = focus.color
  ctx.font = "900 11px Nunito, system-ui, sans-serif"
  ctx.fillText(labels.focusedTopic, x + 16, y + 23)
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 15px Nunito, system-ui, sans-serif"
  ctx.fillText(
    focus.topic.length > 34 ? `${focus.topic.slice(0, 31)}...` : focus.topic,
    x + 16,
    y + 46
  )
  ctx.fillStyle = "#94a3b8"
  ctx.font = "750 12px Nunito, system-ui, sans-serif"
  ctx.fillText(`${relationshipCount} ${labels.directQualifiedRelationships}`, x + 16, y + 65)
  ctx.restore()
}

function labelRect(
  x: number,
  y: number,
  width: number,
  height: number,
  align: CanvasTextAlign
) {
  const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x
  return { x: left - 5, y: y - height + 1, width: width + 10, height: height + 4 }
}

function universeLabelCandidates(
  centerX: number,
  centerY: number,
  radius: number,
  width: number,
  height: number,
  gap: number
) {
  const localAdjustments = [0, -10, 10]
  const candidates = localAdjustments.flatMap(offset => [
    {
      x: centerX + radius + gap + width / 2,
      y: centerY + 4 + offset,
      rect: { x: centerX + radius + gap, y: centerY - 16 + offset, width, height }
    },
    {
      x: centerX - radius - gap - width / 2,
      y: centerY + 4 + offset,
      rect: { x: centerX - radius - gap - width, y: centerY - 16 + offset, width, height }
    },
    {
      x: centerX + offset,
      y: centerY - radius - gap - height + 16,
      rect: { x: centerX - width / 2 + offset, y: centerY - radius - gap - height, width, height }
    },
    {
      x: centerX + offset,
      y: centerY + radius + gap + 16,
      rect: { x: centerX - width / 2 + offset, y: centerY + radius + gap, width, height }
    }
  ])

  return candidates
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return !(
    a.x + a.width < b.x
    || b.x + b.width < a.x
    || a.y + a.height < b.y
    || b.y + b.height < a.y
  )
}

function rectOverlapsCircle(
  rect: { x: number; y: number; width: number; height: number },
  circle: { x: number; y: number; radius: number }
) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width)
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height)
  const dx = circle.x - closestX
  const dy = circle.y - closestY
  return dx * dx + dy * dy < circle.radius * circle.radius
}

function relationshipLineStyle(edge: UniverseEdge, faded: boolean, external = false) {
  const familyColor = FAMILY_COLORS[edge.family]
  const borderlineFactor = edge.borderline ? 0.48 : 1
  const fadedFactor = faded ? 0.16 : 1
  const familyOpacity = edge.family === "core"
    ? 0.52
    : edge.family === "conceptual"
      ? 0.34
      : 0.24
  const width = edge.family === "core"
    ? 1.45 + edge.weight * 0.5
    : edge.family === "conceptual"
      ? 1 + edge.weight * 0.32
      : 0.72 + edge.weight * 0.24

  return {
    color: familyColor,
    opacity: familyOpacity * borderlineFactor * fadedFactor * (external ? 0.5 : 1),
    width: width * (external ? 0.72 : 1) * (edge.borderline ? 0.86 : 1),
    dash: edge.borderline ? [6, 7] : [],
    glow: !faded && !edge.borderline && edge.family === "core" ? 9 : 0
  }
}

function drawTopicEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  faded: boolean
) {
  const style = relationshipLineStyle(edge, faded)
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash)
  if (style.glow) {
    ctx.shadowColor = style.color
    ctx.shadowBlur = style.glow
  }
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawExternalEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  faded: boolean
) {
  const style = relationshipLineStyle(edge, faded, true)
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash)
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2 - 24
  drawDoubleQuadraticLine(ctx, x1, y1, midX, midY, x2, y2, style.width, style.dash)
  ctx.restore()
}

function explodedRelationshipLineStyle(edge: UniverseEdge, faded: boolean, emphasized: boolean, external = false) {
  const familyColor = FAMILY_COLORS[edge.family]
  const strength = clamp(edge.weight, 0, 1)
  const familyBase = edge.family === "core"
    ? { opacity: 0.54, width: 1.15, glow: 8 }
    : edge.family === "conceptual"
      ? { opacity: 0.42, width: 0.86, glow: 4 }
      : { opacity: 0.3, width: 0.62, glow: 0 }
  const borderlineFactor = edge.borderline ? 0.6 : 1
  const fadedFactor = faded ? 0.16 : 1
  const externalFactor = external ? 0.7 : 1
  const emphasisFactor = emphasized ? 1.75 : 1
  return {
    color: familyColor,
    opacity: clamp(
      (familyBase.opacity + strength * 0.26) * borderlineFactor * fadedFactor * externalFactor * (emphasized ? 1.28 : 1),
      0.025,
      emphasized ? 0.96 : 0.78
    ),
    width: clamp(
      (familyBase.width + Math.sqrt(strength) * (external ? 0.82 : 1.3)) * (edge.borderline ? 0.82 : 1) * emphasisFactor,
      0.45,
      emphasized ? 4.4 : 3.1
    ),
    dash: edge.borderline ? [6, 7] : [],
    glow: emphasized
      ? 14
      : !faded && !edge.borderline
        ? familyBase.glow + strength * 5
        : 0
  }
}

function drawExplodedTopicEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  faded: boolean,
  emphasized: boolean
) {
  const style = explodedRelationshipLineStyle(edge, faded, emphasized)
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash)
  ctx.lineCap = "round"
  if (style.glow) {
    ctx.shadowColor = style.color
    ctx.shadowBlur = style.glow
  }
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function drawExplodedExternalEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  faded: boolean,
  emphasized: boolean
) {
  const style = explodedRelationshipLineStyle(edge, faded, emphasized, true)
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash)
  ctx.lineCap = "round"
  if (style.glow) {
    ctx.shadowColor = style.color
    ctx.shadowBlur = style.glow
  }
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2 - 24
  drawDoubleQuadraticLine(ctx, x1, y1, midX, midY, x2, y2, style.width, style.dash)
  ctx.restore()
}

function drawDoubleStraightLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  dash: number[]
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const offset = clamp(width * 1.35 + 2.2, 3.2, 8)
  const nx = -dy / length * offset
  const ny = dx / length * offset
  ;[-0.5, 0.5].forEach(direction => {
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x1 + nx * direction, y1 + ny * direction)
    ctx.lineTo(x2 + nx * direction, y2 + ny * direction)
    ctx.stroke()
  })
}

function drawDoubleQuadraticLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  width: number,
  dash: number[]
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy))
  const offset = clamp(width * 1.45 + 2.4, 3.4, 8.5)
  const nx = -dy / length * offset
  const ny = dx / length * offset
  ;[-0.5, 0.5].forEach(direction => {
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x1 + nx * direction, y1 + ny * direction)
    ctx.quadraticCurveTo(
      cx + nx * direction,
      cy + ny * direction,
      x2 + nx * direction,
      y2 + ny * direction
    )
    ctx.stroke()
  })
}

function drawTopicLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string
) {
  const shortLabel = label.length > 52 ? `${label.slice(0, 49)}...` : label
  ctx.save()
  ctx.font = "800 12px Nunito, system-ui, sans-serif"
  const metrics = ctx.measureText(shortLabel)
  const width = metrics.width + 18
  const height = 26
  const labelX = x + 12
  const labelY = y - height - 8
  ctx.globalAlpha = 0.9
  ctx.fillStyle = "rgba(2, 6, 23, 0.9)"
  roundRect(ctx, labelX, labelY, width, height, 9)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  roundRect(ctx, labelX, labelY, width, height, 9)
  ctx.stroke()
  ctx.fillStyle = "#e5e7eb"
  ctx.fillText(shortLabel, labelX + 9, labelY + 17)
  ctx.restore()
}

function focusedLabelCandidates(
  x: number,
  y: number,
  gap: number,
  width: number,
  height: number,
  preferredAlign: CanvasTextAlign
) {
  const right = { x: x + gap, y: y + 4, align: "left" as CanvasTextAlign }
  const left = { x: x - gap, y: y + 4, align: "right" as CanvasTextAlign }
  const top = { x, y: y - gap, align: "center" as CanvasTextAlign }
  const bottom = { x, y: y + gap + height * 0.46, align: "center" as CanvasTextAlign }
  const preferred = preferredAlign === "left" ? right : left
  const alternate = preferredAlign === "left" ? left : right
  return [preferred, alternate, top, bottom]
}

function drawFocusedTopicAnchor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ;[1.42, 1.86].forEach((multiplier, index) => {
    ctx.globalAlpha = index === 0 ? 0.28 : 0.14
    ctx.lineWidth = index === 0 ? 1.6 : 1
    ctx.setLineDash(index === 0 ? [] : [5, 9])
    ctx.beginPath()
    ctx.arc(x, y, radius * multiplier, 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.restore()
}

function focusedRelationshipLineStyle(edge: UniverseEdge, faded: boolean, emphasized: boolean) {
  const strength = clamp(edge.weight, 0, 1)
  const familyBase = edge.family === "core"
    ? { opacity: 0.66, width: 1.6, glow: 13 }
    : edge.family === "conceptual"
      ? { opacity: 0.5, width: 1.12, glow: 7 }
      : { opacity: 0.38, width: 0.82, glow: 3 }
  const borderlineFactor = edge.borderline ? 0.62 : 1
  const fadedFactor = faded ? 0.18 : 1
  const emphasisFactor = emphasized ? 1.85 : 1
  return {
    color: FAMILY_COLORS[edge.family],
    opacity: clamp(
      (familyBase.opacity + strength * 0.24) * borderlineFactor * fadedFactor * (emphasized ? 1.22 : 1),
      0.035,
      emphasized ? 1 : 0.88
    ),
    width: clamp(
      (familyBase.width + Math.sqrt(strength) * 2.3) * (edge.borderline ? 0.78 : 1) * emphasisFactor,
      0.55,
      emphasized ? 5.8 : 4.2
    ),
    dash: edge.borderline ? [6, 7] : [],
    glow: emphasized
      ? 18
      : !faded
        ? familyBase.glow + strength * 7
        : 0
  }
}

function drawFocusedRelationshipEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: UniverseEdge,
  faded: boolean,
  emphasized: boolean
) {
  const style = focusedRelationshipLineStyle(edge, faded, emphasized)
  ctx.save()
  ctx.globalAlpha = style.opacity
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash)
  ctx.lineCap = "round"
  if (style.glow) {
    ctx.shadowColor = style.color
    ctx.shadowBlur = style.glow
  }
  if (edge.sourceGalaxyId !== edge.targetGalaxyId) {
    drawDoubleStraightLine(ctx, x1, y1, x2, y2, style.width, style.dash)
  } else {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawExplodedHeader(
  ctx: CanvasRenderingContext2D,
  galaxy: Galaxy,
  x: number,
  y: number,
  labels: KnowledgeSphereLabels
) {
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = "rgba(2, 6, 23, 0.6)"
  roundRect(ctx, x, y, 330, 72, 16)
  ctx.fill()
  ctx.font = "900 17px Nunito, system-ui, sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(galaxy.name, x + 16, y + 27)
  ctx.font = "700 12px Nunito, system-ui, sans-serif"
  ctx.fillStyle = galaxy.color
  ctx.fillText(
    `${galaxy.topicCount} ${labels.topics} · ${galaxy.internalEdges} ${labels.internal} · ${galaxy.bridgeEdges} ${labels.bridges}`,
    x + 16,
    y + 51
  )
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function findProjectedStar(
  x: number,
  y: number,
  projectedStars: Array<{ id: string; x: number; y: number; radius: number }>
) {
  let best: { id: string; distance: number } | null = null
  projectedStars.forEach(star => {
    const dx = x - star.x
    const dy = y - star.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > Math.max(8, star.radius + 4)) return
    if (!best || distance < best.distance) best = { id: star.id, distance }
  })
  return best?.id || null
}

function findProjectedGalaxy(
  x: number,
  y: number,
  projectedGalaxies: Array<{ id: string; x: number; y: number; radius: number }>
) {
  let best: { id: string; distance: number } | null = null
  projectedGalaxies.forEach(galaxy => {
    const dx = x - galaxy.x
    const dy = y - galaxy.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > galaxy.radius * 1.25) return
    if (!best || distance < best.distance) best = { id: galaxy.id, distance }
  })
  return best?.id || null
}

function findProjectedRelationship(
  x: number,
  y: number,
  projectedRelationships: ProjectedRelationship[]
) {
  let best: { key: string; distance: number; weight: number } | null = null
  projectedRelationships.forEach(relationship => {
    const distance = pointToSegmentDistance(
      x,
      y,
      relationship.x1,
      relationship.y1,
      relationship.x2,
      relationship.y2
    )
    const tolerance = relationship.external ? 9 : 7
    if (distance > tolerance) return
    const weight = relationship.edge.weight
    if (
      !best
      || distance < best.distance
      || (distance === best.distance && weight > best.weight)
      || (
        distance === best.distance
        && weight === best.weight
        && relationship.key.localeCompare(best.key) < 0
      )
    ) {
      best = { key: relationship.key, distance, weight }
    }
  })
  return best?.key || null
}

function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    const ox = px - x1
    const oy = py - y1
    return Math.sqrt(ox * ox + oy * oy)
  }
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1)
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy
  const ox = px - closestX
  const oy = py - closestY
  return Math.sqrt(ox * ox + oy * oy)
}

function deterministicAngle(value: string) {
  return normalizedHash(hashString(value)) * Math.PI * 2
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizedHash(value: number) {
  return value / 4294967295
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(3)
    : "n/a"
}

function formatEvidenceSource(
  document?: string | null,
  page?: number | null,
  pageLabel = "page",
  unknownSource = "Unknown source"
) {
  if (document && page !== undefined && page !== null) {
    return `${document} — ${pageLabel} ${page}`
  }
  return document || unknownSource
}

function readableRelationshipError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message)
      if (parsed?.detail) return String(parsed.detail)
    } catch {
      return error.message
    }
    return error.message
  }
  return fallback
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  const bigint = parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function DiagnosticStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={diagnosticStat}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  )
}

const sphereShell: CSSProperties = {
  display: "grid",
  gap: 16
}

const sphereHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap"
}

const eyebrow: CSSProperties = {
  color: "#36f2ed",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 900,
  marginBottom: 8
}

const sectionTitle: CSSProperties = {
  color: "white",
  fontSize: 22,
  margin: 0
}

const subtleText: CSSProperties = {
  color: "#94a3b8",
  fontSize: 14,
  lineHeight: 1.55,
  margin: "8px 0 0",
  maxWidth: 800
}

const sphereActions: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap"
}

const primaryButton: CSSProperties = {
  border: "1px solid rgba(54, 242, 237, 0.36)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#07111f",
  background: "linear-gradient(135deg, #36f2ed, #8b5cf6)",
  fontWeight: 900,
  cursor: "pointer"
}

const secondaryButton: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.22)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#d8b4fe",
  background: "rgba(15, 23, 42, 0.72)",
  fontWeight: 850,
  cursor: "pointer"
}

const diagnosticBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10
}

const diagnosticStat: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(2, 6, 23, 0.38)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  color: "#94a3b8",
  fontSize: 12
}

const controlRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(148, 163, 184, 0.14)"
}

const toggleLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 850
}

const universeGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "230px minmax(0, 1fr) 280px",
  gap: 16,
  alignItems: "stretch",
  height: "clamp(660px, 76vh, 860px)"
}

const orientationPanel: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 14,
  minHeight: 0,
  height: "100%",
  maxHeight: "100%",
  padding: 16,
  borderRadius: 24,
  background: "rgba(15, 23, 42, 0.78)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  overflowY: "auto",
  overflowX: "hidden"
}

const stageLabel: CSSProperties = {
  color: "#36f2ed",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: "0.08em"
}

const orientationTitle: CSSProperties = {
  color: "#ffffff",
  margin: "4px 0 0",
  fontSize: 16,
  lineHeight: 1.15
}

const orientationText: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 1.5,
  margin: "10px 0 0"
}

const orientationCard: CSSProperties = {
  display: "grid",
  gap: 9,
  minWidth: 0,
  padding: 12,
  borderRadius: 16,
  background: "rgba(2, 6, 23, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.14)"
}

const orientationCardTitle: CSSProperties = {
  margin: 0,
  color: "#e5e7eb",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em"
}

const legendRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 850
}

const grammarList: CSSProperties = {
  display: "grid",
  gap: 7,
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.35
}

const canvasWrap: CSSProperties = {
  position: "relative",
  height: "100%",
  minHeight: 0,
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34)",
  background: "#020617"
}

const canvasStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  cursor: "grab"
}

const overlayPanel: CSSProperties = {
  position: "absolute",
  inset: "50% auto auto 50%",
  transform: "translate(-50%, -50%)",
  padding: 18,
  borderRadius: 16,
  background: "rgba(2, 6, 23, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  color: "#e5e7eb",
  textAlign: "center",
  maxWidth: 360
}

const canvasBackButton: CSSProperties = {
  ...primaryButton,
  position: "absolute",
  top: 18,
  right: 18,
  boxShadow: "0 14px 36px rgba(54, 242, 237, 0.16)"
}

const hoverCard: CSSProperties = {
  position: "absolute",
  left: 18,
  bottom: 18,
  display: "grid",
  gap: 4,
  maxWidth: 380,
  padding: 14,
  borderRadius: 16,
  background: "rgba(2, 6, 23, 0.86)",
  border: "1px solid rgba(54, 242, 237, 0.22)",
  color: "#e5e7eb",
  boxShadow: "0 16px 60px rgba(0, 0, 0, 0.25)",
  pointerEvents: "none"
}

const diagnosticPanel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
  height: "100%",
  maxHeight: "100%",
  padding: 16,
  borderRadius: 24,
  background: "rgba(15, 23, 42, 0.86)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  overflow: "hidden"
}

const panelTopRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  minWidth: 0
}

const panelTitle: CSSProperties = {
  color: "white",
  margin: 0,
  fontSize: 16
}

const panelText: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.45,
  margin: "6px 0 0",
  overflowWrap: "anywhere"
}

const miniButton: CSSProperties = {
  ...secondaryButton,
  padding: "7px 10px",
  fontSize: 12
}

const galaxyList: CSSProperties = {
  display: "grid",
  gap: 10,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  paddingRight: 4
}

const galaxyCard: CSSProperties = {
  display: "grid",
  gap: 5,
  minWidth: 0,
  textAlign: "left",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(2, 6, 23, 0.42)",
  color: "#cbd5e1",
  cursor: "pointer"
}

const emptyPanelCard: CSSProperties = {
  padding: 12,
  borderRadius: 16,
  background: "rgba(2, 6, 23, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.45
}

const explanationPanel: CSSProperties = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 12,
  borderRadius: 16,
  background: "rgba(2, 6, 23, 0.46)",
  border: "1px solid rgba(54, 242, 237, 0.16)",
  color: "#cbd5e1"
}

const relationshipDetails: CSSProperties = {
  display: "grid",
  gap: 5,
  color: "#cbd5e1",
  fontSize: 11,
  lineHeight: 1.35
}

const relationshipArrow: CSSProperties = {
  color: "#36f2ed",
  fontSize: 16,
  lineHeight: 1,
  fontWeight: 950
}

const evidenceBlock: CSSProperties = {
  display: "grid",
  gap: 8,
  paddingTop: 10,
  borderTop: "1px solid rgba(148, 163, 184, 0.14)"
}

const navigationList: CSSProperties = {
  display: "grid",
  gap: 8
}

const navigationRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "24px 1fr",
  alignItems: "center",
  gap: 8,
  color: "#cbd5e1",
  fontSize: 11,
  lineHeight: 1.25
}

const navigationIcon: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 24,
  height: 24,
  borderRadius: 9,
  color: "#36f2ed",
  background: "rgba(54, 242, 237, 0.08)",
  border: "1px solid rgba(54, 242, 237, 0.14)"
}

const relationshipSidebarPanel: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden",
  color: "#cbd5e1"
}

const relationshipBackButton: CSSProperties = {
  ...secondaryButton,
  alignSelf: "flex-start",
  padding: "8px 11px",
  fontSize: 12
}

const relationshipEntityCard: CSSProperties = {
  display: "grid",
  gap: 5,
  minWidth: 0,
  padding: 14,
  borderRadius: 18,
  background: "rgba(2, 6, 23, 0.48)",
  border: "1px solid rgba(54, 242, 237, 0.16)",
  color: "#e5e7eb",
  textAlign: "center",
  overflowWrap: "anywhere"
}

const relationshipEntityCategory: CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.25,
  overflowWrap: "anywhere"
}

const relationshipEntityMeta: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.35,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginTop: 3,
  overflowWrap: "anywhere"
}

const relationshipStateCard: CSSProperties = {
  padding: 13,
  borderRadius: 16,
  background: "rgba(37, 99, 235, 0.12)",
  border: "1px solid rgba(96, 165, 250, 0.2)",
  color: "#bfdbfe",
  fontSize: 12,
  lineHeight: 1.45
}

const relationshipErrorCard: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 13,
  borderRadius: 16,
  background: "rgba(127, 29, 29, 0.18)",
  border: "1px solid rgba(248, 113, 113, 0.24)",
  color: "#fecaca",
  fontSize: 12,
  lineHeight: 1.45
}

const relationshipRetryButton: CSSProperties = {
  ...secondaryButton,
  justifySelf: "start",
  padding: "7px 10px",
  fontSize: 11
}

const relationshipExplanationText: CSSProperties = {
  color: "#dbeafe",
  fontSize: 12,
  lineHeight: 1.55,
  margin: 0,
  overflowWrap: "anywhere"
}

const evidencePreviewList: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 2
}

const evidencePreviewCard: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  padding: 10,
  borderRadius: 13,
  background: "rgba(15, 23, 42, 0.54)",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.35,
  overflowWrap: "anywhere"
}
