import { useState } from "react"
import type {
  PlannerDailyPlan,
  PlannerProfessorConversationMessage
} from "./PlannerTypes"
import { useTranslation } from "react-i18next"

export default function SessionSummaryStep({
  dailyPlan,
  onBackToDashboard,
  onAskProfessor
}: {
  dailyPlan: PlannerDailyPlan
  onBackToDashboard: () => void
  onAskProfessor?: (
    question: string,
    conversation: PlannerProfessorConversationMessage[]
  ) => Promise<string>
}) {
  const { t: translate } = useTranslation()
  const summary = dailyPlan.summary
  const isAssessmentPlan = dailyPlan.planType === "assessment"
  const [question, setQuestion] = useState("")
  const [conversation, setConversation] = useState<PlannerProfessorConversationMessage[]>([])
  const [sendingQuestion, setSendingQuestion] = useState(false)
  const [questionError, setQuestionError] = useState("")

  const canAskProfessor = !isAssessmentPlan && Boolean(onAskProfessor)

  async function handleAskProfessor() {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || !onAskProfessor || sendingQuestion) {
      return
    }

    setSendingQuestion(true)
    setQuestionError("")

    const nextConversation: PlannerProfessorConversationMessage[] = [
      ...conversation,
      {
        role: "student",
        content: trimmedQuestion
      }
    ]

    setConversation(nextConversation)
    setQuestion("")

    try {
      const answer = await onAskProfessor(trimmedQuestion, conversation)

      if (answer) {
        setConversation([
          ...nextConversation,
          {
            role: "professor",
            content: answer
          }
        ])
      }
    } catch (error) {
      setConversation(conversation)
      setQuestion(trimmedQuestion)
      setQuestionError(
        error instanceof Error
          ? error.message
          : translate("stats.The Professor could not answer right now.")
      )
    } finally {
      setSendingQuestion(false)
    }
  }

  return (
    <div style={container}>
      <section style={heroCard}>
        <div style={eyebrow}>
          {translate(isAssessmentPlan ? "stats.Assessment Module Summary" : "stats.Module Summary")}
        </div>
        <h2 style={title}>{translate("stats.Module completed", { module: dailyPlan.day })}</h2>
        {isAssessmentPlan ? (
          <p style={paragraph}>
            {translate("stats.This module has been recorded. The evidence collected here will contribute to your learning profile, and the next module will continue the assessment.")}
          </p>
        ) : summary.professorDebrief && (
          <p style={paragraph}>{summary.professorDebrief}</p>
        )}
      </section>

      <section style={card}>
        <div style={sectionTitle}>
          {translate(isAssessmentPlan ? "stats.Assessment Data" : "stats.Module Data")}
        </div>
        <div style={dataGrid}>
          <DataPoint label={translate("stats.Flashcards")} value={String(summary.sessionData.flashcards)} />
          <DataPoint label={translate("stats.Quiz")} value={String(summary.sessionData.quiz)} />
          <DataPoint label={translate("stats.Accuracy")} value={summary.sessionData.accuracy} />
          <DataPoint label={translate("stats.Time")} value={summary.sessionData.time} />
        </div>
      </section>

      {!isAssessmentPlan && summary.homeworkRecommendations.length > 0 && (
        <section style={card}>
          <div style={sectionTitle}>{translate("stats.Homework Recommendations")}</div>
          <ul style={homeworkList}>
            {summary.homeworkRecommendations.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {!isAssessmentPlan && (summary.activeRecall || summary.officeHours) && (
        <div style={twoColumn}>
          {summary.activeRecall && (
            <section style={infoBox}>
              <div style={boxTitle}>{translate("stats.Optional Active Recall")}</div>
              <p style={boxText}>{summary.activeRecall.message}</p>
            </section>
          )}

          {summary.officeHours && (
            <section style={infoBox}>
              <div style={boxTitle}>{translate("stats.Ask the Professor")}</div>
              <p style={boxText}>{summary.officeHours.message}</p>
            </section>
          )}
        </div>
      )}

      {canAskProfessor && (
        <section style={card}>
          <div style={sectionTitle}>{translate("stats.Ask the Professor")}</div>
          <p style={boxText}>
            {translate("stats.If something is still unclear, ask me now while this module is still fresh.")}
          </p>

          {conversation.length > 0 && (
            <div style={conversationList}>
              {conversation.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    ...chatBubble,
                    ...(message.role === "student" ? studentBubble : professorBubble)
                  }}
                >
                  <div style={chatRole}>
                    {translate(message.role === "student" ? "stats.You" : "stats.Professor")}
                  </div>
                  <div>{message.content}</div>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder={translate("stats.Ask a question about this module")}
            style={questionInput}
            rows={4}
          />

          {questionError && (
            <div style={errorText}>{questionError}</div>
          )}

          <button
            onClick={handleAskProfessor}
            disabled={!question.trim() || sendingQuestion}
            style={{
              ...secondaryButton,
              opacity: !question.trim() || sendingQuestion ? 0.55 : 1,
              cursor: !question.trim() || sendingQuestion ? "not-allowed" : "pointer"
            }}
          >
            {sendingQuestion
              ? translate("stats.Asking the Professor...")
              : translate("stats.Send question")}
          </button>
        </section>
      )}

      <button onClick={onBackToDashboard} style={primaryButton}>
        {translate(isAssessmentPlan ? "stats.Back to Assessment" : "stats.Back to Study Plan")}
      </button>
    </div>
  )
}

function DataPoint({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={dataPoint}>
      <div style={dataValue}>{value}</div>
      <div style={dataLabel}>{label}</div>
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 980,
  margin: "0 auto"
}

const heroCard = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 26,
  marginBottom: 22
}

const eyebrow = {
  color: "#36F2ED",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  marginBottom: 8
}

const title = {
  color: "white",
  fontSize: 30,
  fontWeight: 900,
  margin: "0 0 12px"
}

const paragraph = {
  color: "#cbd5e1",
  lineHeight: 1.7,
  margin: 0
}

const card = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22
}

const sectionTitle = {
  color: "white",
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 16
}

const dataGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10
}

const dataPoint = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 14
}

