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
const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function server(){return http.createServer(async(req,res)=>{try{let path=new URL(req.url,'http://x').pathname;if(path.endsWith('/'))path+='index.html';const file=normalize(join(root,path));if(!file.startsWith(root))throw Error('bad path');const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end('not found')}})}

test('Q11 opens the exact Arabic service/About page with a text fragment and copy fallback',()=>{
  const {P}=load(),quote='نقدم زراعة الأسنان وتقويم الأسنان بخطة علاج واضحة';
  const result=P.evidenceLink({url:'https://clinic.test/',quote},{url:'https://clinic.test/about-us',title:'من نحن'});
  assert.equal(result.pageUrl,'https://clinic.test/about-us');
  assert.equal(result.mode,'text_fragment');
  assert.ok(result.openUrl.startsWith('https://clinic.test/about-us#:~:text='));
  assert.ok(decodeURIComponent(result.openUrl).includes(quote));
  assert.equal(result.copyText,quote);
});

test('Q11 keeps direct posts and ads direct without inventing a text anchor',()=>{
  const {P}=load();
  for(const url of ['https://www.facebook.com/clinic/posts/12345','https://www.youtube.com/watch?v=abc','https://www.facebook.com/ads/library/?id=987']){
    const result=P.evidenceLink({quote:'دليل منشور'},{url});
    assert.equal(result.mode,'direct');
    assert.equal(result.openUrl,result.pageUrl);
    assert.ok(!result.openUrl.includes(':~:text='));
  }
});

test('Q11 is honest on a dynamic platform that cannot guarantee an in-page jump',()=>{
  const {P}=load(),result=P.evidenceLink({quote:'عدد المتابعين 892'},{url:'https://www.facebook.com/clinic'});
  assert.equal(result.mode,'page');
  assert.equal(result.label,'افتح صفحة المصدر');
  assert.match(result.note,/لا تضمن/);
  assert.equal(result.copyText,'عدد المتابعين 892');
});

test('Q11 validated study evidence preserves the exact source page and read date',()=>{
  const {P}=load(),quote='تأسست العيادة عام 2002';
  const study=P.validateStudy({strengths:[{title:'خبرة موثقة',detail:'العيادة تعمل منذ 2002',evidence:[{sourceId:'about',url:'https://wrong.test/',quote}]}],priorities:[],competitorInsights:[],requirements:[],limits:[]},[{id:'about',url:'https://clinic.test/about',title:'من نحن',platform:'موقع',text:`مقدمة. ${quote}.`,observedAt:'2026-11-05T10:00:00.000Z'}],[],{sampleCount:0});
  const evidence=study.strengths[0].evidence[0];
  assert.equal(evidence.pageUrl,'https://clinic.test/about');
  assert.equal(evidence.url,'https://clinic.test/about');
  assert.equal(evidence.sourceTitle,'من نحن');
  assert.equal(evidence.observedAt,'2026-11-05T10:00:00.000Z');
});

