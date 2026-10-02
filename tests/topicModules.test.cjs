const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync('utils/topicModules.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const context = { exports: {} }
vm.runInNewContext(code, context)
const { groupTopicsByModule } = context.exports

test('identically named categories stay separate across module IDs', () => {
  const topics = [{ id: 'a', module_id: 'one', category: 'General' }, { id: 'b', module_id: 'two', category: 'General' }]
  const groups = groupTopicsByModule(topics, [{ id: 'one', name: 'First', accepted_for_study: true, taxonomy_status: 'ready' }, { id: 'two', name: 'Second', accepted_for_study: false, taxonomy_status: 'ready' }], 'Project', 'learning')
  assert.equal(groups.length, 2)
  assert.equal(groups[0].topics.length, 1)
  assert.equal(groups[0].topics[0].id, 'a')
  assert.equal(groups[1].topics[0].id, 'b')
  assert.equal(groups[0].accepted, true)
  assert.equal(groups[1].accepted, false)
})

test('approval of one module leaves the other review section unchanged', () => {
  const topics = [{ module_id: 'one' }, { module_id: 'two' }]
  const groups = groupTopicsByModule(topics, [{ id: 'one', accepted_for_study: true, taxonomy_status: 'ready' }, { id: 'two', accepted_for_study: false, taxonomy_status: 'ready' }], 'Project', 'learning')
  assert.equal(groups[1].accepted, false)
  assert.equal(groups[1].ready, true)
})

test('processing or failed modules appear even before topics exist', () => {
  const groups = groupTopicsByModule([], [{ id: 'one', taxonomy_status: 'processing' }, { id: 'two', taxonomy_status: 'failed' }], 'Project', 'learning')
  assert.equal(groups.length, 2)
  assert.equal(groups[0].ready, false)
  assert.equal(groups[1].failed, true)
})

test('legacy project topics remain separate from named modules', () => {
  const groups = groupTopicsByModule([{ topic: 'Legacy' }, { module_id: 'new', module_name: 'New module', topic: 'New' }], [], 'Old project', 'learning')
  assert.equal(groups[0].id, '')
  assert.equal(groups[0].accepted, true)
  assert.equal(groups[1].name, 'New module')
  assert.equal(groups[1].accepted, false)
})

test('module sections approve their own ID and keep review activities gated', async () => {
  const approvals = [], navigations = [], states = []
  const jsx = (type, props) => ({ type, props })
  const module = { exports: {}, require(name) {
    if (name === 'react') return { useMemo: fn => fn(), useState: initial => { const i = states.length; states.push(initial); return [initial, value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] } }
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
    if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) }
    if (name.includes('topicModules')) return context.exports
    if (name.includes('studyModeGate')) return { studyActivityLabel: view => view === 'quiz' ? 'Quiz' : null }
    if (name === './TopicsView') return { default: 'TopicsView' }
    throw Error(name)
  } }
  const result = ts.transpileModule(fs.readFileSync('components/views/ModuleTopicsView.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true })
  assert.equal(result.diagnostics.length, 0)
  vm.runInNewContext(result.outputText, module)
  const tree = module.exports.default({
    projectId: 'project', projectName: 'Project', projectStudyMode: 'learning',
    topics: [{ module_id: 'one', category: 'General' }, { module_id: 'two', category: 'General' }],
    studyModules: [{ id: 'one', name: 'One', accepted_for_study: true, taxonomy_status: 'ready' }, { id: 'two', name: 'Two', accepted_for_study: false, taxonomy_status: 'ready' }],
    onBeginModuleStudy: async id => approvals.push(id), setActiveView: view => navigations.push(view)
  })
  function nodes(node) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)] }
  const all = nodes(tree)
  const approveButtons = all.filter(n => n.type === 'button' && n.props.children === 'moduleTopics.enter')
  assert.equal(approveButtons.length, 1)
  approveButtons[0].props.onClick()
  await new Promise(done => setImmediate(done))
  assert.deepEqual(approvals, ['two'])
  const taxonomies = all.filter(n => n.type === 'TopicsView')
  assert.equal(taxonomies[0].props.topics.length, 1)
  assert.equal(taxonomies[1].props.topics.length, 1)
  taxonomies[1].props.setActiveView('quiz')
  assert.equal(navigations.length, 0)
  taxonomies[0].props.setActiveView('quiz')
  assert.deepEqual(navigations, ['quiz'])
  const heading = all.find(n => n.type === 'button' && n.props['aria-expanded'] === true)
  heading.props.onClick()
  assert.equal(states[0].one, true)
})
