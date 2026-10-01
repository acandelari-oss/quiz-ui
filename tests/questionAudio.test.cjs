const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function mount(fetchImpl, enabled = true) {
  let cursor = 0, stateCursor = 0, effectCursor = 0
  const effects = [], pending = []
  const refs = [], states = [], cleanups = [], calls = [], revoked = []
  const audio = { paused: true, currentTime: 0, playCount: 0, pauseCount: 0,
    async play() { this.playCount++; this.paused = false },
    pause() { this.pauseCount++; this.paused = true }, removeAttribute() {}, load() {} }
  const hooks = {
    useRef(value) { const index = cursor++; return refs[index] ||= { current: index === 0 ? audio : value } },
    useState(value) { const index = stateCursor++; if (!(index in states)) states[index] = value; return [value, next => { states[index] = next }] },
    useEffect(fn, deps) { const index = effectCursor++; if (!effects[index] || deps.some((v, i) => v !== effects[index][i])) { pending.push(() => { cleanups[index]?.(); cleanups[index] = fn() }); effects[index] = deps } }
  }
  const jsx = (type, props) => ({ type, props })
  const source = ts.transpileModule(fs.readFileSync('components/ui/QuestionAudio.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
  const context = { exports: {}, require(name) {
    if (name === 'react') return hooks
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === 'lucide-react') return { Square: 'square', Volume2: 'speaker' }
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) }
    if (name.includes('supabase')) return { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'session-token' } } }) } } }
    throw Error(name)
  }, Error, AbortController, process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example' } }, URL: { createObjectURL: () => 'blob:question', revokeObjectURL: value => revoked.push(value) },
    fetch: async (...args) => { calls.push(args); return fetchImpl ? fetchImpl(...args) : { ok: true, blob: async () => ({}) } } }
  vm.runInNewContext(source, context)
  const view = { audio, calls, revoked, states, unmount: () => cleanups.forEach(fn => fn?.()) }
  view.render = (enabled) => {
    cursor = stateCursor = effectCursor = 0
    const tree = context.exports.default({ projectId: 'project', question: 'Perché?\nExplain.', enabled })
    view.click = tree.props.children.find(child => child?.type === 'button').props.onClick
    while (pending.length) pending.shift()()
  }
  view.render(enabled)
  return view
}

const settle = () => new Promise(done => setImmediate(done))

test('automatically plays exact question; replay reuses audio and restarts without overlap', async () => {
  const view = mount()
  await settle()
  assert.equal(JSON.parse(view.calls[0][1].body).question, 'Perché?\nExplain.')
  assert.equal(view.calls[0][1].headers.Authorization, 'Bearer session-token')
  assert.equal(view.audio.playCount, 1)
  await view.click()
  assert.equal(view.audio.pauseCount, 1)
  assert.equal(view.audio.currentTime, 0)
  assert.equal(view.audio.playCount, 2)
  assert.equal(view.calls.length, 1)
  view.unmount()
  assert.equal(view.audio.paused, true)
  assert.deepEqual(view.revoked, ['blob:question'])
})

test('audio off makes no request; on starts audio; off stops; on reuses cache', async () => {
  const view = mount(undefined, false)
  await settle()
  await view.click()
  assert.equal(view.calls.length, 0)
  view.render(true)
  await settle()
  assert.equal(view.audio.playCount, 1)
  view.render(false)
  assert.equal(view.audio.paused, true)
  view.render(true)
  await settle()
  assert.equal(view.audio.playCount, 2)
  assert.equal(view.calls.length, 1)
  view.unmount()
})

for (const action of ['unmount', 'disable']) test(action + ' aborts generation and prevents stale playback', async () => {
  let resolve
  const view = mount(() => new Promise(done => { resolve = done }))
  await settle()
  await view.click()
  if (action === 'unmount') view.unmount()
  else view.render(false)
  assert.equal(view.calls[0][1].signal.aborted, true)
  resolve({ ok: true, blob: async () => ({}) })
  await settle()
  assert.equal(view.audio.playCount, 0)
  assert.equal(view.calls.length, 1)
})

test('generation failure stays local and allows retry', async () => {
  const view = mount(async () => ({ ok: false }))
  await settle()
  assert.equal(view.states[0], false)
  assert.equal(view.states[1], true)
  await view.click()
  assert.equal(view.calls.length, 2)
  view.unmount()
})

test('autoplay rejection offers manual replay using cached audio', async () => {
  const view = mount()
  view.audio.play = async () => { const error = new Error('blocked'); error.name = 'NotAllowedError'; throw error }
  await settle()
  assert.equal(view.states[2], true)
  view.audio.play = async () => { view.audio.playCount++ }
  await view.click()
  assert.equal(view.calls.length, 1)
  assert.equal(view.audio.playCount, 1)
  view.unmount()
})
