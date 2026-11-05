import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
  const box={module:{exports:{}},exports:{},console,URL,AbortController,setTimeout,clearTimeout};
  vm.createContext(box);
  vm.runInContext(fs.readFileSync('t04-review/data-model.js','utf8'),box);
  const T=box.module.exports,ctx={window:{},console,URL,AbortController,setTimeout,clearTimeout,fetch:null};
  ctx.window.window=ctx.window;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('r02-integrated-app/pipeline.js','utf8'),ctx);
  return{T,P:ctx.window.TechnoPipeline,ctx};
}
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});

function clientDoc(T,name='عيادة الاختبار'){
  let doc=T.emptyDocument();
  const made=T.createClientDraft(doc,{name,specialty:'أسنان',links:'https://facebook.com/testclinic'});
  doc=made.document;
  const source=doc.clients[0].sources[0];
  source.identity.status='confirmed';
  source.read={status:'read',observedAt:'2026-11-05T10:00:00.000Z'};
  source.content={text:[
    '2026-10-02 فيديو تعليمي عن أسباب ألم الأسنان وطريقة الوقاية قبل زيارة الطبيب.',
    'https://facebook.com/testclinic/posts/1',
    '2026-10-12 قصة مريض ونتيجة الحالة بعد المتابعة مع الفريق الطبي.',
    'https://facebook.com/testclinic/posts/2',
    '2026-10-25 احجز موعدك الآن للكشف وتقييم الحالة قبل بدء العلاج.',
    'https://facebook.com/testclinic/posts/3'
  ].join('\n'),hash:'sample'};
  return{doc,clientId:made.clientId,source};
}

test('Q14 builds a dated content sample with explicit denominator and links',async()=>{
  const {T,P}=load(),made=clientDoc(T);
  const doc=await P.sampleClientContent(T,made.doc,made.clientId,{}),c=doc.clients[0],content=P.contentContext(T,c);
  assert.equal(content.sampleCount,3);
  assert.equal(content.typeBreakdown.reduce((n,x)=>n+x.count,0),3);
  assert.equal(content.typeBreakdown.reduce((n,x)=>n+x.percent,0),100);
  assert.equal(content.formatBreakdown.reduce((n,x)=>n+x.count,0),3);
  assert.ok(content.platforms[0].posts.every(x=>/^https:\/\/facebook\.com\/testclinic\/posts\//.test(x.url)));
  assert.match(content.period,/2026-10-02/);
  assert.match(content.period,/2026-10-25/);
});

test('Q14 stores an active client ad only with a library ID and matching identity',async()=>{
  const {T,P,ctx}=load(),made=clientDoc(T);let searches=0;
  ctx.fetch=async(url)=>{
    if(url==='/api/search'){searches++;return reply({output:[{type:'web_search_call',action:{sources:[{url:'https://www.facebook.com/ads/library/?id=123',title:'Meta Ad Library'}]}}]})}
    if(url==='/api/read')return reply({status:'read',text:'عيادة الاختبار\nSponsored\nLibrary ID: 123\nStarted running on 01/10/2026\nاحجز كشف الأسنان الآن\nSend Message'});
    throw Error('unexpected '+url);
  };
  let doc=await P.inspectClientAds(T,made.doc,made.clientId,{});
  doc=await P.inspectClientAds(T,doc,made.clientId,{});
  const ads=doc.clients[0].integratedClientAds;
  assert.equal(searches,1,'unchanged identity uses cached ad inspection');
  assert.equal(ads.status,'active_found');
  assert.equal(ads.ads.length,1);
  assert.equal(ads.ads[0].libraryId,'123');
  assert.equal(ads.ads[0].status,'active');
});

test('Q14 distinguishes verified empty search from unavailable verification',async()=>{
  const {T,P,ctx}=load(),made=clientDoc(T,'عيادة بدون سجل');
  ctx.fetch=async url=>url==='/api/search'
    ?reply({output:[{type:'web_search_call',action:{sources:[{url:'https://www.facebook.com/ads/library/?q=clinic',title:'Meta Ad Library'}]}}]})
    :reply({status:'read',text:'No active ads match this search'});
  let doc=await P.inspectClientAds(T,made.doc,made.clientId,{});
  assert.equal(doc.clients[0].integratedClientAds.status,'none_active_in_checked_results');

  const another=clientDoc(T,'عيادة تعذر فحصها');
  ctx.fetch=async url=>url==='/api/search'?reply({output:[]}):reply({status:'unavailable'});
  doc=await P.inspectClientAds(T,another.doc,another.clientId,{});
  const c=doc.clients[0],content=P.contentContext(T,c);
  assert.equal(c.integratedClientAds.status,'unverified');
  assert.notEqual(c.integratedClientAds.status,'none_active_in_checked_results');
  c.contentSamples=[];c.sources[0].read.status='unavailable';
  const noSample=P.contentContext(T,c);
  assert.equal(noSample.sampleCount,0);
  assert.equal(noSample.typeBreakdown.length,0);
  assert.equal(noSample.formatBreakdown.length,0);
});

test('Q14 report contains separate content and client ads slides',()=>{
  const {T,P}=load(),made=clientDoc(T),c=made.doc.clients[0],content={status:'sampled',sampleCount:2,period:'2026-10-01 — 2026-10-20',lastActivity:'2026-10-20',typeBreakdown:[{label:'توعية',count:1,percent:50},{label:'خدمة أو عرض',count:1,percent:50}],formatBreakdown:[{label:'فيديو',count:2,percent:100}],platforms:[],ads:{status:'unverified',ads:[],checks:[],sources:[],limits:['تعذر التحقق']},limits:[]},study={executive:{},strengths:[],weaknesses:[],priorities:[],competitorInsights:[],contentInsights:[],positioning:{basis:{}},journey:[],channels:[],roadmap:[],metrics:[],requirements:[],content};
  const slides=P.slidesFromStudy(c,study);
  assert.ok(slides.some(x=>x.key==='client_content'));
  assert.ok(slides.some(x=>x.key==='client_ads'&&x.kind==='unverified'));
  const sample=slides.find(x=>x.key==='client_content').blocks.find(x=>x.type==='sample');
  assert.match(sample.value,/2 منشور/);
});
