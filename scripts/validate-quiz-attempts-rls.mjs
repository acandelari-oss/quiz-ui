import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"

const QUIZ_UI_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
)

const VALIDATION_TOPIC = "RLS_VALIDATION"

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const contents = fs.readFileSync(filePath, "utf8")

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value
    }
  }
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`${name}: MISSING`)
    process.exitCode = 1
    return null
  }
  return value
}

function sanitizeSupabaseError(error) {
  if (!error) return null
  return {
    message: error.message,
    code: error.code,
    status: error.status,
    name: error.name
  }
}

function printResult(label, passed, extra = "") {
  const status = passed ? "PASS" : "FAIL"
  console.log(`${label}: ${status}${extra ? ` — ${extra}` : ""}`)
}

function createAttemptPayload({
  id = crypto.randomUUID(),
  userId,
  projectId,
  quizId
}) {
  return {
    id,
    quiz_id: quizId,
    user_id: userId,
    score: 0,
    total_questions: 1,
    answers: [],
    topic: VALIDATION_TOPIC,
    project_id: projectId,
    question_index: Math.floor(Date.now() / 1000),
    target_duration_seconds: 0,
    actual_duration_seconds: 0
  }
}

async function expectInsertBlocked(label, client, payload, cleanupIds) {
  const result = await client
    .from("quiz_attempts")
    .insert(payload)
    .select("id")
    .single()

  if (result.error) {
    printResult(
      label,
      true,
      `blocked=${JSON.stringify(sanitizeSupabaseError(result.error))}`
    )
    return true
  }

  if (result.data?.id) {
    cleanupIds.push(result.data.id)
  }

  printResult(label, false, "unexpected insert success")
  return false
}

async function expectUpdateBlocked({
  label,
  client,
  attemptId,
  payload,
  expectedOriginal
}) {
  const result = await client
    .from("quiz_attempts")
    .update(payload)
    .eq("id", attemptId)
    .eq("topic", VALIDATION_TOPIC)
    .select("id,user_id,project_id,quiz_id")

  if (result.error) {
    printResult(
      label,
      true,
      `blocked=${JSON.stringify(sanitizeSupabaseError(result.error))}`
    )
    return true
  }

  const verification = await client
    .from("quiz_attempts")
    .select("id,user_id,project_id,quiz_id")
    .eq("id", attemptId)
    .eq("topic", VALIDATION_TOPIC)
    .single()

  if (verification.error || !verification.data) {
    printResult(
      label,
      false,
      `row not visible after update attempt=${JSON.stringify(
        sanitizeSupabaseError(verification.error)
      )}`
    )
    return false
  }

  const unchanged =
    verification.data.user_id === expectedOriginal.user_id
    && verification.data.project_id === expectedOriginal.project_id
    && verification.data.quiz_id === expectedOriginal.quiz_id

  printResult(
    label,
    unchanged && (result.data ?? []).length === 0,
    `returned_rows=${(result.data ?? []).length}`
  )

  return unchanged && (result.data ?? []).length === 0
}

loadEnvFile(path.join(QUIZ_UI_ROOT, ".env.local"))
loadEnvFile(path.join(QUIZ_UI_ROOT, ".env"))

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const testUserAEmail = requireEnv("TEST_USER_A_EMAIL")
const testUserAPassword = requireEnv("TEST_USER_A_PASSWORD")
const aProjectId = requireEnv("A_PROJECT_ID")
const aQuizId = requireEnv("A_QUIZ_ID")
const bProjectId = requireEnv("B_PROJECT_ID")
const bQuizId = requireEnv("B_QUIZ_ID")
const bUserId = requireEnv("B_USER_ID")

if (
  !supabaseUrl
  || !supabaseAnonKey
  || !testUserAEmail
  || !testUserAPassword
  || !aProjectId
  || !aQuizId
  || !bProjectId
  || !bQuizId
  || !bUserId
) {
  process.exit(1)
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
}

const userAClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  clientOptions
)

const anonymousClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  clientOptions
)

const cleanupIds = []

const authResult = await userAClient.auth.signInWithPassword({
  email: testUserAEmail,
  password: testUserAPassword
})

if (authResult.error || !authResult.data.user) {
  printResult(
    "AUTHENTICATION",
    false,
    JSON.stringify(sanitizeSupabaseError(authResult.error))
  )
  process.exit(1)
}

const userAId = authResult.data.user.id
printResult("AUTHENTICATION", true, `user_id=${userAId}`)

const aProjectResult = await userAClient
  .from("projects")
  .select("id,user_id")
  .eq("id", aProjectId)
  .single()

if (aProjectResult.error || aProjectResult.data?.user_id !== userAId) {
  printResult(
    "A PROJECT PRECHECK",
    false,
    aProjectResult.error
      ? JSON.stringify(sanitizeSupabaseError(aProjectResult.error))
      : "A_PROJECT_ID is not owned by authenticated User A"
  )
  process.exit(1)
}

printResult("A PROJECT PRECHECK", true)

const bProjectResult = await userAClient
  .from("projects")
  .select("id,user_id")
  .eq("id", bProjectId)

if (bProjectResult.error) {
  printResult(
    "B PROJECT HIDDEN PRECHECK",
    false,
    JSON.stringify(sanitizeSupabaseError(bProjectResult.error))
  )
  process.exit(1)
}

const bProjectRows = bProjectResult.data ?? []
printResult(
  "B PROJECT HIDDEN PRECHECK",
  bProjectRows.length === 0,
  `returned_rows=${bProjectRows.length}`
)

if (bProjectRows.length > 0) {
  process.exit(1)
}

const aQuizResult = await userAClient
  .from("quizzes")
  .select("id,user_id,project_id")
  .eq("id", aQuizId)
  .single()

if (
  aQuizResult.error
  || aQuizResult.data?.user_id !== userAId
  || aQuizResult.data?.project_id !== aProjectId
) {
  printResult(
    "A QUIZ PRECHECK",
    false,
    aQuizResult.error
      ? JSON.stringify(sanitizeSupabaseError(aQuizResult.error))
      : "A_QUIZ_ID is not owned by User A inside A_PROJECT_ID"
  )
  process.exit(1)
}

printResult("A QUIZ PRECHECK", true)

const bQuizResult = await userAClient
  .from("quizzes")
  .select("id,user_id,project_id")
  .eq("id", bQuizId)
  .single()

if (
  !bQuizResult.error
  && bQuizResult.data?.user_id === userAId
  && bQuizResult.data?.project_id === aProjectId
) {
  printResult(
    "B QUIZ NOT A-OWNED PRECHECK",
    false,
    "B_QUIZ_ID resolves as an A-owned quiz in A_PROJECT_ID"
  )
  process.exit(1)
}

printResult("B QUIZ NOT A-OWNED PRECHECK", true)

const ownAttempts = await userAClient
  .from("quiz_attempts")
  .select("id,user_id,project_id")
  .eq("project_id", aProjectId)

if (ownAttempts.error) {
  printResult(
    "OWN ATTEMPT VISIBILITY",
    false,
    JSON.stringify(sanitizeSupabaseError(ownAttempts.error))
  )
  process.exit(1)
}

const ownAttemptRows = ownAttempts.data ?? []
const invalidOwnAttemptRows = ownAttemptRows.filter(
  (row) => row.user_id !== userAId || row.project_id !== aProjectId
)

printResult(
  "OWN ATTEMPT VISIBILITY",
  invalidOwnAttemptRows.length === 0,
  `visible_rows=${ownAttemptRows.length}`
)

if (invalidOwnAttemptRows.length > 0) {
  process.exit(1)
}

const bProjectAttempts = await userAClient
  .from("quiz_attempts")
  .select("id")
  .eq("project_id", bProjectId)

