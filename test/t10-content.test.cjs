const assert=require('node:assert/strict');
const T=require('../t04-review/data-model.js');
function source(id,platform,url){return{id,url,canonicalUrl:url,platform,identity:{status:'confirmed'},read:{status:'read',title:platform+' test',observedAt:'2026-10-26T12:00:00.000Z'},content:{text:'sample',hash:T.hash('sample')},links:[],legacy:{}}}
let doc=T.emptyDocument();
doc.clients.push({id:'c1',identity:{displayName:'عيادة T10',specialty:'أسنان'},inputs:{links:[],answers:{}},sources:[source('fb','Facebook','https://facebook.com/test'),source('ig','Instagram','https://instagram.com/test'),source('yt','YouTube','https://youtube.com/@test')],evidence:[],facts:[],findings:[],questions:[],decisions:[],contentSamples:[],report:{},revisions:{data:0,review:0,report:0},createdAt:'2026-10-26T12:00:00.000Z',updatedAt:'2026-10-26T12:00:00.000Z',legacy:{sourceVersion:'test',unmapped:{}}});
const fbPosts=[
{date:'2026-10-20',format:'video',url:'https://facebook.com/test/1',text:'نصيحة: تعرف على أسباب ألم الأسنان وطرق الوقاية.'},
{date:'2026-10-18',format:'image',url:'https://facebook.com/test/2',text:'هل تعلم ما الفرق بين تنظيف الأسنان والتلميع؟ معلومة مهمة.'},
{date:'2026-10-16',format:'carousel',url:'https://facebook.com/test/3',text:'أعراض التهاب اللثة وخطوات العلاج المبكر.'},
{date:'2026-10-14',format:'video',url:'https://facebook.com/test/4',text:'احجز موعد الكشف وخدمة تنظيف الأسنان متاحة الآن.'},
{date:'2026-10-12',format:'image',url:'https://facebook.com/test/5',text:'عرض الكشف والمتابعة — للحجز ابعت رسالة.'},
{date:'2026-10-10',format:'video',url:'https://facebook.com/test/6',text:'تجربة مريض قبل وبعد العلاج وشهادته عن النتيجة.'},
{date:'2026-10-08',format:'image',url:'https://facebook.com/test/7',text:'قصة مريضة ونتيجة الحالة بعد المتابعة.'},
{date:'2026-10-06',format:'video',url:'https://facebook.com/test/8',text:'سؤال: إيه أكتر حاجة بتأخرك عن زيارة طبيب الأسنان؟ شاركونا.'}
];
doc=T.setContentSample(doc,'c1','fb',fbPosts,{origin:'test'});
doc=T.setContentSample(doc,'c1','yt',[{date:'2025-04-01',format:'video',url:'https://youtube.com/watch?v=test',text:'تعرف على فريق العيادة والخدمات المتاحة.'}],{origin:'test'});
let c=doc.clients[0],analysis=T.buildContentAnalysis(c,{asOf:'2026-10-26'}),fb=analysis.platforms.find(x=>x.sourceId==='fb'),ig=analysis.platforms.find(x=>x.sourceId==='ig'),yt=analysis.platforms.find(x=>x.sourceId==='yt');
assert.equal(analysis.totalPosts,9,'all dated posts counted');
assert.equal(fb.sampleCount,8,'facebook sample count');
assert.equal(fb.lastActivity,'2026-10-20','latest dated post used');
assert.equal(fb.firstActivity,'2026-10-06','sample range start');
assert.equal(fb.typeBreakdown.reduce((n,x)=>n+x.percent,0),100,'content percentages total 100');
assert.deepEqual(Object.fromEntries(fb.typeBreakdown.map(x=>[x.key,x.count])),{educational:3,proof:2,service:2,engagement:1},'deterministic content mix');
assert.equal(fb.formatBreakdown.reduce((n,x)=>n+x.percent,0),100,'format percentages total 100');
assert.equal(ig.status,'no_sample','confirmed platform without posts stays visible');
assert.equal(ig.typeBreakdown.length,0,'no percentages without sample');
assert.ok(ig.limits.some(x=>x.includes('مش هنحسب نسب')),'no-sample limitation explicit');
assert.equal(yt.lastActivity,'2025-04-01','old activity retained');
assert.ok(yt.ageDays>90&&yt.limits.some(x=>x.includes('أقدم من 90 يوم')),'old activity disclosed instead of empty 90-day window');
const parsed=T.parseContentPaste('2026-10-25\nفورمات: فيديو\nرابط: https://facebook.com/test/9\nنصيحة جديدة\n\nمنشور بلا تاريخ','fb');
assert.equal(parsed.posts.length,1,'valid pasted post parsed');
assert.equal(parsed.rejected.length,1,'undated block rejected');
doc=T.setContentSample(doc,'c1','fb',parsed.posts,{rejected:parsed.rejected});
c=doc.clients[0];analysis=T.buildContentAnalysis(c,{asOf:'2026-10-26'});fb=analysis.platforms.find(x=>x.sourceId==='fb');
assert.equal(fb.sampleCount,9,'new post merged into sample');
assert.equal(fb.lastActivity,'2026-10-25','latest activity updated');
const post=fb.posts.find(x=>x.url.includes('/9'));
doc=T.setContentPostType(doc,'c1',post.id,'brand');
const round=T.normalizeDocument(JSON.parse(JSON.stringify(doc))),roundFb=T.buildContentAnalysis(round.clients[0],{asOf:'2026-10-26'}).platforms.find(x=>x.sourceId==='fb'),corrected=roundFb.posts.find(x=>x.id===post.id);
assert.equal(corrected.teamType,'brand','team correction survives refresh');
assert.ok(round.clients[0].decisions.some(x=>x.targetType==='content_post_type'&&x.targetId===post.id),'content correction decision saved');
doc=T.setContentSample(doc,'c1','fb',parsed.posts,{rejected:parsed.rejected});
assert.equal(T.buildContentAnalysis(doc.clients[0],{asOf:'2026-10-26'}).platforms.find(x=>x.sourceId==='fb').sampleCount,9,'same post does not duplicate');
const legacy=T.normalizeDocument({version:'V3.44',clients:[{id:'old',name:'قديم',sources:[],facts:[],decisions:[]}]});
assert.ok(Array.isArray(legacy.clients[0].contentSamples),'old data opens with empty content samples');
console.log(JSON.stringify({passed:true,datedOnly:true,noSampleNoPercent:true,lastActivity:true,oldActivityRetained:true,percentages100:true,deterministicMix:true,teamCorrectionPreserved:true,noDuplicates:true,legacyOpens:true}));