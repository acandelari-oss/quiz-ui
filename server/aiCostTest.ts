/** Server-only, local, opt-in metadata benchmark. Never include in browser code. */
import { AsyncLocalStorage } from 'node:async_hooks'
import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

type RecordData = Record<string, unknown>
type Pending = { id: string; start: number; model: string; suboperation: string; attempt: number | null }
type Context = { id: string; feature: string; pending: Map<Response, Pending> }
const context = new AsyncLocalStorage<Context>()
const processId = randomUUID().slice(0, 8)
let failures = 0
let warned = false
export const costEnabled = () => process.env.DOUNO_AI_COST_TEST === '1'
const label = (value: unknown) => typeof value === 'string' && /^[\w.:-]{1,100}$/.test(value) ? value : 'unknown'
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
function emit(event: string, fields: RecordData = {}) {
  if (!costEnabled()) return
  try {
    const testId = process.env.DOUNO_AI_COST_TEST_ID || 'local-test'
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(testId)) throw new Error('Invalid test ID')
    const ctx = context.getStore()
    const row = { schema_version: 1, event_id: randomUUID(), timestamp: new Date().toISOString(),
      test_id: testId, operation_id: ctx?.id || testId, feature: ctx?.feature || 'unscoped',
      event, writer_failures: failures, ...fields }
    const directory = join(process.env.DOUNO_AI_COST_TEST_OUTPUT_DIR || 'benchmark-output', testId)
    mkdirSync(directory, { recursive: true })
    if (!existsSync(join(directory, '.gitignore'))) writeFileSync(join(directory, '.gitignore'), '*\n')
    appendFileSync(join(directory, `nextjs-${process.pid}-${processId}.jsonl`), JSON.stringify(row) + '\n')
  } catch {
    failures += 1
    if (!warned) {
      warned = true
      try { console.warn('AI cost benchmark: diagnostic write failed; report may be incomplete.') } catch { /* fail open */ }
    }
  }
}
export function costOutcome(outcome: 'fallback' | 'failed') {
  emit('metrics', { metadata: { outcome } })
}
function finish(pending: Pending, status: string, data?: RecordData) {
  const usage = data?.usage as RecordData | undefined
  const details = usage?.prompt_tokens_details as RecordData | undefined
  const output = usage?.completion_tokens_details as RecordData | undefined
  emit('call_end', { call_id: pending.id, call_feature: context.getStore()?.feature,
    suboperation: pending.suboperation, model: pending.model, returned_model: data?.model ? label(data.model) : null,
    service_tier: data?.service_tier ? label(data.service_tier) : null,
    status, application_outcome: 'unknown', duration_ms: Date.now() - pending.start,
    metadata: { application_attempt: pending.attempt }, sdk_retry_visibility: 'unobserved',
    usage: usage ? { input_tokens: count(usage.prompt_tokens), output_tokens: count(usage.completion_tokens),
      total_tokens: count(usage.total_tokens), cached_input_tokens: count(details?.cached_tokens),
      reasoning_tokens: count(output?.reasoning_tokens), audio_input_tokens: count(details?.audio_tokens),
      audio_output_tokens: count(output?.audio_tokens) } : {} })
}
export async function costFetch(suboperation: string, url: string, options: RequestInit, attempt: number | null = null): Promise<Response> {
  if (!costEnabled()) return fetch(url, options)
  let model = 'unknown'
  try { model = label(JSON.parse(String(options.body)).model) } catch { /* no body logged */ }
  const pending: Pending = { id: randomUUID(), start: Date.now(), model, suboperation, attempt }
  emit('call_start', { call_id: pending.id, call_feature: context.getStore()?.feature,
    suboperation, model, metadata: { application_attempt: attempt } })
  try {
    const response = await fetch(url, options)
    if (!response.ok) finish(pending, 'failed')
    else context.getStore()?.pending.set(response, pending)
    return response
  } catch (error) {
    finish(pending, 'failed')
    throw error
  }
}
export function costUsage(response: Response, data: RecordData) {
  if (!costEnabled()) return
  const pending = context.getStore()?.pending.get(response)
  if (pending) {
    finish(pending, 'succeeded', data)
    context.getStore()?.pending.delete(response)
  }
}
export function costOperation<A extends unknown[], R>(feature: string, handler: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    if (!costEnabled()) return handler(...args)
    return context.run({ id: randomUUID(), feature, pending: new Map() }, async () => {
      const start = Date.now()
      emit('operation_start')
      let status = 'completed'
      try { return await handler(...args) }
      catch (error) { status = 'failed'; throw error }
      finally {
        for (const pending of context.getStore()!.pending.values()) finish(pending, 'succeeded')
        emit('operation_end', { status, duration_ms: Date.now() - start })
      }
    })
  }
}
