import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
  const box={module:{exports:{}},exports:{},console,URL,AbortController,setTimeout,clearTimeout};
  vm.createContext(box);vm.runInContext(fs.readFileSync('t04-review/data-model.js','utf8'),box);
  const T=box.module.exports,ctx={window:{},console,URL,AbortController,setTimeout,clearTimeout,fetch:null};ctx.window.window=ctx.window;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('r02-integrated-app/pipeline.js','utf8'),ctx);
  return{T,P:ctx.window.TechnoPipeline,ctx};
}
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function madeClient(T){let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'عيادة العميل',specialty:'أسنان',links:'https://client.example.com'});doc=made.document;const c=doc.clients[0];c.sources[0].identity.status='confirmed';c.inputs.answers={geo:'المهندسين'};return{doc,clientId:made.clientId}}
function search(items){return{output:[{type:'web_search_call',action:{sources:items}}]}}

test('Q15 keeps website, dated content and library-backed ads separate for each competitor',async()=>{
  const {T,P,ctx}=load(),made=madeClient(T);let searchNo=0;
  ctx.fetch=async(url,opt)=>{const body=JSON.parse(opt.body||'{}');
    if(url==='/api/search'){
      searchNo++;
      if(body.input.includes('منافسين مباشرين'))return reply(search([
        {url:'https://alpha.example.org',title:'Alpha Dental Clinic - Official'},
        {url:'https://beta.example.net',title:'Beta Dental Center - Official'}
      ]));
      if(body.input.includes('Alpha Dental'))return reply(search([{url:'https://www.facebook.com/ads/library/?id=111',title:'Meta Ad Library'}]));
      if(body.input.includes('Beta Dental'))return reply(search([]));
      throw Error('unexpected search '+body.input);
    }
    if(url==='/api/read'){
      if(body.url==='https://alpha.example.org')return reply({status:'read',text:'خدمات زراعة وتقويم الأسنان. احجز عبر واتساب. تقييمات المرضى.\n2026-10-01 فيديو حالة زراعة قبل وبعد مع شرح الخطة.\nhttps://facebook.com/alpha/posts/1\n2026-10-12 صورة عن التقويم ودعوة للحجز.'});
      if(body.url==='https://beta.example.net')return reply({status:'read',text:'خدمات أسنان عامة وتنظيف. تواصل معنا للحجز. '.repeat(8)});
      if(body.url.includes('ads/library'))return reply({status:'read',text:'Alpha Dental Clinic\nSponsored\nLibrary ID: 111\nStarted running on 01/10/2026\nابتسامتك تبدأ بخطة زراعة واضحة\nSend Message\nhttps://www.facebook.com/ads/library/?id=111'});
    }
    throw Error('unexpected '+url);
  };
  const doc=await P.competitors(T,made.doc,made.clientId,{}),c=doc.clients[0],r=c.integratedCompetitors;
  assert.equal(searchNo,3);
  assert.equal(r.competitors.length,2);
  const alpha=r.competitors.find(x=>x.name.includes('Alpha'));
  assert.equal(alpha.website.status,'read');
  assert.equal(alpha.content.status,'sampled');
  assert.equal(alpha.ads.status,'active_found');
  assert.equal(alpha.ads.ads[0].libraryId,'111');
  assert.ok(r.rows.some(x=>x.sourceType==='website'));
  assert.ok(r.rows.some(x=>x.sourceType==='published_content'));
  assert.ok(r.rows.some(x=>x.sourceType==='advertisement'&&/Library ID: 111/.test(x.text)));
  const content={sampleCount:0,ads:{status:'unverified'},limits:[]},study={executive:{},strengths:[],weaknesses:[],priorities:[],competitorInsights:[],contentInsights:[],positioning:{basis:{}},journey:[],channels:[],roadmap:[],metrics:[],requirements:[],content};
  const slides=P.slidesFromStudy(c,study),adSlide=slides.find(x=>x.key==='competitor_ads');
  assert.equal(adSlide.kind,'inference');
  assert.ok(adSlide.blocks.some(x=>/Library ID 111/.test(x.detail)&&/زاوية/.test(x.title)));
  assert.match(adSlide.body,/ليست دليل ربحية/);
});

