import DailyBriefingStep from "./DailyBriefingStep"
import SessionSummaryStep from "./SessionSummaryStep"
import type { PlannerDailyPlan } from "./PlannerTypes"

type DailySessionStep =
  | "briefing"
  | "summary"

export default function PlannerDailySession({
  dailyPlan,
  mode,
  onStartSession,
  onBackToDashboard
}: {
  dailyPlan: PlannerDailyPlan
  mode: DailySessionStep
  onStartSession: () => void
  onBackToDashboard: () => void
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
    />
  )
}
