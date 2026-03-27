import Image from "next/image";
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

  return (
    <div style={sidebar}>

      {/* LOGO */}
      <div style={logoBox}>
        <Image
          src="/logoSF.png"
          width={270}
          height={75}
          alt="StudyQuiz"
        />
      </div>

      <div style={divider} />

      {/* PROJECT */}
      <div style={sectionTitle}>
        <Folder size={16}/> Project
      </div>

      <div style={menuItem} onClick={() => setActiveView("create_project")}>
        Create project
      </div>

      <div style={menuItem} onClick={() => setActiveView("load_project")}>
        Load project
      </div>

      <div style={menuItem} onClick={() => setActiveView("manage_projects")}>
        Manage projects
      </div>

      <div style={divider} />

      {/* STUDY */}
      <div style={sectionTitle}>
        <Brain size={16}/> Study
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("ask")
        }}
      >
        <HelpCircle size={16}/> Ask question
      </div>

      <div
      style={menuItem}
      onClick={() => {
        setStarted(false)
        setFinished(false)
        setAnswers({})
        setActiveView("study_session")
      }}
            >
      <Brain size={16}/> Study Session
      </div>

      <div
        style={menuItem}
        onClick={() => {
          setStarted(false)
          setFinished(false)
          setAnswers({})
          setActiveView("active_recall")
        }}
      >
        <Brain size={16}/> Memory check
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
        <Layers size={16}/> Generate flashcards
      </div>

      <div
        style={menuItem}
        onClick={async () => {
          if(projectId){
            await loadFlashcards(projectId)
          }
          setActiveView("flashcards")
        }}
      >
        <Layers size={16}/> Load flashcards
        <span style={{marginLeft:6,color:"#9ca3af"}}>
          ({availableFlashcards || 0})
        </span>
      </div>

      

      <div style={divider} />

      {/* QUIZ */}
      <div style={sectionTitle}>
        <ClipboardList size={16}/> Quiz
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
        <ClipboardList size={16}/> Generate quiz
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
        <History size={16}/> Previous quizzes
        <span style={{marginLeft:6,color:"#9ca3af"}}>
          ({previousQuizzes?.length || 0})
        </span>
      </div>

     

      <div
        style={menuItem}
        onClick={async () => {

          // reset quiz
          setStarted(false)
          setFinished(false)
          setAnswers({})  

          if(projectId){
            await loadResults(projectId)
            await loadSummary(projectId)
          }

          setActiveView("results_summary")

        }}
      >
        <BarChart3 size={16}/> Results & Summary
      </div>

    </div>
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