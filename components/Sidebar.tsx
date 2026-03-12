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

export default function Sidebar({ activeView, setActiveView }: any) {
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

      <div style={menuItem} onClick={() => setActiveView("project")}>
      Load project
      </div>

      <div style={menuItem} onClick={() => setActiveView("project")}>
      Create project
      </div>

      <div style={menuItem} onClick={() => setActiveView("project")}>
      Manage projects
      </div>

      <div style={divider} />

      {/* STUDY */}
      <div style={sectionTitle}>
        <Brain size={16}/> Study
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("ask")}
      >
      <HelpCircle size={16}/> Ask question
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("flashcards")}
      >
      <Layers size={16}/> Flashcards
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("summary")}
      >
      <BarChart3 size={16}/> Summary
      </div>

      <div style={divider} />

      {/* QUIZ */}
      <div style={sectionTitle}>
        <ClipboardList size={16}/> Quiz
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("quiz")}
      >
      <ClipboardList size={16}/> Generate quiz
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("previous")}
      >
      <History size={16}/> Previous quizzes
      </div>

      <div
      style={menuItem}
      onClick={() => setActiveView("results")}
      >
      <BarChart3 size={16}/> Results
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