import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"

const QUIZ_UI_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
)

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

async function expectInsertFailure(label, client, payload) {
  const result = await client
    .from("learning_sessions")
    .insert(payload)
    .select("id,user_id,project_id")
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
    await client
      .from("learning_sessions")
      .update({
        completed_at: new Date().toISOString(),
        status: "abandoned"
      })
      .eq("id", result.data.id)
  }

  printResult(
    label,
    false,
    "unexpected insert success; attempted to close the disposable row"
  )
  return false
}

async function expectUpdateFailure(label, client, sessionId, payload) {
  const result = await client
    .from("learning_sessions")
    .update(payload)
    .eq("id", sessionId)
    .select("id")

  if (result.error) {
    printResult(
      label,
      true,
      `blocked=${JSON.stringify(sanitizeSupabaseError(result.error))}`
    )
    return true
  }

  const rows = result.data ?? []
  const passed = rows.length === 0
  printResult(label, passed, `returned_rows=${rows.length}`)
  return passed
}

loadEnvFile(path.join(QUIZ_UI_ROOT, ".env.local"))
loadEnvFile(path.join(QUIZ_UI_ROOT, ".env"))

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const testUserAEmail = requireEnv("TEST_USER_A_EMAIL")
const testUserAPassword = requireEnv("TEST_USER_A_PASSWORD")
const aProjectId = requireEnv("A_PROJECT_ID")
const bProjectId = requireEnv("B_PROJECT_ID")
const bUserId = requireEnv("B_USER_ID")

if (
  !supabaseUrl
  || !supabaseAnonKey
  || !testUserAEmail
  || !testUserAPassword
  || !aProjectId
  || !bProjectId
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

const ownProjectResult = await userAClient
  .from("projects")
  .select("id,user_id")
  .eq("id", aProjectId)
  .single()

if (ownProjectResult.error || ownProjectResult.data?.user_id !== userAId) {
  printResult(
    "A PROJECT OWNERSHIP PRECHECK",
    false,
    ownProjectResult.error
      ? JSON.stringify(sanitizeSupabaseError(ownProjectResult.error))
      : "A_PROJECT_ID is not owned by authenticated User A"
  )
  process.exit(1)
}

printResult("A PROJECT OWNERSHIP PRECHECK", true)

const bProjectVisibility = await userAClient
  .from("projects")
  .select("id")
  .eq("id", bProjectId)

if (bProjectVisibility.error) {
  printResult(
    "B PROJECT HIDDEN FROM USER A PRECHECK",
    false,
    JSON.stringify(sanitizeSupabaseError(bProjectVisibility.error))
  )
  process.exit(1)
}

printResult(
  "B PROJECT HIDDEN FROM USER A PRECHECK",
  (bProjectVisibility.data ?? []).length === 0,
  `returned_rows=${(bProjectVisibility.data ?? []).length}`
)

if ((bProjectVisibility.data ?? []).length > 0) {
  process.exit(1)
}

const ownVisibility = await userAClient
  .from("learning_sessions")
  .select("id,user_id,project_id")
  .limit(100)

if (ownVisibility.error) {
  printResult(
    "OWN LEARNING SESSION VISIBILITY",
    false,
    JSON.stringify(sanitizeSupabaseError(ownVisibility.error))
  )
  process.exit(1)
}

const ownRows = ownVisibility.data ?? []
const foreignRows = ownRows.filter((row) => row.user_id !== userAId)

printResult(
  "OWN LEARNING SESSION VISIBILITY",
  foreignRows.length === 0,
  `visible_rows_sample=${ownRows.length}`
)

if (foreignRows.length > 0) {
  console.error(`Foreign learning_session rows visible to User A: ${foreignRows.length}`)
  process.exit(1)
}

const now = new Date().toISOString()
const createdSessionId = crypto.randomUUID()

const allowedInsert = await userAClient
  .from("learning_sessions")
  .insert({
    id: createdSessionId,
    user_id: userAId,
    project_id: aProjectId,
    session_type: "ask",
    started_at: now,
    completed_at: null
  })
  .select("id,user_id,project_id")
  .single()

if (allowedInsert.error || allowedInsert.data?.id !== createdSessionId) {
  printResult(
    "A INSERT WITH A PROJECT",
    false,
    JSON.stringify(sanitizeSupabaseError(allowedInsert.error))
  )
  process.exit(1)
}

printResult("A INSERT WITH A PROJECT", true, `created_session_id=${createdSessionId}`)

await expectInsertFailure(
  "A INSERT WITH B PROJECT",
  userAClient,
  {
    id: crypto.randomUUID(),
    user_id: userAId,
    project_id: bProjectId,
    session_type: "ask",
    started_at: new Date().toISOString(),
    completed_at: null
  }
)

await expectInsertFailure(
  "B USER INSERT WITH A PROJECT AS USER A",
  userAClient,
  {
    id: crypto.randomUUID(),
    user_id: bUserId,
    project_id: aProjectId,
    session_type: "ask",
    started_at: new Date().toISOString(),
    completed_at: null
  }
)

await expectUpdateFailure(
  "A UPDATE CREATED SESSION TO B PROJECT",
  userAClient,
  createdSessionId,
  {
    project_id: bProjectId
  }
)

await expectUpdateFailure(
  "A UPDATE CREATED SESSION TO B USER",
  userAClient,
  createdSessionId,
  {
    user_id: bUserId
  }
)

const cleanupResult = await userAClient
  .from("learning_sessions")
  .update({
    completed_at: new Date().toISOString(),
    status: "abandoned"
  })
  .eq("id", createdSessionId)
  .eq("user_id", userAId)
  .eq("project_id", aProjectId)
  .select("id,status,completed_at")
  .single()

if (cleanupResult.error || cleanupResult.data?.status !== "abandoned") {
  printResult(
    "DISPOSABLE SESSION CLEANUP",
    false,
    JSON.stringify(sanitizeSupabaseError(cleanupResult.error))
  )
  process.exit(1)
}

printResult(
  "DISPOSABLE SESSION CLEANUP",
  true,
  "created row closed as abandoned; physical delete is intentionally unavailable to browser users"
)

const anonymousAccess = await anonymousClient
  .from("learning_sessions")
  .select("id")
  .limit(1)

if (anonymousAccess.error) {
  printResult(
    "ANONYMOUS LEARNING SESSION ACCESS",
    true,
    `blocked=${JSON.stringify(sanitizeSupabaseError(anonymousAccess.error))}`
  )
} else {
  const anonymousRows = anonymousAccess.data ?? []
  printResult(
    "ANONYMOUS LEARNING SESSION ACCESS",
    anonymousRows.length === 0,
    `returned_rows=${anonymousRows.length}`
  )
  if (anonymousRows.length > 0) {
    process.exit(1)
  }
}
