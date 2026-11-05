const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/generationError.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
const { generationResponseError } = context.exports

test('preserves HTTP status and a readable backend explanation', async () => {
 const error = await generationResponseError(new Response(JSON.stringify({detail:'Unable to persist the complete quiz.'}), {status:503}), 'Quiz generation failed')
 assert.equal(error.message, 'Quiz generation failed (HTTP 503): Unable to persist the complete quiz.')
})
test('proxy HTML and validation objects do not leak into the displayed message', async () => {
 for (const body of ['<html>proxy failure</html>', JSON.stringify({detail:[{input:'private payload'}]})]) {
  const error = await generationResponseError(new Response(body,{status:502}), 'Generation failed')
  assert.equal(error.message, 'Generation failed (HTTP 502)')
 }
})
