import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {chromium as pw} from 'playwright-core';
import chromium from '@sparticuz/chromium';

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
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function server(){return http.createServer(async(req,res)=>{try{let path=new URL(req.url,'http://x').pathname;if(path.endsWith('/'))path+='index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw Error('bad path');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end('not found')}})}

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

test('Q14 completes a thin sample from direct dated posts on the confirmed account',async()=>{
  const {T,P,ctx}=load(),made=clientDoc(T,'عيادة الاختبار');
  made.source.content={text:'الصفحة الرسمية لعيادة الاختبار من غير منشورات مؤرخة ظاهرة.',hash:'thin'};
  let searches=0,reads=0;
  ctx.fetch=async(url,opt)=>{
    const body=JSON.parse(opt.body||'{}');
    if(url==='/api/search'){
      searches++;
      return reply({output:[{type:'web_search_call',action:{sources:[
        {url:'https://facebook.com/testclinic/posts/101',title:'عيادة الاختبار — منشور'},
        {url:'https://facebook.com/testclinic/posts/102',title:'عيادة الاختبار — منشور'},
        {url:'https://facebook.com/testclinic/posts/103',title:'عيادة الاختبار — منشور'},
        {url:'https://facebook.com/otherclinic/posts/999',title:'عيادة أخرى — منشور'}
      ]}}]});
    }
    if(url==='/api/read'){
      reads++;
      const id=body.url.match(/(10[1-3])$/)?.[1]||'999';
      return reply({status:'read',title:'عيادة الاختبار',text:`November ${Number(id)-100}, 2026\nمنشور طبي مؤرخ ومباشر من حساب العيادة المؤكد يشرح خدمة مهمة للمريض.`});
    }
    throw Error('unexpected '+url);
  };
  let doc=await P.sampleClientContent(T,made.doc,made.clientId,{});
  doc=await P.sampleClientContent(T,doc,made.clientId,{});
  const c=doc.clients[0],content=P.contentContext(T,c);
  assert.equal(searches,1,'direct search is cached for unchanged confirmed accounts');
  assert.equal(reads,3,'unrelated direct post is rejected before reading');
  assert.equal(content.sampleCount,3);
  assert.equal(c.integratedContentDiscovery.status,'sampled');
  assert.ok(content.platforms[0].posts.every(x=>x.url.includes('/testclinic/posts/')));
});

test('Q14 keeps the existing sample when direct post completion fails',async()=>{
  const {T,P,ctx}=load(),made=clientDoc(T,'عيادة الاختبار');
  made.source.content={text:'2026-10-02 منشور واحد مؤرخ عن الوقاية وصحة الأسنان قبل الحجز والمتابعة.',hash:'one'};
  ctx.fetch=async url=>url==='/api/search'?reply({output:[]}):reply({},503);
  const doc=await P.sampleClientContent(T,made.doc,made.clientId,{}),c=doc.clients[0],content=P.contentContext(T,c);
  assert.equal(content.sampleCount,1);
  assert.equal(c.integratedContentDiscovery.status,'unverified');
  assert.match(content.limits.join(' '),/أضف الباقي/);
});

test('Q14 accepts cited structured post data when the social reader blocks the direct URL',async()=>{
  const {T,P,ctx}=load(),made=clientDoc(T,'عيادة الاختبار');
  made.source.content={text:'الصفحة الرسمية من غير Feed قابل للقراءة.',hash:'blocked-feed'};
  const posts=[1,2,3].map(i=>({url:`https://facebook.com/testclinic/posts/${i}`,accountName:'عيادة الاختبار',publishedAt:`2026-10-0${i}`,text:`نص منشور طبي موثق رقم ${i} من نتيجة البحث المرتبطة بالرابط المباشر للحساب.`,format:i===1?'video':'image'}));
  ctx.fetch=async url=>url==='/api/search'
    ?reply({output:[{type:'web_search_call',action:{sources:posts.map(x=>({url:x.url,title:'عيادة الاختبار'}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({posts}),annotations:posts.map(x=>({url:x.url,title:'عيادة الاختبار'}))}]}]})
    :reply({error:'blocked'},503);
  const mock={output:[{type:'web_search_call',action:{sources:posts.map(x=>({url:x.url,title:'عيادة الاختبار'}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({posts}),annotations:posts.map(x=>({url:x.url,title:'عيادة الاختبار'}))}]}]};
  assert.equal(P.structuredPostCandidates(mock,'عيادة الاختبار').length,3);
  const doc=await P.sampleClientContent(T,made.doc,made.clientId,{}),c=doc.clients[0],content=P.contentContext(T,c);
  assert.equal(content.sampleCount,3);
  assert.equal(c.integratedContentDiscovery.accepted,3);
  assert.ok(c.contentSamples[0].posts.every(x=>x.origin==='auto_search_cited'));
});

test('Q14 report drawer saves a manual dated sample and marks the report stale',async t=>{
  process.getuid=()=>1000;
  const {T}=load(),made=clientDoc(T,'عيادة العينة'),c=made.doc.clients[0];
  c.contentSamples=[];
  c.integratedStudy={inputHash:'old-hash'};
  c.integratedReport={status:'ready',quality:{status:'limited',warnings:['عينة المحتوى ناقصة']},slides:[{id:'slide_client_content',number:1,key:'client_content',layout:'content',title:'تحليل محتوى العميل',headline:'العينة المقروءة لا تكفي',body:'مطلوب عينة مؤرخة',kind:'unverified',blocks:[],evidence:[]}]};
  made.doc.extensions.integratedUI={activeClientId:c.id,stage:'report',slide:0};
  const web=server();await new Promise(r=>web.listen(0,'127.0.0.1',r));
  const port=web.address().port,browser=await pw.launch({executablePath:await chromium.executablePath(),headless:true,args:['--no-sandbox']});
  t.after(async()=>{await browser.close();await new Promise(r=>web.close(r))});
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  await page.addInitScript(({doc})=>localStorage.setItem('tt_integrated_r02_current',JSON.stringify(doc)),{doc:made.doc});
  await page.goto(`http://127.0.0.1:${port}/r02-integrated-app/`);
  await page.getByText('التحديث اكتمل، لكن المنصة حجبت المنشورات',{exact:true}).waitFor();
  await page.getByRole('button',{name:'إضافة عينة الآن'}).click();
  await page.getByLabel('المنشورات').fill([
    '2026-10-01\nرابط: https://facebook.com/testclinic/posts/1\nفورمات: فيديو\nمعلومة طبية مفيدة للمريض عن الوقاية والمتابعة.',
    '2026-10-08\nرابط: https://facebook.com/testclinic/posts/2\nنص حالة يشرح رحلة المريض والخطوات المتاحة.',
    '2026-10-15\nرابط: https://facebook.com/testclinic/posts/3\nدعوة واضحة للحجز ومعرفة تفاصيل الخدمة.'
  ].join('\n\n'));
  await page.getByRole('button',{name:'حفظ العينة وتحديث حالة التقرير'}).click();
  await page.getByText('تم حفظ 3 منشور؛ حدّث التقرير الآن').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_integrated_r02_current'))),savedClient=saved.clients[0];
  assert.equal(savedClient.contentSamples[0].posts.length,3);
  assert.equal(savedClient.integratedStudy.inputHash,'');
  assert.equal(savedClient.integratedReport.status,'stale');
  await page.reload();
  await page.getByText('التقرير محتاج تحديث',{exact:true}).waitFor();
  await page.getByRole('button',{name:'اذهب لتحديث التقرير'}).waitFor();
});
