const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('pages/index.tsx', 'utf8')
function extract(name) {
  const file = ts.createSourceFile('index.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let result
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(file)
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(result, name)
  return ts.transpileModule(result, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
}
function setup(failAt) {
  const events = []
  const ctx = { console: { log(){}, error(){} }, projectId: '', projectName: '', projectStudyMode: '', status: '', activeView: 'project', uploading: false,
    projects: [{ id: 'p', name: 'Saved project' }], uploadWorkflowActiveRef: { current: false }, uploadCanContinueRef: {}, projectLoadTargetRef: {},
    LAST_ACTIVE_PROJECT_STORAGE_KEY: 'saved', window: { localStorage: { setItem(){}, getItem(){ return 'p' } } },
    blockProjectChangeDuringUpload: () => false, normalizePriorityCategories: () => [], uploadLifecycleTrace(){}, traceSetterCall(){},
    setProjectLoadPhase: phase => events.push(phase), setProjectLoadError: error => events.push(['error', error]),
    enterLoadedProjectWorkspace: () => events.push('ready'),
  }
  for (const name of source.match(/\bset[A-Z]\w+/g)) if (!ctx[name]) ctx[name] = () => {}
  for (const name of ['loadStudyModules','loadDocuments','loadTopics','loadPreviousQuizzes','loadFlashcards','loadQuizStats']) {
    ctx[name] = async (...args) => { events.push(name); assert.equal(args.at(-1), true); if (name === failAt) throw Error('offline'); return [] }
  }
  vm.createContext(ctx)
  vm.runInContext(extract('selectProject'), ctx)
  return { ctx, events }
}
test('project opening phases follow real data requests and finish after statistics', async () => {
  const { ctx, events } = setup()
  await ctx.selectProject('p')
  assert.deepEqual(events, [['error',false], 'documents','loadStudyModules','loadDocuments','loadTopics','materials','loadPreviousQuizzes','loadFlashcards','stats','loadQuizStats',null,'ready'])
})
test('a failed project phase retains loading panel and exposes retry error without entering workspace', async () => {
  for (const name of ['loadDocuments','loadTopics','loadFlashcards','loadQuizStats']) {
    const { ctx, events } = setup(name)
    assert.equal(await ctx.selectProject('p'), false)
    assert.deepEqual(events.at(-1), ['error',true])
    assert.ok(!events.includes(null))
    assert.ok(!events.includes('ready'))
  }
})
test('startup fetches project list once and restores only an existing saved project', async () => {
  const { ctx } = setup()
  let reads = 0, restored = 0
  ctx.supabase = { auth: { getSession: async () => ({ data: { session: {} } }) } }
  ctx.loadProjects = async () => { reads++; return ctx.projects }
  ctx.selectProject = async id => { assert.equal(id,'p'); restored++ }
  vm.runInContext(extract('restoreLastProject'),ctx)
  await ctx.restoreLastProject()
  assert.equal(reads,1); assert.equal(restored,1)
  ctx.projects = []
  await ctx.restoreLastProject()
  assert.equal(restored,1)
})
test('loading messages have English and Italian translations', () => {
  for (const lang of ['en','it']) {
    const labels = JSON.parse(fs.readFileSync(`public/locales/${lang}/common.json`)).projectLoading
    for (const key of ['opening','documents','materials','stats','error','retry','progress']) assert.ok(labels[key])
  }
})
