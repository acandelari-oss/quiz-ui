import { useState, useEffect, useRef, type MutableRefObject } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

import Sidebar from "../components/Sidebar";
import ToolPanel from "../components/ToolPanel";
import Workspace from "../components/Workspace";
import PlannerView from "@/components/views/PlannerView";
import { useTranslation } from "react-i18next";

import {
  extractTopicIds,
  extractTopicNames,
  normalizeTopic,
  resolveCategoryTopicObjects
} from "../utils/topics";
import { isCorrectQuizOption } from "../utils/quizAnswers";
import {
  completePlannerAssessment,
  completePlannerModule,
  generatePlannerActivityDebrief,
  generatePlannerHomeworkRecommendation,
  generatePlannerModuleDebrief,
  generatePlannerStudyPlanDebrief
} from "../services/plannerApi";
import type {
  PlannerActivityDebriefs,
  PlannerCompletedSessionResults,
  PlannerDailyPlan,
  PlannerModuleHomework,
  PlannerModuleDebriefs,
  PlannerSessionResults
} from "../components/views/planner/PlannerTypes";
import { dispatchPlannerActivity } from "../components/views/planner/plannerActivityDispatcher";
import {
  completeLearningSession,
  startLearningSession
} from "../services/learningSessions";

type LearningGenerationOverrides = {
  selectedTopics?: any[]
  selectedTopic?: any
  numQuestions?: number
  numCards?: number
  difficulty?: string
  questionStyle?: string
  secondsPerAnswer?: number | null
  source?: "standalone" | "planner"
}

type FlashcardGenerationSnapshot = {
  source: "standalone"
  selectedTopics: any[]
  selectedTopic: any
  numCards: number
}

type PlannerRuntimeState = {
  plannerWeekId?: string | null
  mode: "dashboard" | "daily_briefing" | "external_activity" | "activity_review" | "summary"
  dailyPlan: PlannerDailyPlan | null
  activityIndex: number
  todaySessionCompleted: boolean
  sessionResults: PlannerSessionResults
  completedSessionResults: PlannerCompletedSessionResults
  activityDebriefs: PlannerActivityDebriefs
  moduleDebriefs: PlannerModuleDebriefs
  moduleHomework: PlannerModuleHomework
  studyPlanDebrief: string
  assessmentCompletedAt?: number | null
}

const directWorkspaceViews = new Set([
  "project",
  "results_summary",
  "previous_quizzes",
  "topics",
  "manage_projects",
  "planner_view",
  "learning_home"
])

const configurationDrivenViews = new Set([
  "create_project",
  "load_project",
  "ask_setup",
  "generate_flashcards",
  "active_recall_setup",
  "study_session_setup"
])

function resolveStudentFirstName(user: any): string {
  const metadata = user?.user_metadata || {}
  const candidates = [
    metadata.first_name,
    metadata.full_name,
    metadata.name,
    metadata.display_name
  ]

  const rawName = candidates.find(
    value => typeof value === "string" && value.trim().length > 0
  )

  if (!rawName) {
    return ""
  }

  return rawName.trim().split(/\s+/)[0] || ""
}

function createUploadSessionId(): string {
  return Math.random().toString(16).slice(2, 8).toUpperCase()
}

function uploadFlightLog(sessionId: string | null | undefined, message: string, details?: any) {
  const prefix = `[${sessionId || "NOSESSION"}]`
  if (details !== undefined) {
    console.log(`${prefix} ${message}`, details)
    return
  }
  console.log(`${prefix} ${message}`)
}

function uploadFlightError(sessionId: string | null | undefined, message: string, error: any) {
  const prefix = `[${sessionId || "NOSESSION"}]`
  console.error(`${prefix} ${message}`, {
    type: error?.name || error?.constructor?.name || typeof error,
    message: error?.message || String(error),
    stack: error?.stack
  })
}

function uploadTraceStack() {
  return new Error().stack
    ?.split("\n")
    .slice(2, 8)
    .map(line => line.trim())
}

function normalizePriorityCategories(value: any): string[] {
  const parsedValue = typeof value === "string"
    ? (() => {
        try {
          return JSON.parse(value)
        } catch {
          return []
        }
      })()
    : value
  const raw = Array.isArray(parsedValue)
    ? parsedValue
    : typeof parsedValue?.priorityCategories === "string"
      ? normalizePriorityCategories(parsedValue.priorityCategories)
      : typeof parsedValue?.study_priority_categories === "string"
        ? normalizePriorityCategories(parsedValue.study_priority_categories)
        : Array.isArray(parsedValue?.priorityCategories)
          ? parsedValue.priorityCategories
          : Array.isArray(parsedValue?.study_priority_categories)
            ? parsedValue.study_priority_categories
            : []

  return Array.from(
    new Set(
      raw
        .map((category: any) => String(category || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3)
}

const LAST_ACTIVE_PROJECT_STORAGE_KEY = "douno:lastActiveProjectId"

export default function Home() {
const { i18n } = useTranslation();
const pollingRef = useRef<any>(null)
const pollingRunRef = useRef(0)
const uploadSessionRef = useRef<string | null>(null)
const router = useRouter()



const [projectId,setProjectId]=useState("")
const [projectName,setProjectName]=useState("")
const [projectStudyMode,setProjectStudyMode]=useState("building")
const [projectReadyVisible,setProjectReadyVisible]=useState(false)
const [projectReadyDismissed,setProjectReadyDismissed]=useState(false)
const [createProjectName,setCreateProjectName]=useState("")
const [projects,setProjects]=useState<any[]>([])
const [studentFirstName,setStudentFirstName]=useState("")
const projectRestoreAttemptedRef = useRef(false)


useEffect(() => {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔐 AUTH EVENT:", event)

    if (!session) {
      console.log("❌ No session → redirect login")
      uploadLifecycleTrace("router.push called", {
        method: "router.push",
        nextValue: "/login",
        reason: "auth session missing"
      })
      setStudentFirstName("")
      router.push("/login")
      return
    }

    setStudentFirstName(resolveStudentFirstName(session.user))

    console.log("✅ Session ready → loading projects")

    const token = session.access_token

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!res.ok) {
      console.log("❌ FETCH FAILED")
      setProjects([])
      return
    }

    const data = await res.json()
    const list = Array.isArray(data) ? data : data.projects || []

    console.log("📦 PROJECTS:", list)

    console.log(
      "⭐ Persisted study priorities loaded",
      list.map((project: any) => ({
        projectId: project.id,
        priorityCategories: normalizePriorityCategories(project)
      }))
    )

    uploadLifecycleTrace("setProjects called", {
      previousValue: projects.map((project: any) => project.id),
      nextValue: list.map((project: any) => project.id),
      reason: "auth session project load"
    })
    setProjects(list)
  })

  return () => subscription.unsubscribe()
}, [])

const [files,setFiles]=useState<FileList|null>(null)
const [documents,setDocuments]=useState<any[]>([])
const [topics,setTopics]=useState<any[]>([])
const [loadingTopics,setLoadingTopics]=useState(false)

const [quiz,setQuiz]=useState<any[]>([])
const [previousQuizzes,setPreviousQuizzes]=useState<any[]>([])
const [quizId,setQuizId]=useState("")

const [generatingQuiz,setGeneratingQuiz]=useState(false)

const [flashcards,setFlashcards]=useState<any[]>([])
const [studyFlashcards,setStudyFlashcards] = useState<any[]>([])
const [previousFlashcards,setPreviousFlashcards]=useState<any[]>([])
const [generatingFlashcards,setGeneratingFlashcards]=useState(false)
const [lastFlashcardGeneration,setLastFlashcardGeneration]=useState<FlashcardGenerationSnapshot | null>(null)

const [openCard,setOpenCard]=useState<number|null>(null)

const [askQuestion,setAskQuestion]=useState("")
const [askAnswer,setAskAnswer]=useState("")
const [chatMessages,setChatMessages]=useState<any[]>([])
const [asking,setAsking]=useState(false)
const [useGlobalKnowledge, setUseGlobalKnowledge] = useState(false)

const [answers,setAnswers]=useState<any>({})
const [score,setScore] = useState<number | null>(null)

const [status,setStatus]=useState("")
const [uploadStatus,setUploadStatus]=useState("")
const [uploading,setUploading]=useState(false)
const [uploadWorkflowActive,setUploadWorkflowActive]=useState(false)
const uploadWorkflowActiveRef = useRef(false)
const [uploadFlightSessionId,setUploadFlightSessionId]=useState<string | null>(null)
const [creatingProject,setCreatingProject]=useState(false)
const creatingProjectRef = useRef(false)

const [numQuestions,setNumQuestions]=useState(10)
const [difficulty,setDifficulty]=useState("medium")
const [language,setLanguage]=useState("English")
  useEffect(() => {
    console.log("🌍 CURRENT LANGUAGE STATE:", language)
  }, [language])
const [timerMinutes,setTimerMinutes]=useState(0)

const [timeLeft,setTimeLeft]=useState(0)
const [quizTargetDurationSeconds,setQuizTargetDurationSeconds]=useState(0)
const [started,setStarted]=useState(false)
const [finished,setFinished]=useState(false)

const [expanded,setExpanded]=useState<{[key:number]:boolean}>({})
const [activeView,setActiveView]=useState("project")

	const [topicsOpen,setTopicsOpen]=useState(true)
	const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
	const [selectedTopics, setSelectedTopics] = useState<any[]>([])
	const [priorityCategories, setPriorityCategories] = useState<string[]>([])

const [availableFlashcards,setAvailableFlashcards]=useState(0)
const [studyCount,setStudyCount]=useState(10)

const [summaryStats,setSummaryStats]=useState<any>(null)


const [uploadLog, setUploadLog] = useState("")
const [loadingFlashcards, setLoadingFlashcards] = useState(false)
const [studyMode, setStudyMode] = useState<"generated" | "loaded" | null>(null)
const [isGenerating, setIsGenerating] = useState(false);
const [loaderStep, setLoaderStep] = useState(0);
const [loaderType, setLoaderType] = useState<"quiz" | "flashcards">("quiz");
const [resultsData, setResultsData] = useState(null);
const [toolMode, setToolMode] = useState("")
const [toolPanelCollapsed, setToolPanelCollapsed] = useState(true)
const [isMobileLayout, setIsMobileLayout] = useState(false)
const [studyConfig, setStudyConfig] = useState({
  flashcards: 8,
  recall: 3,
  quiz: 5
})
const [questionStyle, setQuestionStyle] =
  useState("balanced")
const [plannerRuntime, setPlannerRuntime] =
  useState<PlannerRuntimeState>({
    plannerWeekId: null,
    mode: "dashboard",
    dailyPlan: null,
    activityIndex: 0,
    todaySessionCompleted: false,
    sessionResults: emptyPlannerSessionResults(),
    completedSessionResults: {},
    activityDebriefs: {},
    moduleDebriefs: {},
  moduleHomework: {},
  studyPlanDebrief: "",
  assessmentCompletedAt: null
})

useEffect(() => {
  const updateLayoutMode = () => {
    setIsMobileLayout(window.innerWidth <= 900)
  }

  updateLayoutMode()
  window.addEventListener("resize", updateLayoutMode)
  return () => window.removeEventListener("resize", updateLayoutMode)
}, [])

const quizActivityStarted =
  activeView === "quiz"
  && (started || finished || generatingQuiz || (Array.isArray(quiz) && quiz.length > 0))

const flashcardsActivityStarted =
  activeView === "flashcards"
  && Array.isArray(flashcards)
  && flashcards.length > 0
  && openCard !== null

const toolPanelUseful =
  configurationDrivenViews.has(activeView)
  || (activeView === "quiz" && !quizActivityStarted)
  || (activeView === "flashcards" && !flashcardsActivityStarted)

const workspacePrimary =
  directWorkspaceViews.has(activeView)
  || activeView === "ask"
  || activeView === "active_recall"
  || flashcardsActivityStarted
  || activeView === "study_session"
  || quizActivityStarted

const toolPanelAvailableForView =
  toolPanelUseful
  && !directWorkspaceViews.has(activeView)

const uploadWorkspaceActive =
  uploadWorkflowActive
  || uploading
  || status === "Processing topics..."
  || status === "Project upload completed"
  || (
    projectStudyMode === "building"
    && !projectReadyDismissed
    && (
      projectReadyVisible
      || Boolean(projectId && ((documents?.length || 0) > 0 || (topics?.length || 0) > 0))
    )
  )

const mobileNavigationSelected = isMobileLayout
const mobileHome = false
const mobileConfiguration =
  mobileNavigationSelected
  && toolPanelAvailableForView
  && !workspacePrimary
  && !uploadWorkspaceActive
const mobileExecution = mobileNavigationSelected && !mobileConfiguration
const mobileSidebarWidth = mobileNavigationSelected ? 56 : 260
const plannerGuidedSessionActive =
  plannerRuntime.mode === "external_activity"
  || plannerRuntime.mode === "activity_review"
const quizPacingOverTarget =
  started
  && !finished
  && quizTargetDurationSeconds > 0
  && timeLeft > quizTargetDurationSeconds
const plannerActivityProgress = plannerGuidedSessionActive
  ? currentPlannerActivityProgress()
  : []

function uploadStateSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    component: "pages/index.tsx",
    currentProject: {
      projectId,
      projectName,
      projectStudyMode,
      projectReadyVisible,
      projectReadyDismissed
    },
    workspaceMode: {
      activeView,
      mobileHome,
      mobileConfiguration,
      mobileExecution,
      workspacePrimary,
      toolPanelAvailableForView,
      toolPanelCollapsed
    },
    upload: {
      uploading,
      uploadWorkflowActive,
      uploadWorkflowActiveRef: uploadWorkflowActiveRef.current,
      status,
      uploadStatus,
      uploadLogPresent: Boolean(uploadLog),
      filesSelected: files?.length || 0
    },
    processing: {
      loadingTopics,
      documents: documents?.length || 0,
      topics: topics?.length || 0
    },
    planner: {
      mode: plannerRuntime.mode,
      plannerWeekId: plannerRuntime.plannerWeekId,
      hasDailyPlan: Boolean(plannerRuntime.dailyPlan)
    },
    loading: {
      generatingQuiz,
      generatingFlashcards,
      loadingFlashcards,
      isGenerating
    }
  }
}

