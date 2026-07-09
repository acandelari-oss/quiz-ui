type QuizQuestionLike = {
  correct_answer?: unknown
  correct?: unknown
  answer?: unknown
  options?: unknown
}

function normalizeAnswerText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function getAnswerKey(question: QuizQuestionLike) {
  if (
    question.correct_answer !== undefined
    && question.correct_answer !== null
    && String(question.correct_answer).trim() !== ""
  ) {
    return question.correct_answer
  }

  if (
    question.correct !== undefined
    && question.correct !== null
    && String(question.correct).trim() !== ""
  ) {
    return question.correct
  }

  if (
    question.answer !== undefined
    && question.answer !== null
    && String(question.answer).trim() !== ""
  ) {
    return question.answer
  }

  return null
}

export function resolveCorrectAnswerIndex(question: QuizQuestionLike): number | null {
  const options = Array.isArray(question.options) ? question.options : []
  const answerKey = getAnswerKey(question)

  if (answerKey === null) {
    return null
  }

  if (typeof answerKey === "number" && Number.isInteger(answerKey)) {
    return answerKey >= 0 && answerKey < options.length ? answerKey : null
  }

  const rawAnswer = String(answerKey).trim()

  if (!rawAnswer) {
    return null
  }

  if (/^\d+$/.test(rawAnswer)) {
    const numericIndex = Number(rawAnswer)
    return numericIndex >= 0 && numericIndex < options.length
      ? numericIndex
      : null
  }

  if (/^[a-e]$/i.test(rawAnswer)) {
    const letterIndex = rawAnswer.toUpperCase().charCodeAt(0) - 65
    return letterIndex >= 0 && letterIndex < options.length
      ? letterIndex
      : null
  }

  const normalizedAnswer = normalizeAnswerText(rawAnswer)
  const textIndex = options.findIndex(
    option => normalizeAnswerText(option) === normalizedAnswer
  )

  return textIndex >= 0 ? textIndex : null
}

export function isCorrectQuizOption(
  question: QuizQuestionLike,
  optionIndex: number
) {
  return resolveCorrectAnswerIndex(question) === optionIndex
}
