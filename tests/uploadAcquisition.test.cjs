const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const output = ts.transpileModule(fs.readFileSync('utils/uploadAcquisition.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandbox={exports:{}}; vm.runInNewContext(output,sandbox);
const { acquisitionReports, acquisitionStatus }=sandbox.exports;
const report={filename:'same.pdf',document_id:'one',module_id:'m',unit_kind:'page',total:10,acquired:9,partial:0,failed:1,blank:0,units:[{number:10,status:'failed',reasons:['ocr_error'],better_copy:false}],limitations:[],accepted:true,status:'completed_with_warnings'};
test('waits for complete stream lines and retains latest backend counts',()=>{
 const line='ACQUISITION_REPORT|'+JSON.stringify(report)+'\n';
 assert.equal(acquisitionReports(line.slice(0,-3)).length,0);
 assert.equal(acquisitionReports(line)[0].failed,1);
 const updated={...report,partial:1,acquired:8};
 assert.equal(acquisitionReports(line+'ACQUISITION_REPORT|'+JSON.stringify(updated)+'\n').length,1);
 assert.equal(acquisitionReports(line+'ACQUISITION_REPORT|'+JSON.stringify(updated)+'\n')[0].partial,1);
});
test('same filenames remain separate documents',()=>{
 assert.equal(acquisitionReports([report,{...report,document_id:'two'}].map(r=>'ACQUISITION_REPORT|'+JSON.stringify(r)+'\n').join('')).length,2);
});
test('success requires taxonomy completion; failure overrides accepted acquisition',()=>{
 assert.equal(acquisitionStatus(report,'processing'),'processing');
 assert.equal(acquisitionStatus(report,'completed'),'completed_with_warnings');
 assert.equal(acquisitionStatus(report,'failed'),'failed');
 assert.equal(acquisitionStatus({...report,accepted:false},'processing'),'failed');
});
test('English and Italian report keys match',()=>{
 const en=JSON.parse(fs.readFileSync('public/locales/en/common.json')).acquisition;
 const it=JSON.parse(fs.readFileSync('public/locales/it/common.json')).acquisition;
 assert.deepEqual(Object.keys(en).sort(),Object.keys(it).sort());
 assert.deepEqual(Object.keys(en.reasons).sort(),Object.keys(it.reasons).sort());
});
test('truncated streams cannot be mistaken for a published upload',()=>{
 assert.equal(sandbox.exports.uploadPublished('Starting upload\nACQUISITION_REPORT|{}\n'),false);
 assert.equal(sandbox.exports.uploadPublished('Upload complete ✅\n'),true);
 assert.equal(sandbox.exports.uploadPublished('Upload complete ✅\nUPLOAD_FAILED|message=error\n'),false);
});

const path = require('node:path');
function loadTS(filename, overrides = {}) {
 const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
 const context = { exports: {}, require(name) {
   if (overrides[name]) return overrides[name];
   return require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name);
 }};
 vm.runInNewContext(source, context);
 return context.exports;
}

test('visual uncertainty alone is not a reading error; parser and OCR problems still count', () => {
 const units = [
   { number: 1, status: 'partial', reasons: ['unresolved_visuals'] },
   { number: 2, status: 'partial', reasons: ['unresolved_visuals','ocr_error'] },
   { number: 3, status: 'failed', reasons: ['parser_error'] },
   { number: 4, status: 'blank', reasons: [] },
 ];
 assert.equal(sandbox.exports.acquisitionReadingErrors({...report, units}), 2);
 assert.equal(sandbox.exports.acquisitionReadingErrors({...report, units:[units[0]]}), 0);
 // Multiple error reasons on the same page count once.
 assert.equal(sandbox.exports.acquisitionReadingErrors({...report, units:[{status:'failed',reasons:['parser_error','ocr_error']}]}),1);
});

test('real DOUNO namespace renders English and Italian summaries, diagnostics and lifecycle states', async () => {
 const React = require('react');
 const {renderToStaticMarkup} = require('react-dom/server');
 const {I18nextProvider} = require('react-i18next');
 // Use the application's actual resource registration, not a mocked translator.
 const i18n = loadTS('lib/i18n.ts').default;
 const Component = loadTS('components/ui/UploadAcquisitionResults.tsx', {'../../utils/uploadAcquisition': sandbox.exports}).default;
 const visual = {...report,failed:0,partial:1,units:[{number:2,status:'partial',reasons:['unresolved_visuals'],better_copy:false}]};
 const render = (data, phase) => renderToStaticMarkup(React.createElement(I18nextProvider,{i18n},React.createElement(Component,{reports:[data],phase})));
 for (const language of ['en','it']) {
   await i18n.changeLanguage(language);
   const locale = JSON.parse(fs.readFileSync(`public/locales/${language}/common.json`)).acquisition;
   const pending = render(visual,'processing');
   assert.ok(pending.includes(locale.processing));
   assert.ok(!pending.includes(locale.completed_with_warnings));
   assert.ok(pending.includes(`${locale.pagesProcessed}: <strong>10</strong>`));
   assert.ok(pending.includes(`${locale.readingErrors}: <strong>0</strong>`));
   assert.ok(pending.includes(locale.visualNotice));
   assert.ok(!pending.includes(`${locale.page}: 2`));
   assert.ok(!pending.includes('<details'));
   assert.ok(!pending.includes('data-acquisition-details="diagnostics"'));
   assert.ok(!pending.includes('acquisition.'));
   assert.ok(pending.includes('overflow-wrap:anywhere'));
   assert.ok(pending.includes('max-width:1080px'));
   assert.ok(pending.includes('flex-wrap:wrap'));
   assert.ok(render(visual,'completed').includes(locale.completed_with_warnings));
   assert.ok(render({...visual,status:'completed',units:[]},'completed').includes(locale.completed));
   const failed = render({...report,accepted:false},'processing');
   assert.ok(failed.includes(locale.failed));
   assert.ok(failed.includes(locale.reasons.ocr_error));
   assert.ok(failed.includes(`${locale.readingErrors}: <strong>1</strong>`));
   assert.ok(!failed.includes(locale.visualNotice));
   const detailed = render({...report, units:[
     {number:3,status:'failed',reasons:['parser_error'],better_copy:true},
     {number:4,status:'blank',reasons:[],better_copy:false},
     {number:5,status:'partial',reasons:['unsupported_embedded_content'],better_copy:false}
   ],limitations:[{reason:'classification_exclusion',unit:3},'short_text_activity_limit']},'failed');
   assert.ok(detailed.includes('<details') && detailed.includes('<summary'));
   for (const value of [locale.reasons.parser_error,locale.blank,locale.reasons.unsupported_embedded_content,locale.reasons.classification_exclusion,locale.reasons.short_text_activity_limit,locale.betterCopy]) assert.ok(detailed.includes(value));
   const docx=render({...visual,total:null,unit_kind:'document'},'processing');
   assert.ok(docx.includes(locale.noPageCount));
   assert.ok(!docx.includes(`${locale.pagesProcessed}:`));
 }
 await i18n.changeLanguage('en');
});

test('42 graphics flags are grouped as information; mixed failures and short-text details remain separate', async () => {
 const React = require('react');
 const {renderToStaticMarkup} = require('react-dom/server');
 const {I18nextProvider} = require('react-i18next');
 const i18n = loadTS('lib/i18n.ts').default;
 const Component = loadTS('components/ui/UploadAcquisitionResults.tsx', {'../../utils/uploadAcquisition': sandbox.exports}).default;
 const graphics = {...report,total:43,acquired:1,partial:42,failed:0,units:Array.from({length:43},(_,i)=>({
   number:i+1,status:i<42?'partial':'acquired',reasons:i<42?['unresolved_visuals']:[],better_copy:false
 }))};
 const unchanged = JSON.stringify(graphics);
 const render = (data,phase='completed') => renderToStaticMarkup(React.createElement(I18nextProvider,{i18n},React.createElement(Component,{reports:[data],phase})));
 for (const language of ['en','it']) {
   await i18n.changeLanguage(language);
   const locale=JSON.parse(fs.readFileSync(`public/locales/${language}/common.json`)).acquisition;
   const html=render(graphics);
   assert.ok(html.includes(`${locale.readingErrors}: <strong>0</strong>`));
   assert.equal(html.split(locale.visualNotice).length-1,1);
   assert.ok(!html.includes('<details'));
   assert.ok(!html.includes('42'));
   assert.ok(!html.includes(locale.reasons.unresolved_visuals));
   assert.ok(html.includes(`${locale.pagesProcessed}: <strong>43</strong>`));
   assert.ok(!html.includes('data-acquisition-details="diagnostics"'));
   assert.ok(!html.includes('<li'));
   assert.ok(html.includes(locale.completed_with_warnings));
   assert.ok(!html.includes('acquisition.'));
   const mixed={...graphics,failed:2,partial:40,units:graphics.units.map(unit=>{
     if(unit.number===3)return {...unit,status:'failed',reasons:['unresolved_visuals','parser_error']};
     if(unit.number===4)return {...unit,reasons:['unresolved_visuals','ocr_error']};
     if(unit.number===5)return {...unit,status:'failed',reasons:['unresolved_visuals','no_recoverable_text'],better_copy:true};
     return unit;
   }),limitations:[17,21,27,38].map(unit=>({unit,reason:'short_text_activity_limit'}))};
   const originalMixed=JSON.stringify(mixed);
   const mixedHtml=render(mixed);
   assert.equal(JSON.stringify(mixed),originalMixed);
   assert.equal(mixedHtml.split(locale.visualNotice).length-1,1);
   assert.ok(mixedHtml.includes(`${locale.readingErrors}: <strong>3</strong>`));
   const diagnostics=mixedHtml.match(/<details data-acquisition-details="diagnostics"[^>]*>(.*?)<\/details>/s)[1];
   for(const [number,reason] of [[3,'parser_error'],[4,'ocr_error'],[5,'no_recoverable_text'],[17,'short_text_activity_limit'],[21,'short_text_activity_limit'],[27,'short_text_activity_limit'],[38,'short_text_activity_limit']]) {
     assert.ok(diagnostics.includes(`${locale.page} ${number}:`));
     assert.ok(diagnostics.includes(locale.reasons[reason]));
   }
   assert.ok(!diagnostics.includes(locale.reasons.unresolved_visuals));
   assert.equal((diagnostics.match(/<li /g)||[]).length,7);
   assert.equal(diagnostics.split(locale.reasons.short_text_activity_limit).length-1,4);
   assert.ok(!mixedHtml.includes('data-acquisition-details="graphics"'));
   assert.ok(!mixedHtml.includes('42'));
   assert.ok(render(mixed,'processing').includes(locale.processing));
   assert.ok(!render(mixed,'processing').includes(locale.completed_with_warnings));
   assert.ok(render(mixed,'failed').includes(locale.failed));
   const slides=render({...graphics,unit_kind:'slide'});
   assert.ok(slides.includes(locale.visualNotice));
   assert.ok(!slides.includes('<details'));
   assert.ok(!slides.includes('42'));
 }
 assert.equal(JSON.stringify(graphics),unchanged,'presentation must not mutate the backend report');
 await i18n.changeLanguage('en');
});