const dataValue = {
  color: "#36F2ED",
  fontWeight: 900,
  fontSize: 22,
  marginBottom: 4
}

const dataLabel = {
  color: "#9ca3af",
  fontSize: 12
}

const homeworkList = {
  color: "#cbd5e1",
  lineHeight: 1.8,
  margin: 0,
  paddingLeft: 20
}

const twoColumn = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  marginBottom: 22
}

const infoBox = {
  background: "#052b2a",
  border: "1px solid #0e6c69",
  borderRadius: 16,
  padding: 18
}

const boxTitle = {
  color: "#36F2ED",
  fontWeight: 900,
  marginBottom: 8
}

const boxText = {
  color: "#cbd5e1",
  lineHeight: 1.6,
  margin: 0
}

const conversationList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  marginTop: 16,
  marginBottom: 16
}

const chatBubble = {
  borderRadius: 14,
  padding: 14,
  color: "#d1d5db",
  lineHeight: 1.6,
  maxWidth: "86%"
}

const studentBubble = {
  alignSelf: "flex-end",
  background: "#17324f",
  border: "1px solid #2b7dcb"
}

const professorBubble = {
  alignSelf: "flex-start",
  background: "#052b2a",
  border: "1px solid #0e6c69"
}

const chatRole = {
  color: "#36F2ED",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 6
}

const questionInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#0b111d",
  border: "1px solid #374151",
  borderRadius: 12,
  padding: 14,
  color: "white",
  resize: "vertical" as const,
  marginTop: 16,
  marginBottom: 12,
  fontFamily: "inherit",
  lineHeight: 1.5
}

const secondaryButton = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #2b7dcb",
  background: "rgba(43, 125, 203, 0.18)",
  color: "white",
  fontWeight: 800
}

const errorText = {
  color: "#fca5a5",
  fontSize: 13,
  marginBottom: 10
}

const primaryButton = {
  width: "100%",
  padding: "13px 18px",
  borderRadius: 10,
  border: "none",
  background: "#2b7dcb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer"
}
