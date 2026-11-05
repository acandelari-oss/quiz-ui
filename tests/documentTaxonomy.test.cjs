const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript')
function load(path, deps={}, globals={}) {
 const context={exports:{},require:n=>{if(n in deps)return deps[n];throw Error(n)},...globals}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,context)
 return context.exports
}
const grouping=load('utils/topicModules.ts')
const jsx=(type,props)=>({type,props})
function nodes(n){return !n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)]}
const doc=(id,status='ready',order=1)=>({id,title:id+'.pdf',module_id:'m',taxonomy_status:status,document_order_index:order})
const topic=(id,file)=>({id,module_id:'m',document_id:file,category:'Same',topic:id})
function render(topics,documents,accepted=false){
 const View=load('components/views/ModuleTopicsView.tsx',{
 'react':{useMemo:f=>f(),useState:v=>[v,()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},
 'react-i18next':{useTranslation:()=>({t:k=>k})},'../../utils/studyModeGate':{studyActivityLabel:()=>null},
 '../../utils/categoryIdentity':load('utils/categoryIdentity.ts'), '../../utils/topicModules':grouping,'./TopicsView':{default:'TopicsView'},'../CategoryOrganizationReview':{default:'Review'},
 '../DocumentTaxonomyControls':{default:'Controls'},'../useTaxonomyDocuments':{useTaxonomyDocuments:()=>({documents,refresh:async()=>{},error:false})}
 }).default
 return nodes(View({projectId:'p',topics,studyModules:[{id:'m',name:'Module',taxonomy_status:'ready',accepted_for_study:accepted}],projectName:'Project'}))
}
test('every file has a named card; multi file isolates editors and preserves order',()=>{
 const single=render([topic('a','one')],[doc('one')]);assert.equal(single.filter(n=>n.type==='h3').length,1)
 const multi=render([topic('a','one'),topic('b','two')],[doc('two','ready',2),doc('one','ready',1)])
 assert.deepEqual(multi.filter(n=>n.type==='h3').map(n=>n.props.children),['one.pdf','two.pdf'])
 assert.deepEqual(multi.filter(n=>n.type==='TopicsView').map(n=>n.props.topics.map(t=>t.id).join()),['a','b'])
})
test('mixed outcomes keep completed topics visible and gate module approval; legacy stays separate',()=>{
 const all=render([topic('a','one'),topic('old',null)],[doc('one'),doc('two','failed',2)])
 assert.ok(all.some(n=>n.type==='h3'&&n.props.children==='documentTaxonomy.legacyGroup'))
 assert.equal(all.find(n=>n.type==='button'&&n.props.children==='moduleTopics.enter').props.disabled,true)
 assert.ok(all.some(n=>n.type==='TopicsView'&&n.props.topics.some(t=>t.id==='a')))
 assert.equal(grouping.documentAggregate([{status:'ready'},{status:'failed'},{status:'queued'}]),'building')
 assert.equal(grouping.documentAggregate([{status:'ready'},{status:'failed'}]),'failed')
 assert.ok(render([topic('a','one')],[doc('one')],true).filter(n=>n.type==='Controls').every(n=>n.props.locked))
})
for(const lang of ['en','it']) test(`${lang}: recovery and deletion use exact document IDs, ready and locked files cannot retry`,async()=>{
 const locale=JSON.parse(fs.readFileSync(`public/locales/${lang}/common.json`))
 const requests=[], refresh=[]
 const Controls=load('components/DocumentTaxonomyControls.tsx',{
 'react':{useRef:v=>({current:v}),useState:v=>[v,()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},'react-i18next':{useTranslation:()=>({t:k=>k.split('.').reduce((a,b)=>a[b],locale)})},
 '../lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}
 },{window:{confirm:()=>true},process:{env:{NEXT_PUBLIC_API_URL:'local'}},fetch:async(url,options)=>{requests.push({url,...options});return {ok:true}}}).default
 const tree=nodes(Controls({document:{id:'file-id',status:'failed'},projectId:'p',locked:false,onChanged:async()=>refresh.push(1)}))
 assert.ok(tree.some(n=>n.props?.role==='status'&&n.props.children===locale.documentTaxonomy.failed))
 const buttons=tree.filter(n=>n.type==='button');await buttons[0].props.onClick();await new Promise(r=>setImmediate(r))
 assert.equal(requests[0].url,'local/projects/p/documents/file-id/taxonomy/retry');assert.equal(requests[0].method,'POST')
 await buttons[1].props.onClick();await new Promise(r=>setImmediate(r))
 assert.equal(requests[1].url,'local/projects/p/documents/file-id');assert.equal(requests[1].method,'DELETE');assert.equal(refresh.length,2)
 const ready=nodes(Controls({document:{id:'x',status:'ready'},locked:false}));assert.equal(ready.filter(n=>n.type==='button').length,2)
 assert.equal(nodes(Controls({document:{id:'x',status:'failed'},locked:true})).filter(n=>n.type==='button').length,0)
})
test('category scope resolves explicit IDs across documents for module-wide activities',()=>{
 const utils=load('utils/topics.ts');const topics=[topic('a','one'),topic('b','two')]
 assert.equal(utils.resolveCategoryTopicObjects('Same',topics,'m','one').length,1)
 assert.equal(utils.resolveCategoryTopicObjects('Same',topics,'m').length,2)
 assert.deepEqual(Array.from(utils.extractTopicIds(topics)),['a','b'])
 const label=load('utils/categoryIdentity.ts');assert.equal(label.categoryDisplayName('Same · one.pdf ⟦document:123⟧'),'Same · one.pdf')
})

test('old unambiguous priorities resolve, ambiguous names do not cross files',()=>{
 const {resolveCategoryPriorities}=load('utils/categoryIdentity.ts')
 const topics=[{category:'Same',category_key:'Same A'},{category:'Same',category_key:'Same B'},{category:'Unique',category_key:'Unique C'}]
 assert.deepEqual(Array.from(resolveCategoryPriorities(['Same','Unique'],topics)),['Unique C'])
 assert.deepEqual(Array.from(resolveCategoryPriorities(['Same A'],topics)),['Same A'])
})

test('document cards enclose their own editors, review and actions; approval remains outside',()=>{
 const all=render([topic('a','one'),topic('b','two')],[doc('one'),doc('two','ready',2)])
 const cards=all.filter(n=>n.type==='section'&&n.props['data-document-id'])
 assert.equal(cards.length,2)
 for(const card of cards){
   assert.ok(card.props.style.border)
   assert.equal(card.props.style.minWidth,0)
   const content=nodes(card)
   assert.equal(content.filter(n=>n.type==='TopicsView').length,1)
   assert.equal(content.filter(n=>n.type==='Controls').length,1)
   const view=content.find(n=>n.type==='TopicsView')
   assert.equal(view.props.documentName,`${card.props['data-document-id']}.pdf`)
   assert.ok(view.props.topics.every(t=>t.document_id===card.props['data-document-id']))
   assert.equal(content.filter(n=>n.type==='button'&&n.props.children==='moduleTopics.enter').length,0)
 }
})
test('category source label preserves identical names and long filenames without affecting legacy labels',()=>{
 const react={createContext:v=>v,useContext:v=>v}
 const Label=load('components/ui/CategoryLabel.tsx',{'react':{...react,default:react},'react/jsx-runtime':{jsx,jsxs:jsx},'../../utils/categoryIdentity':load('utils/categoryIdentity.ts')}).default
 for(const filename of ['one.pdf','two.pdf','A'.repeat(200)+'.pdf']){
   const all=nodes(Label({category:'Same',sourceDocument:filename}))
   const source=all.find(n=>n.props?.children===filename)
   assert.ok(source);assert.equal(source.props.style.textTransform,'none');assert.equal(source.props.style.overflowWrap,'anywhere')
 }
 assert.ok(!nodes(Label({category:'Legacy'})).some(n=>n.props?.style?.fontSize===12))
})

for (const ok of [true,false]) test('preview click-only single authenticated request; success='+ok,async()=>{
 const state=[],refs=[],requests=[];let index=0,refIndex=0,finish
 const Controls=load('components/DocumentTaxonomyControls.tsx',{
 'react':{useState:v=>{const i=index++;if(!(i in state))state[i]=v;return [state[i],v=>state[i]=v]},useRef:v=>refs[refIndex++] ||= {current:v}},
 'react/jsx-runtime':{jsx,jsxs:jsx},'react-i18next':{useTranslation:()=>({t:k=>k})},
 '../lib/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}}
 },{process:{env:{NEXT_PUBLIC_API_URL:'local'}},fetch:async(url,options)=>{requests.push({url,...options});return await new Promise(r=>finish=r)}}).default
 const render=()=>{index=0;refIndex=0;return nodes(Controls({document:{id:'file',status:'ready'},projectId:'p',locked:false,onChanged:()=>assert.fail('no persisted changes')}))}
 let tree=render();assert.equal(requests.length,0)
 const button=tree.find(n=>n.type==='button'&&n.props.children==='documentTaxonomy.preview')
 button.props.onClick();button.props.onClick();await new Promise(r=>setImmediate(r))
 assert.equal(requests.length,1);assert.equal(requests[0].url,'local/projects/p/documents/file/category-organization/preview')
 assert.equal(requests[0].headers.Authorization,'Bearer test');assert.equal(requests[0].method,'POST')
 assert.ok(render().some(n=>n.props?.role==='status'&&n.props.children==='documentTaxonomy.previewLoading'))
 finish({ok,json:async()=>ok?{document_id:'file',topic_count:1,categories:[{name:'Judges',topic_count:1}],assignments:[{topic_id:'a',topic_title:'Jurisdiction',category:'Judges'}]}:{detail:'Study Mode locked'}})
 await new Promise(r=>setImmediate(r));tree=render()
 if(ok) assert.deepEqual(tree.filter(n=>n.type==='li').map(n=>n.props.children),['Jurisdiction'])
 else assert.ok(tree.some(n=>n.props?.role==='alert'&&n.props.children==='Study Mode locked'))
 assert.equal(tree.find(n=>n.type==='button'&&n.props.children==='documentTaxonomy.preview').props.disabled,true)
 assert.equal(requests.length,1)
})
