import HomeworkAccordion from "./HomeworkAccordion"
import ProfessorDebriefs from "./ProfessorDebriefs"
import WeeklyBriefing from "./WeeklyBriefing"
import WeeklyCalendar from "./WeeklyCalendar"
import WeeklyStatistics from "./WeeklyStatistics"
import type { PlannerDay, PlannerMockData } from "./PlannerTypes"
import { useTranslation } from "react-i18next"
import { useState } from "react"

export default function PlannerDashboard({
  plan,
  onOpenDailySession
}: {
  plan: PlannerMockData
  onOpenDailySession: (day: PlannerDay) => void
}) {
  const { t: translate } = useTranslation()
  const [introExpanded, setIntroExpanded] = useState(true)
  const currentModule =
    plan.calendar.find(day => day.status === "today")
    || plan.calendar.find(day => day.day === plan.todayPlan.day)
  const isAssessmentPlan = plan.planType === "assessment"

  return (
    <div className="planner-mobile-dashboard" style={container}>
      <section className="planner-intro-panel" style={plannerIntroPanel}>
        <div style={plannerIntroHeader}>
          <h2 className="planner-intro-title" style={plannerIntroTitle}>
            <img
              src="/icons/professor.svg"
              alt=""
              style={plannerIntroIcon}
            />
            {translate("stats.Welcome to your Study Planner")}
          </h2>
          <button
            type="button"
            style={plannerIntroToggle}
            onClick={() => setIntroExpanded(current => !current)}
          >
            {introExpanded
              ? translate("stats.Hide intro")
              : translate("stats.Show intro")}
          </button>
        </div>

        {introExpanded && (
          <div className="planner-intro-body" style={plannerIntroBody}>
            <p style={plannerIntroParagraph}>
              {translate("stats.Planner intro welcome")}
            </p>
            <p style={plannerIntroParagraph}>
              {translate("stats.Planner intro purpose")}
            </p>
            <p style={plannerIntroParagraph}>
              {translate("stats.Planner intro flexibility")}
            </p>
            <p style={plannerIntroParagraph}>
              {translate("stats.Planner intro debrief")}
            </p>
            <p style={plannerIntroParagraph}>
              {translate("stats.Planner intro dashboard")}
            </p>
          </div>
        )}
      </section>

      <section className="planner-mobile-cta-card" style={ctaCard}>
        {plan.todaySessionCompleted ? (
          <>
            <div>
              <div className="planner-mobile-cta-title" style={ctaTitle}>
                {translate(isAssessmentPlan
                  ? "stats.Current assessment module is complete"
                  : "stats.Current module is complete")}
              </div>
              <div className="planner-mobile-cta-text" style={ctaText}>
                {translate(isAssessmentPlan
                  ? "stats.This assessment module has been recorded."
                  : "stats.The Professor can offer an optional extra module based on the same work.")}
              </div>
            </div>
            <button
              onClick={() => currentModule && onOpenDailySession(currentModule)}
              style={secondaryButton}
              className="planner-mobile-cta-button"
            >
              {translate(isAssessmentPlan
                ? "stats.Continue Assessment"
                : "stats.Start Extra Module")}
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="planner-mobile-cta-title" style={ctaTitle}>
                {translate(isAssessmentPlan
                  ? "stats.Current assessment module is ready"
                  : "stats.Current module is ready")}
              </div>
              <div className="planner-mobile-cta-text" style={ctaText}>
                {translate(isAssessmentPlan
                  ? "stats.Answer honestly. If you are unsure, choose your best answer."
                  : "stats.Start the current module when you are ready.")}
              </div>
            </div>
            <button
              onClick={() => currentModule && onOpenDailySession(currentModule)}
              style={primaryButton}
              className="planner-mobile-cta-button"
            >
              {translate(isAssessmentPlan
                ? "stats.Start Assessment Module"
                : "stats.Start Current Module")}
            </button>
          </>
        )}
      </section>

      {isAssessmentPlan && (
        <section style={assessmentIntroCard}>
          <div style={assessmentEyebrow}>
            {translate("stats.Professor Assessment")}
          </div>
          <h2 style={assessmentTitle}>
            {translate("stats.This is not an exam")}
          </h2>
          <p style={assessmentText}>
            {translate("stats.The goal is not to judge your score, but to understand your current preparation. Every answer helps me build your first personalised Study Plan from objective evidence.")}
          </p>
        </section>
      )}

      <WeeklyCalendar
        weekLabel={plan.weekLabel}
        days={plan.calendar}
        planType={plan.planType}
        onDayClick={onOpenDailySession}
      />

      {!isAssessmentPlan && <WeeklyBriefing briefing={plan.weeklyBriefing} />}

      <WeeklyStatistics statistics={plan.statistics} planType={plan.planType} />

      {!isAssessmentPlan && <ProfessorDebriefs debriefs={plan.debriefs} />}

      {!isAssessmentPlan && <HomeworkAccordion homework={plan.homework} />}
      <style jsx global>{`
        @media (max-width: 900px) {
          .planner-mobile-dashboard {
            padding: 10px 10px 16px !important;
            max-width: none !important;
          }

          .planner-intro-panel {
            padding: 14px !important;
            margin-bottom: 12px !important;
            border-radius: 12px !important;
          }

          .planner-intro-title {
            font-size: 17px !important;
          }

          .planner-intro-body {
            margin-top: 10px !important;
          }

          .planner-mobile-cta-card {
            padding: 12px !important;
            margin-bottom: 10px !important;
            border-radius: 12px !important;
            gap: 10px !important;
          }

          .planner-mobile-cta-title {
            font-size: 16px !important;
            margin-bottom: 2px !important;
          }

          .planner-mobile-cta-text {
            font-size: 13px !important;
            line-height: 1.35 !important;
          }

          .planner-mobile-cta-button {
            width: 100%;
            padding: 10px 12px !important;
            border-radius: 9px !important;
          }
        }
      `}</style>
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 1280,
  margin: "0 auto"
}

const plannerIntroPanel = {
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(54, 242, 237, 0.18)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.18)"
}

const plannerIntroHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14
}

const plannerIntroTitle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#36f2ed",
  fontSize: 21,
  fontWeight: 900,
  margin: 0
}

const plannerIntroIcon = {
  width: 26,
  height: 26,
  objectFit: "contain" as const,
  flexShrink: 0
}

const plannerIntroToggle = {
  background: "transparent",
  border: "1px solid rgba(148, 163, 184, 0.32)",
  borderRadius: 999,
  color: "#cbd5e1",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  padding: "6px 11px",
  whiteSpace: "nowrap" as const
}

const plannerIntroBody = {
  marginTop: 14,
  maxWidth: 980
}

const plannerIntroParagraph = {
  color: "#e5e7eb",
  fontSize: 15,
  lineHeight: 1.58,
  margin: "8px 0"
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

const assessmentIntroCard = {
  background: "#0b111d",
  border: "1px solid #0e6c69",
  borderRadius: 18,
  padding: 22,
  marginBottom: 22
}

const assessmentEyebrow = {
  color: "#36F2ED",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  marginBottom: 8
}

const assessmentTitle = {
  color: "white",
  fontSize: 26,
  fontWeight: 900,
  margin: "0 0 10px"
}

const assessmentText = {
  color: "#cbd5e1",
  lineHeight: 1.7,
  margin: 0
}
