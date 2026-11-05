const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync('components/views/TopicsView.tsx', 'utf8')
const fn = source.slice(source.indexOf('export function groupPersistedMacroCategories('))
const ctx = { exports: {} }
vm.runInNewContext(ts.transpileModule(fn, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, ctx)
const group = ctx.exports.groupPersistedMacroCategories

test('saved parents group existing category selectors without changing topic IDs', () => {
  const a = ['doc-key-a', [{ id: 't1', category: 'Syntax', macrocategory: 'Logic' }]]
  const b = ['doc-key-b', [{ id: 't2', category: 'Semantics', macrocategory: 'Logic' }]]
  const c = ['doc-key-c', [{ id: 't3', category: 'Rules', macrocategory: 'Proofs' }]]
  const result = group([a,b,c])
  assert.equal(result.length,2)
  assert.equal(result[0].title,'Logic')
  assert.equal(result[0].items[0],a)
  assert.equal(result[0].items[1],b)
  assert.equal(result[1].items[0],c)
})

test('inconsistent or absent parents never invent a hierarchy', () => {
  assert.equal(group([['a',[{category:'A'}]]]),null)
  assert.equal(group([['a',[{category:'A',macrocategory:'P'},{category:'A',macrocategory:'Q'}]]]),null)
  assert.equal(group([['a',[{category:'A',macrocategory:'A'}]]]),null)
})

test('saved grouping is checked before any educational-unit API request', () => {
  assert.ok(source.indexOf('const savedGroups =') < source.indexOf('fetch("/api/educational-units"'))
})