if (bProjectAttempts.error) {
  printResult(
    "B PROJECT ATTEMPTS HIDDEN",
    false,
    JSON.stringify(sanitizeSupabaseError(bProjectAttempts.error))
  )
  process.exit(1)
}

const bAttemptRows = bProjectAttempts.data ?? []
printResult(
  "B PROJECT ATTEMPTS HIDDEN",
  bAttemptRows.length === 0,
  `returned_rows=${bAttemptRows.length}`
)

if (bAttemptRows.length > 0) {
  process.exit(1)
}

const validAttemptId = crypto.randomUUID()
const validAttemptPayload = createAttemptPayload({
  id: validAttemptId,
  userId: userAId,
  projectId: aProjectId,
  quizId: aQuizId
})

const validInsert = await userAClient
  .from("quiz_attempts")
  .insert(validAttemptPayload)
  .select("id,user_id,project_id,quiz_id")
  .single()

if (validInsert.error || validInsert.data?.id !== validAttemptId) {
  printResult(
    "A INSERT WITH A PROJECT + A QUIZ",
    false,
    JSON.stringify(sanitizeSupabaseError(validInsert.error))
  )
  process.exit(1)
}

cleanupIds.push(validAttemptId)
printResult("A INSERT WITH A PROJECT + A QUIZ", true)

await expectInsertBlocked(
  "A INSERT WITH B PROJECT",
  userAClient,
  createAttemptPayload({
    userId: userAId,
    projectId: bProjectId,
    quizId: bQuizId
  }),
  cleanupIds
)

await expectInsertBlocked(
  "A INSERT WITH B QUIZ",
  userAClient,
  createAttemptPayload({
    userId: userAId,
    projectId: aProjectId,
    quizId: bQuizId
  }),
  cleanupIds
)

await expectInsertBlocked(
  "B USER INSERT AS A",
  userAClient,
  createAttemptPayload({
    userId: bUserId,
    projectId: aProjectId,
    quizId: aQuizId
  }),
  cleanupIds
)

await expectInsertBlocked(
  "PROJECT-ID-AS-QUIZ-ID",
  userAClient,
  createAttemptPayload({
    userId: userAId,
    projectId: aProjectId,
    quizId: aProjectId
  }),
  cleanupIds
)

const expectedOriginal = {
  user_id: userAId,
  project_id: aProjectId,
  quiz_id: aQuizId
}

await expectUpdateBlocked({
  label: "UPDATE TO B PROJECT",
  client: userAClient,
  attemptId: validAttemptId,
  payload: { project_id: bProjectId },
  expectedOriginal
})

await expectUpdateBlocked({
  label: "UPDATE TO B QUIZ",
  client: userAClient,
  attemptId: validAttemptId,
  payload: { quiz_id: bQuizId },
  expectedOriginal
})

await expectUpdateBlocked({
  label: "UPDATE TO B USER",
  client: userAClient,
  attemptId: validAttemptId,
  payload: { user_id: bUserId },
  expectedOriginal
})

const anonymousAttempts = await anonymousClient
  .from("quiz_attempts")
  .select("id")
  .limit(1)

if (anonymousAttempts.error) {
  printResult(
    "ANONYMOUS QUIZ ATTEMPT ACCESS",
    true,
    `blocked=${JSON.stringify(sanitizeSupabaseError(anonymousAttempts.error))}`
  )
} else {
  const anonymousRows = anonymousAttempts.data ?? []
  printResult(
    "ANONYMOUS QUIZ ATTEMPT ACCESS",
    anonymousRows.length === 0,
    `returned_rows=${anonymousRows.length}`
  )
  if (anonymousRows.length > 0) {
    process.exit(1)
  }
}

for (const id of cleanupIds) {
  console.log(`CLEANUP REQUIRED: quiz_attempts.id=${id}`)
}

console.log(`CLEANUP IDENTIFIER: topic=${VALIDATION_TOPIC}`)
