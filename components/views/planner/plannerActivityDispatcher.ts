import type { PlannerActivity } from "./PlannerTypes"

type GenerateFlashcards = (overrides: {
  selectedTopics?: any[]
  numCards?: number
}) => Promise<void>

type GenerateQuiz = (overrides: {
  selectedTopics?: any[]
  numQuestions?: number
  difficulty?: string
  questionStyle?: string
  secondsPerAnswer?: number | null
}) => Promise<void>

export async function dispatchPlannerActivity({
  activity,
  generateFlashcards,
  generateQuiz,
  onFlashcardsStart
}: {
  activity: PlannerActivity
  generateFlashcards: GenerateFlashcards
  generateQuiz: GenerateQuiz
  onFlashcardsStart?: () => void
}) {
  const selectedTopics = activity.configuration.selectedTopics || []

  if (activity.type === "flashcards") {
    onFlashcardsStart?.()
    await generateFlashcards({
      selectedTopics,
      numCards: activity.configuration.numCards ?? activity.configuration.count
    })
    return
  }

  if (activity.type === "quiz") {
    await generateQuiz({
      selectedTopics,
      numQuestions: activity.configuration.numQuestions ?? activity.configuration.count,
      difficulty: activity.configuration.difficulty,
      secondsPerAnswer: activity.configuration.secondsPerAnswer,
      questionStyle:
        activity.configuration.questionStyle ?? activity.configuration.style
    })
    return
  }

  throw new Error(`Unsupported Planner activity type: ${activity.type}`)
}
