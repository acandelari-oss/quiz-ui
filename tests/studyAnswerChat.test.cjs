const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const settle = () => new Promise(done => setImmediate(done))
const compiled = ts.transpileModule(fs.readFileSync('components/ui/StudyAnswerChat.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true })
assert.equal(compiled.diagnostics.length, 0, "Chat component must parse without errors")
const code = compiled.outputText

function mount({ fetchImpl, token = 'token', histories = new Map(), id = 'card-a', Recognition } = {}) {
  const states = [], refs = [], effects = [], calls = []
  let stateIndex, refIndex, tree
  const jsx = (type, props) => ({ type, props })
  const context = { exports: {}, AbortController, window: { SpeechRecognition: Recognition }, navigator: { language: 'en' }, process: { env: { NEXT_PUBLIC_API_URL: 'https://api.example' } },
    fetch: async (...args) => { calls.push(args); return fetchImpl ? fetchImpl(...args) : { ok: true, json: async () => ({ answer: 'Explanation' }) } },
    require(name) {
      if (name === 'react') return {
        useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next }] },
        useRef(initial) { return refs[refIndex++] ||= { current: initial } },
        useEffect(fn) { if (!effects.length) effects.push(fn()) }
      }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
      if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key, i18n: { language: 'it' } }) }
      if (name.includes('supabase')) return { supabase: { auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) } } }
      if (name.includes('MarkdownContent')) return { default: 'markdown' }
      throw Error(name)
    }
  }
  vm.runInNewContext(code, context)
  function render() { stateIndex = refIndex = 0; tree = context.exports.default({ projectId: 'project', context: 'Question: Q\nAnswer: A', conversationId: id, histories, kind: 'flashcard' }) }
  function nodes(node = tree) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children ?? null)] }
  function button(label) { return nodes().find(n => n.type === 'button' && (n.props.children === label || n.props['aria-label'] === label)) }
  render()
  return { render, nodes, button, calls, states, histories, unmount: () => effects.forEach(fn => fn()), open() { button('answerChat.cardTitle').props.onClick(); render() }, type(value) { nodes().find(n => n.type === 'input' && n.props.placeholder).props.onChange({ target: { value } }); render() } }
}

test('sends authenticated card context, stores history, and prevents duplicate sends', async () => {
  const view = mount()
  view.open(); view.type('Why?')
  const send = view.button('answerChat.send').props.onClick
  send(); send()
  await settle(); view.render()
  assert.equal(view.calls.length, 1)
  const body = JSON.parse(view.calls[0][1].body)
  assert.equal(view.calls[0][1].headers.Authorization, 'Bearer token')
  assert.ok(body.question.includes('Question: Q\nAnswer: A'))
  assert.ok(body.question.includes('Why?'))
  assert.equal(body.expand_search, false)
  assert.equal(view.histories.get('card-a').length, 2)
  view.type('More?'); view.button('answerChat.send').props.onClick()
  await settle()
  assert.equal(JSON.parse(view.calls[1][1].body).history.length, 2)
  view.unmount()
})

test('revisiting a card restores only that card history', () => {
  const histories = new Map([['card-a', [{ role: 'assistant', content: 'A explanation' }]]])
  const a = mount({ histories }); const b = mount({ histories, id: 'card-b' })
  assert.equal(a.states[0][0].content, 'A explanation')
  assert.equal(b.states[0].length, 0)
  a.unmount(); b.unmount()
})

test('failed requests preserve input and allow retry without duplicate history', async () => {
  let fail = true
  const view = mount({ fetchImpl: async () => ({ ok: !fail, json: async () => ({ answer: 'Recovered' }) }) })
  view.open(); view.type('Why?'); view.button('answerChat.send').props.onClick()
  await settle(); view.render()
  assert.equal(view.states[2], 'Why?')
  assert.equal(view.states[5], 'answerChat.error')
  assert.equal(view.histories.size, 0)
  fail = false; view.button('answerChat.send').props.onClick()
  await settle()
  assert.equal(view.histories.get('card-a').length, 2)
  view.unmount()
})

test('missing auth does not call backend', async () => {
  const view = mount({ token: null }); view.open(); view.type('Why?'); view.button('answerChat.send').props.onClick()
  await settle()
  assert.equal(view.calls.length, 0)
  assert.equal(view.states[5], 'answerChat.error')
  view.unmount()
})

test('leaving a card aborts and discards late results', async () => {
  let resolve
  const view = mount({ fetchImpl: () => new Promise(done => { resolve = done }) })
  view.open(); view.type('Why?'); view.button('answerChat.send').props.onClick()
  await settle(); view.unmount()
  assert.equal(view.calls[0][1].signal.aborted, true)
  resolve({ ok: true, json: async () => ({ answer: 'Late' }) })
  await settle()
  assert.equal(view.histories.size, 0)
})

test('dictation fills the text input and is stopped when leaving', () => {
  let recognition
  class Recognition { constructor() { recognition = this } start() {} stop() { this.stopped = true } }
  const view = mount({ Recognition }); view.open(); view.button('answerChat.startMic').props.onClick()
  recognition.onresult({ results: [[{ transcript: 'Spiega meglio' }]] })
  assert.equal(view.states[2], 'Spiega meglio')
  assert.equal(view.calls.length, 0)
  view.unmount()
  assert.equal(recognition.stopped, true)
  assert.equal(recognition.onresult, null)
})

test('general knowledge toggle is passed through', async () => {
  const view = mount()
  // The mode can be chosen before opening the conversation or sending a suggestion.
  view.nodes().find(n => n.type === 'select').props.onChange({ target: { value: 'expanded' } })
  view.render(); view.open(); view.type('Example?'); view.button('answerChat.send').props.onClick()
  await settle()
  assert.equal(JSON.parse(view.calls[0][1].body).expand_search, true)
  view.unmount()
})