function uploadLifecycleTrace(reason: string, details?: Record<string, unknown>) {
  uploadFlightLog(uploadSessionRef.current, `UPLOAD STATE TRACE — ${reason}`, {
    ...uploadStateSnapshot(),
    details,
    stack: uploadTraceStack()
  })
}

function traceSetterCall(
  setterName: string,
  previousValue: unknown,
  nextValue: unknown,
  reason: string
) {
  uploadLifecycleTrace(`${setterName} called`, {
    setterName,
    previousValue,
    nextValue,
    reason
  })
}

function useUploadStateTransitionTrace<T>(
  name: string,
  value: T
) {
  const previousValueRef = useRef<T>(value)

  useEffect(() => {
    if (Object.is(previousValueRef.current, value)) {
      return
    }

    uploadFlightLog(uploadSessionRef.current, `UPLOAD STATE TRANSITION — ${name}`, {
      timestamp: new Date().toISOString(),
      component: "pages/index.tsx",
      previousValue: previousValueRef.current,
      newValue: value,
      snapshot: uploadStateSnapshot(),
      stack: uploadTraceStack()
    })

    previousValueRef.current = value
  }, [name, value])
}

const workspaceModeTraceValue = JSON.stringify({
  activeView,
  mobileHome,
  mobileConfiguration,
  mobileExecution,
  workspacePrimary,
  toolPanelAvailableForView,
  toolPanelCollapsed
})
const plannerTraceValue = JSON.stringify({
  mode: plannerRuntime.mode,
  plannerWeekId: plannerRuntime.plannerWeekId,
  hasDailyPlan: Boolean(plannerRuntime.dailyPlan)
})
const processingTraceValue = JSON.stringify({
  loadingTopics,
  documentCount: documents?.length || 0,
  topicCount: topics?.length || 0
})

useUploadStateTransitionTrace("currentProject.projectId", projectId)
useUploadStateTransitionTrace("currentProject.projectName", projectName)
useUploadStateTransitionTrace("currentProject.studyMode", projectStudyMode)
useUploadStateTransitionTrace("currentProject.readyVisible", projectReadyVisible)
useUploadStateTransitionTrace("currentProject.readyDismissed", projectReadyDismissed)
useUploadStateTransitionTrace("currentView", activeView)
useUploadStateTransitionTrace("workspaceMode", workspaceModeTraceValue)
useUploadStateTransitionTrace("upload.uploading", uploading)
useUploadStateTransitionTrace("upload.workflowActive", uploadWorkflowActive)
useUploadStateTransitionTrace("upload.status", status)
useUploadStateTransitionTrace("upload.uploadStatus", uploadStatus)
useUploadStateTransitionTrace("upload.filesSelected", files?.length || 0)
useUploadStateTransitionTrace("processing", processingTraceValue)
useUploadStateTransitionTrace("planner.state", plannerTraceValue)

useEffect(() => {
  if (mobileConfiguration) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      false,
      "mobileConfiguration true"
    )
    setToolPanelCollapsed(false)
    return
  }

  if (mobileNavigationSelected) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      true,
      "mobileNavigationSelected true"
    )
    setToolPanelCollapsed(true)
    return
  }

  if (isMobileLayout && !toolPanelAvailableForView) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      true,
      "mobile layout without tool panel"
    )
    setToolPanelCollapsed(true)
    return
  }

  if (workspacePrimary) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      true,
      "workspacePrimary true"
    )
    setToolPanelCollapsed(true)
    return
  }

  if (toolPanelAvailableForView) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      false,
      "toolPanelAvailableForView true"
    )
    setToolPanelCollapsed(false)
  }
}, [
  isMobileLayout,
  mobileConfiguration,
  mobileNavigationSelected,
  workspacePrimary,
  toolPanelAvailableForView,
  toolPanelCollapsed
])
const plannerReviewedFlashcardsRef = useRef<Set<string>>(new Set())
const plannerCompletedActivityIdsRef = useRef<Set<string>>(new Set())
const quizLearningSessionIdRef = useRef<string | null>(null)
const flashcardsLearningSessionIdRef = useRef<string | null>(null)
const askLearningSessionIdRef = useRef<string | null>(null)
const plannerLearningSessionIdRef = useRef<string | null>(null)

function abandonLearningSessionRef(
  sessionRef: MutableRefObject<string | null>
) {
  const sessionId = sessionRef.current
  if (!sessionId) return

  sessionRef.current = null
  void completeLearningSession(sessionId, "abandoned")
}

function abandonOpenLearningSessions(
  except: Array<"quiz" | "flashcards" | "ask" | "planner"> = []
) {
  if (!except.includes("quiz")) {
    abandonLearningSessionRef(quizLearningSessionIdRef)
  }
  if (!except.includes("flashcards")) {
    abandonLearningSessionRef(flashcardsLearningSessionIdRef)
  }
  if (!except.includes("ask")) {
    abandonLearningSessionRef(askLearningSessionIdRef)
  }
  if (!except.includes("planner")) {
    abandonLearningSessionRef(plannerLearningSessionIdRef)
  }
}

useEffect(() => {
  return () => {
    abandonOpenLearningSessions()
  }
}, [])

function handleSidebarNavigation(nextView: string) {
  uploadLifecycleTrace("handleSidebarNavigation called", {
    previousValue: activeView,
    nextValue: nextView,
    reason: "sidebar navigation"
  })
  const opensConfigurationPanel =
    configurationDrivenViews.has(nextView)
    || nextView === "quiz"
    || nextView === "flashcards"

  abandonOpenLearningSessions()

  setStarted(false)
  setFinished(false)
  setAnswers({})
  setScore(null)
  setExpanded({})
  setGeneratingQuiz(false)
  setGeneratingFlashcards(false)
  setLoadingFlashcards(false)
  setIsGenerating(false)
  setLoaderStep(0)
  setProjectReadyVisible(false)
  setProjectReadyDismissed(true)

  if (plannerRuntime.mode !== "dashboard" && nextView !== "planner_view") {
    setPlannerRuntime(prev => ({
      ...prev,
      mode: "dashboard",
      dailyPlan: null,
      activityIndex: 0,
      todaySessionCompleted: false,
      sessionResults: emptyPlannerSessionResults()
    }))
    plannerReviewedFlashcardsRef.current = new Set()
    plannerCompletedActivityIdsRef.current = new Set()
  }

  if (nextView === "create_project") {
    uploadLifecycleTrace("create_project navigation resetState", {
      reason: "Create Project selected from sidebar",
      clears: ["createProjectName", "files", "uploadStatus", "uploadLog", "status"]
    })
    setCreateProjectName("")
    setFiles(null)
    setUploadStatus("")
    setUploadLog("")
    setStatus("")
  }

  if (nextView === "quiz") {
    setQuiz([])
    setQuizId("")
    setTimeLeft(0)
  }

  if (nextView === "generate_flashcards" || nextView === "flashcards") {
    setFlashcards([])
    setOpenCard(null)
    setStudyMode(null)
    setLastFlashcardGeneration(null)
  }

  if (nextView === "ask_setup") {
    setAskQuestion("")
    setAskAnswer("")
    setChatMessages([])
    setAsking(false)
  }

  if (nextView === "active_recall_setup" || nextView === "study_session_setup") {
    setChatMessages([])
  }

  setToolPanelCollapsed(!opensConfigurationPanel)
  traceSetterCall(
    "setActiveView",
    activeView,
    nextView,
    "handleSidebarNavigation final transition"
  )
  setActiveView(nextView)
}

function openProjectUploadWorkspace() {
  uploadLifecycleTrace("openProjectUploadWorkspace called", {
    previousValue: activeView,
    nextValue: "load_project",
    reason: "Project Ready continue-building/upload another file"
  })
  setStatus("")
  setUploadStatus("")
  setUploadLog("")
  traceSetterCall(
    "setActiveView",
    activeView,
    "load_project",
    "openProjectUploadWorkspace"
  )
  setActiveView("load_project")
  setToolPanelCollapsed(false)
}

function openLearningFeature(view: string) {
  handleSidebarNavigation(view)
}

function startFocusedStudySession(focusTopics: string[]) {
  const normalizedFocusTopics = Array.from(
    new Set(
      (focusTopics || [])
        .map(topic => String(topic || "").trim())
        .filter(Boolean)
    )
  )

  if (normalizedFocusTopics.length === 0) return

  setSelectedTopic(null)
  setSelectedTopics(normalizedFocusTopics)
  setToolPanelCollapsed(true)
  traceSetterCall(
    "setActiveView",
    activeView,
    "study_session",
    "Summary focus session"
  )
  setActiveView("study_session")
}

function updateProjectPriorityCategories(projectId: string, nextPriorityCategories: string[]) {
  const normalizedPriorityCategories = normalizePriorityCategories(nextPriorityCategories)
  console.log("⭐ Updating local project study priorities", {
    projectId,
    priorityCategories: normalizedPriorityCategories
  })
  setProjects(currentProjects =>
    currentProjects.map(project =>
      project.id === projectId
        ? {
            ...project,
            study_priority_categories: normalizedPriorityCategories,
            priorityCategories: normalizedPriorityCategories
          }
        : project
    )
  )
}

async function beginStudy() {
  if (!projectId) return

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/begin_study`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!res.ok) return

  const data = await res.json()
  const nextStudyMode = data.study_mode || "learning"

  traceSetterCall(
    "setProjectStudyMode",
    projectStudyMode,
    nextStudyMode,
    "beginStudy response"
  )
  setProjectStudyMode(nextStudyMode)
  setProjects(currentProjects =>
    currentProjects.map(project =>
      project.id === projectId
        ? { ...project, study_mode: nextStudyMode }
        : project
    )
  )
  setProjectReadyVisible(false)
  setProjectReadyDismissed(true)
  setStatus("")
  setUploadStatus("")
  setUploadLog("")
  setToolPanelCollapsed(true)
  traceSetterCall(
    "setActiveView",
    activeView,
    "learning_home",
    "beginStudy completed"
  )
  setActiveView("learning_home")
}

const loaderMessages = {
  quiz: [
    "Analyzing learning materials...",
    "Identifying key concepts...",
    "Building high-quality questions...",
    "Creating answer options...",
    "Finalizing your quiz..."
  ],
  flashcards: [
    "Scanning study material...",
    "Extracting key concepts...",
    "Creating flashcards...",
    "Organizing your deck...",
    "Almost ready..."
  ]
}

useEffect(() => {

  console.log("🧠 GLOBAL selectedTopics:", selectedTopics)

}, [selectedTopics])

useEffect(() => {
    if (projectId) {
        loadQuizStats(projectId);
        loadResults(projectId);
    }
}, [projectId]);

useEffect(() => {
  console.log("INDEX uploadLog:", uploadLog)
}, [uploadLog])

useEffect(() => {
  uploadFlightLog(uploadSessionRef.current, "Status changed", {
    status
  })
}, [status])

useEffect(() => {
  uploadFlightLog(uploadSessionRef.current, "Uploading state changed", {
    uploading
  })
}, [uploading])

useEffect(() => {
  if(activeView !== "project"){
    uploadFlightLog(uploadSessionRef.current, "Active view changed; clearing transient status", {
      activeView,
      previousStatus: status
    })
    setStatus("")
  }
}, [activeView])

useEffect(()=>{
async function init(){
const { data } = await supabase.auth.getSession()
if(!data.session) return
await loadProjects()
}
init()
},[])

useEffect(() => {

  // 🔥 NON sovrascrivere le flashcards appena generate
  if (
    activeView === "flashcards" &&
    projectId &&
    studyMode !== "generated"
  ) {

    setStudyMode("loaded")

    loadFlashcards(projectId)

  }

}, [activeView, projectId, studyMode])

useEffect(() => {
  async function init() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    await loadProjects()
  }

  init()
}, [])

useEffect(() => {
  if (projectRestoreAttemptedRef.current) return
  if (projectId) return
  if (!Array.isArray(projects) || projects.length === 0) return

  projectRestoreAttemptedRef.current = true

  let lastActiveProjectId = ""
  try {
    lastActiveProjectId = window.localStorage.getItem(LAST_ACTIVE_PROJECT_STORAGE_KEY) || ""
  } catch {
    lastActiveProjectId = ""
  }

  if (!lastActiveProjectId) return

  const projectExists = projects.some((project: any) => project.id === lastActiveProjectId)
  if (!projectExists) return

  void selectProject(lastActiveProjectId, projects)
}, [projects, projectId])

// Se l'utente seleziona un topic tramite checkbox, 
// impostiamo automaticamente l'ultimo selezionato come 'selectedTopic'
useEffect(() => {
  if (selectedTopics.length > 0) {
    // Prende l'ultimo topic spuntato e lo imposta come attivo per tutti
    setSelectedTopic(selectedTopics[selectedTopics.length - 1]);
  } else {
    setSelectedTopic(null);
  }
}, [selectedTopics]);

// Timer per il cambio messaggi del loader
useEffect(() => {
  let interval: NodeJS.Timeout;
  if (isGenerating) {
    setLoaderStep(0); 
    interval = setInterval(() => {
      setLoaderStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 5000);
  }
  return () => { if (interval) clearInterval(interval); };
}, [isGenerating]);

// Quiz pacing timer: elapsed time only, never blocks or submits automatically.
useEffect(() => {
  if (!started || finished) return;

  const interval = setInterval(() => {
    setTimeLeft((prev) => prev + 1);
  }, 1000);

  return () => clearInterval(interval);
}, [started, finished]);



function formatTime(){
const m=Math.floor(timeLeft/60)
const s=timeLeft%60
return `${m}:${s.toString().padStart(2,"0")}`
}

function formatSeconds(totalSeconds: number) {
const safeSeconds = Math.max(0, Math.floor(totalSeconds))
const m=Math.floor(safeSeconds/60)
const s=safeSeconds%60
return `${m}:${s.toString().padStart(2,"0")}`
}

function currentPlannerActivityProgress() {
const activityType = plannerRuntime.dailyPlan
  ?.activities?.[plannerRuntime.activityIndex]?.type
  ?.toLowerCase()

if (activityType === "quiz") {
  return [
    {
      label: "elapsed",
      icon: "⏱",
      value: formatSeconds(timeLeft),
      warning: quizTargetDurationSeconds > 0 && timeLeft > quizTargetDurationSeconds
    },
    {
      label: "answered",
      icon: "✔",
      value: `${Object.keys(answers).length} / ${Array.isArray(quiz) ? quiz.length : 0}`
    }
  ]
}

if (activityType === "flashcards") {
  const totalCards =
    plannerRuntime.dailyPlan?.activities?.[plannerRuntime.activityIndex]
      ?.configuration?.count
    || plannerRuntime.dailyPlan?.activities?.[plannerRuntime.activityIndex]
      ?.configuration?.numCards
    || 0

  return [
    {
      label: "cards",
      icon: "▣",
      value: `${plannerRuntime.sessionResults.flashcardsReviewed || 0} / ${totalCards}`
    }
  ]
}

return []
}

async function loadProjects(){

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token
if(!token) return

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects`,
{headers:{Authorization:`Bearer ${token}`}}
)

