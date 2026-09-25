const activityLabels: Record<string, string> = {
  quiz: "Quiz",
  generate_flashcards: "Flashcards",
  flashcards: "Flashcards",
  active_recall_setup: "Memory Check",
  active_recall: "Memory Check",
  study_session_setup: "Study Session",
  study_session: "Study Session",
  ask_setup: "Ask a Question",
  ask: "Ask a Question",
  planner_view: "Professor"
}

export function studyActivityLabel(view: string): string | undefined {
  return activityLabels[view]
}
