const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')

function runtime(enabled = true, failWrite = false) {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'douno-cost-'))
 const fakeProcess = { pid: process.pid, env: { DOUNO_AI_COST_TEST: enabled ? '1':'0', DOUNO_AI_COST_TEST_ID:'node-mock', DOUNO_AI_COST_TEST_OUTPUT_DIR:dir, OPENAI_API_KEY:'dummy-test' } }
 let calls = 0
 const payload = { model:'gpt-4o-mini', usage:{ prompt_tokens:100, completion_tokens:20,total_tokens:120,prompt_tokens_details:{cached_tokens:0} }, choices:[{ message:{content:'PRIVATE ANSWER'} }] }
 const ctx = { exports:{}, require: name => name === 'node:fs' && failWrite ? {...fs, mkdirSync(){throw Error('secret')}} : require(name), process:fakeProcess, console:{warn(){}}, fetch:async()=>{calls++;return new Response(JSON.stringify(payload),{status:200})} }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('server/aiCostTest.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx)
 const events=()=>fs.readdirSync(dir).flatMap(sub=>fs.readdirSync(path.join(dir,sub)).filter(f=>f.endsWith('.jsonl')).flatMap(f=>fs.readFileSync(path.join(dir,sub,f),'utf8').trim().split('\n').map(JSON.parse)))
 return {ctx, helper:ctx.exports, dir, events, calls:()=>calls, payload}
}

test('Next.js capture uses existing JSON response; metadata only', async()=>{
 const r=runtime(); const h=r.helper
 const handler=h.costOperation('educational_units',async()=>{
  const res=await h.costFetch('grouping','https://unused.test',{body:JSON.stringify({model:'gpt-4o-mini',messages:['PRIVATE PROMPT']})})
  const data=await res.json();h.costUsage(res,data);return data.choices[0].message.content
 })
 assert.equal(await handler(),'PRIVATE ANSWER');assert.equal(r.calls(),1)
 const events=r.events();assert.equal(events.filter(e=>e.event==='call_end').length,1)
 assert.equal(events.find(e=>e.event==='call_end').usage.input_tokens,100)
 assert.ok(!JSON.stringify(events).includes('PRIVATE'))
 fs.rmSync(r.dir,{recursive:true})
})
test('disabled helper makes no files and returns normal content',async()=>{
 const r=runtime(false),h=r.helper
 const run=h.costOperation('units',async()=>{
  const res=await h.costFetch('title','unused',{});const data=await res.json();h.costUsage(res,data);return data
 })
 assert.equal((await run()).choices[0].message.content,'PRIVATE ANSWER')
 assert.equal(fs.readdirSync(r.dir).length,0);assert.equal(r.calls(),1)
 fs.rmSync(r.dir,{recursive:true})
})
test('logging failure never replaces successful response',async()=>{
 const r=runtime(true,true),h=r.helper
 const run=h.costOperation('units',async()=>{const res=await h.costFetch('title','unused',{});const data=await res.json();h.costUsage(res,data);return data})
 assert.equal((await run()).choices[0].message.content,'PRIVATE ANSWER')
 fs.rmSync(r.dir,{recursive:true})
})
test('HTTP failure and malformed JSON preserve unknown costs',async()=>{
 const r=runtime(),h=r.helper
 r.ctx.fetch=async()=>new Response('bad',{status:500})
 await h.costOperation('units',async()=>h.costFetch('title','unused',{}))()
 r.ctx.fetch=async()=>new Response('bad',{status:200})
 await assert.rejects(h.costOperation('units',async()=>{const response=await h.costFetch('title','unused',{});return response.json()})())
 const ends=r.events().filter(e=>e.event==='call_end');assert.equal(ends.length,2)
 assert.deepEqual(ends.map(e=>e.usage),[{},{}])
 fs.rmSync(r.dir,{recursive:true})
})
test('real title route keeps three attempts and fallback response',async()=>{
 const r=runtime(),h=r.helper
 const ctx={...r.ctx,exports:{},require:name=>name.includes('server/aiCostTest')?h:name.includes('educationalUnitTitles')?{buildFallbackEducationalUnitTitle:()=> 'Fallback',validateEducationalUnitTitle:()=>({valid:false,title:'Rejected'})}:require(name)}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('pages/api/educational-unit-title.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx)
 let result;const res={status(){return this},json(data){result=data;return this}}
 await ctx.exports.default({method:'POST',body:{categories:['a']}},res)
 assert.equal(result.source,'fallback');assert.equal(r.calls(),3)
 assert.deepEqual(r.events().filter(e=>e.event==='call_end').map(e=>e.metadata.application_attempt),[1,2,3])
 fs.rmSync(r.dir,{recursive:true})
})