test('Q11 source drawer shows quote first, exact page, date, jump mode, and working copy fallback',async t=>{
  process.getuid=()=>1000;const {T}=load();let doc=T.emptyDocument();const made=T.createClientDraft(doc,{name:'عيادة الدليل',specialty:'أسنان',links:'https://clinic.test/about'});doc=made.document;const c=doc.clients[0],s=c.sources[0],quote='نقدم زراعة الأسنان وتقويم الأسنان بخطة علاج واضحة';
  s.identity.status='confirmed';s.read={status:'read',title:'صفحة من نحن',observedAt:'2026-11-05T10:00:00.000Z'};s.content={text:quote,hash:T.hash(quote)};
  c.integratedStudy={sources:[{id:s.id,url:s.url,title:'صفحة من نحن',platform:'موقع / مصدر خارجي',observedAt:s.read.observedAt}]};
  c.integratedReport={status:'ready',quality:{status:'ready'},slides:[{id:'slide_strengths',number:1,key:'strengths',layout:'cards',title:'نقاط القوة',headline:'خبرة وخدمات واضحة',body:'',kind:'observed',blocks:[],evidence:[{sourceId:s.id,url:s.url,pageUrl:s.url,sourceTitle:'صفحة من نحن',platform:'موقع / مصدر خارجي',quote,observedAt:s.read.observedAt}]}]};
  doc.extensions.integratedUI={activeClientId:c.id,stage:'report',slide:0};
  const web=server();await new Promise(r=>web.listen(0,'127.0.0.1',r));const port=web.address().port,browser=await pw.launch({executablePath:await chromium.executablePath(),headless:true,args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>web.close(r))});
  const page=await browser.newPage({viewport:{width:1100,height:800}});await page.addInitScript(({doc})=>{localStorage.setItem('tt_integrated_r02_current',JSON.stringify(doc));Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__copied=value}},configurable:true})},{doc});
  await page.goto(`http://127.0.0.1:${port}/r02-integrated-app/`);await page.getByRole('button',{name:'راجع المصادر'}).click();
  const card=page.locator('[data-evidence-card="0"]');await assert.doesNotReject(()=>card.waitFor());assert.equal(await card.locator('blockquote').textContent(),quote);await assert.doesNotReject(()=>card.getByText('2026-11-05',{exact:false}).waitFor());
  const open=card.locator('[data-evidence-open="0"]');assert.equal(await open.textContent(),'فتح الصفحة الأصلية ↗');assert.equal(await open.getAttribute('href'),'https://clinic.test/about');
  const popupWait=page.waitForEvent('popup');await card.getByRole('button',{name:'اعرض الدليل عند المعلومة'}).click();const proof=await popupWait;await proof.waitForLoadState('domcontentloaded');assert.equal(await proof.locator('#evidenceTarget').textContent(),quote);assert.ok(await proof.locator('#evidenceTarget').isVisible());await assert.doesNotReject(()=>proof.getByText('دي نسخة النص اللي النظام قرأها وقت الدراسة.').waitFor());assert.equal(await proof.getByRole('link',{name:'فتح الصفحة الأصلية ↗'}).getAttribute('href'),'https://clinic.test/about');
  await card.getByRole('button',{name:'نسخ نص الدليل للبحث'}).click();await page.getByText('تم نسخ نص الدليل للبحث داخل الصفحة').waitFor();assert.equal(await page.evaluate(()=>window.__copied),quote);
});

test('Q11 account discovery shows loading immediately and a clear completion state',async t=>{
  process.getuid=()=>1000;const web=server();await new Promise(r=>web.listen(0,'127.0.0.1',r));const port=web.address().port,browser=await pw.launch({executablePath:await chromium.executablePath(),headless:true,args:['--no-sandbox']});t.after(async()=>{await browser.close();await new Promise(r=>web.close(r))});const page=await browser.newPage({viewport:{width:1100,height:800}});let releaseRead;const gate=new Promise(r=>{releaseRead=r});
  await page.route('**/api/read',async r=>{await gate;await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'read',url:'https://clinic.test/',title:'عيادة التحميل',text:'موقع العيادة الرسمي ومعلومات الحجز والتواصل والخدمات الطبية.',links:[]})})});
  await page.route('**/api/search',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({output:[]})}));
  await page.goto(`http://127.0.0.1:${port}/r02-integrated-app/`);await page.getByLabel('اسم العميل *').fill('عيادة التحميل');await page.getByLabel('التخصص / النشاط').fill('طب');await page.getByLabel('رابط واحد على الأقل *').fill('https://clinic.test');await page.getByRole('button',{name:'إنشاء العميل والذهاب للحسابات'}).click();await page.getByRole('button',{name:'اكتشف الحسابات الأساسية'}).click();
  const loading=page.getByRole('button',{name:/جاري اكتشاف الحسابات/});await loading.waitFor();assert.equal(await loading.isEnabled(),false);await page.getByText('جاري البحث وقراءة الروابط').waitFor();releaseRead();await page.getByText('اكتمل اكتشاف الحسابات الأساسية ✓').first().waitFor();assert.equal(await page.getByRole('button',{name:'اكتشف الحسابات الأساسية'}).isEnabled(),true);
});
