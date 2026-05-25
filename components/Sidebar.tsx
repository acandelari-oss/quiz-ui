import Image from "next/image";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Calendar } from "lucide-react"

import {
  Folder,
  Brain,
  HelpCircle,
  Layers,
  FileText,
  ClipboardList,
  History,
  BarChart3
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
  loadQuizStats
}: any) {
   // Dentro il componente Sidebar
        const [mounted, setMounted] = useState(false);
        const { t: translate } = useTranslation();
        const { i18n, t } = useTranslation();
        const [numToReview, setNumToReview] = useState(availableFlashcards || 0);

        const changeLanguage = (lng: string) => {
          i18n.changeLanguage(lng);
          // Opzionale: salva la preferenza nel DB qui quando saremo pronti
        };
  // Questo useEffect gira SOLO sul client dopo il primo render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se non è ancora montato, restituisci un placeholder o null 
  // per evitare che il server mandi testo che il client cambierà
  if (!mounted) {
    return <div style={{ width: 260 }}></div>; // Mantieni lo spazio della sidebar vuoto
  }

  return (
    <aside>
    <div style={sidebar}>

      {/* LOGO */}
      <div style={logoBox}>
        <Image
          src="/logoSTX.png"
          width={270}
          height={75}
          alt="StutorX logo"
        />
      </div>

      <div style={divider} />

      {/* PROJECT */}
      <div style={sectionTitle}>
        <Folder size={16}/> {translate('stats.Project')}
      </div>

      <div style={menuItem} onClick={() => setActiveView("create_project")}>
        {translate('stats.Create project')}
      </div>

      <div style={menuItem} onClick={() => setActiveView("load_project")}>
        {translate('stats.Load project')}
      </div>

      <div
        style={menuItem}
        onClick={() => {
          console.log("🔥 CLICK MANAGE PROJECTS")
          setActiveView("manage_projects")
        }}
      >
        {translate('stats.Manage projects')}
      </div>

      <div 
        style={{...menuItem, color: activeView === "topics" ? "#22c55e" : "#e5e7eb", fontWeight: activeView === "topics" ? "600" : "400"}} 
        onClick={() => setActiveView("topics")}
      >
        <Layers size={16} style={{marginRight: 8}}/> {translate('stats.Topics Dashboard')}
      </div>

      <div style={divider} />

      {/* STUDY */}
      <div style={sectionTitle}>
        <Brain size={16}/> {translate('stats.Study')}
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("ask_setup")
        }}
      >
        <HelpCircle size={16}/> {translate('stats.Ask question')}
      </div>

      <div
      style={menuItem}
      onClick={() => {
        setStarted(false)
        setFinished(false)
        setAnswers({})
        setActiveView("study_session_setup")
      }}
            >
      <Brain size={16}/> {translate('stats.Study Session')}
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("active_recall_setup")
        }}
      >
        <Brain size={16}/> {translate('stats.Memory check')}
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("generate_flashcards")
        }}
      >
        <Layers size={16}/> {translate('stats.Generate flashcards')}
      </div>

  
   
    <div
      style={menuItem}
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
    >
      <Layers size={16}/> {translate('stats.Load flashcards')}
      <span style={{ marginLeft: 6, color: "#9ca3af" }}>
        ({availableFlashcards || 0})
      </span>
    </div>
 

      

      <div style={divider} />

      {/* QUIZ */}
      <div style={sectionTitle}>
        <ClipboardList size={16}/> {translate('stats.Quiz')}
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("quiz")
        }}
      >
        <ClipboardList size={16}/> {translate('stats.Generate quiz')}
      </div>

      <div
        style={menuItem}
        onClick={async () => {

          setStarted(false)
          setFinished(false)
          setAnswers({})

          if(projectId){
            await loadPreviousQuizzes(projectId)
          }

          setActiveView("previous_quizzes")

        }}
      >
        <History size={16}/> {translate('stats.Previous quizzes')}
        <span style={{marginLeft:6,color:"#9ca3af"}}>
          ({previousQuizzes?.length || 0})
        </span>
      </div>

      <div
        style={menuItem}
        onClick={() => setActiveView("planner")}
      >
        <Calendar size={16}/>{translate('stats.Study planner')}
      </div>

      <div
        style={menuItem}
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
      >
        <BarChart3 size={16}/> {translate('stats.Results & Summary')}
      </div>

      
      <div>
       

      
        <div style={{ display: 'flex', gap: '10px', padding: '20px' }}>
          <button onClick={() => changeLanguage('it')} style={btnStyle}>ITA</button>
          <button onClick={() => changeLanguage('en')} style={btnStyle}>ENG</button>
        </div>
      </div>  
    </div>
    </aside>
  );
}

const sidebar = {
  width: 260,
  background: "#020617",
  color: "#e5e7eb",
  borderRight: "1px solid #1f2937",
  display: "flex",
  flexDirection: "column" as const,
  padding: 20,
  fontSize: 14
};

const logoBox = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 20
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  marginTop: 10,
  marginBottom: 8,
  color: "#9ca3af"
};

const menuItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer"
};

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