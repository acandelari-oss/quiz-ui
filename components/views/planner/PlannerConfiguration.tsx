import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { PlannerGenerationConfiguration } from "../../../services/plannerApi"
import {
  EDUCATIONAL_UNIT_THRESHOLD,
  type EducationalUnitChapter
} from "../../../utils/educationalUnitTitles"

type SurveyAnswer = "confident" | "practice" | "unsure"

type PlannerConfigurationProps = {
  showLearningSurvey: boolean
  categories: string[]
  onGenerate: (configuration: PlannerGenerationConfiguration) => Promise<void> | void
  onGenerateAssessment?: (configuration: PlannerGenerationConfiguration) => Promise<void> | void
  generating?: boolean
}

type SurveyCategoryGroup = {
  key: string
  title: string
  showTitle: boolean
  items: string[]
}

type NewProjectOnboardingStep = "choice" | "preferences" | "survey"

const studyDurationOptions = [
  { value: "30 minutes", labelKey: "stats.30 minutes" },
  { value: "45 minutes", labelKey: "stats.45 minutes" },
  { value: "60 minutes", labelKey: "stats.60 minutes" }
]

const questionPaceOptions = [
  { value: "30 sec/question", labelKey: "stats.30 sec/question" },
  { value: "60 sec/question", labelKey: "stats.60 sec/question" },
  { value: "90 sec/question", labelKey: "stats.90 sec/question" },
  { value: "120 sec/question", labelKey: "stats.120 sec/question" }
]

const quizStyleOptions = [
  { value: "Exam", labelKey: "stats.Exam" },
  { value: "Balanced", labelKey: "stats.Balanced" },
  { value: "Reasoning", labelKey: "stats.Reasoning" }
]

const surveyOptions: Array<{
  value: SurveyAnswer
  labelKey: string
}> = [
  {
    value: "confident",
    labelKey: "stats.I know it"
  },
  {
    value: "unsure",
    labelKey: "stats.I'm not sure"
  },
  {
    value: "practice",
    labelKey: "stats.I don't know"
  }
]

