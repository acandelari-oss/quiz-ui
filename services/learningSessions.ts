import { supabase } from "../lib/supabase"

export type LearningSessionType =
  | "quiz"
  | "flashcards"
  | "ask"
  | "active_recall"
  | "planner"

export type LearningSessionStatus = "completed" | "abandoned"

export async function startLearningSession(
  projectId: string | null | undefined,
  sessionType: LearningSessionType
): Promise<string | null> {
  if (!projectId) return null

  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id

  if (!userId) return null

  const sessionId = crypto.randomUUID()

  const { data: insertedSession, error } = await supabase
    .from("learning_sessions")
    .insert({
      id: sessionId,
      user_id: userId,
      project_id: projectId,
      session_type: sessionType,
      started_at: new Date().toISOString(),
      completed_at: null
    })
    .select("id")
    .single()

  if (error) {
    console.warn("LEARNING SESSION START FAILED:", error)
    return null
  }

  return insertedSession?.id || sessionId
}

export async function completeLearningSession(
  sessionId: string | null | undefined,
  status: LearningSessionStatus = "completed"
): Promise<void> {
  if (!sessionId) return

  const { error } = await supabase
    .from("learning_sessions")
    .update({
      completed_at: new Date().toISOString(),
      status
    })
    .eq("id", sessionId)

  if (error) {
    console.warn("LEARNING SESSION COMPLETE FAILED:", error)
  }
}
