const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('components/views/ActiveRecallView.tsx', 'utf8')
const tree = ts.createSourceFile('oral.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function getFunction(name) {
  let found
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) found = n; ts.forEachChild(n, visit) }
  visit(tree); assert.ok(found)
  return ts.transpileModule(found.getText(tree), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
}
function setup() {
  let instance
  class Recognition {
    constructor() { instance = this }
    start() {}
    stop() { this.stopped = true }
    abort() { this.aborted = true }
  }
  const ctx = { window: { SpeechRecognition: Recognition }, i18n: { language: 'en' }, recordingRef: { current: null }, input: '', recording: false, submissions: 0,
    setInput: value => { ctx.input = typeof value === 'function' ? value(ctx.input) : value },
    setRecording: value => { ctx.recording = value }, setRecognition: value => { ctx.recognition = value }, submitAnswer: () => { ctx.submissions++ } }
  vm.createContext(ctx); vm.runInContext(getFunction('startRecording') + getFunction('toggleRecording'), ctx)
  ctx.startRecording()
  return { ctx, instance }
}
function result(text) { return Object.assign([{ transcript: text }], { isFinal: true }) }
test('pauses and recognition end never submit; final results append once and remain editable', () => {
  const { ctx, instance } = setup()
  assert.equal(instance.continuous, true)
  instance.onresult({ resultIndex: 0, results: [result('First sentence')] })
  instance.onresult({ resultIndex: 1, results: [result('First sentence'), result('Second sentence')] })
  instance.onend()
  assert.equal(ctx.input, 'First sentence Second sentence')
  assert.equal(ctx.recording, false)
  assert.equal(ctx.submissions, 0)
  ctx.setInput('Edited answer')
  assert.equal(ctx.input, 'Edited answer')
})
test('Stop waits for final recognition result without submitting', () => {
  const { ctx, instance } = setup()
  ctx.toggleRecording()
  assert.equal(instance.stopped, true)
  assert.equal(ctx.recording, true)
  instance.onresult({ resultIndex: 0, results: [result('Last words')] })
  instance.onend()
  assert.equal(ctx.input, 'Last words')
  assert.equal(ctx.submissions, 0)
})
test('Clear text aborts recognition and discards late transcripts', () => {
  const { ctx, instance } = setup()
  ctx.input = 'Discard this'
  let handler
  function visit(n) {
    if (ts.isJsxAttribute(n) && n.name.getText(tree) === 'onClick' && n.initializer?.expression?.getText(tree).includes('current?.abort()')) handler = n.initializer.expression
    ts.forEachChild(n, visit)
  }
  visit(tree); assert.ok(handler)
  vm.runInContext(ts.transpileModule('(' + handler.getText(tree) + ')()', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, ctx)
  instance.onresult({ resultIndex: 0, results: [result('Late words')] })
  assert.equal(instance.aborted, true)
  assert.equal(ctx.input, '')
  assert.equal(ctx.recording, false)
  assert.equal(ctx.submissions, 0)
})