export default function PlannerConfiguration({
  showLearningSurvey,
  categories,
  onGenerate,
  onGenerateAssessment,
  generating = false
}: PlannerConfigurationProps) {
  const { t: translate } = useTranslation()
  const uniqueCategories = useMemo(
    () => Array.from(new Set(categories.filter(Boolean))).sort(),
    [categories]
  )
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, SurveyAnswer>>({})
  const [surveyCategoryGroups, setSurveyCategoryGroups] = useState<SurveyCategoryGroup[]>([])
  const [studyDuration, setStudyDuration] = useState("")
  const [questionPace, setQuestionPace] = useState("90 sec/question")
  const [quizStyle, setQuizStyle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [onboardingStep, setOnboardingStep] =
    useState<NewProjectOnboardingStep>("choice")
  const [selectedOnboardingPath, setSelectedOnboardingPath] =
    useState<"self_assessment" | "professor_assessment" | null>(null)

  const surveyComplete =
    !showLearningSurvey
    || selectedOnboardingPath === "professor_assessment"
    || (
      uniqueCategories.length > 0
      && uniqueCategories.every(category => Boolean(surveyAnswers[category]))
    )
  const preferencesComplete = Boolean(studyDuration && questionPace && quizStyle)
  const isGenerating = generating || submitting
  const canGenerate = surveyComplete && preferencesComplete && !isGenerating
  const canContinueFromSurvey = surveyComplete && !isGenerating

  const updateSurveyAnswer = (category: string, value: SurveyAnswer) => {
    setSurveyAnswers(current => ({
      ...current,
      [category]: value
    }))
  }

  const updateSurveyGroup = (categories: string[], value: SurveyAnswer) => {
    setSurveyAnswers(current => ({
      ...current,
      ...Object.fromEntries(categories.map(category => [category, value]))
    }))
  }

  const getGroupAnswer = (categories: string[]) => {
    const answers = categories
      .map(category => surveyAnswers[category])
      .filter(Boolean)

    if (answers.length !== categories.length) {
      return null
    }

    return answers.every(answer => answer === answers[0])
      ? answers[0]
      : null
  }

  useEffect(() => {
    let cancelled = false

    async function fetchEducationalUnits() {
      if (uniqueCategories.length < EDUCATIONAL_UNIT_THRESHOLD) {
        if (!cancelled) {
          setSurveyCategoryGroups([
            {
              key: "categories",
              title: "Categories",
              showTitle: false,
              items: uniqueCategories
            }
          ])
        }

        return
      }

      try {
        const response = await fetch("/api/educational-units", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categories: uniqueCategories,
            language: translate("stats.study_language_value")
          })
        })
        const data = response.ok ? await response.json() : null
        const educationalUnits = Array.isArray(data?.educational_units)
          ? data.educational_units as EducationalUnitChapter[]
          : []

        if (!cancelled) {
          setSurveyCategoryGroups(
            mapEducationalUnitsToSurveyGroups(
              educationalUnits,
              uniqueCategories
            )
          )
        }
      } catch {
        if (!cancelled) {
          setSurveyCategoryGroups([
            {
              key: "categories",
              title: "Categories",
              showTitle: false,
              items: uniqueCategories
            }
          ])
        }
      }
    }

    fetchEducationalUnits()

    return () => {
      cancelled = true
    }
  }, [uniqueCategories, translate])

  const handleGenerate = async () => {
    if (!canGenerate) return

    setSubmitting(true)

    try {
      const configuration = {
        survey: (
          showLearningSurvey
          && selectedOnboardingPath !== "professor_assessment"
        ) ? surveyAnswers : null,
        study_language: translate("stats.study_language_value"),
        preferences: {
          studyDurationMinutes: parseStudyDuration(studyDuration),
          questionPaceSeconds: parseQuestionPace(questionPace),
          questionStyle: parseQuizStyle(quizStyle)
        }
      }

      if (selectedOnboardingPath === "professor_assessment" && onGenerateAssessment) {
        await onGenerateAssessment(configuration)
      } else {
        await onGenerate(configuration)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderSurvey = () => (
    <>
      {showLearningSurvey && (
        <section style={card}>
          <div style={sectionTitle}>{translate("stats.Learning Survey")}</div>
          <p style={paragraph}>
            {translate("stats.I don't know you well enough yet to build a reliable study plan.")}
          </p>
          <p style={paragraph}>
            {translate("stats.Help me understand where we should start.")}
          </p>

          {uniqueCategories.length === 0 ? (
            <div style={emptyState}>
              {translate("stats.No project categories are available yet.")}
            </div>
          ) : (
            <div style={categoryList}>
              {surveyCategoryGroups.map(group => (
                <div key={group.key} style={groupContainer}>
                  {group.showTitle ? (
                    <div style={educationalUnitCard}>
                      <div style={educationalUnitTitle}>
                        {group.title}
                      </div>
                      <ul style={educationalUnitCategoryList}>
                        {group.items.map(category => (
                          <li key={category}>{category}</li>
                        ))}
                      </ul>

                      <div style={optionGrid}>
                        {surveyOptions.map(option => {
                          const groupAnswer = getGroupAnswer(group.items)

                          return (
                            <label
                              key={option.value}
                              style={{
                                ...optionLabel,
                                ...(groupAnswer === option.value
                                  ? selectedOptionLabel
                                  : {})
                              }}
                            >
                              <input
                                type="radio"
                                name={`planner-survey-${group.key}`}
                                value={option.value}
                                checked={groupAnswer === option.value}
                                onChange={() => updateSurveyGroup(group.items, option.value)}
                                style={radioInput}
                              />
                              {translate(option.labelKey)}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    group.items.map(category => (
                      <div key={category} style={categoryRow}>
                        <div style={categoryName}>{category}</div>
                        <div style={optionGrid}>
                          {surveyOptions.map(option => (
                            <label
                              key={option.value}
                              style={{
                                ...optionLabel,
                                ...(surveyAnswers[category] === option.value
                                  ? selectedOptionLabel
                                  : {})
                              }}
                            >
                              <input
                                type="radio"
                                name={`planner-survey-${category}`}
                                value={option.value}
                                checked={surveyAnswers[category] === option.value}
                                onChange={() => updateSurveyAnswer(category, option.value)}
                                style={radioInput}
                              />
                              {translate(option.labelKey)}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )

  const renderPreferences = () => (
      <section style={card}>
        <div style={sectionTitle}>{translate("stats.Study Plan Preferences")}</div>

        <PreferenceGroup
          label={translate("stats.Study duration")}
          options={studyDurationOptions}
          value={studyDuration}
          onChange={setStudyDuration}
          translate={translate}
        />

        <PreferenceGroup
          label={translate("stats.Question pace")}
          options={questionPaceOptions}
          value={questionPace}
          onChange={setQuestionPace}
          translate={translate}
        />

        <PreferenceGroup
          label={translate("stats.Quiz Style")}
          options={quizStyleOptions}
          value={quizStyle}
          onChange={setQuizStyle}
          translate={translate}
        />
      </section>
  )

  const learningPathSelected = showLearningSurvey && selectedOnboardingPath !== null

  const renderOnboardingChoice = () => (
    <section style={card}>
      <div style={sectionTitle}>
        {translate("stats.Choose how to build the first Study Plan")}
      </div>
      <div style={onboardingChoiceGrid}>
        <button
          type="button"
          style={{
            ...onboardingOptionCard,
            ...(selectedOnboardingPath === "self_assessment"
              ? selectedOnboardingOptionCard
              : {}),
            ...(learningPathSelected && selectedOnboardingPath !== "self_assessment"
              ? disabledOnboardingOptionCard
              : {})
          }}
          onClick={learningPathSelected ? undefined : () => {
            setSelectedOnboardingPath("self_assessment")
            setOnboardingStep("survey")
          }}
          aria-pressed={selectedOnboardingPath === "self_assessment"}
        >
          <div style={onboardingOptionTitle}>
            {translate("stats.I already know part of the material")}
          </div>
          <p style={onboardingOptionDescription}>
            {translate("stats.If you already know some topics better than others, tell the Professor where you feel confident and where you need more practice.")}
          </p>
          <span style={onboardingOptionAction}>
            {translate("stats.Continue")}
          </span>
        </button>

        <button
          type="button"
          style={{
            ...onboardingOptionCard,
            ...(selectedOnboardingPath === "professor_assessment"
              ? selectedOnboardingOptionCard
              : {}),
            ...(learningPathSelected && selectedOnboardingPath !== "professor_assessment"
              ? disabledOnboardingOptionCard
              : {})
          }}
          onClick={learningPathSelected ? undefined : () => {
            setSelectedOnboardingPath("professor_assessment")
            setOnboardingStep("preferences")
          }}
          aria-pressed={selectedOnboardingPath === "professor_assessment"}
        >
          <div style={onboardingOptionTitle}>
            {translate("stats.Let the Professor assess me")}
          </div>
          <p style={onboardingOptionDescription}>
            {translate("stats.The Professor will assess your initial preparation objectively before preparing your first Study Plan.")}
          </p>
          {!learningPathSelected && (
            <span style={onboardingOptionAction}>
              {translate("stats.Continue")}
            </span>
          )}
        </button>
      </div>
    </section>
  )

  return (
    <div style={container}>
      <section style={heroCard}>
        <div style={eyebrow}>{translate("stats.Professor Planner")}</div>
        <h2 style={title}>{translate("stats.Configure your study plan")}</h2>
        <p style={paragraph}>
          {translate("stats.Choose the minimum planning information the Professor needs before generating your first study plan.")}
        </p>
      </section>

      {!showLearningSurvey && renderPreferences()}

      {showLearningSurvey && renderOnboardingChoice()}

      {showLearningSurvey && onboardingStep === "survey" && renderSurvey()}

      {showLearningSurvey && onboardingStep === "preferences" && renderPreferences()}

      {showLearningSurvey && onboardingStep === "survey" ? (
        <button
          style={{
            ...primaryButton,
            ...(canContinueFromSurvey ? {} : disabledButton)
          }}
          disabled={!canContinueFromSurvey}
          onClick={() => setOnboardingStep("preferences")}
          title={translate("stats.Complete the required choices to continue.")}
        >
          {translate("stats.Continue")}
        </button>
      ) : (
        (!showLearningSurvey || onboardingStep === "preferences") && (
          <button
            style={{
              ...primaryButton,
              ...(canGenerate ? {} : disabledButton)
            }}
            disabled={!canGenerate}
            onClick={handleGenerate}
            title={translate("stats.Complete the required choices to generate a Study Plan.")}
          >
            {isGenerating
              ? translate("stats.Generating Study Plan…")
              : selectedOnboardingPath === "professor_assessment"
                ? translate("stats.Generate Assessment")
                : translate("stats.Generate Study Plan")}
          </button>
        )
      )}
    </div>
  )
}

function parseStudyDuration(value: string): PlannerGenerationConfiguration["preferences"]["studyDurationMinutes"] {
  return Number(value.replace(" minutes", "")) as PlannerGenerationConfiguration["preferences"]["studyDurationMinutes"]
}

function parseQuestionPace(value: string): PlannerGenerationConfiguration["preferences"]["questionPaceSeconds"] {
  return Number(value.replace(" sec/question", "")) as PlannerGenerationConfiguration["preferences"]["questionPaceSeconds"]
}

function parseQuizStyle(value: string): PlannerGenerationConfiguration["preferences"]["questionStyle"] {
  return value.toLowerCase() as PlannerGenerationConfiguration["preferences"]["questionStyle"]
}

function PreferenceGroup({
  label,
  options,
  value,
  onChange,
  translate
}: {
  label: string
  options: Array<{
    value: string
    labelKey: string
  }>
  value: string
  onChange: (value: string) => void
  translate: (key: string) => string
}) {
  return (
    <div style={preferenceGroup}>
      <div style={preferenceLabel}>{label}</div>
      <div style={preferenceOptions}>
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...optionButton,
              ...(value === option.value ? selectedOptionButton : {})
            }}
          >
            {translate(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

const container = {
  padding: 30,
  color: "white",
  maxWidth: 920,
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
  margin: "0 0 12px"
}

const card = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22,
  maxWidth: "100%",
  boxSizing: "border-box" as const,
  overflow: "hidden"
}

const sectionTitle = {
  color: "white",
  fontSize: 18,
  fontWeight: 800,
  marginBottom: 16
}

const emptyState = {
  color: "#9ca3af",
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 14
}

const categoryList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 14,
  marginTop: 18
}

const groupContainer = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12
}

const educationalUnitTitle = {
  color: "#36F2ED",
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 10
}

const educationalUnitCard = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 14,
  padding: 16
}

const educationalUnitCategoryList = {
  color: "#cbd5e1",
  lineHeight: 1.7,
  margin: "0 0 14px",
  paddingLeft: 20
}

const categoryRow = {
  background: "#0b111d",
  border: "1px solid #1f2937",
  borderRadius: 14,
  padding: 16
}

const categoryName = {
  color: "white",
  fontWeight: 800,
  marginBottom: 12
}

const optionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10
}

const optionLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #374151",
  background: "#111827",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#cbd5e1",
  fontWeight: 700,
  cursor: "pointer"
}

const selectedOptionLabel = {
  border: "1px solid #2b7dcb",
  color: "white",
  background: "#0f1f33"
}

const radioInput = {
  accentColor: "#2b7dcb"
}

const onboardingChoiceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const
}

const onboardingOptionCard = {
  position: "relative" as const,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: 220,
  textAlign: "left" as const,
  background: "#0b111d",
  border: "1px solid #374151",
  borderRadius: 16,
  padding: 20,
  color: "white",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between" as const,
  gap: 14,
  boxSizing: "border-box" as const,
  whiteSpace: "normal" as const,
  overflowWrap: "anywhere" as const,
  wordBreak: "normal" as const
}

const disabledOnboardingOptionCard = {
  opacity: 0.55,
  cursor: "not-allowed"
}

const selectedOnboardingOptionCard = {
  border: "1px solid #36F2ED",
  background: "#0f1f33",
  boxShadow: "0 0 0 1px rgba(54, 242, 237, 0.18)"
}

const onboardingOptionTitle = {
  color: "white",
  fontSize: 20,
  fontWeight: 900,
  marginBottom: 8,
  overflowWrap: "anywhere" as const
}

const onboardingOptionDescription = {
  color: "#cbd5e1",
  lineHeight: 1.65,
  margin: 0,
  overflowWrap: "anywhere" as const
}

const onboardingOptionAction = {
  color: "#36F2ED",
  fontWeight: 900
}

const comingSoonBadge = {
  alignSelf: "flex-start" as const,
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: 999,
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 900,
  padding: "5px 10px",
  textTransform: "uppercase" as const,
  letterSpacing: 0.7
}

const preferenceGroup = {
  marginBottom: 20
}

const preferenceLabel = {
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 800,
  marginBottom: 10
}

const preferenceOptions = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10
}

const optionButton = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #374151",
  background: "#0b111d",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 800
}

const selectedOptionButton = {
  border: "1px solid #2b7dcb",
  background: "#2b7dcb",
  color: "white"
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

const disabledButton = {
  opacity: 0.45,
  cursor: "not-allowed"
}

function mapEducationalUnitsToSurveyGroups(
  educationalUnits: EducationalUnitChapter[],
  categories: string[]
): SurveyCategoryGroup[] {
  const availableCategories = new Set(categories)
  const usedCategories = new Set<string>()
  const groups = educationalUnits
    .map((unit, index) => {
      const items = unit.categories.filter(category => availableCategories.has(category))

      items.forEach(category => usedCategories.add(category))

      return {
        key: `${index + 1}:${unit.title}:${unit.categories.join("|")}`,
        title: unit.title,
        showTitle: true,
        items
      }
    })
    .filter(group => group.items.length > 0)

  const remainingCategories = categories.filter(category => !usedCategories.has(category))

  if (remainingCategories.length > 0) {
    groups.push({
      key: "remaining-categories",
      title: "Categories",
      showTitle: false,
      items: remainingCategories
    })
  }

  return groups.length > 0
    ? groups
    : [
      {
        key: "categories",
        title: "Categories",
        showTitle: false,
        items: categories
      }
    ]
}
