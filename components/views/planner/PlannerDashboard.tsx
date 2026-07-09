import HomeworkAccordion from "./HomeworkAccordion"
import ProfessorDebriefs from "./ProfessorDebriefs"
import WeeklyBriefing from "./WeeklyBriefing"
import WeeklyCalendar from "./WeeklyCalendar"
import WeeklyStatistics from "./WeeklyStatistics"
import type { PlannerDay, PlannerMockData } from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function PlannerDashboard({
  plan,
  onOpenDailySession
}: {
  plan: PlannerMockData
  onOpenDailySession: (day: PlannerDay) => void
}) {
  const { t: translate } = useTranslation()
  const currentModule =
    plan.calendar.find(day => day.status === "today")
    || plan.calendar.find(day => day.day === plan.todayPlan.day)

  return (
    <div style={container}>
      <section style={ctaCard}>
        {plan.todaySessionCompleted ? (
          <>
            <div>
              <div style={ctaTitle}>{translate("stats.Current module is complete")}</div>
              <div style={ctaText}>
                {translate("stats.The Professor can offer an optional extra module based on the same work.")}
              </div>
            </div>
            <button
              onClick={() => currentModule && onOpenDailySession(currentModule)}
              style={secondaryButton}
            >
              {translate("stats.Start Extra Module")}
            </button>
          </>
        ) : (
          <>
            <div>
              <div style={ctaTitle}>{translate("stats.Current module is ready")}</div>
              <div style={ctaText}>
                {translate("stats.Start the current module when you are ready.")}
              </div>
            </div>
            <button
              onClick={() => currentModule && onOpenDailySession(currentModule)}
              style={primaryButton}
            >
              {translate("stats.Start Current Module")}
            </button>
          </>
        )}
      </section>

      <WeeklyCalendar
        weekLabel={plan.weekLabel}
        days={plan.calendar}
        onDayClick={onOpenDailySession}
      />

      <WeeklyBriefing briefing={plan.weeklyBriefing} />

      <WeeklyStatistics statistics={plan.statistics} />

      <ProfessorDebriefs debriefs={plan.debriefs} />

      <HomeworkAccordion homework={plan.homework} />
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 1280,
  margin: "0 auto"
}

const ctaCard = {
  background: "#0b111d",
  border: "1px solid #2b7dcb",
  borderRadius: 16,
  padding: 18,
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap" as const
}

const ctaTitle = {
  color: "white",
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 4
}

const ctaText = {
  color: "#cbd5e1",
  fontSize: 14
}

const primaryButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2b7dcb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer"
}

const secondaryButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #36F2ED",
  background: "transparent",
  color: "#36F2ED",
  fontWeight: 800,
  cursor: "pointer"
}
