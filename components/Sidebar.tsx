import Image from "next/image";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Calendar } from "lucide-react"
import { shellHeaderCell } from "./layoutStyles";

import {
  Folder,
  FolderPlus,
  Brain,
  HelpCircle,
  Layers,
  FileText,
  ClipboardList,
  History,
  BarChart3,
  Settings
} from "lucide-react";

export default function Sidebar({ 
  activeView,
  setActiveView,
  loadResults,
  loadSummary,
  projectId,
  loadFlashcards,
  availableFlashcards,
  previousQuizzes,
  setStarted,
  setFinished,
  setAnswers,
  loadPreviousQuizzes,
  loadQuizStats,
  setLanguage,
  compactMode = false
}: any) {
   // Dentro il componente Sidebar
        const [mounted, setMounted] = useState(false);
        const { t: translate } = useTranslation();
        const { i18n, t } = useTranslation();
        const [numToReview, setNumToReview] = useState(availableFlashcards || 0);

        const changeLanguage = (lng: string) => {
          i18n.changeLanguage(lng)

          setLanguage(
            lng === "it" ? "Italian" : "English"
          )
          console.log("🌍 CHANGE LANGUAGE:", lng)
        }
  // Questo useEffect gira SOLO sul client dopo il primo render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se non è ancora montato, restituisci un placeholder o null 
  // per evitare che il server mandi testo che il client cambierà
  if (!mounted) {
    return <div style={{ width: compactMode ? 56 : 260 }}></div>; // Mantieni lo spazio della sidebar vuoto
  }

  return (
    <aside>
    <div style={{
      ...sidebar,
      width: compactMode ? 56 : 260,
      padding: compactMode ? "12px 6px" : 20,
      alignItems: compactMode ? "center" : "stretch"
    }}>

      {/* LOGO */}
      {!compactMode && (
        <div style={logoBox}>
          <Image
            src="/logodun.png"
            width={220}
            height={60}
            alt="Do U no logo"
          />
        </div>
      )}

      {/* PROJECT */}
      {!compactMode && (
      <div style={sectionTitle}>
         <Folder size={18} />
         {translate('stats.Project')}
      </div>
      )}

      <div style={navItemStyle(activeView === "create_project", compactMode)} onClick={() => setActiveView("create_project")} title={translate('stats.Create project')}>
        <FolderPlus size={24} />
        {!compactMode && translate('stats.Create project')}
      </div>

      <div style={navItemStyle(activeView === "load_project", compactMode)} onClick={() => setActiveView("load_project")} title={translate('stats.Load project')}>
        <Folder size={24} />
        {!compactMode && translate('stats.Load project')}
      </div>

      <div
        style={navItemStyle(activeView === "manage_projects", compactMode)}
        onClick={() => {
          console.log("🔥 CLICK MANAGE PROJECTS")
          setActiveView("manage_projects")
        }}
        title={translate('stats.Manage projects')}
      >
        <Settings size={24} />
        {!compactMode && translate('stats.Manage projects')}
      </div>

      <div 
        style={navItemStyle(activeView === "topics", compactMode)} 
        onClick={() => setActiveView("topics")}
        title={translate('stats.Topics Dashboard')}
      >
        <img
          src="/icons/topic-dashboard-side.svg"
          alt=""
          width={24}
          height={24}
        />
        {!compactMode && translate('stats.Topics Dashboard')}
      </div>

      <div style={divider} />

      {/* STUDY */}
      {!compactMode && (
      <div style={sectionTitle}>
       <Brain size={18} />
       {translate('stats.Study')}
      </div>
      )}

      <div
        style={navItemStyle(activeView === "ask_setup" || activeView === "ask", compactMode)}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("ask_setup")
        }}
        title={translate('stats.Ask question')}
      >
        <img
          src="/icons/ask-side.svg"
          alt=""
          width={24}
          height={24}
        /> {!compactMode && translate('stats.Ask question')}
      </div>

      <div
      style={navItemStyle(activeView === "study_session_setup" || activeView === "study_session", compactMode)}
      onClick={() => {
        setStarted(false)
        setFinished(false)
        setAnswers({})
        setActiveView("study_session_setup")
      }}
      title={translate('stats.Study Session')}
            >
      <img
        src="/icons/study-session-side.svg"
        alt=""
        width={24}
        height={24}
      /> {!compactMode && translate('stats.Study Session')}
      </div>

      <div
        style={navItemStyle(activeView === "active_recall_setup" || activeView === "active_recall", compactMode)}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("active_recall_setup")
        }}
        title={translate('stats.Memory check')}
      >
        <img
          src="/icons/memory-check-side.svg"
          alt=""
          width={24}
          height={24}
        /> {!compactMode && translate('stats.Memory check')}
      </div>

      <div
        style={navItemStyle(activeView === "generate_flashcards", compactMode)}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("generate_flashcards")
        }}
        title={translate('stats.Generate flashcards')}
      >
        <img
          src="/icons/flashcards-side.svg"
          alt=""
          width={24}
          height={24}
        /> {!compactMode && translate('stats.Generate flashcards')}
      </div>

  
   
    <div
      style={navItemStyle(activeView === "flashcards", compactMode)}
      onClick={async (e) => {
        // Impediamo conflitti di eventi
        e.preventDefault();
        e.stopPropagation();

        if (projectId) {
          // 1. Spegniamo categoricamente i loader prima di ogni altra cosa
          if (typeof setGeneratingFlashcards === 'function') {
            setGeneratingFlashcards(false);
          }
          
          // 2. Carichiamo le card
          await loadFlashcards(projectId);
          
          // 3. Cambiamo vista SOLO dopo che il caricamento è "iniziato"
          setActiveView("flashcards");
        }
      }}
      title={translate('stats.Load flashcards')}
    >
      <img
        src="/icons/flashcard-library-side.svg"
        alt=""
        width={24}
        height={24}
      /> {!compactMode && translate('stats.Load flashcards')}
      {!compactMode && <span style={{ marginLeft: 6, color: "#9ca3af" }}>
        ({availableFlashcards || 0})
      </span>}
    </div>

    <div
        style={navItemStyle(activeView === "quiz", compactMode)}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("quiz")
        }}
        title={translate('stats.Generate quiz')}
      >
        <img
          src="/icons/quiz-side.svg"
          alt=""
          width={24}
          height={24}
        /> {!compactMode && translate('stats.Generate quiz')}
      </div>

      <div
        style={navItemStyle(activeView === "previous_quizzes", compactMode)}
        onClick={async () => {

          setStarted(false)
          setFinished(false)
          setAnswers({})

          if(projectId){
            await loadPreviousQuizzes(projectId)
          }

          setActiveView("previous_quizzes")

        }}
        title={translate('stats.Previous quizzes')}
      >
        <img
          src="/icons/quiz-history-side.svg"
          alt=""
          width={24}
          height={24}
        />{!compactMode && translate('stats.Previous quizzes')}
        {!compactMode && <span style={{marginLeft:6,color:"#9ca3af"}}>
          ({previousQuizzes?.length || 0})
        </span>}
      </div>
 

      

      <div style={divider} />

      {/* QUIZ */}
      {!compactMode && (
      <div style={sectionTitle}>
        <BarChart3 size={18} />
        {translate('stats.Stats & Planner')}
      </div>
      )}

      

      <div
        style={navItemStyle(activeView === "planner_view", compactMode)}
        onClick={() => setActiveView("planner_view")}
        title={translate('stats.Study planner')}
      >
        <img
          src="/icons/study-planner-side.svg"
          alt=""
          width={24}
          height={24}
        />{!compactMode && translate('stats.Study planner')}
      </div>

      <div
        style={navItemStyle(activeView === "results_summary", compactMode)}
        onClick={async () => {
          // reset quiz
          setStarted(false)
          setFinished(false)
          setAnswers({})  

          if(projectId){
            // Se loadSummary non è definita nel Workspace o passata come prop, 
            // caricheremo i dati direttamente dentro SummaryView tramite useEffect.
            await loadResults(projectId) 
          }

          setActiveView("results_summary")
        }}
        title={translate('stats.Results & Summary')}
      >
        <img
          src="/icons/summary-side.svg"
          alt=""
          width={24}
          height={24}
        /> {!compactMode && translate('stats.Results & Summary')}
      </div>

      
      <div>
       

      
        <div style={{
          display: 'flex',
          gap: compactMode ? 6 : '10px',
          padding: compactMode ? "16px 0" : '20px',
          flexDirection: compactMode ? "column" : "row"
        }}>
          <button
            onClick={() => changeLanguage("it")}
            style={{
              ...btnStyle,
              backgroundColor:
                i18n.language.startsWith("it")
                  ? "#22c55e"
                  : "#374151",
              borderColor:
                i18n.language.startsWith("it")
                  ? "#22c55e"
                  : "#4b5563"
            }}
          >
            ITA
          </button>

          <button
            onClick={() => changeLanguage("en")}
            style={{
              ...btnStyle,
              backgroundColor:
                i18n.language.startsWith("en")
                  ? "#22c55e"
                  : "#374151",
              borderColor:
                i18n.language.startsWith("en")
                  ? "#22c55e"
                  : "#4b5563"
            }}
          >
            ENG
          </button>
        </div>
      </div>  
    </div>
    </aside>
  );
}

