const activityLabels: Record<string, string> = {
  quiz: "Quiz",
  generate_flashcards: "Flashcards",
  flashcards: "Flashcards",
  active_recall_setup: "Oral Practice",
  active_recall: "Oral Practice",
  study_session_setup: "Study Session",
  study_session: "Study Session",
  ask_setup: "ask DO·U·NO",
  ask: "ask DO·U·NO",
  planner_view: "Professor"
}

export function studyActivityLabel(view: string): string | undefined {
  return activityLabels[view]
}
