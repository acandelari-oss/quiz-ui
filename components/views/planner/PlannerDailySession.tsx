import DailyBriefingStep from "./DailyBriefingStep"
import SessionSummaryStep from "./SessionSummaryStep"
import type {
  PlannerDailyPlan,
  PlannerProfessorConversationMessage
} from "./PlannerTypes"

type DailySessionStep =
  | "briefing"
  | "summary"

export default function PlannerDailySession({
  dailyPlan,
  mode,
  onStartSession,
  onBackToDashboard,
  onAskProfessor
}: {
  dailyPlan: PlannerDailyPlan
  mode: DailySessionStep
  onStartSession: () => void
  onBackToDashboard: () => void
  onAskProfessor?: (
    question: string,
    conversation: PlannerProfessorConversationMessage[]
  ) => Promise<string>
}) {
  if (mode === "briefing") {
    return (
      <DailyBriefingStep
        dailyPlan={dailyPlan}
        onStart={onStartSession}
        onBackToDashboard={onBackToDashboard}
      />
    )
  }

  return (
    <SessionSummaryStep
      dailyPlan={dailyPlan}
      onBackToDashboard={onBackToDashboard}
      onAskProfessor={onAskProfessor}
    />
  )
}
