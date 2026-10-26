const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const box={module:{exports:{}},exports:{},URL,Date,console};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../t04-review/data-model.js'),'utf8'),box);const T=box.module.exports;
function client(id='c1',specialty='جلدية'){const now='2026-10-27T00:00:00.000Z';return{id,identity:{displayName:'عميل تجريبي',specialty},inputs:{links:[],answers:{}},sources:[],evidence:[],facts:[],findings:[],questions:[],decisions:[],contentSamples:[],competitorSelection:{search:{service:'جلدية وليزر',region:'الدقي'},candidates:[],runs:[],limits:[]},report:{},revisions:{data:0,review:0,report:0},createdAt:now,updatedAt:now,legacy:{}}}
let doc=T.emptyDocument();doc.clients.push(client());
doc=T.setCompetitorSearchContext(doc,'c1',{service:'جلدية وليزر',region:'الدقي'});
const items=[
{name:'منافس ألف',service:'جلدية وليزر',area:'الدقي',sources:[{url:'https://alpha.example/skin',type:'official_site',evidence:'عيادة جلدية وليزر في الدقي'}]},
{name:'منافس باء',service:'جلدية',area:'مدينة نصر',sources:[{url:'https://beta.example/skin',evidence:'عيادة جلدية في مدينة نصر'}]},
{name:'مورد جيم',service:'توريد أجهزة ليزر للعيادات',area:'الدقي',sources:[{url:'https://supplier.example',evidence:'توريد معدات لأصحاب العيادات في الدقي'}]}
];
let applied=T.applyCompetitorCandidates(doc,'c1',items,{origin:'test',status:'success'});doc=applied.document;
let analysis=T.buildCompetitorSelection(doc.clients[0]),strong=analysis.candidates.find(x=>x.name==='منافس ألف'),wrong=analysis.candidates.find(x=>x.name==='منافس باء'),b2b=analysis.candidates.find(x=>x.name==='مورد جيم');
assert.equal(strong.eligibility.state,'strong','same service, area and source is strong');
assert.equal(wrong.eligibility.state,'ineligible','wrong explicit area is ineligible');
assert.equal(b2b.eligibility.state,'ineligible','B2B supplier is ineligible');
assert.throws(()=>T.setCompetitorDecision(doc,'c1',wrong.id,'approved'),/كمّل إثبات/,'weak candidate cannot be approved');
doc=T.setCompetitorDecision(doc,'c1',strong.id,'approved');
analysis=T.buildCompetitorSelection(doc.clients[0]);assert.equal(analysis.approved.length,1,'team approval saved');
applied=T.applyCompetitorCandidates(doc,'c1',[{name:'منافس ألف',service:'جلدية وليزر',area:'الدقي',sources:[{url:'https://maps.app.goo.gl/alpha',evidence:'فرع الدقي للجلدية'}]}],{origin:'test',status:'success'});doc=applied.document;
analysis=T.buildCompetitorSelection(doc.clients[0]);strong=analysis.candidates.find(x=>x.name==='منافس ألف');assert.equal(analysis.candidates.filter(x=>x.name==='منافس ألف').length,1,'same candidate merged');assert.equal(strong.sources.length,2,'second source preserved');assert.equal(strong.review.status,'approved','decision survives merge');
const before=JSON.stringify(analysis.candidates);doc=T.applyCompetitorCandidates(doc,'c1',[],{origin:'live_search',status:'error',error:'network'}).document;analysis=T.buildCompetitorSelection(doc.clients[0]);assert.equal(JSON.stringify(analysis.candidates),before,'failed search does not erase candidates or decisions');assert.ok(analysis.limits.some(x=>x.includes('تعذر آخر بحث')),'failed search recorded as limit');
let other=T.emptyDocument();other.clients.push(client('c2','تدريب'));other=T.setCompetitorSearchContext(other,'c2',{service:'تدريب برمجة',region:'مدينة نصر'});other=T.applyCompetitorCandidates(other,'c2',[{name:'أكاديمية ألف',service:'تدريب برمجة',area:'مدينة نصر',sources:[{url:'https://academy.example',evidence:'أكاديمية تدريب برمجة في مدينة نصر'}]}],{status:'success'}).document;
assert.equal(T.buildCompetitorSelection(other.clients[0]).candidates[0].eligibility.state,'strong','generic logic works outside clinics');
const parsed=T.parseCompetitorPaste('الاسم: مركز مثال\nالخدمة: تدريب برمجة\nالمنطقة: مدينة نصر\nالرابط: https://example.com\nالدليل: مركز تدريب برمجة في مدينة نصر');
assert.equal(parsed.items.length,1,'manual candidate parser works');
const legacy=T.normalizeDocument({version:'V3.44',clients:[{id:'old',name:'قديم',sources:[],facts:[],decisions:[]}]});assert.ok(legacy.clients[0].competitorSelection&&Array.isArray(legacy.clients[0].competitorSelection.candidates),'old client opens with empty competitor selection');
console.log(JSON.stringify({passed:true,strongMatch:true,wrongRegionRejected:true,b2bRejected:true,dedupe:true,decisionPreserved:true,failedSearchPreserved:true,genericDomain:true,legacyOpens:true}));