const sidebar = {
  width: 260,
  height: "100%",
  background: "#080a10",
  color: "#e5e7eb",
  borderRight: "1px solid #1f2937",
  display: "flex",
  flexDirection: "column" as const,
  padding: 20,
  fontSize: 16,
  flexShrink: 0,
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const
};

const logoBox = {
  ...shellHeaderCell,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderBottom: "1px solid #1f2937"
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  marginTop: 10,
  marginBottom: 8,
  color: "#36f2ed",
  fontSize: 18
};

const menuItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer"
};

function navItemStyle(active: boolean, compact: boolean): React.CSSProperties {
  return {
    ...menuItem,
    justifyContent: compact ? "center" : "flex-start",
    width: compact ? 44 : "100%",
    minHeight: compact ? 44 : 42,
    padding: compact ? "8px 0" : "8px 10px",
    color: active ? "#22c55e" : "#e5e7eb",
    fontWeight: active ? 700 : 400,
    background: active ? "rgba(34, 197, 94, 0.08)" : "transparent",
    boxSizing: "border-box"
  }
}

const divider = {
  height: 1,
  background: "#1f2937",
  margin: "14px 0"
};

const btnStyle = {
  padding: '8px 12px',
  cursor: 'pointer',
  backgroundColor: '#374151',
  color: 'white',
  border: '1px solid #4b5563',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 'bold'
};
