const assert=require('node:assert/strict');
const T=require('./t04-data-model.js');

function source(id,url,platform,body){return{id,url,canonicalUrl:url,platform,identity:{status:'confirmed',reason:'test'},read:{status:'read',title:'',observedAt:'2026-10-26T10:00:00.000Z',lastAttempt:{status:'read'}},content:{text:body,rawText:'',hash:T.hash(body)},links:[],legacy:{}}}
let doc=T.emptyDocument();
doc.clients.push({id:'c1',identity:{displayName:'د. هناء يوسف',officialName:'',specialty:'نساء وتوليد',status:'draft'},inputs:{links:[],notes:'',goal:'',budget:'',answers:{}},sources:[
  source('site','https://doctor.test/','موقع / مصدر خارجي',`عيادة د. هناء يوسف\nالتخصص: نساء وتوليد\nالعنوان: 2 شارع بستان الجيش، العباسية، القاهرة\nللحجز عن طريق التليفون 01220541356\nالخدمات: متابعة الحمل، الولادة، السونار\nVISIT OUR NEW STORE IN NEW YORK\n294 Bay Meadows Ave., Bay Shore, NY 11706\nNew Collection Woman Dress — Purchase Now`),
  source('booking','https://vezeeta.test/ar/dr/hanan','منصة حجز',`د. هناء يوسف\nالتقييم 4.8 من 5 بناء على 200 تقييم\nالكشف 300 جنيه ويشمل السونار\nآخر تقييم مريض: 2019-11-03\nللحجز اتصل على 16676`)
],evidence:[],facts:[],findings:[],questions:[],decisions:[],report:{status:'not_started',slides:[],generatedFromRevision:null,updatedAt:null},revisions:{data:0,review:0,report:0},createdAt:'2026-10-26T10:00:00.000Z',updatedAt:'2026-10-26T10:00:00.000Z',legacy:{sourceVersion:'test',unmapped:{}}});

let r=T.applyFactExtraction(doc,'c1','site');doc=r.document;
assert.ok(doc.clients[0].facts.some(f=>f.field==='address'&&/بستان الجيش/.test(f.observedValue)),'real address extracted');
assert.ok(!doc.clients[0].facts.some(f=>/Bay Shore|Bay Meadows/i.test(f.observedValue)),'template address rejected');
assert.ok(r.rejected.some(x=>x.field==='address'&&/قالب/.test(x.reason)),'template rejection reason recorded');
assert.ok(doc.clients[0].facts.some(f=>f.field==='phone'&&/01220541356/.test(f.observedValue)),'first-party phone extracted');

r=T.applyFactExtraction(doc,'c1','booking');doc=r.document;
const c=doc.clients[0];
assert.ok(!c.facts.some(f=>f.field==='phone'&&/16676/.test(f.observedValue)),'platform phone is not client phone');
assert.ok(c.facts.some(f=>f.field==='platform_phone'&&f.scope==='platform'&&/16676/.test(f.observedValue)),'platform phone scoped correctly');
assert.ok(!c.facts.some(f=>f.field==='platform_phone'&&/2019/.test(f.observedValue)),'review date is not a platform phone');
assert.ok(c.facts.some(f=>f.field==='last_review_date'&&f.scope==='review'&&f.observedValue==='2019-11-03'),'review date scoped correctly');
assert.ok(!c.facts.some(f=>f.field==='last_activity'),'review date is not client activity');
assert.ok(c.facts.some(f=>f.field==='rating'&&/4.8/.test(f.observedValue)),'rating extracted');
assert.ok(c.facts.some(f=>f.field==='reviews_count'&&f.observedValue==='200'),'review count extracted');
assert.ok(c.facts.some(f=>f.field==='price'&&f.observedValue==='300 جنيه'),'price extracted');
assert.ok(!c.facts.some(f=>f.field==='address'&&/عن طريق/.test(f.observedValue)),'booking phrase is not an address');

for(const f of c.facts){for(const eid of f.evidenceIds){const e=c.evidence.find(x=>x.id===eid);assert.ok(e,'evidence exists');const s=c.sources.find(x=>x.id===e.sourceId);assert.ok(s.content.text.includes(e.quote),'quote is exact');assert.ok(e.url,'evidence url');assert.ok(e.observedAt,'observation date');assert.ok(e.scope,'evidence scope')}}

const beforeFacts=c.facts.length,beforeEvidence=c.evidence.length;
r=T.applyFactExtraction(doc,'c1','booking');doc=r.document;
assert.equal(doc.clients[0].facts.length,beforeFacts,'repeat extraction does not duplicate facts');
assert.equal(doc.clients[0].evidence.length,beforeEvidence,'repeat extraction does not duplicate evidence');

doc=T.upsertFact(doc,'c1',{field:'platform_phone',scope:'platform',observedValue:'2019-11-03',origin:'deterministic_extraction',sourceId:'booking',evidence:[{sourceId:'booking',url:'https://vezeeta.test/ar/dr/hanan',quote:'آخر تقييم مريض: 2019-11-03',scope:'platform',observedAt:'2026-10-26T10:00:00.000Z'}]});
doc=T.upsertFact(doc,'c1',{field:'address',scope:'client',observedValue:'للحجز عن طريق التليفون 01220541356',origin:'deterministic_extraction',sourceId:'site',evidence:[{sourceId:'site',url:'https://doctor.test/',quote:'للحجز عن طريق التليفون 01220541356',scope:'client',observedAt:'2026-10-26T10:00:00.000Z'}]});
doc=T.applyFactExtraction(doc,'c1','booking').document;doc=T.applyFactExtraction(doc,'c1','site').document;
assert.ok(!doc.clients[0].facts.some(f=>f.field==='platform_phone'&&/2019/.test(f.observedValue)),'stale bad date fact removed on re-extraction');
assert.ok(!doc.clients[0].facts.some(f=>f.field==='address'&&/عن طريق/.test(f.observedValue)),'stale bad address fact removed on re-extraction');

const rating=doc.clients[0].facts.find(f=>f.field==='rating');
doc=T.setFactDecision(doc,'c1',rating.id,'approved');
doc=T.applyFactExtraction(doc,'c1','booking').document;
assert.equal(doc.clients[0].facts.find(f=>f.id===rating.id).review.status,'approved','review survives re-extraction');

const bad=T.clone(doc);bad.clients[0].sources.push(source('bad','https://bad.test','موقع / مصدر خارجي','Just a moment\nCloudflare Ray ID'));
bad.clients[0].sources.at(-1).read.status='blocked';
assert.throws(()=>T.applyFactExtraction(bad,'c1','bad'),/مؤكد ومقروء/,'blocked source cannot be extracted');

console.log(JSON.stringify({passed:true,facts:doc.clients[0].facts.length,evidence:doc.clients[0].evidence.length,templateAddressRejected:true,platformPhoneScoped:true,reviewDateScoped:true,deduplicated:true,decisionPreserved:true}));
