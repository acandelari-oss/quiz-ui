const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('utils/backgroundUpload.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS }, reportDiagnostics: true })
assert.equal(compiled.diagnostics.length, 0)
const context = { exports: {} }
vm.runInNewContext(compiled.outputText, context)
const { shouldPresentUploadResult, uploadStatusForWorkspace } = context.exports

test('upload completion and failure cannot replace an active study activity', () => {
  for (const view of ['quiz', 'flashcards', 'active_recall', 'ask', 'study_session', 'planner_view', 'relationship_lab', 'topics']) {
    assert.equal(shouldPresentUploadResult(true, view), false, view)
    for (const status of ['Processing topics...', 'Project upload completed', 'Upload failed', 'Upload interrupted', 'Topic generation timeout']) {
      assert.equal(uploadStatusForWorkspace(status, true, view), '', view)
    }
  }
})

test('students staying on the upload screen retain foreground feedback', () => {
  for (const view of ['project', 'load_project', 'create_project', 'upload_error']) {
    assert.equal(shouldPresentUploadResult(true, view), true)
    assert.equal(uploadStatusForWorkspace('Processing topics...', true, view), 'Processing topics...')
  }
})

test('first upload retains existing foreground behavior', () => {
  assert.equal(shouldPresentUploadResult(false, 'quiz'), true)
  assert.equal(uploadStatusForWorkspace('Processing topics...', false, 'quiz'), 'Processing topics...')
})

test('unrelated workspace loading states are never suppressed', () => {
  for (const status of ['Loading project...', 'Loading previous material...', 'Project loaded successfully', '']) {
    assert.equal(uploadStatusForWorkspace(status, true, 'quiz'), status)
  }
})