test('Q15 reports unreadable ad libraries as unverified instead of claiming no ads',async()=>{
  const {T,P,ctx}=load(),made=madeClient(T);
  ctx.fetch=async(url,opt)=>{const body=JSON.parse(opt.body||'{}');if(url==='/api/search')return reply(body.input.includes('منافسين مباشرين')?search([{url:'https://gamma.example.org',title:'Gamma Dental Clinic'}]):search([]));if(url==='/api/read')return reply({status:'read',text:'عيادة أسنان تقدم خدمات علاجية وحجز مواعيد وتفاصيل واضحة. '.repeat(5)});throw Error('unexpected')};
  const doc=await P.competitors(T,made.doc,made.clientId,{}),c=doc.clients[0],comp=c.integratedCompetitors.competitors[0];
  assert.equal(comp.ads.status,'unverified');
  assert.match(comp.limits.join(' '),/غير متحققة/);
  const study={executive:{},strengths:[],weaknesses:[],priorities:[],competitorInsights:[],contentInsights:[],positioning:{basis:{}},journey:[],channels:[],roadmap:[],metrics:[],requirements:[],content:{sampleCount:0,ads:{status:'unverified'},limits:[]}};
  const slide=P.slidesFromStudy(c,study).find(x=>x.key==='competitor_ads');
  assert.equal(slide.kind,'unverified');
  assert.doesNotMatch(slide.headline,/لا يعلن|لا توجد إعلانات/);
});

test('Q15 website audit does not claim mobile, traffic or bounce metrics from text reading',()=>{
  const {P}=load(),signals=P.competitorWebsiteAudit('خدمات الأسنان والحجز عبر واتساب وآراء المرضى');
  assert.ok(signals.includes('مسار حجز أو تواصل ظاهر'));
  assert.ok(signals.some(x=>/لم يُقاسا/.test(x)));
  assert.doesNotMatch(signals.join(' '),/Bounce|زيارات|سرعة ممتازة/);
});

test('Q15 keeps different social accounts separate and excludes only the exact client account',async()=>{
  const {T,P,ctx}=load();let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'عيادة العميل',specialty:'أسنان',links:'https://facebook.com/clientclinic'});doc=made.document;doc.clients[0].sources[0].identity.status='confirmed';
  ctx.fetch=async(url,opt)=>{const body=JSON.parse(opt.body||'{}');if(url==='/api/search')return reply(body.input.includes('منافسين مباشرين')?search([
    {url:'https://facebook.com/clientclinic',title:'عيادة العميل'},
    {url:'https://facebook.com/alphaClinic',title:'Alpha Dental'},
    {url:'https://facebook.com/betaClinic',title:'Beta Dental'}
  ]):search([]));if(url==='/api/read')return reply({status:'read',text:'عيادة أسنان وحجز وخدمات علاجية ومعلومات كافية للقراءة. '.repeat(5)});throw Error('unexpected')};
  const out=await P.competitors(T,doc,made.clientId,{}),names=out.clients[0].integratedCompetitors.competitors.map(x=>x.name);
  assert.equal(names.length,2);
  assert.ok(names.some(x=>/Alpha/.test(x))&&names.some(x=>/Beta/.test(x)));
});

test('Q15 manual library paste accepts a matching advertiser, preserves evidence and marks report stale',()=>{
  const {T,P}=load(),made=madeClient(T),c=made.doc.clients[0],competitorId='competitor_alpha';
  c.integratedCompetitors={service:'أسنان',region:'المهندسين',competitors:[{id:competitorId,name:'Alpha Dental Clinic',primaryUrl:'https://alpha.example.org',ads:{status:'unverified',ads:[],checks:[]},sourceIds:[],limits:[]}],rows:[],limits:[]};
  c.integratedStudy={inputHash:'old'};c.integratedReport={status:'ready',slides:[]};
  const out=P.addCompetitorAdPaste(T,made.doc,made.clientId,competitorId,'Alpha Dental Clinic\nSponsored\nLibrary ID: 991\nStarted running on 01/10/2026\nقصة حالة مريض قبل وبعد\nSend Message',{platform:'Meta',libraryUrl:'https://www.facebook.com/ads/library/?id=991'}),updated=out.clients[0];
  assert.equal(updated.integratedCompetitors.competitors[0].ads.status,'active_found');
  assert.equal(updated.integratedCompetitors.rows[0].sourceType,'advertisement');
  assert.match(updated.integratedCompetitors.rows[0].text,/Library ID: 991/);
  assert.equal(updated.integratedReport.status,'stale');
  assert.equal(updated.integratedStudy.inputHash,'');
});
