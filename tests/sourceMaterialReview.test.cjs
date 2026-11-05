const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript'), i18next=require('i18next')
const code=ts.transpileModule(fs.readFileSync('components/SourceMaterialReview.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)]
async function harness(lang,fail=false,payload=null){
 const i18n=i18next.createInstance();await i18n.init({lng:lang,resources:{[lang]:{translation:JSON.parse(fs.readFileSync(`public/locales/${lang}/common.json`))}}})
 let index=0,effected=false;const state=[],requests=[],effects=[]
 const react={useState(value){const i=index++;if(!(i in state))state[i]=value;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useEffect(fn){if(!effected){effects.push(fn);effected=true}}}
 const jsx=(type,props)=>({type,props})
 const context={exports:{},process:{env:{NEXT_PUBLIC_API_URL:'test'}},fetch:async(url,opts)=>{requests.push({url,opts});return{ok:!fail,json:async()=>payload||{revision:1,pending_count:1,items:[{chunk_id:4,page:23,text:'Original source'}],topics:[{id:'t',title:'Topic',category:'Category'}],unsupported_candidates:[]}}},require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};if(name==='react-i18next')return{useTranslation:()=>({t:i18n.t.bind(i18n)})};if(name==='../lib/supabase')return{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'token'}}})}}};throw Error(name)}}
 vm.runInNewContext(code,context)
 const props={projectId:'p',documentId:'d',ready:true,locked:false}
 function render(){index=0;return context.exports.default(props)}
 render();effects.forEach(f=>f());await new Promise(r=>setImmediate(r))
 return{render,props,requests}
}
for(const lang of ['en','it'])test(`${lang} coverage warning is localized and read-only`,async()=>{
 const h=await harness(lang)
 const all=nodes(h.render())
 assert.ok(all.some(n=>n.props?.role==='status'))
 assert.ok(!JSON.stringify(all).includes('Page 23'))
 assert.ok(!JSON.stringify(all).includes('sourceReview.'))
 assert.ok(!JSON.stringify(all).includes('Original source'))
 assert.ok(!all.some(n=>['pre','select','input','button','fieldset'].includes(n.type)))
 assert.equal(h.requests.length,1)
 assert.notEqual(h.requests[0].opts.method,'PATCH')
 h.props.locked=true
 assert.ok(nodes(h.render()).some(n=>n.props?.role==='status'))
})
test('successful coverage hides the notice',async()=>{
 const h=await harness('en',false,{pending_count:0,items:[],unsupported_candidates:[]})
 assert.equal(h.render(),null)
})
test('unpublished proposals show warning without exposing repair work',async()=>{
 const h=await harness('en',false,{pending_count:0,items:[],unsupported_candidates:[{id:'x',title:'Internal proposal'}]})
 const all=nodes(h.render())
 assert.ok(all.some(n=>n.props?.role==='status'))
 assert.ok(!JSON.stringify(all).includes('Internal proposal'))
})
test('pages are deduplicated and sorted and stale checks remain visible',async()=>{
 const h=await harness('en',false,{pending_count:4,stale:true,items:[{page:23},{page:3},{page:23},{page:null}]})
 const all=nodes(h.render())
 assert.equal(all.filter(n=>n.type==='summary').length,1)
 assert.equal(all.find(n=>n.type==='details').props.open,undefined)
 assert.equal(all.filter(n=>n.type==='strong').length,0)
 assert.ok(all.some(n=>n.props?.role==='alert'))
})
test('fetch failures cannot appear as complete coverage',async()=>{
 const h=await harness('en',true)
 assert.ok(nodes(h.render()).some(n=>n.props?.role==='alert'))
 assert.equal(h.requests.length,1)
})
test('document not ready does not show the notice',async()=>{
 const h=await harness('en');h.props.ready=false
 assert.equal(h.render(),null)
})


for(const lang of ['en','it'])test(`${lang} one plain coverage note replaces repeated internal errors`,async()=>{
 const h=await harness(lang,false,{pending_count:28,items:Array.from({length:28},(_,i)=>({page:i+1,reason:'recovery_failed'}))})
 const all=nodes(h.render())
 assert.equal(all.filter(n=>n.type==='details').length,1)
 assert.equal(all.filter(n=>n.type==='p').length,1)
 const translations=JSON.parse(fs.readFileSync(`public/locales/${lang}/common.json`)).sourceReview
 assert.ok(JSON.stringify(all).includes(translations.coverageSummary))
 assert.ok(!JSON.stringify(all).includes(translations.reasons.recovery_failed))
 assert.equal(h.requests.length,1)
})
test('dashboard reuses acquisition UI with document and module identity',()=>{
 const module=fs.readFileSync('components/views/ModuleTopicsView.tsx','utf8')
 assert.ok(module.includes('report.document_id === file.id && report.module_id === group.id'))
 assert.ok(module.includes('<UploadAcquisitionResults'))
 assert.ok(!module.includes('report.filename === file.name'))
 const workspace=fs.readFileSync('components/Workspace.tsx','utf8')
 assert.ok(workspace.includes('<ModuleTopicsView\n          acquisition={acquisition}'))
})
