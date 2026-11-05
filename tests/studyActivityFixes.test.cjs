const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const i18next = require('i18next')
const page = fs.readFileSync('pages/index.tsx', 'utf8')
const ast = ts.createSourceFile('index.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function functionCode(name) {
  let found
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) found = n; ts.forEachChild(n, visit) }
  visit(ast)
  assert.ok(found, name)
  return ts.transpileModule(found.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
}

for (const language of ['en', 'it']) test(`Study session, quiz and flashcard labels resolve in ${language}`, async () => {
  const i18n = i18next.createInstance()
  await i18n.init({ lng: language, resources: { [language]: { translation: JSON.parse(fs.readFileSync(`public/locales/${language}/common.json`, 'utf8')) } } })
  for (const file of ['StudySessionView', 'QuizView', 'FlashcardsView']) {
    const source = fs.readFileSync(`components/views/${file}.tsx`, 'utf8')
    for (const match of source.matchAll(/translate\(['"](stats\.[^'"]+)['"]/g)) assert.notEqual(i18n.t(match[1]), match[1], `${file}: ${match[1]}`)
  }
})

test('opening loaded flashcards preserves the fetched library; generating new cards clears it', () => {
  const calls = []
  const ctx = {
    activeView: 'topics', plannerRuntime: { mode: 'dashboard' },
    configurationDrivenViews: new Set(), requiresStudyMode: () => false,
    studyActivityLabel: () => false, uploadLifecycleTrace() {}, abandonOpenLearningSessions() {}, traceSetterCall() {}
  }
  for (const setter of functionCode('handleSidebarNavigation').matchAll(/\b(set\w+)\(/g)) ctx[setter[1]] = value => calls.push([setter[1], value])
  vm.createContext(ctx); vm.runInContext(functionCode('handleSidebarNavigation'), ctx)
  ctx.handleSidebarNavigation('flashcards')
  assert.equal(calls.some(([name]) => name === 'setFlashcards'), false)
  assert.equal(calls.find(([name]) => name === 'setOpenCard')[1], 0)
  assert.equal(calls.find(([name]) => name === 'setActiveView')[1], 'flashcards')
  calls.length = 0
  ctx.handleSidebarNavigation('generate_flashcards')
  assert.equal(calls.find(([name]) => name === 'setFlashcards')[1].length, 0)
})

function libraryContext() {
  const calls = []
  const ctx = { console, process: { env: {} }, libraryProjectRef: { current: 'p' },
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
    fetch: async () => ({ ok: true, json: async () => ({ flashcards: [{ id: 'saved' }], quizzes: [{ id: 'quiz' }] }) }) }
  for (const setter of ['setFlashcards', 'setPreviousFlashcards', 'setAvailableFlashcards', 'setStudyMode', 'setPreviousQuizzes']) ctx[setter] = value => calls.push([setter, value])
  vm.createContext(ctx)
  vm.runInContext(functionCode('loadFlashcards') + functionCode('loadPreviousQuizzes'), ctx)
  return { ctx, calls }
}

test('metadata refresh updates libraries without replacing an active study session', async () => {
  const { ctx, calls } = libraryContext()
  await ctx.loadFlashcards('p', true); await ctx.loadPreviousQuizzes('p')
  assert.equal(calls.find(([name]) => name === 'setAvailableFlashcards')[1], 1)
  assert.ok(calls.some(([name]) => name === 'setPreviousQuizzes'))
  assert.equal(calls.some(([name]) => ['setFlashcards', 'setStudyMode'].includes(name)), false)
})

test('late library responses from another project do not replace current libraries', async () => {
  const { ctx, calls } = libraryContext()
  await ctx.loadFlashcards('old', true); await ctx.loadPreviousQuizzes('old')
  assert.equal(calls.length, 0)
})

for (const file of ['AskView', 'ActiveRecallView']) test(`${file} voices only the latest completed professor reply`, () => {
  const source = fs.readFileSync(`components/views/${file}.tsx`, 'utf8')
  const tree = ts.createSourceFile(file + '.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let expression
  function visit(n) {
    if (ts.isJsxExpression(n) && n.expression && n.expression.getText(tree).includes('<QuestionAudio') && !n.expression.getText(tree).includes('messages.map')) expression = n.expression
    ts.forEachChild(n, visit)
  }
  visit(tree)
  assert.ok(expression)
  // Evaluate the actual JSX condition with a lightweight JSX runtime.
  const code = ts.transpileModule('const result = ' + expression.getText(tree), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText
  function evaluate(overrides) {
    const ctx = { React: { createElement: (_type, props) => props }, QuestionAudio: 'audio', enableQuestionAudio: true, loading: false, generatingQuestion: false, asking: false, m: { role: 'assistant', content: 'Feedback' }, i: 1, messages: [{}, {}], projectId: 'p', oralAudioEnabled: true, ...overrides }
    return vm.runInNewContext(code + ';result', ctx)
  }
  assert.equal(evaluate({}).question, 'Feedback')
  assert.equal(evaluate({ i: 0 }), false)
  assert.equal(evaluate({ m: { role: 'user' } }), false)
  assert.equal(evaluate(file === 'AskView' ? { asking: true } : { loading: true }), false)
})
