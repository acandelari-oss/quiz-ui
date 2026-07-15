import Image from "next/image";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import { shellHeaderCell } from "./layoutStyles";

export default function Sidebar({ 
  activeView,
  handleSidebarNavigation,
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
  compactMode = false,
  mobileHome = false
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
        const handleLogout = async () => {
          await supabase.auth.signOut()
          window.location.reload()
        }
        const navigate = (view: string) => {
          handleSidebarNavigation(view)
        }
  // Questo useEffect gira SOLO sul client dopo il primo render
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se non è ancora montato, restituisci un placeholder o null 
  // per evitare che il server mandi testo che il client cambierà
  if (!mounted) {
    return <div style={{ width: mobileHome ? "100%" : compactMode ? 56 : 260 }}></div>; // Mantieni lo spazio della sidebar vuoto
  }

  return (
    <aside>
    <div style={{
      ...sidebar,
      width: mobileHome ? "100%" : compactMode ? 56 : 260,
      padding: mobileHome ? "38px 28px 24px" : compactMode ? "12px 6px" : 20,
      alignItems: compactMode ? "center" : "stretch"
    }}>

      {/* LOGO */}
      {mobileHome ? (
        <div style={mobileHomeLogoBox}>
          <div style={mobileHomeLogoText}>DO•U•NO</div>
        </div>
      ) : !compactMode && (
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
         {translate('stats.Project')}
      </div>
      )}

      <div style={navItemStyle(activeView === "create_project", compactMode)} onClick={() => navigate("create_project")} title={translate('stats.Create project')}>
        <img
          src="/icons/new-project.svg"
          alt=""
          width={24}
          height={24}
        />
        {!compactMode && translate('stats.Create project')}
      </div>

      <div style={navItemStyle(activeView === "load_project", compactMode)} onClick={() => navigate("load_project")} title={translate('stats.Load project')}>
        <img
          src="/icons/load-project.svg"
          alt=""
          width={24}
          height={24}
        />
        {!compactMode && translate('stats.Load project')}
      </div>

      <div
        style={navItemStyle(activeView === "manage_projects", compactMode)}
        onClick={() => {
          console.log("🔥 CLICK MANAGE PROJECTS")
          navigate("manage_projects")
        }}
        title={translate('stats.Manage projects')}
      >
        <img
          src="/icons/manage-project.svg"
          alt=""
          width={24}
          height={24}
        />
        {!compactMode && translate('stats.Manage projects')}
      </div>

      <div 
        style={navItemStyle(activeView === "topics", compactMode)} 
        onClick={() => navigate("topics")}
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
       {translate('stats.Study')}
      </div>
      )}

      <div
        style={navItemStyle(activeView === "ask_setup" || activeView === "ask", compactMode)}
        onClick={() => {
          navigate("ask_setup")
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
        navigate("study_session_setup")
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
          navigate("active_recall_setup")
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
          navigate("generate_flashcards")
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
          await loadFlashcards(projectId);
          
          navigate("flashcards");
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
          navigate("quiz")
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
          if(projectId){
            await loadPreviousQuizzes(projectId)
          }

          navigate("previous_quizzes")

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
        {translate('stats.Stats & Planner')}
      </div>
      )}

      

      <div
        style={navItemStyle(activeView === "planner_view", compactMode)}
        onClick={() => navigate("planner_view")}
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
          if(projectId){
            // Se loadSummary non è definita nel Workspace o passata come prop, 
            // caricheremo i dati direttamente dentro SummaryView tramite useEffect.
            await loadResults(projectId) 
          }

          navigate("results_summary")
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
       

      
        <div style={mobileHome ? mobileHomeUtilityRow : compactMode ? compactUtilityColumn : desktopLanguageRow}>
          {mobileHome ? (
            <>
              <label style={mobileHomeLanguageLabel}>
                {translate('stats.Language')}:
                <select
                  value={i18n.language.startsWith("it") ? "it" : "en"}
                  onChange={(event) => changeLanguage(event.target.value)}
                  style={mobileHomeLanguageSelect}
                >
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                </select>
              </label>
              <img
                src="/icons/user.svg"
                alt="Account"
                role="button"
                tabIndex={0}
                style={toolbarIcon}
                onClick={() => alert("Account area coming soon")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    alert("Account area coming soon")
                  }
                }}
              />
              <img
                src="/icons/logout.svg"
                alt="Logout"
                role="button"
                tabIndex={0}
                style={toolbarIcon}
                onClick={handleLogout}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleLogout()
                  }
                }}
              />
            </>
          ) : compactMode ? (
            <>
              <button
                type="button"
                onClick={() => changeLanguage(i18n.language.startsWith("it") ? "en" : "it")}
                style={compactIconButton}
                aria-label="Language"
              >
                {i18n.language.startsWith("it") ? "🇮🇹" : "🇬🇧"}
              </button>
              <img
                src="/icons/user.svg"
                alt="Account"
                role="button"
                tabIndex={0}
                style={compactToolbarIcon}
                onClick={() => alert("Account area coming soon")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    alert("Account area coming soon")
                  }
                }}
              />
              <img
                src="/icons/logout.svg"
                alt="Logout"
                role="button"
                tabIndex={0}
                style={compactToolbarIcon}
                onClick={handleLogout}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleLogout()
                  }
                }}
              />
            </>
          ) : (
            <label style={desktopLanguageLabel}>
              {translate('stats.Language')}:
              <select
                value={i18n.language.startsWith("it") ? "it" : "en"}
                onChange={(event) => changeLanguage(event.target.value)}
                style={mobileHomeLanguageSelect}
              >
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </label>
          )}
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

const mobileHomeLogoBox: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "4px 0 34px",
  borderBottom: "1px solid #1f2937",
  marginBottom: 20
}

const mobileHomeLogoText: React.CSSProperties = {
  fontSize: "clamp(48px, 14vw, 92px)",
  fontWeight: 900,
  letterSpacing: 1.5,
  lineHeight: 1,
  background: "linear-gradient(90deg, #1778d4, #36f2ed, #1778d4)",
  WebkitBackgroundClip: "text",
  color: "transparent"
}

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

const desktopLanguageRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: 20,
  flexDirection: "row"
}

const desktopLanguageLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#36f2ed",
  fontWeight: 700,
  fontSize: 16
}

const compactUtilityColumn: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "16px 0",
  flexDirection: "column",
  alignItems: "center",
  marginTop: "auto"
}

const compactIconButton: React.CSSProperties = {
  width: 44,
  height: 44,
  border: "1px solid #1f2937",
  borderRadius: 10,
  background: "transparent",
  color: "#36f2ed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18
}

const mobileHomeUtilityRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "24px 6px 0",
  marginTop: "auto",
  borderTop: "1px solid #1f2937",
  flexWrap: "wrap"
}

const mobileHomeLanguageLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#36f2ed",
  fontWeight: 700,
  fontSize: 20
}

const mobileHomeLanguageSelect: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 18,
  border: "1px solid #1f2937",
  padding: "4px 34px 4px 14px",
  background: "#f8fafc",
  color: "#111827",
  fontSize: 16
}

const toolbarIcon: React.CSSProperties = {
  width: 34,
  height: 34,
  objectFit: "contain",
  cursor: "pointer",
  opacity: 0.95
}

const compactToolbarIcon: React.CSSProperties = {
  width: 30,
  height: 30,
  objectFit: "contain",
  cursor: "pointer",
  opacity: 0.95
}