if(!res.ok) return

const data=await res.json()
const list = Array.isArray(data)?data:data.projects||[]

console.log(
  "⭐ Persisted study priorities loaded",
  list.map((project: any) => ({
    projectId: project.id,
    priorityCategories: normalizePriorityCategories(project)
  }))
)

uploadLifecycleTrace("setProjects called", {
  previousValue: projects.map((project: any) => project.id),
  nextValue: list.map((project: any) => project.id),
  reason: "loadProjects()"
})
setProjects(list)
return list

}

async function loadResults(projectId: string) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/results`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  if (!res.ok) return

  const dataRes = await res.json()
  console.log("🔥 FULL RESULTS RESPONSE:", dataRes)
  console.log("🔥 topic_mastery:", dataRes.topic_mastery)
  console.log("🔥 quiz_history:", dataRes.quiz_history)

  console.log("📊 RESULTS FROM API:", dataRes)

  setResultsData(dataRes)
  console.log("✅ RESULTS DATA SAVED:", dataRes)
}

async function createProject(){

if(creatingProjectRef.current) return

const nameToCreate = createProjectName.trim()

if(!nameToCreate) return

creatingProjectRef.current = true
setCreatingProject(true)

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) {
setStatus("Please log in again before creating a project")
creatingProjectRef.current = false
setCreatingProject(false)
return
}

try {
setStatus("Creating project...")
const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body: JSON.stringify({
name: nameToCreate
})
}
)

if(!res.ok) {
const errorText = await res.text()
throw new Error(errorText || "Project creation failed")
}

const data = await res.json()

uploadLifecycleTrace("createProject response received", {
  projectId: data.project_id,
  projectName: data.name,
  studyMode: data.study_mode || "building"
})
uploadLifecycleTrace("setProjects called", {
  previousValue: projects.map((project: any) => project.id),
  nextValue: [...projects.map((project: any) => project.id), data.project_id],
  reason: "createProject success"
})
setProjects([...projects,{
id:data.project_id,
name:data.name,
study_mode:data.study_mode || "building",
study_priority_categories: normalizePriorityCategories(data),
priorityCategories: normalizePriorityCategories(data)
}])

traceSetterCall(
  "setProjectId",
  projectId,
  data.project_id,
  "createProject success"
)
setProjectId(data.project_id)
try {
  window.localStorage.setItem(LAST_ACTIVE_PROJECT_STORAGE_KEY, data.project_id)
} catch {
  // localStorage may be unavailable in restricted browser modes.
}
traceSetterCall(
  "setProjectName",
  projectName,
  data.name,
  "createProject success"
)
setProjectName(data.name)
traceSetterCall(
  "setProjectStudyMode",
  projectStudyMode,
  data.study_mode || "building",
  "createProject success"
)
setProjectStudyMode(data.study_mode || "building")
setProjectReadyVisible(false)
setProjectReadyDismissed(false)
setCreateProjectName(data.name)
setStatus("Project created")
setUploadStatus("")
setUploadLog("")
setFiles(null)
setDocuments([])
setTopics([])
//setProjectName("")

} catch (err) {
console.error("CREATE PROJECT ERROR:", err)
setStatus("Project creation failed")
} finally {
creatingProjectRef.current = false
setCreatingProject(false)
}

}

async function deleteProject(id:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`,
{
method:"DELETE",
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok){
setStatus("Error deleting project")
return
}

setProjects(projects.filter(p => p.id !== id))

if(projectId === id){
uploadLifecycleTrace("deleteProject clearing active project", {
  projectId,
  reason: "deleted project was active"
})
traceSetterCall("setProjectId", projectId, "", "deleteProject active project removed")
setProjectId("")
traceSetterCall("setProjectName", projectName, "", "deleteProject active project removed")
setProjectName("")
traceSetterCall("setProjectStudyMode", projectStudyMode, "building", "deleteProject active project removed")
setProjectStudyMode("building")
setDocuments([])
setTopics([])
setQuiz([])
setPreviousQuizzes([])
setPreviousFlashcards([])
setFlashcards([])
setSummaryStats(null)
setResultsData(null)
}

setStatus("Project deleted")
}

