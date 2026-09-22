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

loadEnvFile(path.join(QUIZ_UI_ROOT, ".env.local"))
loadEnvFile(path.join(QUIZ_UI_ROOT, ".env"))

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
const testUserAEmail = requireEnv("TEST_USER_A_EMAIL")
const testUserAPassword = requireEnv("TEST_USER_A_PASSWORD")
const bProjectId = requireEnv("B_PROJECT_ID")

if (
  !supabaseUrl
  || !supabaseAnonKey
  || !testUserAEmail
  || !testUserAPassword
  || !bProjectId
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

const ownVisibility = await userAClient
  .from("projects")
  .select("id,user_id,name")

if (ownVisibility.error) {
  printResult(
    "OWN PROJECT VISIBILITY",
    false,
    JSON.stringify(sanitizeSupabaseError(ownVisibility.error))
  )
  process.exit(1)
}

const ownRows = ownVisibility.data ?? []
const foreignRows = ownRows.filter((row) => row.user_id !== userAId)

printResult(
  "OWN PROJECT VISIBILITY",
  foreignRows.length === 0,
  `visible_projects=${ownRows.length}`
)

if (foreignRows.length > 0) {
  console.error(`Foreign project rows visible to User A: ${foreignRows.length}`)
  process.exit(1)
}

const crossUserAccess = await userAClient
  .from("projects")
  .select("id,user_id,name")
  .eq("id", bProjectId)

if (crossUserAccess.error) {
  console.log(
    `CROSS-USER SELECT: INCONCLUSIVE — ${JSON.stringify(
      sanitizeSupabaseError(crossUserAccess.error)
    )}`
  )
  process.exitCode = 1
} else {
  const rows = crossUserAccess.data ?? []
  printResult(
    "CROSS-USER SELECT",
    rows.length === 0,
    `returned_rows=${rows.length}`
  )
  if (rows.length > 0) {
    console.error("CRITICAL: User A can read B_PROJECT_ID through Supabase.")
    process.exit(1)
  }
}

const anonymousAccess = await anonymousClient
  .from("projects")
  .select("id")
  .limit(1)

if (anonymousAccess.error) {
  printResult(
    "ANONYMOUS PROJECT ACCESS",
    true,
    `blocked=${JSON.stringify(sanitizeSupabaseError(anonymousAccess.error))}`
  )
} else {
  const anonymousRows = anonymousAccess.data ?? []
  printResult(
    "ANONYMOUS PROJECT ACCESS",
    anonymousRows.length === 0,
    `returned_rows=${anonymousRows.length}`
  )
  if (anonymousRows.length > 0) {
    process.exit(1)
  }
}
