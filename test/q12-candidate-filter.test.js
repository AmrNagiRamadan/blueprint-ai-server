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
  return{T,P:ctx.window.TechnoPipeline,ctx};
}
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function server(){return http.createServer(async(req,res)=>{try{let path=new URL(req.url,'http://x').pathname;if(path.endsWith('/'))path+='index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw Error('bad path');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end('not found')}})}

test('Q12 classifies booking profiles separately from app downloads and general listings',()=>{
  const {T}=load(),bad=[
    ['https://apps.apple.com/eg/app/example/id123','Example booking app'],
    ['https://play.google.com/store/apps/details?id=com.example','Download the app'],
    ['https://vezeeta.com/en/download-app','Download Vezeeta App'],
    ['https://vezeeta.com/en/doctors/dentistry/cairo','Dentists in Cairo'],
    ['https://clinido.com/en/doctors','All doctors']
  ],good=[
    ['https://vezeeta.com/en/dr/doctor-profile','Doctor profile'],
    ['https://clinido.com/en/doctor/doctor-profile','Doctor profile'],
    ['https://doctorak.com/doctor/doctor-profile','Doctor profile'],
    ['https://clinic-example.test/','Official clinic website'],
    ['https://maps.app.goo.gl/abc123','Google Maps profile']
  ];
  for(const [url,title] of bad){const result=T.classifyAccountCandidate(url,title);assert.equal(result.eligible,false,`${url} must be rejected`);assert.ok(result.reason)}
  for(const [url,title] of good)assert.equal(T.classifyAccountCandidate(url,title).eligible,true,`${url} must be eligible`);
});

test('Q12 keeps only specific booking profiles, merges language variants, and records ignored reasons',()=>{
  const {T}=load();let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'Sample Medical Center',specialty:'Medical care',links:'https://sample-clinic.test'});doc=made.document;
  const out=T.applyDiscoveryResults(doc,made.clientId,{status:'success',items:[
    {url:'https://apps.apple.com/eg/app/booking/id123',title:'Download booking app'},
    {url:'https://vezeeta.com/en/doctors/medical-care',title:'All doctors'},
    {url:'https://vezeeta.com/ar/dr/sample-doctor',title:'Sample Doctor'},
    {url:'https://vezeeta.com/en/dr/sample-doctor',title:'Sample Doctor English'},
    {url:'https://clinido.com/en/doctor/sample-doctor',title:'Sample Doctor'},
    {url:'https://clinido.com/en/doctor/similar-name',title:'Similar doctor'}
  ]});
  const c=out.document.clients[0],booking=c.sources.filter(s=>s.platform==='منصة حجز');
  assert.equal(booking.length,3,'Arabic and English variants must merge into one profile');
  assert.ok(booking.every(s=>s.identity.status==='pending'),'search results stay pending until identity confirmation');
  assert.equal(out.ignored.length,2);
  assert.ok(out.ignored.some(x=>x.kind==='app_download'));
  assert.ok(out.ignored.some(x=>x.kind==='general_page'));
  assert.equal(c.discovery.ignored.length,2);
  assert.ok(c.discovery.ignored.every(x=>x.reason&&x.at));
});

test('Q12 preserves user decisions but excludes a confirmed app page from account review and analysis',()=>{
  const {T}=load();let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'Sample Clinic',links:'https://apps.apple.com/eg/app/example/id123'});doc=T.reconcileSourceEligibility(made.document,made.clientId);let source=doc.clients[0].sources[0];
  assert.equal(source.identity.status,'confirmed','the historical user-input decision is preserved');
  assert.equal(source.discovery.excludedFromAccountReview,true);
  assert.equal(source.discovery.excludedFromAnalysis,true);
  assert.equal(T.sourceAnalysisEligible(source),false);
  assert.equal(T.sourceUpdateDecision(source).action,'none');
});

test('Q12 checks the final read URL and isolates a redirect to an app store without losing the client',async()=>{
  const {T,P,ctx}=load();let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'Sample Clinic',specialty:'Medical care',links:'https://short.example/profile'});doc=made.document;
  ctx.fetch=async(url)=>{
    if(url==='/api/read')return reply({status:'read',url:'https://play.google.com/store/apps/details?id=booking',title:'Download the app',text:'Download the booking application for patients. '.repeat(3),links:[]});
    if(url==='/api/search')return reply({output:[]});
    throw Error(`unexpected ${url}`);
  };
  doc=await P.discover({T,doc,clientId:made.clientId,hooks:{persist:async x=>x}});const c=doc.clients[0],source=c.sources[0];
  assert.equal(source.identity.status,'confirmed','the explicit user decision remains recorded');
  assert.equal(source.discovery.excludedFromAnalysis,true);
  assert.equal(source.discovery.accountKind,'app_download');
  assert.ok(c.integratedWorkflow.limits.some(x=>x.includes('استبعدنا')));
  assert.equal(c.sources.length,1);
});

test('Q12 UI never shows app downloads or general booking lists as client accounts',async t=>{
  process.getuid=()=>1000;const web=server();await new Promise(r=>web.listen(0,'127.0.0.1',r));const port=web.address().port,browser=await pw.launch({executablePath:await chromium.executablePath(),headless:true,args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>web.close(r))});const page=await browser.newPage({viewport:{width:1100,height:800}});
  await page.route('**/api/read',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'read',url:'https://sample-clinic.test/',title:'Sample Clinic',text:'Sample Clinic official medical website. Contact and booking information for patients.',links:[]})}));
  await page.route('**/api/search',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({output:[{type:'web_search_call',action:{sources:[
    {url:'https://apps.apple.com/eg/app/booking/id123',title:'Download booking app'},
    {url:'https://vezeeta.com/en/doctors/medical-care',title:'All doctors'},
    {url:'https://vezeeta.com/en/dr/sample-doctor',title:'Sample Doctor'},
    {url:'https://clinido.com/en/doctor/sample-doctor',title:'Sample Doctor'}
  ]}}]})}));
  await page.goto(`http://127.0.0.1:${port}/r02-integrated-app/`);await page.getByLabel('اسم العميل *').fill('Sample Clinic');await page.getByLabel('التخصص / النشاط').fill('Medical care');await page.getByLabel('رابط واحد على الأقل *').fill('https://sample-clinic.test');await page.getByRole('button',{name:'إنشاء العميل والذهاب للحسابات'}).click();await page.getByRole('button',{name:'اكتشف الحسابات الأساسية'}).click();await page.getByText('أفضل مرشح يحتاج قرار').waitFor();
  const links=await page.locator('[data-source-card] a').allTextContents();assert.ok(links.some(x=>x.includes('vezeeta.com/en/dr/')));assert.ok(links.some(x=>x.includes('clinido.com/en/doctor/')));assert.ok(!links.some(x=>x.includes('apps.apple.com')));assert.ok(!links.some(x=>x.includes('/doctors/medical-care')));
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tt_integrated_r02_current'))),client=stored.clients[0];assert.equal(client.discovery.ignored.length,2);assert.ok(client.sources.every(s=>!s.url.includes('apps.apple.com')&&!s.url.includes('/doctors/medical-care')));
});