async function loadDocuments(projectId:string){

const { data:sessionData }=await supabase.auth.getSession()
const token=sessionData.session?.access_token
if(!token) return

const res=await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents`,
{headers:{Authorization:`Bearer ${token}`}}
)

if(!res.ok) return

const data=await res.json()

setDocuments(data.documents||[])

}
async function uploadFiles(){
  uploadLifecycleTrace("uploadFiles invoked", {
    projectId,
    activeView,
    fileCount: files?.length || 0,
    uploadWorkflowActive: uploadWorkflowActiveRef.current
  })
  console.log("UPLOAD CLICK");
  console.log("projectId:", projectId);
  console.log("files:", files);

  if(uploadWorkflowActiveRef.current) {
    uploadFlightLog(uploadSessionRef.current, "Upload ignored because workflow already active", {
      projectId,
      uploading,
      uploadWorkflowActive: uploadWorkflowActiveRef.current
    })
    return
  }

  const uploadSessionId = createUploadSessionId()
  uploadSessionRef.current = uploadSessionId
  setUploadFlightSessionId(uploadSessionId)
  uploadFlightLog(uploadSessionId, `UPLOAD SESSION #${uploadSessionId}`)
  uploadFlightLog(uploadSessionId, "Upload button clicked")
  uploadFlightLog(uploadSessionId, "Project ID", projectId)
  uploadFlightLog(uploadSessionId, "Files selected", {
    hasFiles: Boolean(files),
    fileCount: files?.length || 0,
    filenames: files ? Array.from(files).map((file: any) => file.name) : []
  })

  if(!projectId) {
    uploadFlightLog(uploadSessionId, "Upload stopped before request because project ID is missing")
    uploadSessionRef.current = null
    setUploadFlightSessionId(null)
    return
  }
  if(!files || files.length === 0) {
    uploadFlightLog(uploadSessionId, "Upload stopped before request because no files were selected")
    uploadSessionRef.current = null
    setUploadFlightSessionId(null)
    return
  }

  uploadWorkflowActiveRef.current = true
  uploadFlightLog(uploadSessionId, "Upload workflow lock acquired")
  traceSetterCall(
    "setUploadWorkflowActive",
    uploadWorkflowActive,
    true,
    "uploadFiles start"
  )
  setUploadWorkflowActive(true)
  uploadFlightLog(uploadSessionId, "setUploadWorkflowActive(true)")
  traceSetterCall("setUploading", uploading, true, "uploadFiles start")
  setUploading(true)
  uploadFlightLog(uploadSessionId, "setUploading(true)")
  traceSetterCall("setUploadStatus", uploadStatus, "Uploading...", "uploadFiles start")
  setUploadStatus("Uploading...")
  uploadFlightLog(uploadSessionId, "setUploadStatus(Uploading...)")
  if (isMobileLayout) {
    traceSetterCall(
      "setToolPanelCollapsed",
      toolPanelCollapsed,
      true,
      "uploadFiles start mobile"
    )
    setToolPanelCollapsed(true)
    uploadFlightLog(uploadSessionId, "setToolPanelCollapsed(true) for mobile upload workspace")
  }

  try{

  const docs = []

  for(const file of Array.from(files)){
  uploadFlightLog(uploadSessionId, "File read started", {
    filename: file.name,
    size: file.size
  })

  const base64 = await new Promise((resolve,reject)=>{

  const reader = new FileReader()

  reader.onload = () => {
  const result = reader.result.split(",")[1]
  resolve(result)
  }

  reader.onerror = reject

  reader.readAsDataURL(file)

  })

  uploadFlightLog(uploadSessionId, "File read completed", {
    filename: file.name
  })

  docs.push({
  title:file.name,
  file_bytes:base64
  })

}

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
uploadFlightLog(uploadSessionId, "Auth token available", Boolean(token))
if(!token) {
  uploadFlightLog(uploadSessionId, "Stopped because missing token")
  setUploadStatus("Please log in again before uploading documents")
  uploadFlightLog(uploadSessionId, "setUploadStatus(Please log in again before uploading documents)")
  setUploading(false)
  uploadFlightLog(uploadSessionId, "setUploading(false)")
  uploadWorkflowActiveRef.current = false
  setUploadWorkflowActive(false)
  uploadFlightLog(uploadSessionId, "setUploadWorkflowActive(false)")
  uploadSessionRef.current = null
  return
}

uploadFlightLog(uploadSessionId, "Upload request started", {
  url: `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/ingest_stream`,
  projectId,
  documentCount: docs.length
})
const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/ingest_stream`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
        documents: docs
    })
  }
)
uploadFlightLog(uploadSessionId, "Upload request finished", {
  httpStatus: res.status,
  ok: res.ok
})

    const reader = res.body.getReader()
    uploadFlightLog(uploadSessionId, "Stream opened")

    const decoder = new TextDecoder();
    let fullText = "";
    let streamChunkCount = 0

    // 1. Leggiamo lo streaming fino alla fine
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        console.log("STREAM FINITO");
        uploadFlightLog(uploadSessionId, "Stream completed", {
          chunks: streamChunkCount,
          receivedCharacters: fullText.length
        })
        uploadFlightLog(uploadSessionId, "Stream closed")
        traceSetterCall(
          "setStatus",
          status,
          "Processing topics...",
          "upload stream completed"
        )
        setStatus("Processing topics..."); 
        uploadFlightLog(uploadSessionId, "setStatus(Processing topics...)")
        traceSetterCall("setUploading", uploading, false, "upload stream completed")
        setUploading(false);
        uploadFlightLog(uploadSessionId, "setUploading(false)")
        break; 
      }

      const chunk = decoder.decode(value, { stream: true });
      streamChunkCount += 1
      uploadFlightLog(uploadSessionId, "Stream chunk received", {
        chunkNumber: streamChunkCount,
        chunkCharacters: chunk.length
      })
      fullText += chunk;
      setUploadLog(fullText); 
    }

    // 2. Controllo finale: se la risposta NON era OK, fermati qui
    if (!res.ok) {
      uploadFlightLog(uploadSessionId, "Upload response not OK; entering error block", {
        httpStatus: res.status
      })
      setUploadStatus("Upload failed");
      uploadFlightLog(uploadSessionId, "setUploadStatus(Upload failed)")
      setUploading(false);
      uploadFlightLog(uploadSessionId, "setUploading(false)")
      uploadWorkflowActiveRef.current = false;
      setUploadWorkflowActive(false);
      uploadFlightLog(uploadSessionId, "setUploadWorkflowActive(false)")
      uploadSessionRef.current = null
      return;
    }

    // 3. Successo! Aggiorniamo la UI e facciamo partire i processi post-upload
    setUploading(false);
    uploadFlightLog(uploadSessionId, "setUploading(false)")
    traceSetterCall(
      "setUploadStatus",
      uploadStatus,
      "Files uploaded successfully! Processing topics...",
      "upload response ok"
    )
    setUploadStatus("Files uploaded successfully! Processing topics...");
    uploadFlightLog(uploadSessionId, "setUploadStatus(Files uploaded successfully! Processing topics...)")

    // Topic processing is the completion signal for upload ingestion.
    await pollTopicStatus(projectId, uploadSessionId);
    uploadFlightLog(uploadSessionId, "Post-poll loadDocuments() started")
    await loadDocuments(projectId);
    uploadFlightLog(uploadSessionId, "Post-poll loadDocuments() completed")
    uploadWorkflowActiveRef.current = false;
    setUploadWorkflowActive(false);
    uploadFlightLog(uploadSessionId, "setUploadWorkflowActive(false)")
    uploadFlightLog(uploadSessionId, "Upload workflow completed")
    uploadSessionRef.current = null

    // Pulizia estetica del log dopo un po'
    setTimeout(() => {
      setUploadLog("");
    }, 2000);

  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    uploadFlightError(uploadSessionId, "UPLOAD ERROR", e)
    setUploadStatus("Upload error");
    uploadFlightLog(uploadSessionId, "setUploadStatus(Upload error)")
    setUploading(false);
    uploadFlightLog(uploadSessionId, "setUploading(false)")
    uploadWorkflowActiveRef.current = false;
    setUploadWorkflowActive(false);
    uploadFlightLog(uploadSessionId, "setUploadWorkflowActive(false)")
    uploadSessionRef.current = null
  }
} // Chiusura finale della funzione uploadFiles

async function loadTopics(projectId:string){

  try {
    console.log("🧪 loadTopics RUNNING")

    setLoadingTopics(true)

    const { data:sessionData } = await supabase.auth.getSession()

    const token = sessionData.session?.access_token

    if(!token){

      setLoadingTopics(false)

      return
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topics`,
      {
        headers:{
          Authorization:`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      }
    )

    console.log("🟡 TOPICS RESPONSE STATUS:", res.status)

    if(!res.ok){
      console.error("❌ TOPICS FETCH FAILED")
      return
    }

    const data = await res.json()
    console.log("🧪 TOPICS RECEIVED:", data)
    console.log("🔥 RAW TOPICS FROM API:", data.topics)

    const loadedTopics = data.topics || []

    setTopics(loadedTopics)

    console.log(
      "✅ STATO TOPICS AGGIORNATO:",
      loadedTopics?.length
    )

    return loadedTopics

  } catch(err){

    console.error("❌ LOAD TOPICS ERROR:", err)

  } finally {

    console.log("🔴 setLoadingTopics(false)")
    setLoadingTopics(false)

  }

  return []
}

async function pollTopicStatus(projectId:string, uploadSessionId?: string): Promise<void>{
  console.log("🧨 pollTopicStatus CALLED")
  const flightSessionId = uploadSessionId || uploadSessionRef.current

  if (pollingRef.current) {

    console.log("🛑 CLEARING EXISTING POLL")
    uploadFlightLog(flightSessionId, "Polling stopped because superseded by a new polling instance")

    clearTimeout(pollingRef.current)

    pollingRef.current = null
  }

  const pollRunId = pollingRunRef.current + 1
  pollingRunRef.current = pollRunId

  const { data:sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  uploadFlightLog(flightSessionId, "Polling started", {
    pollRunId,
    projectId,
    authTokenAvailable: Boolean(token)
  })

  if(!token) {
    uploadFlightLog(flightSessionId, "Polling stopped because missing token")
    return
  }

  let attempts = 0
  const maxPollingMs = 60 * 60 * 1000
  const pollingStartedAt = Date.now()

  let isPolling = false

  console.log("🚨 STARTING TOPIC POLLING")

  return new Promise((resolve) => {
  let resolved = false

  const resolvePolling = (reason?: string) => {
    if (resolved) return

    resolved = true
    uploadFlightLog(flightSessionId, "resolvePolling()", {
      reason: reason || "unspecified"
    })
    resolve()
  }

  const stopPolling = (reason?: string) => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    uploadFlightLog(flightSessionId, "Polling stopped", {
      reason: reason || "unspecified",
      attempts
    })
  }

  const checkTopicStatus = async () => {
    if (resolved) {
      uploadFlightLog(flightSessionId, "Polling iteration skipped because promise already resolved", {
        pollRunId
      })
      return
    }
    if (pollRunId !== pollingRunRef.current) {
      uploadFlightLog(flightSessionId, "Polling iteration stopped because superseded", {
        pollRunId,
        currentRunId: pollingRunRef.current
      })
      return
    }
    if (isPolling) {
      uploadFlightLog(flightSessionId, "Polling iteration skipped because previous request is still active", {
        pollRunId
      })
      return
    }
    isPolling = true

    attempts += 1
    console.log("🔢 POLLING ATTEMPT:", attempts)
    try {
    console.log("🧠 POLLING PROJECT ID:", projectId)
    const requestUrl = `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/topic_status?t=${Date.now()}`
    uploadFlightLog(flightSessionId, "Poll iteration", {
      pollRunId,
      pollNumber: attempts,
      projectId
    })
    uploadFlightLog(flightSessionId, "Poll request started", {
      pollNumber: attempts,
      requestUrl
    })
    
    const res = await fetch(
      requestUrl,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )
    uploadFlightLog(flightSessionId, "Poll HTTP response", {
      pollNumber: attempts,
      httpStatus: res.status,
      ok: res.ok
    })

    if(!res.ok){

      const retryReason = res.status === 401
        ? "HTTP 401"
        : res.status >= 500
          ? `HTTP ${res.status}`
          : `HTTP ${res.status}`

      console.error("TOPIC STATUS FAILED")
      uploadFlightLog(flightSessionId, "Poll request failed with non-OK status; polling will continue", {
        pollNumber: attempts,
        httpStatus: res.status,
        reason: retryReason
      })
      return
    }

    const data = await res.json()
    uploadFlightLog(flightSessionId, "Poll response body", data)

    console.log("🔥 FULL TOPIC RESPONSE:", data)
    console.log("🔥 STATUS TYPE:", typeof data.status)
    console.log("🔥 STATUS VALUE:", JSON.stringify(data.status))
    uploadFlightLog(flightSessionId, "Poll parsed status", {
      pollNumber: attempts,
      status: data.status,
      normalizedStatus: String(data.status).trim().toLowerCase()
    })

    if(
      String(data.status)
        .trim()
        .toLowerCase() === "completed"
    ){

      stopPolling("completed")
      pollingRunRef.current = pollRunId + 1

      console.log("🛑 POLLING STOPPED")

      console.log("🟢 TOPIC GENERATION COMPLETED")
      console.log("🧪 ENTERED COMPLETED BLOCK")
      uploadFlightLog(flightSessionId, "Entering completed block")

      try {

        console.log("🧪 STARTING loadTopics")
        uploadFlightLog(flightSessionId, "setUploading(false)")

        traceSetterCall("setUploading", uploading, false, "polling completed block")
        setUploading(false)
        uploadFlightLog(flightSessionId, "setUploadLog(empty)")
        setUploadLog("")
        uploadFlightLog(flightSessionId, "setUploadStatus(Topics ready!)")
        traceSetterCall(
          "setUploadStatus",
          uploadStatus,
          "Topics ready!",
          "polling completed block"
        )
        setUploadStatus("Topics ready!")

        uploadFlightLog(flightSessionId, "loadTopics() started")
        await loadTopics(projectId)
        uploadFlightLog(flightSessionId, "loadTopics() completed")

        console.log("🧪 loadTopics FINISHED")
        console.log("✅ TOPICS LOADED")

        traceSetterCall(
          "setActiveView",
          activeView,
          "load_project",
          "polling completed block keeps upload tool panel selected"
        )
        setActiveView("load_project")
        traceSetterCall(
          "setToolPanelCollapsed",
          toolPanelCollapsed,
          !isMobileLayout,
          "polling completed block"
        )
        setToolPanelCollapsed(!isMobileLayout)
        uploadFlightLog(flightSessionId, "setProjectReadyVisible(true)")
        setProjectReadyVisible(true)
        setProjectReadyDismissed(false)
        uploadFlightLog(flightSessionId, "setStatus(Project upload completed)")
        traceSetterCall(
          "setStatus",
          status,
          "Project upload completed",
          "polling completed block"
        )
        setStatus("Project upload completed")
        resolvePolling("completed")

      } catch(err){

        console.error("❌ FINAL LOAD TOPICS FAILED:", err)
        uploadFlightError(flightSessionId, "FINAL LOAD TOPICS FAILED", err)
        uploadFlightLog(flightSessionId, "Entering completed-block error state")
        uploadFlightLog(flightSessionId, "setUploading(false)")
        traceSetterCall("setUploading", uploading, false, "completed-block error state")
        setUploading(false)
        uploadFlightLog(flightSessionId, "setUploadLog(empty)")
        setUploadLog("")
        uploadFlightLog(flightSessionId, "setUploadStatus(Topics ready, but loading topics failed)")
        traceSetterCall(
          "setUploadStatus",
          uploadStatus,
          "Topics ready, but loading topics failed",
          "completed-block error state"
        )
        setUploadStatus("Topics ready, but loading topics failed")
        uploadFlightLog(flightSessionId, "setProjectReadyVisible(false)")
        setProjectReadyVisible(false)
        uploadFlightLog(flightSessionId, "setStatus(empty)")
        traceSetterCall("setStatus", status, "", "completed-block error state")
        setStatus("")
        resolvePolling("completed-block-error")

      }

      return
    }

    

    if(
      String(data.status)
        .trim()
        .toLowerCase() === "error"
    ){

      stopPolling("error")
      pollingRunRef.current = pollRunId + 1

      uploadFlightLog(flightSessionId, "Entering topic-status error block")
      uploadFlightLog(flightSessionId, "setProjectReadyVisible(false)")
      setProjectReadyVisible(false)
      uploadFlightLog(flightSessionId, "setActiveView(upload_error)")
      traceSetterCall(
        "setActiveView",
        activeView,
        "upload_error",
        "topic-status error block"
      )
      setActiveView("upload_error")
      resolvePolling("error")

      return
    }

    if(Date.now() - pollingStartedAt >= maxPollingMs){
      console.log("⏰ POLLING TIMEOUT REACHED")
      console.log("🔢 FINAL ATTEMPT:", attempts)
      stopPolling("timeout")

      uploadFlightLog(flightSessionId, "Entering polling timeout block", {
        elapsedMs: Date.now() - pollingStartedAt,
        maxPollingMs
      })
      setUploadStatus("Topic generation timeout")
      uploadFlightLog(flightSessionId, "setUploadStatus(Topic generation timeout)")
      traceSetterCall(
        "setStatus",
        status,
        "Topic generation timeout",
        "polling timeout block"
      )
      setStatus("Topic generation timeout")
      uploadFlightLog(flightSessionId, "setStatus(Topic generation timeout)")
      setUploading(false)
      uploadFlightLog(flightSessionId, "setUploading(false)")
      setUploadLog("")
      uploadFlightLog(flightSessionId, "setUploadLog(empty)")
      resolvePolling("timeout")
      return
    }
    uploadFlightLog(flightSessionId, "Retry scheduled", {
      pollNumber: attempts,
      retryDelayMs: 3000
    })
    } catch(err){

      console.error("❌ POLLING LOOP ERROR:", err)
      uploadFlightError(flightSessionId, "Polling request exception", err)

    } finally {
      isPolling = false
    }

    if (!resolved && pollRunId === pollingRunRef.current) {
      uploadFlightLog(flightSessionId, "Retry timer armed", {
        retryDelayMs: 3000,
        nextPollNumber: attempts + 1
      })
      pollingRef.current = setTimeout(checkTopicStatus, 3000)
    }
  }

  pollingRef.current = setTimeout(checkTopicStatus, 0)
  })
}

async function loadPreviousQuizzes(projectId: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/quizzes`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  if (!res.ok) {
    console.error("❌ Errore loadPreviousQuizzes:", res.status)
    setPreviousQuizzes([])
    return
  }

  const data = await res.json()
  console.log("QUIZZES FROM API:", data)

  const quizzes = data.quizzes || data.data || []

  if (!Array.isArray(quizzes)) {
    console.warn("⚠️ Formato quiz inatteso:", data)
    setPreviousQuizzes([])
    return
  }

  setPreviousQuizzes(quizzes)
  console.log("✅ previousQuizzes caricati:", quizzes.length)
}

async function loadFlashcards(projectId:string){

const { data:sessionData } = await supabase.auth.getSession()
const token = sessionData.session?.access_token
if(!token) return

try{

const res = await fetch(
`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/flashcards`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
)

if(!res.ok){
console.error("Failed loading flashcards")
return
}

const data = await res.json()
const loadedCards = data.flashcards || [];

// --- LE RIGHE CHE RISOLVONO TUTTO ---
setFlashcards(loadedCards); // <--- AGGIUNGI QUESTA: Popola la vista Workspace
setPreviousFlashcards(loadedCards); 
// ------------------------------------



setAvailableFlashcards((data.flashcards || []).length)
setStudyMode("loaded")
}catch(e){

console.error("FLASHCARDS LOAD ERROR:",e)

}

}

async function loadQuizStats(id: string) {
    if (!id) return;
    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        // 1. Chiamata per le statistiche dei muscoli
        const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const statsData = await resStats.json();

        // 2. Chiamata per la lista reale dei quiz
        const resHistory = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/quizzes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const historyData = await resHistory.json();
        
        // --- TRASFORMAZIONE E TRADUZIONE ---
        // Prima prendiamo i dati grezzi
        const tempHistory = Array.isArray(historyData) ? historyData : (historyData.quizzes || []);
        

        // Poi mappiamo i campi così la tabella vede 'date' e 'score'
        const realHistory = tempHistory.map((q: any) => {
            // Logghiamo un quiz per essere sicuri dei nomi (controlla la console!)
            console.log("Dati quiz singolo:", q);

            return {
                ...q,
                // Forza la data: se è una stringa strana, cerchiamo di pulirla
                date: q.date || q.created_at || q.timestamp, 
                
                // Forza lo score: cerchiamo TUTTI i nomi possibili che Python di solito usa
                score: q.score !== undefined ? q.score : 
                       q.percentage !== undefined ? q.percentage : 
                       q.result !== undefined ? q.result :
                       q.correct_answers_pct !== undefined ? q.correct_answers_pct : 0
            };
        });

        // Trasformiamo i dati dei muscoli
        console.log("🔥 STATS DATA RAW:", statsData);
        const topicsArray = Object.entries(statsData)
          .filter(([_, stats]: [string, any]) =>
            stats &&
            typeof stats === "object" &&
            "total" in stats
          )
          .map(([name, stats]: [string, any]) => ({
            topic: name,
            score:
              stats.total > 0
                ? Math.round((stats.correct / stats.total) * 100)
                : 0,
            correct: stats.correct || 0,
            total: stats.total || 0
          }));

        // 4. Prepariamo l'oggetto finale
        console.warn("⚠️ Legacy local analytics builder disabled. Use /results instead.");

        await loadResults(projectId);

    } catch (err) {
        console.error("❌ Errore:", err);
    }
}

async function loadQuizStatsByQuiz(projectId: string) {
  if (!projectId) return;

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    console.error("❌ Errore Supabase:", error.message);
    return;
  }

  if (!data) return;

  const map: any = {};

  data.forEach(row => {
    const qid = row.quiz_id;

    if (!map[qid]) {
      map[qid] = {
        attempts: 0,
        best_score: 0,
        last_score: 0
      };
    }

    map[qid].attempts += 1;

    const scorePercent = row.total_questions > 0
      ? Math.round((row.score / row.total_questions) * 100)
      : 0;

    if (scorePercent > map[qid].best_score) {
      map[qid].best_score = scorePercent;
    }

    // latest attempt (semplice: sovrascrive)
    map[qid].last_score = scorePercent;
  });

  console.log("🔥 QUIZ STATS MAP:", map);

  return map;
}

// Questo codice esegue il caricamento ogni volta che il progetto attivo cambia o la pagina viene ricaricata


async function loadStudyFlashcards() {

  console.log("📚 LOAD STUDY FLASHCARDS")

  if (!previousFlashcards || previousFlashcards.length === 0) {
    console.warn("No previous flashcards")
    return
  }

  let filtered = previousFlashcards

  // FILTER BY TOPICS
  if (selectedTopics && selectedTopics.length > 0) {

    const selectedTopicIds = extractTopicIds(selectedTopics)
    const selectedTopicNames = extractTopicNames(selectedTopics)
    const normalizedTopics = selectedTopicNames.map(topic =>
      normalizeTopic(topic)
    )

    console.log("PAYLOAD TOPIC_IDS COUNT:", selectedTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", selectedTopicNames.length)

    filtered = previousFlashcards.filter(card =>
      normalizedTopics.includes(
        normalizeTopic(card.topic)
      )
    )

  }

  const cards = filtered.slice(0, studyCount)

  console.log("✅ LOADED CARDS:", cards.length)

  // IMPORTANTISSIMO
  setStudyMode("loaded")

  // SOLO le card selezionate
  setFlashcards(cards)

  if (cards.length > 0) {
    abandonOpenLearningSessions()
    flashcardsLearningSessionIdRef.current =
      await startLearningSession(projectId, "flashcards")
  }

  // VIEW corretta
  setActiveView("flashcards")

  // APRI prima card
  setOpenCard(0)
}


async function loadQuiz(id: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    console.error("❌ Token mancante in loadQuiz")
    return
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/quizzes/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  if (!res.ok) {
    console.error("❌ Errore caricamento quiz:", res.status)
    return
  }

  const data = await res.json()
  console.log("✅ QUIZ LOADED:", data)

  setQuiz(data.questions || [])
  if (data.quiz_id) {
    setQuizId(data.quiz_id)
  }
  setAnswers({})
  setFinished(false)
  setStarted(true)
  setActiveView("quiz")
}

async function selectProject(id: string, availableProjects = projects) {
  uploadLifecycleTrace("selectProject invoked", {
    previousProjectId: projectId,
    nextProjectId: id,
    activeView,
    uploadWorkflowActive: uploadWorkflowActiveRef.current,
    uploading
  })
  // Se il progetto cliccato è DIVERSO da quello attuale, allora resettiamo il topic
  if (id !== projectId) {
    uploadLifecycleTrace("selectProject reset selected topics", {
      reason: "different project selected",
      previousProjectId: projectId,
      nextProjectId: id
    })
    setSelectedTopic(null);
    setSelectedTopics([]); // Puliamo anche la lista dei quiz per sicurezza
  }

  try {
    window.localStorage.setItem(LAST_ACTIVE_PROJECT_STORAGE_KEY, id)
  } catch {
    // localStorage may be unavailable in restricted browser modes.
  }

  const project = availableProjects.find(p => p.id === id);
  const selectedStudyMode = project?.study_mode || "building";
  const persistedPriorityCategories = normalizePriorityCategories(project)
  console.log("⭐ Project selected with persisted study priorities", {
    projectId: id,
    persistedPriorityCategories
  })
  traceSetterCall(
    "setProjectName",
    projectName,
    project?.name || "",
    "selectProject"
  )
  setProjectName(project?.name || "");
  traceSetterCall(
    "setProjectStudyMode",
    projectStudyMode,
    selectedStudyMode,
    "selectProject"
  )
  setProjectStudyMode(selectedStudyMode);
  traceSetterCall("setStatus", status, "Loading project...", "selectProject")
  setStatus("Loading project...");
  traceSetterCall("setProjectId", projectId, id, "selectProject")
  setProjectId(id);
  setProjectReadyDismissed(false)
  
  // Rimosso il setSelectedTopic(null) che era qui sotto fisso
  setDocuments([]);
    setTopics([]);
  setQuiz([])
  setAnswers({})
  setPreviousQuizzes([])
  setPreviousFlashcards([])
  setPriorityCategories(persistedPriorityCategories)

  try {
    await loadDocuments(id);
    const loadedTopics = await loadTopics(id);
    const loadedCategorySet = new Set(
      (loadedTopics || [])
        .map((topic: any) => String(topic.category || "General"))
        .filter(Boolean)
    )
    const restoredPriorityCategories = persistedPriorityCategories.filter(category =>
      loadedCategorySet.has(category)
    )

    console.log("⭐ Study priorities restored into Topic View state", {
      projectId: id,
      persistedPriorityCategories,
      restoredPriorityCategories,
      loadedCategories: Array.from(loadedCategorySet)
    })
    setPriorityCategories(restoredPriorityCategories)

    setStatus("Loading previous material...");

    await loadPreviousQuizzes(id);

    console.log("✅ Progetto selezionato:", id)
    console.log("✅ Topics caricati")
    console.log("✅ Quiz storici richiesti")
    
    // 1. COMMENTA QUESTA RIGA: 
    // await loadSummary(id); 
    
    // 2. ASSICURATI CHE CI SIA QUESTA:
    await loadQuizStats(id); 

    console.log("✅ Quiz stats richieste per project:", id)

    await loadFlashcards(id);
    if (selectedStudyMode === "learning") {
      uploadLifecycleTrace("selectProject learning-mode workspace transition", {
        projectId: id,
        nextView: "learning_home"
      })
      setProjectReadyVisible(false)
      setProjectReadyDismissed(true)
      setStatus("")
      setToolPanelCollapsed(true)
      traceSetterCall(
        "setActiveView",
        activeView,
        "learning_home",
        "selectProject learning mode"
      )
      setActiveView("learning_home")
      return
    }

    uploadLifecycleTrace("selectProject building-mode workspace transition", {
      projectId: id,
      nextView: "load_project"
    })
    setProjectReadyVisible(true)
    setProjectReadyDismissed(false)
    setStatus("")
    setToolPanelCollapsed(false)
    traceSetterCall(
      "setActiveView",
      activeView,
      "load_project",
      "selectProject building mode"
    )
    setActiveView("load_project")

  } catch(e) {
    console.error("PROJECT LOAD ERROR:", e);
    setStatus("Error loading project");
  }
}

async function generateQuiz(overrides: LearningGenerationOverrides = {}) {

    console.log("🚨 GENERATE QUIZ CLICKED");
    console.log("GENERATE QUIZ FUNCTION RUNNING")
    if (!projectId) return

    setIsGenerating(true)
    setLoaderType("quiz")
    setGeneratingQuiz(true)

    setAnswers({})
    setExpanded({})
    setFinished(false)
    setStarted(false)
    setQuiz([])
    setTimeLeft(0)
    setQuizTargetDurationSeconds(0)

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const user = sessionData.session?.user

    if (!token || !user) {
      setIsGenerating(false)
      setGeneratingQuiz(false)
      return
    }
    const effectiveSelectedTopics =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopics")
        ? overrides.selectedTopics || []
        : selectedTopics
    const effectiveSelectedTopic =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopic")
        ? overrides.selectedTopic
        : selectedTopic
    const effectiveNumQuestions =
      overrides.numQuestions ?? numQuestions
    const effectiveDifficulty =
      overrides.difficulty ?? difficulty
    const effectiveQuestionStyle =
      overrides.questionStyle ?? questionStyle
    const quizGenerationSource = overrides.source ?? "standalone"
    const effectiveSecondsPerAnswer =
      overrides.secondsPerAnswer
      ?? (
        timerMinutes > 0 && effectiveNumQuestions > 0
          ? Math.round((timerMinutes * 60) / effectiveNumQuestions)
          : 0
      )

    console.log("🧠 SELECTED TOPICS RAW:", effectiveSelectedTopics)

    if (effectiveSelectedTopics?.length > 0) {
      console.log("🧠 FIRST TOPIC:", effectiveSelectedTopics[0])
      console.log("🧠 TYPE:", typeof effectiveSelectedTopics[0])
    }
    try {

      console.log("🌍 LANGUAGE SENT:", language)
      console.log("🌍 I18N LANGUAGE:", i18n.language)

      console.log(
        "🌍 LANGUAGE SENT:",
        i18n.language.startsWith("it")
          ? "Italian"
          : "English"
      )
      const payloadTopicIds =
        effectiveSelectedTopics && effectiveSelectedTopics.length > 0
          ? extractTopicIds(effectiveSelectedTopics)
          : effectiveSelectedTopic?.id
            ? [String(effectiveSelectedTopic.id)]
            : []
      const payloadTopicNames =
        effectiveSelectedTopics && effectiveSelectedTopics.length > 0
          ? extractTopicNames(effectiveSelectedTopics)
          : effectiveSelectedTopic?.topic
            ? [effectiveSelectedTopic.topic]
            : []

      console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
      console.log("PAYLOAD TOPICS COUNT:", payloadTopicNames.length)

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            num_questions: effectiveNumQuestions,

            difficulty: effectiveDifficulty,
            
            language:
              i18n.language.startsWith("it")
                ? "Italian"
                : "English",

            question_style: effectiveQuestionStyle,

            topic_ids: payloadTopicIds,
            topics: payloadTopicNames,
          })
        }
      )

      if (!res.ok) throw new Error("Fetch failed")

      const data = await res.json()
      console.log("🔥 QUIZ RESPONSE:", data)
      console.log(
        JSON.stringify(data, null, 2)
      )

      const quizData = data.questions || data.quiz || []

      const normalizedQuizData = quizData.map((q:any) => ({
        ...q,
        topic:
          typeof q.topic === "string"
            ? q.topic
            : q.topic?.topic || "General"
      }))

      if (data.quiz_id) {
        setQuizId(data.quiz_id)
        console.log("✅ quizId salvato:", data.quiz_id)
      } else {
        console.warn("⚠️ Il backend non ha restituito quiz_id", data)
        setQuizId("")
      }

      if (quizData.length === 0) {
        console.warn("⚠️ Nessuna domanda ricevuta dal backend", data)
        setIsGenerating(false)
        setGeneratingQuiz(false)
        return
      }
      setActiveView("quiz") // Spostato qui per sicurezza
      setQuiz(normalizedQuizData)
      setTimeLeft(0)
      setQuizTargetDurationSeconds(
        normalizedQuizData.length * Math.max(0, Number(effectiveSecondsPerAnswer || 0))
      )
      if (quizGenerationSource === "standalone") {
        abandonOpenLearningSessions()
        quizLearningSessionIdRef.current =
          await startLearningSession(projectId, "quiz")
      }
      setStarted(true)
      setFinished(false)

      // ... resto del codice per il salvataggio su Supabase ...

    } catch (err) {
      console.error("QUIZ ERROR:", err)
    } finally {
      setIsGenerating(false)
      setGeneratingQuiz(false)
    }
}

  // --- ORA GENERATE FLASHCARDS È UNA FUNZIONE INDIPENDENTE ---
  async function generateFlashcards(overrides: LearningGenerationOverrides = {}) {
    console.log("GENERATE FLASHCARDS FUNCTION RUNNING");
    if (!projectId) return;

    // Inizializzazione stati di caricamento
    setIsGenerating(true);       
    setLoaderType("flashcards");
    setGeneratingFlashcards(true);
    setLoadingFlashcards(true);

    // Reset dati precedenti
    setFlashcards([]); 
    setOpenCard(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      console.error("❌ TOKEN MISSING");
      setGeneratingFlashcards(false);
      setLoadingFlashcards(false);
      setIsGenerating(false);
      return;
    }

    // LOGICA DI SELEZIONE TOPIC: 
    // Se c'è un topic selezionato nella dashboard (filtro attivo), usa solo quello.
    // Altrimenti usa la lista di topic selezionati manualmente.
    const effectiveSelectedTopics =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopics")
        ? overrides.selectedTopics || []
        : selectedTopics
    const effectiveSelectedTopic =
      Object.prototype.hasOwnProperty.call(overrides, "selectedTopic")
        ? overrides.selectedTopic
        : selectedTopic
    const effectiveNumCards =
      overrides.numCards ?? overrides.numQuestions ?? numQuestions
    const flashcardGenerationSource = overrides.source ?? "standalone"

    const finalTopics =
      effectiveSelectedTopics && effectiveSelectedTopics.length > 0
        ? extractTopicNames(effectiveSelectedTopics)
        : (
            typeof effectiveSelectedTopic === "string"
              ? [effectiveSelectedTopic.trim()]
              : effectiveSelectedTopic?.topic
                ? [effectiveSelectedTopic.topic.trim()]
                : []
          );
    const payloadTopicIds =
      effectiveSelectedTopics && effectiveSelectedTopics.length > 0
        ? extractTopicIds(effectiveSelectedTopics)
        : effectiveSelectedTopic?.id
          ? [String(effectiveSelectedTopic.id)]
          : []

    console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
    console.log("PAYLOAD TOPICS COUNT:", finalTopics.length)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/generate_flashcards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({

            topic_ids: payloadTopicIds,

            topics: finalTopics,

            num_cards: effectiveNumCards || 10

          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Flashcards generation failed");
      }

      const data = await res.json();
      
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setStudyMode("generated");   
        setLastFlashcardGeneration(
          flashcardGenerationSource === "standalone"
            ? {
                source: "standalone",
                selectedTopics: effectiveSelectedTopics || [],
                selectedTopic: effectiveSelectedTopic || null,
                numCards: effectiveNumCards || 10
              }
            : null
        );
        if (flashcardGenerationSource === "standalone") {
          abandonOpenLearningSessions()
          flashcardsLearningSessionIdRef.current =
            await startLearningSession(projectId, "flashcards")
        }
        setOpenCard(0);              // Apre subito la prima carta
        setActiveView("flashcards"); // Sposta la vista sulle flashcards

        await loadResults(projectId);

      } else {
        alert("L'IA non ha generato flashcards. Prova a selezionare altri argomenti o verifica che ci sia testo a sufficienza.");
      }
    } catch (e) {
      console.error("FLASHCARDS ERROR:", e);
      alert(`Errore: ${e.message}`);
    } finally {
      // Chiudiamo tutti i loader
      setLoadingFlashcards(false);
      setGeneratingFlashcards(false);
      setIsGenerating(false);
    }
}

  async function generateMoreStandaloneFlashcards() {
    if (!lastFlashcardGeneration) return

    await generateFlashcards({
      selectedTopics: lastFlashcardGeneration.selectedTopics,
      selectedTopic: lastFlashcardGeneration.selectedTopic,
      numCards: lastFlashcardGeneration.numCards,
      source: "standalone"
    })
  }

  function returnFromStandaloneFlashcardsToDashboard() {
    setFlashcards([])
    setOpenCard(null)
    setStudyMode(null)
    setLastFlashcardGeneration(null)
    handleSidebarNavigation("learning_home")
  }

  async function completeStandaloneFlashcardsSession() {
    await completeLearningSession(flashcardsLearningSessionIdRef.current, "completed")
    flashcardsLearningSessionIdRef.current = null
  }

  function openPlannerDailySession(dailyPlan: PlannerDailyPlan) {
    plannerReviewedFlashcardsRef.current = new Set()
    plannerCompletedActivityIdsRef.current = new Set()
    setPlannerRuntime(prev => ({
      ...prev,
      mode: "daily_briefing",
      plannerWeekId: dailyPlan.plannerWeekId || null,
      dailyPlan,
      activityIndex: 0,
      todaySessionCompleted: false,
      sessionResults: emptyPlannerSessionResults()
    }))
    setActiveView("planner_view")
  }

  async function launchPlannerActivity(
    dailyPlan: PlannerDailyPlan,
    activityIndex: number
  ) {
    const activity = dailyPlan.activities[activityIndex]

    if (!activity) {
      return
    }

    if (!plannerLearningSessionIdRef.current) {
      abandonOpenLearningSessions()
      plannerLearningSessionIdRef.current =
        await startLearningSession(projectId, "planner")
    }

    setPlannerRuntime(prev => ({
      ...prev,
      mode: "external_activity",
      plannerWeekId: dailyPlan.plannerWeekId || prev.plannerWeekId || null,
      dailyPlan,
      activityIndex,
      sessionResults: {
        ...prev.sessionResults,
        startedAtMs: prev.sessionResults.startedAtMs || Date.now()
      }
    }))

    await dispatchPlannerActivity({
      activity,
      generateFlashcards,
      generateQuiz,
      onFlashcardsStart: () => {
        plannerReviewedFlashcardsRef.current = new Set()
      }
    })
  }

  async function requestPlannerActivityDebrief(
    dailyPlan: PlannerDailyPlan,
    activityIndex: number,
    activityResult: Record<string, unknown>
  ) {
    const activity = dailyPlan.activities[activityIndex]

    if (!projectId || !activity) {
      return ""
    }

    try {
      const debrief = await generatePlannerActivityDebrief(
        projectId,
        dailyPlan.sessionIndex + 1,
        activityResult,
        plannerStudyLanguage(i18n.language)
      )

      if (debrief) {
        setPlannerRuntime(prev => ({
          ...prev,
          activityDebriefs: {
            ...prev.activityDebriefs,
            [String(activity.id)]: debrief
          }
        }))
      }

      return debrief
    } catch (error) {
      console.error("PLANNER ACTIVITY DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function requestPlannerModuleDebrief(
    dailyPlan: PlannerDailyPlan,
    moduleResults: PlannerSessionResults
  ) {
    if (!projectId) {
      return ""
    }

    try {
      const debrief = await generatePlannerModuleDebrief(
        projectId,
        dailyPlan.sessionIndex + 1,
        {
          activity_results: moduleResults.activityResults || [],
          flashcards_reviewed: moduleResults.flashcardsReviewed,
          quizzes_completed: moduleResults.quizzesCompleted,
          quiz_questions: moduleResults.quizQuestions,
          quiz_correct: moduleResults.quizCorrect,
          accuracy: moduleResults.quizQuestions > 0
            ? moduleResults.quizCorrect / moduleResults.quizQuestions
            : null
        },
        plannerStudyLanguage(i18n.language)
      )

      return debrief
    } catch (error) {
      console.error("PLANNER MODULE DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function requestPlannerHomeworkRecommendation(
    dailyPlan: PlannerDailyPlan,
    moduleResults: PlannerSessionResults,
    moduleDebrief: string
  ) {
    if (!projectId) {
      return ""
    }

    const modulePayload = {
      activity_results: moduleResults.activityResults || [],
      flashcards_reviewed: moduleResults.flashcardsReviewed,
      quizzes_completed: moduleResults.quizzesCompleted,
      quiz_questions: moduleResults.quizQuestions,
      quiz_correct: moduleResults.quizCorrect,
      accuracy: moduleResults.quizQuestions > 0
        ? moduleResults.quizCorrect / moduleResults.quizQuestions
        : null,
      professor_debrief: moduleDebrief
    }

    try {
      return await generatePlannerHomeworkRecommendation(
        projectId,
        dailyPlan.sessionIndex + 1,
        modulePayload,
        plannerStudyLanguage(i18n.language)
      )
    } catch (error) {
      console.error("PLANNER HOMEWORK RECOMMENDATION ERROR:", error)
      return ""
    }
  }

  async function requestPlannerStudyPlanDebrief(
    completedSessionResults: PlannerCompletedSessionResults
  ) {
    if (!projectId) {
      return ""
    }

    try {
      const moduleResults = Object.entries(completedSessionResults)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, result]) => ({
          activity_results: result.activityResults || [],
          flashcards_reviewed: result.flashcardsReviewed,
          quizzes_completed: result.quizzesCompleted,
          quiz_questions: result.quizQuestions,
          quiz_correct: result.quizCorrect,
          accuracy: result.quizQuestions > 0
            ? result.quizCorrect / result.quizQuestions
            : null
        }))

      return await generatePlannerStudyPlanDebrief(
        projectId,
        { module_results: moduleResults },
        plannerStudyLanguage(i18n.language)
      )
    } catch (error) {
      console.error("PLANNER STUDY PLAN DEBRIEF ERROR:", error)
      return ""
    }
  }

  async function completePlannerActivity() {
    const dailyPlan = plannerRuntime.dailyPlan

    if (!dailyPlan) {
      return
    }

    const nextActivityIndex = plannerRuntime.activityIndex + 1

    if (nextActivityIndex < dailyPlan.activities.length) {
      await launchPlannerActivity(dailyPlan, nextActivityIndex)
      return
    }

    const completedAtMs = Date.now()
    const completedResults = {
      ...plannerRuntime.sessionResults,
      completedAtMs
    }
    const completedSessionIndex = dailyPlan.sessionIndex
    const isAssessmentPlan = dailyPlan.planType === "assessment"
    const moduleDebrief = isAssessmentPlan
      ? ""
      : await requestPlannerModuleDebrief(
          dailyPlan,
          completedResults
        )
    const homeworkRecommendation = isAssessmentPlan
      ? ""
      : await requestPlannerHomeworkRecommendation(
          dailyPlan,
          completedResults,
          moduleDebrief
        )
    const completedSessionResults = {
      ...plannerRuntime.completedSessionResults,
      [completedSessionIndex]: completedResults
    }
    const allModulesCompleted =
      Boolean(dailyPlan.studyPlanModuleCount)
      && Object.keys(completedSessionResults).length >= (dailyPlan.studyPlanModuleCount || 0)
    const assessmentCompleted =
      isAssessmentPlan
      && allModulesCompleted

    const studyPlanDebrief = allModulesCompleted
      && !assessmentCompleted
      ? await requestPlannerStudyPlanDebrief(completedSessionResults)
      : ""

    if (projectId) {
      try {
        await completePlannerModule(
          projectId,
          dailyPlan.sessionIndex + 1,
          completedResults,
          moduleDebrief,
          homeworkRecommendation,
          studyPlanDebrief
        )
      } catch (error) {
        console.error("PLANNER MODULE COMPLETION PERSISTENCE ERROR:", error)
      }
    }

    if (assessmentCompleted && projectId) {
      try {
        await completePlannerAssessment(projectId)
      } catch (error) {
        console.error("PLANNER ASSESSMENT COMPLETION ERROR:", error)
      }
    }

    await completeLearningSession(plannerLearningSessionIdRef.current, "completed")
    plannerLearningSessionIdRef.current = null

    setPlannerRuntime(prev => ({
      ...prev,
      mode: "summary",
      todaySessionCompleted: true,
      sessionResults: completedResults,
      completedSessionResults,
      moduleDebriefs: moduleDebrief
        ? {
            ...prev.moduleDebriefs,
            [completedSessionIndex]: moduleDebrief
          }
        : prev.moduleDebriefs,
      moduleHomework: homeworkRecommendation
        ? {
            ...prev.moduleHomework,
            [completedSessionIndex]: homeworkRecommendation
          }
        : prev.moduleHomework,
      studyPlanDebrief: studyPlanDebrief || prev.studyPlanDebrief,
      assessmentCompletedAt: assessmentCompleted ? Date.now() : prev.assessmentCompletedAt
    }))
    setActiveView("planner_view")
  }

  async function handlePlannerFlashcardReview(
    flashcardId: string | number
  ) {
    const activity = plannerRuntime.dailyPlan
      ?.activities[plannerRuntime.activityIndex]

    if (
      plannerRuntime.mode !== "external_activity"
      || activity?.type !== "flashcards"
      || !flashcardId
    ) {
      return
    }

    plannerReviewedFlashcardsRef.current.add(String(flashcardId))

    if (
      plannerReviewedFlashcardsRef.current.size >= flashcards.length
      && flashcards.length > 0
    ) {
      const activityId = String(activity.id)
      if (!plannerCompletedActivityIdsRef.current.has(activityId)) {
        if (!plannerRuntime.dailyPlan) {
          return
        }

        plannerCompletedActivityIdsRef.current.add(activityId)
        const reviewedCount = plannerReviewedFlashcardsRef.current.size
        const activityResult = {
          activity_id: activity.id,
          activity_type: "flashcards",
          completed: true,
          cards: reviewedCount,
          num_cards: reviewedCount
        }
        if (plannerRuntime.dailyPlan.planType !== "assessment") {
          await requestPlannerActivityDebrief(
            plannerRuntime.dailyPlan,
            plannerRuntime.activityIndex,
            activityResult
          )
        }
        setPlannerRuntime(prev => ({
          ...prev,
          mode: "activity_review",
          sessionResults: {
            ...prev.sessionResults,
            flashcardsReviewed:
              prev.sessionResults.flashcardsReviewed
              + reviewedCount,
            activityResults: [
              ...(prev.sessionResults.activityResults || []),
              activityResult
            ]
          }
        }))
      }
    }
  }

  function returnToPlannerDashboard() {
    setPlannerRuntime(prev => ({
      ...prev,
      mode: "dashboard"
    }))
    setActiveView("planner_view")
  }

  function resetPlannerRuntimeForNewStudyPlan() {
    plannerReviewedFlashcardsRef.current = new Set()
    plannerCompletedActivityIdsRef.current = new Set()
    setPlannerRuntime({
      plannerWeekId: null,
      mode: "dashboard",
      dailyPlan: null,
      activityIndex: 0,
      todaySessionCompleted: false,
      sessionResults: emptyPlannerSessionResults(),
      completedSessionResults: {},
      activityDebriefs: {},
      moduleDebriefs: {},
      moduleHomework: {},
      studyPlanDebrief: "",
      assessmentCompletedAt: null
    })
  }

  function emptyPlannerSessionResults(): PlannerSessionResults {
    return {
      flashcardsReviewed: 0,
      quizzesCompleted: 0,
      quizQuestions: 0,
      quizCorrect: 0,
      activityResults: [],
      startedAtMs: null,
      completedAtMs: null
    }
  }

  async function askDocuments(imageFile?: File | null) {
    if (!projectId) return
    const questionText = askQuestion.trim()
    if (!questionText) return
    const previousMessages = chatMessages
    setAsking(true)
    const isFirstAskMessage = previousMessages.length === 0
    setChatMessages(currentMessages => [
      ...currentMessages,
      { role: "user", content: questionText }
    ])
    setAskQuestion("")

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (isFirstAskMessage && !askLearningSessionIdRef.current) {
        abandonOpenLearningSessions()
        askLearningSessionIdRef.current =
          await startLearningSession(projectId, "ask")
      }

      const payloadTopicIds = extractTopicIds(selectedTopics || [])
      const payloadTopicNames = extractTopicNames(selectedTopics || [])

      console.log("PAYLOAD TOPIC_IDS COUNT:", payloadTopicIds.length)
      console.log("PAYLOAD TOPICS COUNT:", payloadTopicNames.length)

      let res: Response

      if (imageFile) {
        const formData = new FormData()
        formData.append("project_id", projectId)
        formData.append("question", questionText)
        formData.append("topics", JSON.stringify(payloadTopicNames))
        formData.append("history", JSON.stringify(previousMessages.slice(-6)))
        formData.append("expand_search", String(useGlobalKnowledge))
        formData.append("image", imageFile)

        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask_with_image`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        })
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            project_id: projectId,
            question: questionText,
            topics: payloadTopicNames,
            history: previousMessages.slice(-6),
            expand_search: useGlobalKnowledge
          })
        })
      }

      if (!res.ok) {
        setChatMessages(currentMessages => [
          ...currentMessages,
          {
            role: "assistant",
            content: i18n.t("stats.Ask answer failed")
          }
        ])
        if (isFirstAskMessage) {
          await completeLearningSession(askLearningSessionIdRef.current, "abandoned")
          askLearningSessionIdRef.current = null
        }
        return
      }
      const data = await res.json()
      setChatMessages(currentMessages => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
          usedGlobalKnowledge: Boolean(data.used_global_knowledge),
          usedImage: Boolean(data.used_image)
        }
      ])
      if (isFirstAskMessage) {
        await completeLearningSession(askLearningSessionIdRef.current, "completed")
        askLearningSessionIdRef.current = null
      }
    } catch (e) {
      console.error("ASK ERROR:", e)
      setChatMessages(currentMessages => [
        ...currentMessages,
        {
          role: "assistant",
          content: i18n.t("stats.Ask answer failed")
        }
      ])
      if (isFirstAskMessage) {
        await completeLearningSession(askLearningSessionIdRef.current, "abandoned")
        askLearningSessionIdRef.current = null
      }
    } finally {
      setAsking(false)
    }
  }

  function selectAnswer(i: number, opt: string) {
    if (finished) return
    setAnswers({ ...answers, [i]: opt })
  }

  function calculateScore() {
    let s = 0
    quiz.forEach((q, i) => {
      const userAnswer = answers[i]
      q.options.forEach((opt: string, j: number) => {
        if (isCorrectQuizOption(q, j) && userAnswer === opt) s++
      })
    })
    return s
  }

  async function submitQuiz() {
    if (!quiz || !Array.isArray(quiz)) {
      console.error("❌ quiz non valido:", quiz)
      return
    }

    if (!answers || typeof answers !== "object") {
      console.error("❌ answers non valide:", answers)
      return
    }
    
    try {
        // 1. CALCOLO UNA VOLTA SOLA (answersArray e attemptsArray)
        const actualDurationSeconds = Math.max(0, Number(timeLeft || 0))
        const targetDurationSeconds = Math.max(
          0,
          Number(
            quizTargetDurationSeconds
            || (
              quiz.length > 0 && timerMinutes > 0
                ? timerMinutes * 60
                : 0
            )
          )
        )
        
        const answersArray = quiz.map((q, index) => {
          
          const userAnswer = answers[index]

          let isCorrect = false
          
          console.log("🧩 OPTIONS:", q.options);

          ;(Array.isArray(q.options) ? q.options : []).forEach((opt: string, j: number) => {
            if (isCorrectQuizOption(q, j) && userAnswer === opt) {
              isCorrect = true
            }
          })

          const normalizedTopic =
            selectedTopic?.topic
              ? normalizeTopic(selectedTopic.topic)
              : normalizeTopic(q.topic || q.title)

          console.log("🔥 NORMALIZED TOPIC:", normalizedTopic)
          console.log("🔥 RAW q.topic:", q.topic)
          console.log("🔥 RAW q.title:", q.title)

          return {
            question_id: q.id,
            is_correct: isCorrect,
            topic: normalizedTopic
          }
        })

        // 🧠 genera un quiz_id consistente
        const quizId = quiz?.[0]?.quiz_id || projectId

        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const userId = data.session?.user?.id

        if (!userId) {
          console.error("❌ userId mancante")
          return
        }

        const topicsUsed = quiz
          .map(q => q.topic || q.title)
          .filter(Boolean)

        const mainTopic =
          topicsUsed.length === 1
            ? normalizeTopic(topicsUsed[0])
            : (
                extractTopicNames(selectedTopics).join(", ")
                || "General"
              )

        const attemptsArray = [
          {
            quiz_id: quizId,
            score: calculateScore(),
            user_id: userId, // 🔥 FIX
            total_questions: quiz.length, // 🔥 FIX
            project_id: projectId, // 🔥 FIX
            topic: mainTopic,
            target_duration_seconds: targetDurationSeconds,
            actual_duration_seconds: actualDurationSeconds,
            answers: answersArray
          }
        ];

        // 2. INVIO A SUPABASE
        const { error } = await supabase.from("quiz_attempts").upsert(attemptsArray);

        if (error) {
          console.error("❌ Supabase error:", error);
          return;
        }

        await loadResults(projectId)

        

        

        // 🔍 debug
        console.log("🧪 QUIZ:", quiz);
        console.log("🧪 ANSWERS:", answers);
        console.log("🧪 ANSWERS ARRAY:", answersArray);
        console.log("📦 PAYLOAD:", {
          quiz_id: quizId,
          answers: answersArray
        });
        console.log("🧠 TOPICS USED:", topicsUsed);
        console.log("🧠 MAIN TOPIC:", mainTopic);

        // 🚀 invio al backend
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/save_quiz_attempt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            quiz_id: quizId,
            project_id: projectId,
            score: calculateScore(),
            total_questions: quiz.length,
            target_duration_seconds: targetDurationSeconds,
            actual_duration_seconds: actualDurationSeconds,
            answers: answersArray
          })
        });

        // 4. REFRESH
        
        console.log("✅ Submit e Refresh completati con successo");

        setFinished(true)
        await completeLearningSession(quizLearningSessionIdRef.current, "completed")
        quizLearningSessionIdRef.current = null
        await loadQuizStats(projectId) // 🔥 QUI

        const plannerActivity = plannerRuntime.dailyPlan
          ?.activities[plannerRuntime.activityIndex]

        if (
          plannerRuntime.mode === "external_activity"
          && plannerActivity?.type === "quiz"
        ) {
          const activityId = String(plannerActivity.id)
          if (!plannerCompletedActivityIdsRef.current.has(activityId)) {
            if (!plannerRuntime.dailyPlan) {
              return
            }

            plannerCompletedActivityIdsRef.current.add(activityId)
            const correctCount = calculateScore()
            const activityResult = {
              activity_id: plannerActivity.id,
              activity_type: "quiz",
              completed: true,
              correct: correctCount,
              total: quiz.length,
              questions: quiz.length,
              num_questions: quiz.length,
              accuracy: quiz.length > 0 ? correctCount / quiz.length : null
            }
            if (plannerRuntime.dailyPlan.planType !== "assessment") {
              await requestPlannerActivityDebrief(
                plannerRuntime.dailyPlan,
                plannerRuntime.activityIndex,
                activityResult
              )
            }
            setPlannerRuntime(prev => ({
              ...prev,
              mode: "activity_review",
              sessionResults: {
                ...prev.sessionResults,
                quizzesCompleted: prev.sessionResults.quizzesCompleted + 1,
                quizQuestions: prev.sessionResults.quizQuestions + quiz.length,
                quizCorrect: prev.sessionResults.quizCorrect + correctCount,
                activityResults: [
                  ...(prev.sessionResults.activityResults || []),
                  activityResult
                ]
              }
            }))
          }
        }
        
      } catch (err) {
          console.error("❌ CRASH nella funzione submitQuiz:", err);
      }
  }

  function plannerStudyLanguage(language: string): "English" | "Italian" {
    return language.toLowerCase().startsWith("it") ? "Italian" : "English"
  }

  function currentFeatureTitle() {
    if (plannerGuidedSessionActive) return i18n.t("stats.Study Planner")
    if (activeView === "ask" || activeView === "ask_setup") return i18n.t("stats.Ask question")
    if (activeView === "quiz") return quizActivityStarted ? i18n.t("stats.Quiz") : i18n.t("stats.Generate quiz")
    if (activeView === "generate_flashcards") return i18n.t("stats.Generate flashcards")
    if (activeView === "flashcards") return i18n.t("stats.Flashcards")
    if (activeView === "active_recall" || activeView === "active_recall_setup") return i18n.t("stats.Memory check")
    if (activeView === "study_session" || activeView === "study_session_setup") return i18n.t("stats.Study Session")
    if (activeView === "planner_view") return i18n.t("stats.Study Planner")
    if (activeView === "previous_quizzes") return i18n.t("stats.Previous quizzes")
    if (activeView === "results_summary") return i18n.t("stats.Results & Summary")
    if (activeView === "topics") return i18n.t("stats.Topics Dashboard")
    if (activeView === "create_project") return i18n.t("stats.Create project")
    if (activeView === "load_project") return i18n.t("stats.Load project")
    if (activeView === "manage_projects") return i18n.t("stats.Manage projects")
    return i18n.t("stats.Project")
  }

  function currentOptionsLabel() {
    if (activeView === "quiz" && quizActivityStarted) return i18n.t("stats.Quiz settings")
    if (activeView === "planner_view") return i18n.t("stats.Planner Options")
    return i18n.t("stats.Options")
  }
    
  const toolPanelCollapsedWidth = isMobileLayout ? 0 : 24
  const toolPanelExpandedWidth = mobileConfiguration
    ? `calc(100vw - ${mobileSidebarWidth}px)`
    : isMobileLayout
    ? `min(320px, calc(100vw - ${mobileSidebarWidth}px))`
    : 320
  const mobileToolPanelStyle: React.CSSProperties = mobileExecution
    ? {
        position: "absolute",
        left: mobileSidebarWidth,
        top: 0,
        bottom: 0,
        height: "100%",
        maxWidth: `calc(100vw - ${mobileSidebarWidth}px)`,
        transform: toolPanelCollapsed ? "translateX(-100%)" : "translateX(0)",
        boxShadow: toolPanelCollapsed
          ? "none"
          : "18px 0 40px rgba(0, 0, 0, 0.36)"
      }
    : mobileConfiguration
    ? {
        position: "relative",
        height: "100%",
        maxWidth: `calc(100vw - ${mobileSidebarWidth}px)`,
        boxShadow: "none"
      }
    : {}
  const mobileToolPanelContentStyle: React.CSSProperties = mobileNavigationSelected
    ? {
        height: "100%"
      }
    : {}
  const mobileEdgeTabStyle: React.CSSProperties = isMobileLayout
    ? {
        display: "none",
        width: 32,
        height: 96,
        right: -32,
        fontSize: 11
      }
    : {}

  return (
    <div style={{
      ...appShell,
      height: isMobileLayout ? "100dvh" : "100vh",
      flexDirection: mobileNavigationSelected ? "column" : "row"
    }}>
      {mobileNavigationSelected && (
        <div style={mobileTopBar}>
          <div style={mobileTopBarLogo}>DO•U•NO</div>
          <div style={mobileTopBarTitle}>{currentFeatureTitle()}</div>
          {mobileExecution && !directWorkspaceViews.has(activeView) ? (
            <button
              type="button"
              onClick={() => setToolPanelCollapsed(current => !current)}
              style={mobileOptionsButton}
              aria-label={
                toolPanelCollapsed
                  ? i18n.t("stats.Open options")
                  : i18n.t("stats.Collapse options")
              }
            >
              ⚙
              <span style={mobileOptionsLabel}>{currentOptionsLabel()}</span>
            </button>
          ) : (
            <div style={mobileOptionsSpacer} />
          )}
        </div>
      )}
      <div style={mobileHome ? mobileHomeShell : mobileNavigationSelected ? mobileContentShell : desktopContentShell}>
      <Sidebar
        activeView={plannerGuidedSessionActive ? "planner_view" : activeView}
        compactMode={mobileNavigationSelected}
        mobileHome={mobileHome}
        handleSidebarNavigation={handleSidebarNavigation}
        loadResults={loadResults}
        projectId={projectId}
        loadFlashcards={loadFlashcards}
        availableFlashcards={availableFlashcards}
        previousQuizzes={previousQuizzes}
        setStarted={setStarted}
        setFinished={setFinished}
        setAnswers={setAnswers}
        loadPreviousQuizzes={loadPreviousQuizzes}
        loadQuizStats={loadQuizStats}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        resultsData={resultsData} // AGGIUNGI QUESTA RIGA SE MANCA
        summaryStats={summaryStats} // AGGIUNGI ANCHE QUESTA
        topics={topics}
        setGeneratingFlashcards={setGeneratingFlashcards}
        setLanguage={setLanguage}
        
      />

      {!mobileHome && !directWorkspaceViews.has(activeView) && (
      <div style={{
        ...toolPanelShell,
        ...mobileToolPanelStyle,
        width: toolPanelCollapsed ? toolPanelCollapsedWidth : toolPanelExpandedWidth,
        minWidth: toolPanelCollapsed ? toolPanelCollapsedWidth : toolPanelExpandedWidth
      }}>
        <div style={{
          ...toolPanelContent,
          ...mobileToolPanelContentStyle,
          width: toolPanelCollapsed ? 0 : "100%",
          minWidth: toolPanelCollapsed ? 0 : "100%"
        }}>
          {!toolPanelCollapsed && (
            <ToolPanel
              activeView={activeView}
              setActiveView={setActiveView}
              projectName={activeView === "create_project" ? createProjectName : projectName}
              projects={projects}
              createProject={createProject}
              creatingProject={creatingProject}
              selectProject={selectProject}
              deleteProject={deleteProject}
              projectId={activeView === "create_project" && status !== "Project created" ? "" : projectId}
              numQuestions={numQuestions}
              setNumQuestions={setNumQuestions}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              language={language}
              setLanguage={setLanguage}
              timerMinutes={timerMinutes}
              setTimerMinutes={setTimerMinutes}
              generateQuiz={generateQuiz}
              generateFlashcards={generateFlashcards}
              generatingFlashcards={generatingFlashcards}
              flashcards={flashcards}
              openCard={openCard}
              setOpenCard={setOpenCard}
              files={files}
              setFiles={setFiles}
              documents={activeView === "create_project" && status !== "Project created" ? [] : documents}
              topics={activeView === "create_project" && status !== "Project created" ? [] : topics}
              loadingTopics={loadingTopics}
              previousFlashcards={previousFlashcards}
              topicsOpen={topicsOpen}
              setTopicsOpen={setTopicsOpen}
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
              selectedTopics={selectedTopics}
              setSelectedTopics={setSelectedTopics}
              availableFlashcards={availableFlashcards}
              studyCount={studyCount}
              setStudyCount={setStudyCount}
              status={status}
              uploadStatus={uploadStatus}
              uploadWorkflowActive={uploadWorkflowActive}
              uploadFlightSessionId={uploadFlightSessionId}
              setProjectName={activeView === "create_project" ? setCreateProjectName : setProjectName}
              uploadFiles={uploadFiles}
              loadStudyFlashcards={loadStudyFlashcards}
              studyMode={studyMode}
              setStudyMode={setStudyMode}
              loadingFlashcards={loadingFlashcards}
              studyConfig={studyConfig}
              setStudyConfig={setStudyConfig}
              questionStyle={questionStyle}
              setQuestionStyle={setQuestionStyle}
              plannerSessionActive={plannerRuntime.mode !== "dashboard"}
              priorityCategories={priorityCategories}
            />
          )}
        </div>
        <button
          type="button"
          className="tool-panel-edge-tab"
          onClick={() => setToolPanelCollapsed(current => !current)}
          style={{
            ...toolPanelEdgeTab,
            ...mobileEdgeTabStyle,
            right: isMobileLayout ? -32 : -20
          }}
          aria-label={
            toolPanelCollapsed
              ? i18n.t("stats.Open options")
              : i18n.t("stats.Collapse options")
          }
        >
          <span style={toolPanelEdgeTabLabel}>
            {toolPanelCollapsed
              ? `▶ ${i18n.t("stats.Options")}`
              : `◀ ${i18n.t("stats.Collapse")}`}
          </span>
        </button>
      </div>
      )}

      <style jsx global>{`
        .tool-panel-edge-tab:hover {
          color: rgba(54, 242, 237, 0.9) !important;
          background: #0f1f33 !important;
          border-color: #374151 !important;
        }
      `}</style>

      {!mobileHome && !mobileConfiguration && (
      <Workspace
        key={quizId}
        activeView={activeView}
        setActiveView={setActiveView}
        handleSidebarNavigation={handleSidebarNavigation}
        summaryStats={summaryStats}
        quiz={quiz}
        answers={answers}
        askQuestion={askQuestion}
        setAskQuestion={setAskQuestion}
        askDocuments={askDocuments}
        chatMessages={chatMessages}
        asking={asking}
        selectAnswer={selectAnswer}
        finished={finished}
        started={started}
        submitQuiz={submitQuiz}
        generatingQuiz={generatingQuiz}
        expanded={expanded}
        setExpanded={setExpanded}
        formatTime={formatTime}
        quizPacingOverTarget={quizPacingOverTarget}
        answeredCount={Object.keys(answers).length}
        projectId={projectId}
        projectName={projectName}
        studentFirstName={studentFirstName}
        projectStudyMode={projectStudyMode}
        projectReadyVisible={projectReadyVisible}
        projectReadyDismissed={projectReadyDismissed}
        projects={projects}
        deleteProject={deleteProject}
        quizId={quizId}
        previousQuizzes={previousQuizzes}
        loadQuiz={loadQuiz}
        flashcards={flashcards}
        openCard={openCard}
        setOpenCard={setOpenCard}
        standaloneFlashcardCompletionAvailable={
          Boolean(lastFlashcardGeneration)
          && studyMode === "generated"
          && plannerRuntime.mode === "dashboard"
        }
        onGenerateMoreFlashcards={generateMoreStandaloneFlashcards}
        onFlashcardsBackToDashboard={returnFromStandaloneFlashcardsToDashboard}
        onFlashcardsComplete={completeStandaloneFlashcardsSession}
        resultsData={resultsData}
        calculateScore={calculateScore}
        uploadLog={uploadLog}
        uploading={uploading}
        loadQuizStats={loadQuizStats}
        loadHistoryStats={loadQuizStatsByQuiz} // Opzionale: passa quella per i grafici con un altro nome
        loadPreviousQuizzes={loadPreviousQuizzes}
        status={status}
        loadingFlashcards={loadingFlashcards}
        generatingFlashcards={generatingFlashcards}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        documents={documents}
        selectedTopics={selectedTopics}
        setSelectedTopics={setSelectedTopics}
        topics={topics}
        loadingTopics={loadingTopics}
        isGenerating={isGenerating}      // Aggiungi questa
        loaderStep={loaderStep}          // Aggiungi questa
        loaderType={loaderType}          // Aggiungi questa
        loaderMessages={loaderMessages}  // Aggiungi questa
        useGlobalKnowledge={useGlobalKnowledge}
        setUseGlobalKnowledge={setUseGlobalKnowledge}
        toolMode={toolMode}
        setToolMode={setToolMode}
        generateQuiz={generateQuiz}
        generateFlashcards={generateFlashcards}
        plannerRuntime={plannerRuntime}
        openPlannerDailySession={openPlannerDailySession}
        launchPlannerActivity={launchPlannerActivity}
        onPlannerFlashcardReview={handlePlannerFlashcardReview}
        continuePlannerActivity={completePlannerActivity}
        returnToPlannerDashboard={returnToPlannerDashboard}
	        resetPlannerRuntimeForNewStudyPlan={resetPlannerRuntimeForNewStudyPlan}
	        plannerActivityProgress={plannerActivityProgress}
	        plannerActivityDebriefs={plannerRuntime.activityDebriefs}
        onUploadAnotherFile={openProjectUploadWorkspace}
	        onBeginStudy={beginStudy}
        onLearningHomeLaunch={openLearningFeature}
        onStartFocusStudySession={startFocusedStudySession}
        priorityCategories={priorityCategories}
        setPriorityCategories={setPriorityCategories}
        onPriorityCategoriesSaved={updateProjectPriorityCategories}
        uploadFlightSessionId={uploadFlightSessionId}
	        
	        
	      />
      )}
      </div>
    </div>
  )
}

const appShell: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  width: "100vw",
  maxWidth: "100vw",
  overflow: "hidden",
  background: "#080a10",
  position: "relative"
}

const desktopContentShell: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minWidth: 0,
  height: "100%"
}

const mobileContentShell: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  position: "relative",
  overflow: "hidden"
}

const mobileHomeShell: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
  minHeight: 0,
  overflow: "hidden"
}

const mobileTopBar: React.CSSProperties = {
  height: 56,
  minHeight: 56,
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 12px",
  boxSizing: "border-box",
  background: "#080a10",
  borderBottom: "1px solid #1f2937",
  color: "#e5e7eb",
  zIndex: 60
}

const mobileTopBarLogo: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 1.2,
  color: "#36f2ed",
  whiteSpace: "nowrap"
}

const mobileTopBarTitle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 15,
  fontWeight: 600,
  color: "#f8fafc",
  textAlign: "center"
}

const mobileOptionsButton: React.CSSProperties = {
  minHeight: 40,
  minWidth: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #1f2937",
  background: "rgba(15, 31, 51, 0.82)",
  color: "#e5e7eb",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap"
}

const mobileOptionsLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500
}

const mobileOptionsSpacer: React.CSSProperties = {
  minWidth: 44
}

const toolPanelShell: React.CSSProperties = {
  position: "relative",
  height: "100%",
  overflow: "visible",
  background: "#080a10",
  borderRight: "1px solid #1f2937",
  transition: "width 220ms ease, min-width 220ms ease, transform 220ms ease",
  flexShrink: 0,
  zIndex: 20
}

const toolPanelContent: React.CSSProperties = {
  height: "100%",
  overflow: "hidden",
  transition: "width 220ms ease, min-width 220ms ease",
  flexShrink: 0
}

const toolPanelEdgeTab: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: 20,
  height: 74,
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #1f2937",
  borderLeft: "none",
  borderRadius: "0 10px 10px 0",
  background: "rgba(11, 17, 29, 0.92)",
  color: "rgba(203, 213, 225, 0.68)",
  cursor: "pointer",
  fontWeight: 400,
  fontSize: 10,
  lineHeight: 1,
  display: "flex",
  padding: "10px 0",
  boxSizing: "border-box",
  zIndex: 40,
  boxShadow: "none",
  transition: "color 160ms ease, background 160ms ease, border-color 160ms ease"
}

const toolPanelEdgeTabLabel: React.CSSProperties = {
  transform: "rotate(-90deg)",
  transformOrigin: "center",
  whiteSpace: "nowrap",
  fontWeight: 400,
  letterSpacing: 0.1
}
