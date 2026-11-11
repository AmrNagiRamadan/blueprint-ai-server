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
  vm.createContext(box);vm.runInContext(fs.readFileSync('t04-review/data-model.js','utf8'),box);
  const T=box.module.exports,ctx={window:{},console,URL,AbortController,setTimeout,clearTimeout,fetch:null};ctx.window.window=ctx.window;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('r02-integrated-app/pipeline.js','utf8'),ctx);
  return{T,P:ctx.window.TechnoPipeline};
}
function client(T){let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'عيادة التحليلات',specialty:'أسنان',links:'https://clinic.example'});return{doc:made.document,id:made.clientId}}
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function server(){return http.createServer(async(req,res)=>{try{let path=new URL(req.url,'http://x').pathname;if(path.endsWith('/'))path+='index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw Error('bad path');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end('not found')}})}
const fixture=`Session default channel group,Sessions,Total users,Bounce rate,Average session duration,Average engagement time per session
Total,1000,800,42%,00:02:30,00:01:20
Direct,600,,40%,00:02:40,00:01:30
Organic Search,400,,45%,00:02:15,00:01:05`;

test('Q16 parses actual GA4 metrics, periods, definitions and traffic denominator exactly',()=>{
  const {P}=load(),r=P.parseAnalyticsCSV(fixture,{scope:'client_actual',provider:'GA4',periodStart:'2026-10-01',periodEnd:'2026-10-31',fileName:'ga4.csv'});
  assert.equal(r.scope,'client_actual');
  assert.deepEqual(JSON.parse(JSON.stringify(r.period)),{start:'2026-10-01',end:'2026-10-31'});
  assert.equal(r.metrics.sessions,1000);assert.equal(r.metrics.users,800);
  assert.equal(r.metrics.bounceRate,42);assert.equal(r.metrics.averageSessionDurationSeconds,150);assert.equal(r.metrics.averageEngagementSeconds,80);
  assert.equal(r.traffic.denominator,'sessions');assert.equal(r.traffic.total,1000);
  assert.equal(r.traffic.channels[0].channel,'Direct');assert.equal(r.traffic.channels[0].share,60);
  assert.equal(r.traffic.channels[1].share,40);
});

test('Q16 never sums users across channel rows when the report has no total row',()=>{
  const {P}=load(),r=P.parseAnalyticsCSV(`Channel,Sessions,Users\nDirect,60,50\nOrganic Search,40,35`,{scope:'client_actual',provider:'GA4',periodStart:'2026-10-01',periodEnd:'2026-10-31'});
  assert.equal(r.metrics.sessions,100);assert.equal(r.metrics.users,null);
});

test('Q16 labels competitor traffic as provider estimate, never account actual',()=>{
  const {T,P}=load(),made=client(T),estimate=P.parseAnalyticsCSV(`Source,Visits\nTotal,5000\nSearch,3000\nDirect,2000`,{scope:'competitor_estimate',provider:'Similarweb export',competitorName:'منافس ألف',periodStart:'2026-09-01',periodEnd:'2026-09-30'});
  made.doc.clients[0].integratedAnalytics={records:[estimate]};
  const context=P.analyticsContext(made.doc.clients[0]),slide=P.analyticsSlide(made.doc.clients[0],context);
  assert.equal(context.status,'estimates_only');assert.equal(slide.kind,'inference');
  assert.match(slide.headline,/تقديرات مزود/);assert.match(slide.body,/ليست وصولًا لحساب المنافس/);
  assert.ok(slide.blocks.some(x=>/تقدير مزود للمنافس/.test(x.title)));
});

test('Q16 shows unavailable analytics without invented traffic numbers',()=>{
  const {T,P}=load(),made=client(T),context=P.analyticsContext(made.doc.clients[0]),slide=P.analyticsSlide(made.doc.clients[0],context);
  assert.equal(context.status,'not_available');assert.equal(slide.kind,'unverified');
  assert.match(slide.headline,/غير متاحة/);assert.equal(slide.blocks.length,1);
  assert.doesNotMatch(JSON.stringify(slide),/\b0(?:\.0+)?%|٠٪/);
});

test('Q16 import updates the analytics slide directly, survives normalization and does not require AI',()=>{
  const {T,P}=load(),made=client(T),c=made.doc.clients[0];
  c.integratedStudy={analytics:{status:'not_available'},inputHash:'previous'};
  c.integratedReport={status:'ready',slides:[{id:'slide_cover',key:'cover',number:1,title:'غلاف',blocks:[],evidence:[]},{id:'slide_metrics',key:'metrics',number:2,title:'مؤشرات',blocks:[],evidence:[]}],quality:{status:'limited'}};
  const out=P.importAnalyticsCSV(T,made.doc,made.id,fixture,{scope:'client_actual',provider:'GA4',periodStart:'2026-10-01',periodEnd:'2026-10-31',fileName:'ga4.csv'}),updated=out.clients[0],slide=updated.integratedReport.slides.find(x=>x.key==='analytics');
  assert.equal(updated.integratedAnalytics.records.length,1);assert.equal(updated.integratedStudy.analytics.status,'actual_available');
  assert.ok(slide);assert.equal(slide.kind,'observed');assert.ok(slide.blocks.some(x=>x.title==='الجلسات Sessions'&&/١٬٠٠٠|1000/.test(x.value)));
  assert.deepEqual(JSON.parse(JSON.stringify(updated.integratedReport.slides.map(x=>x.number))),[1,2,3]);
  const normalized=T.normalizeDocument(out);assert.equal(normalized.clients[0].integratedAnalytics.records[0].metrics.sessions,1000);
});

test('Q16 refuses context-free analytics imports',()=>{
  const {P}=load();assert.throws(()=>P.parseAnalyticsCSV(fixture,{scope:'client_actual',provider:'GA4'}),/بداية ونهاية الفترة/);
});

test('Q16 report UI imports analytics and refreshes the same slide without AI',async t=>{
  process.getuid=()=>1000;
  const {T,P}=load(),made=client(T),c=made.doc.clients[0];
  c.integratedStudy={analytics:P.analyticsContext(c),inputHash:'old'};
  c.integratedReport={status:'limited',quality:{status:'limited',warnings:['بيانات الزيارات الفعلية غير متاحة']},slides:[{...P.analyticsSlide(c),number:1}]};
  made.doc.extensions.integratedUI={activeClientId:c.id,stage:'report',slide:0};
  const web=server();await new Promise(r=>web.listen(0,'127.0.0.1',r));
  const port=web.address().port,browser=await pw.launch({executablePath:await chromium.executablePath(),headless:true,args:['--no-sandbox']});
  t.after(async()=>{await browser.close();await new Promise(r=>web.close(r))});
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  await page.addInitScript(({doc})=>localStorage.setItem('tt_integrated_r02_current',JSON.stringify(doc)),{doc:made.doc});
  await page.goto(`http://127.0.0.1:${port}/r02-integrated-app/`);
  await page.getByRole('button',{name:'استيراد بيانات الزيارات'}).click();
  await page.getByLabel('بداية الفترة').fill('2026-10-01');await page.getByLabel('نهاية الفترة').fill('2026-10-31');
  await page.getByLabel('أو الصق البيانات').fill(fixture);
  await page.getByRole('button',{name:'استيراد وتحديث السلايد'}).click();
  await page.getByText('تم استيراد البيانات وتحديث سلايد الزيارات').waitFor();
  await page.getByText('بيانات فعلية من GA4 للفترة 2026-10-01 — 2026-10-31').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_integrated_r02_current')));
  assert.equal(saved.clients[0].integratedAnalytics.records[0].metrics.sessions,1000);
});
