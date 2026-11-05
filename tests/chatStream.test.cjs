const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const context = { exports: {}, TextDecoder }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/chatStream.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
const { readChatStream } = context.exports
function response(events) {
 const bytes = new TextEncoder().encode(events.map(e => JSON.stringify(e)).join('\n')+'\n')
 return new Response(new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close() } }), { headers: { 'content-type': 'application/x-ndjson' } })
}
test('streams UTF-8 text across byte boundaries and preserves final metadata', async () => {
 const seen = []
 const result = await readChatStream(response([{type:'text',text:'Caffè ☕'}, {type:'text',text:'Caffè ☕ pronto'}, {type:'done', data:{ answer:'Caffè ☕ pronto', sources:['book'] }}]), text => seen.push(text))
 assert.deepEqual(seen, ['Caffè ☕', 'Caffè ☕ pronto']); assert.equal(result.sources[0], 'book')
})
test('rejects incomplete and failed responses', async () => {
 for (const events of [[{type:'text',text:'partial'}], [{type:'error'}]]) await assert.rejects(readChatStream(response(events), () => {}))
})
test('aborted requests never publish text', async () => {
 const controller = new AbortController(); controller.abort()
 await assert.rejects(readChatStream(response([{type:'text',text:'late'}]), () => assert.fail(), controller.signal))
})
