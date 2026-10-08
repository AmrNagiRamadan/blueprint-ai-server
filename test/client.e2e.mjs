// End-to-end checks for client/Techno_Team_OS_V3_33.html in headless Chromium.
// All network is faked (AI, search, reader, /api/read) — no credit is used.
// Run: CHROME_PATH=/path/to/chromium npm run test:client
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = 'file://' + fileURLToPath(new URL('../client/Techno_Team_OS_V3_33.html', import.meta.url));
const SERVER = 'https://bp.test';
const QWEN = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const SITE = 'https://clinic.example/';
const SITE2 = 'https://clinic-two.example/';
const FB = 'https://www.facebook.com/smileclinic';
const NAME = 'عيادة الابتسامة';
const DR_FB = 'https://www.facebook.com/dr.amrziz';
const DR_BIO = 'دكتور العيلة - د. عمرو عبد العزيز Cairo | دكتور العيلة - د. عمرو عبد العزيز 402K followers • 56 following Intro دكتور عمرو عبد العزيز .. جراح أمراض النساء والتوليد، واستشاري الحقن المجهري وأطفال الأنابيب وتحديد جنس المولود، ملتزم برعاية صحة المرأة ودعمها في تحقيق حلم الأمومة. خريج كلية الطب جامعة القاهرة و برمنجهام - إنجلترا.📞للتواصل : 16431 Page · Obstetrician-Gynecologist (OBGYN) 360 شارع الهرم - الجيزة - الدور الأول، Cairo, Egypt +20 16431 amrziz@hotmail.com dr.amrziz ivfegypt.org In-store pickup Price Range · $$$$ 6m · 6 minutes ago اللام بعد الحقن المجهري بيفضل قد ايه؟؟... [reel](https://www.facebook.com/reel/4732289180393971/)';
const DR_MSG = 'لاحظنا نجاحكم الكبير في التوعية الجماهيرية. دكتور عمرو له مكانة رائدة في جراحة النساء والحقن المجهري في عيادات دكتور العيلة. مراكز الحقن المجهري في زايد والتجمع تستحوذ على الحالات عبر مسارات تقييم أولية سريعة تؤدي لمحادثات حجز مؤكدة. تكمن الفرصة الأضخم الآن في بناء مسار تأهيل وحجز مخصص لحالات الحقن المجهري وتأخر الإنجاب لتحويل ملايين المشاهدات إلى عمليات فعلية بأعلى كفاءة. الوكالة حققت عائد إعلاني يصل إلى 6 أضعاف عبر منظومة استقطاب متكاملة لحالات العمليات والجراحات الدقيقة.';
const SITE_TEXT = `${NAME} لتقويم وزراعة الأسنان في المهندسين.\n` + 'نقدم خدمات تقويم الأسنان وزراعة الأسنان وتبييض الأسنان بأحدث الأجهزة في شارع لبنان بالمهندسين.\n'.repeat(6);

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['ok', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
}

// Fake network. `net.mode` switches scenario behaviour per test.
function fakeNetwork(ctx, net) {
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const ai = text => ({ choices: [{ message: { content: typeof text === 'string' ? text : JSON.stringify(text) } }] });
  return ctx.route(/^https?:\/\//, async route => {
    const req = route.request(), url = req.url();
    if (url.startsWith(SERVER + '/api/ai') || url.startsWith(QWEN)) {
      const body = JSON.parse(req.postData() || '{}'), msg = body.messages?.at(-1)?.content;
      if (url.startsWith(QWEN) && net.mode.qwenInspection) return json(route, 400, { error: { code: 'data_inspection_failed', message: 'Input data may contain inappropriate content.' } });
      if (url.startsWith(QWEN)) net.qwen.push({ model: body.model, max: body.max_tokens, json: body.response_format?.type, auth: req.headers()['authorization'], image: Array.isArray(msg) });
      const prompt = Array.isArray(msg) ? msg.find(x => x.type === 'text')?.text || '' : String(msg || '');
      net.ai.push(prompt);
      if (Array.isArray(msg)) return json(route, 200, ai(`${NAME}\nعرض تقويم الأسنان بخصم 20% لحد آخر الشهر\nوصف مرئي: بوست صورة`));
      if (net.mode.aiDown) return json(route, 500, { error: 'down' });
      if (/^اكتب الجزء الاستراتيجي من خطة تسويق/.test(prompt)) return json(route, 200, ai({ summary: [{ title: 'صورتنا', text: 'خبرة طويلة' }, { title: 'المنتج البطل', text: 'كشف أول' }, { title: 'التنفيذ', text: 'ميتا أولًا' }, { title: 'الاستمرار', text: 'محتوى أسبوعي' }], assets: [{ title: 'جمهور كبير', text: '402K' }], bigIdea: { statement: 'الثقة قبل الحجز', support: 'x' }, market: { note: 'وسط السوق', competitors: [{ name: 'منافس 1', price: '500 جنيه', note: '' }, { name: 'منافس 2', price: '800', note: '' }], source: 'دراسة المنافسين' }, personas: [{ name: 'زوجة متأخرة في الإنجاب', who: 'x', need: 'y', offer: 'كشف' }], ladder: [{ name: 'كشف', price: '500', note: '' }, { name: 'حقن', price: 'يحدده العميل', note: '' }], hero: { name: 'كشف الخصوبة', why: ['a', 'b'] }, journey: [{ step: 'يشوف', text: 'x' }, { step: 'يسأل', text: 'y' }], budgetSplit: [{ platform: 'Meta', pct: 75, why: 'الجمهور هناك' }, { platform: 'Google', pct: 25, why: 'بحث' }], targets: [{ label: 'محادثات', value: '300', note: 'تقديري' }], requirements: ['صور العيادة'], first30: [{ day: 'اليوم 1-3', task: 'إعداد التتبع', owner: 'الفريق' }], nextPhases: [{ name: 'توسع', period: 'شهر 2', goal: 'x' }], missing: ['أسعار الباقات'] }));
      if (/^اكتب جزء المحتوى والتشغيل من خطة تسويق/.test(prompt)) { if (net.mode.deckBDown) return json(route, 500, { error: 'down' }); return json(route, 200, ai({ postsPerMonth: 20, contentAxes: [{ axis: 'تعليمي', pct: 40, example: 'x' }, { axis: 'إثبات ثقة', pct: 60, example: 'y' }], ideas: Array.from({ length: 12 }, (_, i) => ({ title: 'فكرة ' + (i + 1), format: 'ريل', axis: 'تعليمي' })), examples: [{ title: 'مثال', hook: 'h', body: 'b', format: 'ريل' }], ads: [{ name: 'إعلان 1', primaryText: 'نص', headline: 'عنوان', cta: 'احجز', visual: 'فيديو' }], calendar: [{ week: 'الأسبوع 1', days: [{ day: 'السبت', idea: 'فكرة السبت' }, { day: 'الاثنين', idea: 'فكرة الاثنين' }] }], production: { title: 'يوم تصوير', output: [{ type: 'ريلز', count: 20 }, { type: 'صور', count: 8 }], plan: ['x'] }, management: { daily: ['متابعة الرسائل'], weekly: ['تقرير'], monthly: ['مراجعة'], roles: [{ role: 'ميديا باير', task: 'x' }] }, replies: [{ trigger: 'لما العميل يسأل عن السعر', text: 'أهلًا' }], kpis: [{ name: 'تكلفة المحادثة', why: 'x' }], afterSale: ['رسالة شكر'], missing: [] })); }
      if (/فكك رسالة السيلز/.test(prompt) && prompt.includes('دكتور عمرو')) return json(route, 200, ai({ claims: [
        { statement: 'دكتور عمرو له مكانة رائدة في جراحة النساء والحقن المجهري في عيادات دكتور العيلة', sourceQuote: 'دكتور عمرو له مكانة رائدة في جراحة النساء والحقن المجهري في عيادات دكتور العيلة', kind: 'fact' },
        { statement: 'مراكز الحقن المجهري في زايد والتجمع تستحوذ على الحالات عبر مسارات تقييم أولية سريعة تؤدي لمحادثات حجز مؤكدة', sourceQuote: 'مراكز الحقن المجهري في زايد والتجمع تستحوذ على الحالات عبر مسارات تقييم أولية سريعة تؤدي لمحادثات حجز مؤكدة', kind: 'fact' },
        { statement: 'هناك فرصة كبيرة لبناء مسار تأهيل وحجز مخصص لحالات الحقن المجهري وتأخر الإنجاب لتحويل المشاهدات إلى عمليات فعلية بكفاءة عالية', sourceQuote: 'تكمن الفرصة الأضخم الآن في بناء مسار تأهيل وحجز مخصص لحالات الحقن المجهري وتأخر الإنجاب لتحويل ملايين المشاهدات إلى عمليات فعلية بأعلى كفاءة', kind: 'problem' },
        { statement: 'العميل حقق نجاحًا كبيرًا في التوعية الجماهيرية', sourceQuote: 'لاحظنا نجاحكم الكبير في التوعية الجماهيرية', kind: 'fact' },
        { statement: 'الرسالة لا تحتوي على أي ذكر لعنوان فعلي للعيادات سوى زايد والتجمع', sourceQuote: 'زايد والتجمع', kind: 'fact' },
        { statement: 'الوكالة حققت عائد إعلاني يصل إلى 6 أضعاف عبر منظومة استقطاب متكاملة لحالات العمليات والجراحات الدقيقة', sourceQuote: 'الوكالة حققت عائد إعلاني يصل إلى 6 أضعاف عبر منظومة استقطاب متكاملة لحالات العمليات والجراحات الدقيقة', kind: 'fact' }] }));
      if (/فكك رسالة السيلز/.test(prompt)) return json(route, 200, ai({ claims: [{ statement: 'العميل مش بيستخدم فيديوهات', sourceQuote: 'مش بيعمل فيديوهات', kind: 'problem', scope: 'المحتوى' }] }));
      if (/^حوّل نتيجة بحث الويب/.test(prompt)) { const m = [...prompt.matchAll(/\{"alternates":\[[\s\S]*?\]\}/g)].at(-1); return json(route, 200, ai(m ? m[0] : {})); }
      if (/^استخرج معلومات صريحة/.test(prompt) && prompt.includes('url="' + DR_FB)) return json(route, 200, ai({ officialName: { value: '', quote: '' }, evidence: [], facts: [{ field: 'description', value: 'جراح نسا وتوليد وحقن مجهري ' + net.ai.length, evidence: [{ url: DR_FB, quote: 'جراح أمراض النساء والتوليد' }] }], posts: [] }));
      if (/^استخرج معلومات صريحة/.test(prompt)) return json(route, 200, ai({ officialName: { value: '', quote: '' }, evidence: [], facts: [], posts: [] }));
      if (/^أنت مدقق تسويق رقمي/.test(prompt)) {
        const keys = [...prompt.matchAll(/\["(\w+)","/g)].map(m => m[1]);
        const drFinding = prompt.includes('جراح أمراض النساء') && keys.includes('business') ? [{ section: 'business', observation: 'نشاط نسا وتوليد وحقن مجهري ' + net.ai.length, impact: 'x', action: 'y', priority: 'مهم', kind: 'observation', evidence: [{ url: DR_FB, quote: 'جراح أمراض النساء والتوليد', relation: 'neutral' }], missing: [] }] : [];
        return json(route, 200, ai({ claims: [], sections: keys.map(key => ({ key, status: 'insufficient', scope: '', evidence: [], missing: ['بيانات'] })), findings: drFinding, positioning: { current: '', proposal: '', evidence: [], missing: [] }, limits: [], nextQuestions: [] }));
      }
      return json(route, 200, ai({}));
    }
    if (url.startsWith(SERVER + '/api/search')) {
      const body = JSON.parse(req.postData() || '{}');
      net.search.push(body.input);
      if (net.mode.searchDown) return json(route, 500, { error: 'down' });
      const alt = /مصادر عامة بديلة/.test(body.input);
      const data = alt ? { alternates: [{ url: FB, platform: 'Facebook', replaces: body.input.includes(SITE2) ? SITE2 : SITE, evidenceUrl: FB }] } : { links: [], notes: [], reviews: [], competitors: [], ads: [] };
      return json(route, 200, { output: [{ type: 'web_search_call', action: { sources: [{ url: FB, title: NAME }, { url: 'https://example.org/', title: 'x' }] } }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] });
    }
    if (url.startsWith(SERVER + '/api/read')) {
      const body = JSON.parse(req.postData() || '{}');
      net.read.push(body.url); net.readBodies = net.readBodies || []; net.readBodies.push(body);
      if (net.mode.plugin && /facebook\.com\/plugin_page_test|instagram\.com\/clinic_ig/.test(body.url)) return json(route, 200, { url: body.url, status: 'read', method: /instagram/.test(body.url) ? 'instagram_preview' : 'facebook_plugin', title: 'عيادة', text: /instagram/.test(body.url) ? 'Clinic (@clinic_ig)\n223 Followers, 316 Following, 45 Posts' : 'عيادة الاختبار\n٨٫١ ألف متابع\n3d\nبوست عن علاج تقوس الساقين\n406\n27', links: [{ url: 'https://www.facebook.com/plugin_page_test/posts/pfbid0abc' }], coverage: 'partial', limitations: ['من إضافة فيسبوك'] });
      if (net.mode.readerOnlyFB) return json(route, 200, { ok: true, url: body.url, title: 'Log in', text: 'Log in', links: [], loginWall: true });
      if (body.url.startsWith(SITE)) return json(route, 200, { ok: true, url: body.url, finalUrl: body.url, title: NAME, text: SITE_TEXT, links: [{ href: FB, text: 'Facebook' }], loginWall: false, dismissed: { clicked: ['Close'], removed: 0 }, html: `<html><head><script>fbq('init','123')</script></head><body>${SITE_TEXT}<a href="${FB}">fb</a></body></html>` });
      return json(route, 200, { ok: true, url: body.url, title: 'Log in', text: 'Log in to continue', links: [], loginWall: true });
    }
    if (url.startsWith('https://r.jina.ai/')) {
      const target = url.slice('https://r.jina.ai/'.length);
      net.jina.push(target);
      if (target.startsWith(DR_FB)) return route.fulfill({ status: 200, contentType: 'text/plain', body: `Title: دكتور العيلة - د. عمرو عبد العزيز | Facebook\nURL Source: ${DR_FB}\nMarkdown Content:\n${DR_BIO}\n` });
      if (target.startsWith('https://ivfegypt.org')) return route.fulfill({ status: 200, contentType: 'text/plain', body: `Title: IVF Egypt - Dr. Amr Abdelaziz\nURL Source: https://ivfegypt.org/\nMarkdown Content:\nدكتور العيلة — مركز د. عمرو عبد العزيز للحقن المجهري وأطفال الأنابيب. خدماتنا: الحقن المجهري، تأخر الإنجاب، تحديد جنس المولود، جراحات المناظير.\n${'نستقبل الحالات في عيادة الهرم بالجيزة. '.repeat(8)}\n[خدماتنا](https://ivfegypt.org/services/)` });
      if (target.startsWith(FB) && !net.mode.fbDown) return route.fulfill({ status: 200, contentType: 'text/plain', body: `Title: ${NAME} | Facebook\nURL Source: ${FB}\nMarkdown Content:\n${NAME} لتقويم وزراعة الأسنان في المهندسين\n12 ألف متابع · 300 منشور\nمعلومات الصفحة: عيادة أسنان في شارع لبنان بالمهندسين وبنقدم تقويم وزراعة\nأحدث منشور: عرض تقويم الأسنان بخصم لحد آخر الشهر للمرضى الجدد\n` });
      return route.fulfill({ status: 451, body: 'blocked' });
    }
    return route.fulfill({ status: 403, body: 'blocked' });
  });
}

async function open(profile, net) {
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROME_PATH });
  await fakeNetwork(ctx, net);
  const page = ctx.pages()[0] || await ctx.newPage();
  page.on('pageerror', e => net.errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(APP);
  await page.waitForTimeout(700);
  return { ctx, page };
}
const newNet = () => ({ mode: {}, ai: [], search: [], read: [], jina: [], qwen: [], errors: [] });
const runStudy = (page, cid, reuse = false) => page.evaluate(async ([cid, reuse]) => { go('dashboard'); await bp324RunStudy(cid, reuse); const s = bp323State(getClient(cid)); return { error: V.errors[jobKey(cid, 'digitalAudit')] || '', report: !!s.report, limits: s.report?.limits || [] }; }, [cid, reuse]);
const configure = page => page.evaluate(server => { localStorage.setItem('blueprint_ai_endpoint', server + '/api/ai'); localStorage.setItem('blueprint_ai_model', 'gpt-4.1-mini'); }, SERVER);

// ---------------------------------------------------------------------------
const profile = mkdtempSync(join(tmpdir(), 'tt333-'));
let net = newNet();
let { ctx, page } = await open(profile, net);

await check('create client opens stage 1 and closes the modal', async () => {
  await page.evaluate(() => openNewClient());
  await page.fill('#ncName', 'عميل أ'); await page.fill('#ncBiz', 'عيادة أسنان');
  await page.locator('.v-modal-footer .btn-primary').dblclick();
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ n: DB.clients.length, view: STATE.view, tab: STATE.tab, modal: !!document.querySelector('.v-modal') }));
  assert.deepEqual(st, { n: 1, view: 'client', tab: 'overview', modal: false });
});

await check('same name asks before creating a duplicate', async () => {
  await page.evaluate(() => { go('dashboard'); openNewClient(); });
  await page.fill('#ncName', 'عميل أ');
  await page.locator('.v-modal-footer .btn-primary').click();
  const warn = await page.locator('#vModalError').innerText();
  assert.match(warn, /فيه عميل بنفس الاسم/);
  assert.equal(await page.evaluate(() => DB.clients.length), 1);
  await page.getByRole('button', { name: 'أنشئ عميل جديد بنفس الاسم' }).click();
  assert.equal(await page.evaluate(() => DB.clients.length), 2);
});

await check('empty duplicate files can be cleaned from the dashboard', async () => {
  await page.evaluate(() => go('dashboard'));
  assert.match(await page.locator('#app').innerText(), /ملف عميل مكرر وفاضي/);
  await page.getByRole('button', { name: 'امسح النسخ الفاضية المكررة' }).click();
  assert.equal(await page.evaluate(() => DB.clients.length), 1);
});

await check('navigation blocked by a stage opens the stage that needs work', async () => {
  const st = await page.evaluate(() => { const c = DB.clients[0]; go('dashboard'); go('client', c.id, 'plan'); return [STATE.view, STATE.tab]; });
  assert.deepEqual(st, ['client', 'overview']);
});

await configure(page);
const cid = await page.evaluate(([site]) => { const c = DB.clients[0]; const s = bp323State(c); s.sourceURL = site; s.message = 'العميل مش بيعمل فيديوهات خالص'; c.answers.geo = 'المهندسين'; c.answers.bizLinks = 'https://www.instagram.com/smile.clinic.eg/'; persist(); return c.id; }, [SITE]);

await check('direct read fails → server browser reads the site; study completes', async () => {
  const r = await runStudy(page, cid);
  assert.equal(r.error, '', r.error);
  assert.ok(r.report, 'report created');
  const src = await page.evaluate(([cid, site]) => bp323State(getClient(cid)).sources.find(x => canonicalURL(x.url) === canonicalURL(site)), [cid, SITE]);
  assert.equal(src.status, 'read');
  assert.equal(src.method333, 'browser');
  assert.ok(net.read.some(u => u.startsWith(SITE)), 'called /api/read');
});

await check('a page that could not be read shows as failed (with the reason), not as identity-unverified', async () => {
  const x = await page.evaluate(cid => bp323State(getClient(cid)).sources.find(y => /instagram/.test(y.url)), cid);
  assert.equal(x.status, 'unavailable');
  assert.ok(x.note);
  assert.deepEqual(x.attempts333.map(a => [a.method, a.ok]), [['direct', false], ['browser', false]]);
});

await check('study started while another screen is open still sends this client\'s data to the diagnosis', async () => {
  // bp329Evaluate used the client open on screen; from the dashboard the prompt had no evidence and no answers.
  const before = net.ai.length;
  await page.evaluate(cid => { const s = bp323State(getClient(cid)); delete s.evaluation329; delete s.aiCache333; STATE.clientId = null; go('dashboard'); }, cid);
  const r = await page.evaluate(cid => bp324RunStudy(cid, true).then(() => V.errors[jobKey(cid, 'digitalAudit')] || ''), cid);
  assert.equal(r, '', r);
  const p = net.ai.slice(before).find(x => /^أنت مدقق تسويق رقمي/.test(x));
  assert.ok(p, 'evaluation ran');
  assert.match(p, /"geo":"المهندسين"/, 'answers of the studied client are in the prompt');
});

await check('blocked decisions are listed under the report, not injected into the evaluation prompt', async () => {
  // A live A/B run showed the injected note made the evaluator mark every section "insufficient".
  assert.ok(!net.ai.some(x => /^أنت مدقق تسويق رقمي/.test(x) && /قرارات موقوفة/.test(x)), 'no note in evaluation prompt');
  const limits = await page.evaluate(cid => bp323State(getClient(cid)).report.limits, cid);
  assert.ok(limits.some(x => /^قرارات موقوفة لحد ما البيانات تكمل/.test(x) && /الحكم على ربحية الإعلانات/.test(x)), JSON.stringify(limits));
});

await check('source status panel shows read / method / decisions', async () => {
  await page.evaluate(cid => { V.picks['unified324' + cid] = 'study'; go('client', cid, 'overview'); }, cid);
  const text = await page.locator('.tt333').innerText();
  assert.match(text, /حالة المصادر/);
  assert.match(text, /متصفح السيرفر/);
  assert.match(text, /الحكم على ربحية الإعلانات/);
  assert.match(text, /⏸ موقوف/);
});

await check('rerun reuses saved reads and per-source extraction (no repeat AI/reader calls)', async () => {
  const before = { read: net.read.length, jina: net.jina.length, extract: net.ai.filter(x => /^استخرج معلومات صريحة/.test(x)).length };
  const r = await runStudy(page, cid);
  assert.equal(r.error, '', r.error);
  assert.equal(net.ai.filter(x => /^استخرج معلومات صريحة/.test(x)).length, before.extract, 'no new extraction calls');
  assert.ok(!net.jina.slice(before.jina).some(u => u.startsWith(FB) || u.startsWith(SITE)), 'read sources not fetched again');
  assert.ok(!net.read.slice(before.read).some(u => u.startsWith(SITE)), 'site not re-read in browser');
});

await check('search failing does not cancel the study', async () => {
  net.mode.searchDown = true;
  const r = await page.evaluate(cid => { go('dashboard'); return tt333RefreshAll(cid); }, cid).then(() => page.evaluate(cid => Promise.resolve().then(() => ({ error: V.errors[jobKey(cid, 'digitalAudit')] || '', report: !!bp323State(getClient(cid)).report })), cid));
  net.mode.searchDown = false;
  assert.equal(r.error, '', r.error);
  assert.ok(r.report);
});

await check('retry re-reads only the failed source', async () => {
  const i = await page.evaluate(([cid, fb]) => { const s = bp323State(getClient(cid)); const x = s.sources.find(y => canonicalURL(y.url) === canonicalURL(fb)); x.status = 'unavailable'; x.text = ''; x.note = 'test'; persist(); return s.sources.indexOf(x); }, [cid, FB]);
  const before = { jina: net.jina.length, read: net.read.length };
  await page.evaluate(([cid, i]) => tt333Retry(cid, i), [cid, i]);
  const after = net.jina.slice(before.jina);
  assert.ok(after.length >= 1 && after.every(u => u.startsWith(FB)), 'only the failed URL: ' + after.join(','));
  assert.ok(net.read.slice(before.read).every(u => u.startsWith(FB)) && net.read.length - before.read <= 1, 'at most the server route for the same page');
  const st = await page.evaluate(([cid, fb]) => bp323State(getClient(cid)).sources.find(y => canonicalURL(y.url) === canonicalURL(fb)).status, [cid, FB]);
  assert.equal(st, 'read');
});

await check('saved progress survives a reload', async () => {
  await page.reload(); await page.waitForTimeout(800);
  const st = await page.evaluate(cid => { const s = bp323State(getClient(cid)); return { n: DB.clients.length, read: s.sources.filter(x => x.status === 'read').length, report: !!s.report }; }, cid);
  assert.equal(st.n, 1); assert.ok(st.read >= 2); assert.ok(st.report);
});

// Second client: link unreadable everywhere → alternative source of the same business.
const cid2 = await page.evaluate(() => { const c = { id: uid(), name: 'عيادة الابتسامة', biz: 'أسنان', createdAt: Date.now(), answers: { biz: 'أسنان' }, preAudit: { type: 'new' } }; DB.clients.unshift(c); const s = bp323State(c); s.sourceURL = 'https://clinic-two.example/'; s.message = 'العميل مش بيعمل فيديوهات خالص'; persist(); return c.id; });
await check('unreadable link → alternative official source of the same business is used', async () => {
  const r = await runStudy(page, cid2);
  assert.equal(r.error, '', r.error);
  const s = await page.evaluate(cid => bp323State(getClient(cid)), cid2);
  assert.notEqual(s.sources.find(x => x.url.startsWith(SITE2))?.status, 'read');
  const alt = s.sources.find(x => x.alternateFor333);
  assert.ok(alt, 'alternate recorded');
  assert.equal(alt.status, 'read');
  assert.ok(alt.identityReviewed, 'identity verified automatically');
  assert.equal(net.search.filter(x => /مصادر عامة بديلة/.test(x) && x.includes(SITE2)).length, 1, 'exactly one alternates search');
});

// Third client: no link at all, only material from the team.
const cid3 = await page.evaluate(() => { const c = { id: uid(), name: 'عميل بدون لينك', biz: 'أسنان', createdAt: Date.now(), answers: { biz: 'أسنان' }, preAudit: { type: 'new' } }; DB.clients.unshift(c); persist(); return c.id; });
await check('no link: pasted text + screenshot unlock stage 1 and feed the study', async () => {
  assert.equal(await page.evaluate(cid => ttChecks(getClient(cid))[0], cid3), false);
  await page.evaluate(cid => { go('client', cid, 'overview'); tt333OpenAdd(cid); }, cid3);
  await page.fill('#tt333Text', 'رسالة العميل: عندنا عيادة أسنان في المهندسين وعايزين حجوزات تقويم');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('#tt333Files', { name: 'shot.png', mimeType: 'image/png', buffer: png });
  await page.check('#tt333Identity');
  await page.locator('.v-modal-footer .btn-primary').click();
  await page.waitForFunction(cid => !V.jobs.has(jobKey(cid, 'supp333')) && tt333Supp(getClient(cid)).every(x => x.status !== 'pending'), cid3, { timeout: 10000 });
  const sup = await page.evaluate(cid => tt333Supp(getClient(cid)).map(x => [x.kind, x.status]), cid3);
  assert.deepEqual(sup, [['text', 'read'], ['image', 'read']]);
  assert.equal(await page.evaluate(cid => ttChecks(getClient(cid))[0], cid3), true);
  const r = await runStudy(page, cid3);
  assert.equal(r.error, '', r.error);
  assert.ok(r.report);
  const docs = await page.evaluate(cid => bp324Docs(getClient(cid)).filter(d => d.kind === 'team_supplied').length, cid3);
  assert.equal(docs, 2);
});

await check('nothing readable + sales message → preliminary study, not an error', async () => {
  const c4 = await page.evaluate(() => { const c = { id: uid(), name: 'عميل رسالة بس', biz: 'أسنان', createdAt: Date.now(), answers: { biz: 'أسنان' }, preAudit: { type: 'new' } }; DB.clients.unshift(c); const s = bp323State(c); s.sourceURL = 'https://nothing.example/'; s.message = 'العميل مش بيعمل فيديوهات خالص'; persist(); return c.id; });
  net.mode.readerOnlyFB = true; net.mode.searchDown = true;
  const r = await runStudy(page, c4);
  net.mode.readerOnlyFB = false; net.mode.searchDown = false;
  assert.equal(r.error, '', r.error);
  assert.ok(r.report);
  assert.ok(r.limits.some(x => /دراسة مبدئية/.test(x)));
});

// The client from the screenshots: Facebook page whose bio names the website as a bare domain.
await check('doctor page: website named in the bio is found and read; agency/proposal/market statements are not judged as unverifiable client claims', async () => {
  const cd = await page.evaluate(([fb, msg]) => { const c = { id: uid(), name: 'دكتور العيلة', biz: 'نسا وحقن مجهري', createdAt: Date.now(), answers: { biz: 'نسا وحقن مجهري' }, preAudit: { type: 'new' } }; DB.clients.unshift(c); const s = bp323State(c); s.sourceURL = fb; s.message = msg; persist(); return c.id; }, [DR_FB, DR_MSG]);
  const r = await runStudy(page, cd);
  assert.equal(r.error, '', r.error);
  const st = await page.evaluate(cid => { const c = getClient(cid), s = bp323State(c); return { sources: s.sources.map(x => [x.url, x.status, x.linkedFrom333 || '']), website: auditState(c).website, claims: (s.pendingClaims329 || []).map(x => [x.subject, x.statement.slice(0, 25)]), agency: (s.report?.agencyOffers || []).length, tracking: s.trackingProbe?.status }; }, cd);
  const site = st.sources.find(x => x[0].startsWith('https://ivfegypt.org/') && x[0].length <= 'https://ivfegypt.org/'.length);
  assert.ok(site, 'site discovered: ' + JSON.stringify(st.sources));
  assert.equal(site[1], 'read'); assert.equal(site[2], DR_FB);
  assert.ok(st.sources.some(x => /ivfegypt\.org\/services/.test(x[0])), 'services page read too');
  assert.ok(!st.sources.some(x => /hotmail/.test(x[0])), 'email domain is not a website');
  assert.equal(st.website, 'https://ivfegypt.org/');
  const subj = Object.fromEntries(['client', 'competitor', 'agency'].map(k => [k, st.claims.filter(x => x[0] === k).length]));
  assert.deepEqual(subj, { client: 2, competitor: 1, agency: 2 }, JSON.stringify(st.claims));
  assert.ok(!st.claims.some(x => /^الرسالة لا تحتوي/.test(x[1])), 'meta statement about the message is dropped');
  assert.equal(st.agency, 2, 'agency result + proposal shown as agency offers');
});

await check('credit: no client ad-library searches unless asked; tracking HTML and duplicates are not sent for extraction', async () => {
  assert.equal(net.search.filter(x => /ابحث عن سجل إعلان فعلي للمعلن/.test(x) && /دكتور العيلة/.test(x)).length, 0, 'no library searches by default');
  const extracted = net.ai.filter(x => /^استخرج معلومات صريحة/.test(x) && /دكتور|ivfegypt/.test(x));
  assert.ok(extracted.every(x => !/نوع المصدر tracking_html/.test(x)), 'tracking html not extracted');
  const urls = extracted.map(x => (x.match(/url="([^"]+)"/) || [])[1]);
  assert.equal(new Set(urls).size, urls.length, 'each page extracted once');
  assert.ok(!urls.includes('provided:social'), 'duplicate social text not extracted');
});

await check('posts: relative times get approximate dates for extraction', async () => {
  const p = net.ai.find(x => /^استخرج معلومات صريحة/.test(x) && x.includes(DR_FB));
  assert.match(p, /6 minutes ago \[≈\d{4}-\d{2}-\d{2}\]/);
});

await check('switching AI to Qwen keeps the server reader; Qwen gets JSON mode, ≤8192 tokens and a vision model for screenshots', async () => {
  await page.evaluate(() => { localStorage.setItem('blueprint_ai_endpoint', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'); localStorage.setItem('blueprint_ai_key', 'sk-test-qwen'); localStorage.setItem('blueprint_ai_model', 'qwen-plus'); });
  const cq = await page.evaluate(() => { const c = { id: uid(), name: 'عميل كوين', biz: 'أسنان', createdAt: Date.now(), answers: { biz: 'أسنان' }, preAudit: { type: 'new' } }; DB.clients.unshift(c); const s = bp323State(c); s.sourceURL = 'https://clinic.example/qwen'; s.message = 'العميل مش بيعمل فيديوهات خالص'; persist(); return c.id; });
  const before = { read: net.read.length, qwen: net.qwen.length };
  const r = await runStudy(page, cq);
  assert.equal(r.error, '', r.error);
  const q = net.qwen.slice(before.qwen);
  assert.ok(q.length > 0, 'calls went to Qwen');
  assert.ok(q.every(x => x.model === 'qwen-plus' && x.max <= 8192 && x.auth === 'Bearer sk-test-qwen'), JSON.stringify(q.slice(0, 3)));
  assert.ok(q.some(x => x.json === 'json_object'), 'JSON mode on');
  assert.ok(net.read.slice(before.read).some(u => u.startsWith('https://clinic.example/qwen')), 'server reader still used');
  const n = net.qwen.length;
  await page.evaluate(() => callAI('انسخ النص', { image: 'data:image/png;base64,iVBORw0KGgo=', maxTokens: 50 }));
  assert.equal(net.qwen[n].model, 'qwen-vl-max');
  net.mode.qwenInspection = true;
  const err = await page.evaluate(() => callAI('اكتب JSON', { json: true, maxTokens: 50, retry: false }).then(() => '', e => e.message));
  net.mode.qwenInspection = false;
  assert.match(err, /فحص المحتوى عند Alibaba/); assert.match(err, /data_inspection_failed/);
  // a fresh browser that never saw /api/ai still finds the server from the saved search endpoint
  const base = await page.evaluate(server => { localStorage.removeItem('bp_server_base'); localStorage.setItem('bp_search_config', JSON.stringify({ endpoint: server + '/api/search', model: 'gpt-4.1' })); return tt333ServerBase(); }, SERVER);
  assert.equal(base, SERVER);
  await page.evaluate(server => { localStorage.setItem('blueprint_ai_endpoint', server + '/api/ai'); localStorage.removeItem('blueprint_ai_key'); localStorage.setItem('blueprint_ai_model', 'gpt-4.1-mini'); }, SERVER);
});

await check('a site named on the page but not naming the client is not accepted (identity check is real)', async () => {
  const r = await page.evaluate(() => { const c = DB.clients.find(x => x.name === 'دكتور العيلة'); const page = { url: 'https://www.facebook.com/dr.amrziz', text: 'x 16431' }; return [tt333SiteBelongs(c, page, 'متجر ميكروفونات KMC500 Bluetooth'), tt333SiteBelongs(c, page, 'دكتور العيلة — خدماتنا')]; });
  assert.equal(r[0], ''); assert.ok(r[1] && typeof r[1] === 'string', JSON.stringify(r));
  const notes = await page.evaluate(() => DB.clients.flatMap(c => bp323State(c).sources.map(x => x.identityAuto333 || '')).join('|'));
  assert.doesNotMatch(notes, /object Promise/);
});

await check('reach claim is partly supported by the follower count; ad platforms are not filled from organic presence', async () => {
  const st = await page.evaluate(() => { const c = DB.clients.find(x => x.name === 'دكتور العيلة'); const p = (bp323State(c).report?.problems || []).find(x => /التوعية/.test(x.statement)); const before = auditState(c).proposals.length; const n = bp324AddFacts(c, [{ field: 'platformsUsed', value: 'YouTube', evidence: [{ url: 'https://www.facebook.com/dr.amrziz', quote: '402K followers' }] }], bp324Docs(c)); return { verdict: p?.verdict, ev: (p?.evidence || []).map(e => e.quote).join('|'), added: auditState(c).proposals.length - before }; });
  assert.equal(st.verdict, 'partial'); assert.match(st.ev, /402K followers/); assert.equal(st.added, 0);
});

await check('tracking found in the site code answers the tracking question', async () => {
  const v = await page.evaluate(cid => getClient(cid).answers.tracking, cid);
  assert.deepEqual(v, ['Meta Pixel']);
});

await check('sidebar lists the client accounts and the sales message', async () => {
  await page.evaluate(cid => go('client', cid, 'overview'), cid);
  const side = await page.locator('.tt333-side').innerText();
  assert.match(side, /حسابات العميل/); assert.match(side, /Facebook/); assert.match(side, /رسالة السيلز/);
  const hrefs = await page.locator('.tt333-side a').evaluateAll(a => a.map(x => x.href));
  assert.ok(hrefs.some(h => h.startsWith('https://clinic.example')), JSON.stringify(hrefs));
});

await check('approve → refresh does not loop: no re-extraction, no new proposals, report becomes approvable', async () => {
  const before = await page.evaluate(() => { const c = DB.clients.find(x => x.name === 'دكتور العيلة'); return { id: c.id, proposals: auditState(c).proposals.length }; });
  assert.ok(before.proposals >= 1, 'study proposed a fact');
  const blockers = await page.evaluate(cid => { bp324Approve(cid); return document.querySelector('.v-modal')?.innerText || ''; }, before.id);
  assert.match(blockers, /معلومة مقترحة محتاجة اعتماد/);
  await page.evaluate(cid => { closeModal(); const c = getClient(cid), d = auditState(c); for (const p of d.proposals) c.answers[p.key || p.field] = p.value; d.proposals = []; changed(c); }, before.id);
  const n = net.ai.length;
  const r = await page.evaluate(cid => { go('dashboard'); return bp324RunStudy(cid, true).then(() => { const c = getClient(cid); return { err: V.errors[jobKey(cid, 'digitalAudit')] || '', proposals: auditState(c).proposals.length, refresh: bp324NeedsRefresh(c) }; }); }, before.id);
  assert.equal(r.err, '', r.err);
  assert.equal(net.ai.slice(n).filter(x => /^استخرج معلومات صريحة/.test(x)).length, 0, 'no re-extraction');
  assert.equal(r.proposals, 0, 'no new proposals');
  assert.equal(r.refresh, false, 'report is current');
});

await check('content mix: preliminary shares before review; post link taken from the reel URL', async () => {
  const r = await page.evaluate(() => { const today = new Date().toISOString().slice(0, 10); const posts = [{ id: 'a', url: 'https://www.facebook.com/dr.amrziz', date: today, text: 'الالم بعد الحقن المجهري https://www.facebook.com/reel/4732289180393971/', category: 'تعليمي', format: 'فيديو' }, { id: 'b', url: 'https://www.facebook.com/dr.amrziz', date: today, text: 'عرض', category: 'عرض وبيع', format: 'صورة' }]; const html = bp323ContentHTML(posts); return { html, url: posts[0].url }; });
  assert.match(r.html, /نسب مبدئية من 2 منشور/); assert.match(r.html, /تعليمي/); assert.match(r.html, /(?:50|٥٠)%/);
  assert.equal(r.url, 'https://www.facebook.com/reel/4732289180393971/');
});

await check('reviews are approve buttons; approval refreshes by itself and keeps earlier reviews', async () => {
  const cid2 = await page.evaluate(() => DB.clients.find(x => x.name === 'دكتور العيلة').id);
  // open the report tab directly (the stage gate would redirect: earlier stages are not complete in this fake client)
  await page.evaluate(cid => { V.picks['unified324' + cid] = 'report'; STATE.view = 'client'; STATE.clientId = cid; STATE.tab = 'digitalAudit'; render(); }, cid2);
  const f = await page.evaluate(cid => (bp323State(getClient(cid)).report.findings || []).find(x => x.verified), cid2);
  assert.ok(f, 'an evidenced finding exists');
  assert.equal(await page.locator('input[type=checkbox][onchange*="bp323ReviewFinding"]').count(), 0, 'no review checkboxes left');
  await page.locator(`button[onclick*="bp323ReviewFinding"][onclick*="${f.id}"]`).first().click();
  assert.equal(await page.evaluate(([cid, id]) => bp323State(getClient(cid)).report.findings.find(x => x.id === id).accepted, [cid2, f.id]), true);
  // answers change → approving refreshes by itself, keeps the review, then approves
  const n = net.ai.length;
  const st = await page.evaluate(async cid => { const keep = auditMissing; auditMissing = () => []; try { const c = getClient(cid); auditState(c).proposals = []; brain(c).conflicts = []; c.answers.geo = 'الجيزة'; changed(c); await bp324Approve(cid); const r = bp323State(getClient(cid)).report; return { approved: !!r.approved, accepted: r.findings.filter(x => x.verified).every(x => x.accepted), modal: document.querySelector('.v-modal')?.innerText || '' }; } finally { auditMissing = keep; } }, cid2);
  assert.ok(net.ai.slice(n).some(x => /^أنت مدقق تسويق رقمي/.test(x)), 'refreshed the diagnosis');
  assert.ok(!net.ai.slice(n).some(x => /^استخرج معلومات صريحة/.test(x)), 'without re-extraction');
  assert.equal(st.accepted, true, 'earlier review kept after refresh');
  assert.equal(st.approved, true, st.modal);
});

await check('post link is taken from the source page next to the post text', async () => {
  const u = await page.evaluate(fb => { const c = DB.clients.find(x => x.name === 'دكتور العيلة'); return tt333PostURL({ url: fb, text: 'اللام بعد الحقن المجهري بيفضل قد ايه؟؟…', evidence: [{ url: fb, quote: 'اللام بعد الحقن المجهري بيفضل قد ايه' }] }, c); }, DR_FB);
  assert.equal(u, 'https://www.facebook.com/reel/4732289180393971/');
});

await check('round 12: all content types with shares, same-platform post links, open sections stay open, TikTok link, plan budget, digits', async () => {
  const r = await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10), fb = 'https://www.facebook.com/dr.amrziz';
    const posts = [{ id: 'a', url: fb, date: today, text: 'نصيحة', category: 'تعليمي', format: 'فيديو', evidence: [{ url: fb, quote: 'نصيحة' }] }, { id: 'b', url: fb, date: today, text: 'شوف https://www.youtube.com/watch?v=abc', category: 'تعليمي', format: 'فيديو', evidence: [{ url: fb, quote: 'شوف' }] }];
    const html = bp323ContentHTML(posts);
    const c = DB.clients.find(x => x.name === 'دكتور العيلة');
    const out = { html, ytLink: posts[1].url, zeroShown: /إثبات ثقة[\s\S]{0,80}0 \/ 2/.test(html), linkGone: !/المنشور — غير متاح/.test(html) };
    out.tiktok = tt333Decode('https%3A%2F%2Ftiktok.com%2F%40dr.amrabdelaziz%253Flang%253Den');
    out.gone = tt333Accept('Couldn\'t find this account', 'https://www.tiktok.com/@x', { text: "Couldn't find this account" }).ok;
    out.type = [tt333ContentType({ angle: 'قصص نجاح مرضى الحقن المجهري' }), tt333ContentType({ angle: 'عرض الكشف بخصم' }), tt333ContentType({ angle: 'إزاي تعرفي إنك محتاجة حقن مجهري' })];
    out.digits = fmt(2000) + ' ' + money(2000);
    c.answers.budgetNext = '30000'; openPlanOptions(c.id); out.budget = document.getElementById('poBudget')?.value; closeModal();
    return out;
  });
  assert.equal(r.ytLink, '', 'no YouTube link for a Facebook post'); assert.ok(r.linkGone, 'no "not available" link text');
  assert.ok(r.zeroShown, 'categories with 0 are listed');
  assert.equal(r.tiktok, 'https://tiktok.com/@dr.amrabdelaziz'); assert.equal(r.gone, false);
  assert.deepEqual(r.type, ['إثبات ثقة', 'عرض وبيع', 'تعليمي']);
  assert.match(r.digits, /^2,000 2,000/); assert.equal(r.budget, '10000');
  // open "review posts" section survives an approve click
  const cid0 = await page.evaluate(() => DB.clients.find(x => x.name === 'دكتور العيلة').id);
  await page.evaluate(cid => { const s = bp323State(getClient(cid)); s.posts = [{ id: 'p1', url: 'https://www.facebook.com/reel/1/', date: new Date().toISOString().slice(0, 10), text: 'x', category: 'تعليمي', format: 'فيديو', evidence: [{ url: 'https://www.facebook.com/dr.amrziz', quote: 'x' }] }]; document.getElementById('app').innerHTML = shell(bp323ContentHTML(s.posts), getClient(cid)); }, cid0);
  await page.evaluate(() => { const d = [...document.querySelectorAll('details')].find(x => /راجع المنشورات/.test(x.textContent)); d.open = true; d.dispatchEvent(new Event('toggle')); });
  const reopened = await page.evaluate(cid => { const s = bp323State(getClient(cid)); s.posts[0].reviewed = true; const html = shell(bp323ContentHTML(s.posts), getClient(cid)); return /<details open><summary>راجع المنشورات/.test(html) || /<details[^>]*open[^>]*><summary>راجع المنشورات/.test(html); }, cid0);
  assert.ok(reopened, 'section stays open after re-render');
});

await check('verification engine: rating compared with the source, website and branch confirmed, agency rows removed', async () => {
  const r = await page.evaluate(() => {
    const claims = [
      { id: 'a', statement: 'العميل حصل على تقييم 5.0 من أكثر من 130 مريضا', sourceQuote: 'تقييمكم الاستثنائي (5.0 من أكثر من 130 مريضا)', subject: 'client', kind: 'fact' },
      { id: 'b', statement: 'لدى العميل موقع إلكتروني', sourceQuote: 'موقعكم', subject: 'client', kind: 'fact' },
      { id: 'c', statement: 'العميل يمتلك فرعًا في الهرم', sourceQuote: 'فرعكم في الهرم', subject: 'client', kind: 'fact' },
      { id: 'd', statement: 'الوكالة تدعي أن حملاتها تحقق أعلى عائد على الإنفاق الإعلاني', sourceQuote: 'تحقق أعلى عائد', subject: 'client', kind: 'fact' }];
    const docs = [{ url: 'https://site.example/', kind: 'website', text: 'عيادة النور لطب الأسنان\nفرع الهرم: 12 شارع الهرم\n' + 'خدمات تقويم وزراعة. '.repeat(10) }, { url: 'https://www.vezeeta.com/ar/dr-x', kind: 'source', text: 'عيادة النور\n4.6 ★ (98 reviews)' }];
    const out = bp324Validate({ claims: [], sections: [], findings: [], positioning: {}, limits: [], nextQuestions: [] }, docs, claims);
    return { problems: out.problems.map(p => [p.id || p.statement.slice(0, 12), p.verdict, (p.evidence || [])[0]?.quote || '', p.reason]), agency: (out.agencyOffers || []).map(x => x.statement) };
  });
  const by = k => r.problems.find(p => p[3] && p[0] && (p[0] === k || true) && false) || null; void by;
  const rating = r.problems.find(p => /4\.6/.test(p[2]));
  assert.ok(rating, JSON.stringify(r.problems)); assert.equal(rating[1], 'unsupported'); assert.match(rating[3], /4\.6 من 98/);
  assert.ok(r.problems.some(p => p[1] === 'confirmed' && /site\.example|النور/.test(p[3] + p[2])), 'website confirmed');
  assert.ok(r.problems.some(p => p[1] === 'confirmed' && /الهرم/.test(p[2])), 'branch confirmed');
  assert.ok(!r.problems.some(p => /الوكالة/.test(p[0] + p[3])) && r.agency.some(x => /الوكالة/.test(x)), 'agency row removed');
});

await check('«ابدأ الدراسة» moves to the next stage when the study finishes cleanly', async () => {
  const st = await page.evaluate(async cid => { go('client', cid, 'overview'); const html = document.getElementById('app').innerHTML; await tt333StartStudy(cid); return { btn: /tt333StartStudy/.test(html), err: V.errors[jobKey(cid, 'digitalAudit')] || '', tab: STATE.tab, pick: V.picks['unified324' + cid] }; }, cid);
  assert.ok(st.btn, 'button uses the new action'); assert.equal(st.err, '', st.err);
  assert.equal(st.tab, 'digitalAudit'); assert.equal(st.pick, 'facts');
});

await check('server token is sent only to the Blueprint server', async () => {
  await page.evaluate(() => localStorage.setItem('bp_server_token', 'tok'));
  const headers = [];
  page.on('request', r => { if (r.url().startsWith(SERVER)) headers.push(r.headers()['x-blueprint-token']); });
  await page.evaluate(() => callAI('اكتب تمام فقط.', { maxTokens: 10 }));
  assert.ok(headers.length && headers.every(h => h === 'tok'));
});

await check('manual identity confirmation survives the next run', async () => {
  const i = await page.evaluate(([cid, fb]) => { const s = bp323State(getClient(cid)); return s.sources.findIndex(x => canonicalURL(x.url) === canonicalURL(fb)); }, [cid, FB]);
  await page.evaluate(([cid, i]) => tt333ConfirmIdentity(cid, i), [cid, i]);
  await runStudy(page, cid);
  const x = await page.evaluate(([cid, fb]) => bp323State(getClient(cid)).sources.find(y => canonicalURL(y.url) === canonicalURL(fb)), [cid, FB]);
  assert.equal(x.status, 'read'); assert.equal(x.identityReviewed, true);
});

await check('marketing-plan report: 23 slides, cached, failed part retried alone, wording follows business type', async () => {
  const grab = (cid) => page.evaluate(async cid => { let blob = null; const u = URL.createObjectURL, k = HTMLAnchorElement.prototype.click; URL.createObjectURL = b => { blob = b; return 'blob:x'; }; HTMLAnchorElement.prototype.click = function () {}; try { const r = await tt333PlanDeck(cid); return { html: blob ? await blob.text() : '', failed: r?.failed || [] }; } finally { URL.createObjectURL = u; HTMLAnchorElement.prototype.click = k; } }, cid);
  const deckCalls = from => net.ai.slice(from).filter(x => /^اكتب (?:الجزء الاستراتيجي|جزء المحتوى والتشغيل) من خطة تسويق/.test(x));
  const cid = await page.evaluate(() => { const c = DB.clients.find(x => x.name === 'دكتور العيلة'); delete c.planDeck333; c.answers.budgetNext = '30000'; return c.id; });
  let n = net.ai.length; const r1 = await grab(cid);
  assert.equal(deckCalls(n).length, 2); assert.deepEqual(r1.failed, []);
  assert.equal((r1.html.match(/<section class="slide/g) || []).length, 23);
  for (const x of ['الخطة في أربع نقاط', 'الثقة قبل الحجز', 'رحلة العميل', 'conic-gradient', 'فكرة 12', 'فكرة الاثنين', '= 28 قطعة', 'لما العميل يسأل عن السعر', 'أسعار الباقات', 'اطبع / احفظ PDF']) assert.ok(r1.html.includes(x), x);
  assert.match(r1.html, /22,500/, 'Meta 75% of 30,000');
  assert.ok(!/مقترح|ناقص<\/b>/.test(r1.html.match(/الخطة في أربع نقاط[\s\S]*?<\/section>/)[0]), 'summary filled');
  n = net.ai.length; await grab(cid); assert.equal(deckCalls(n).length, 0, 'cached: no AI calls');
  await page.evaluate(cid => { delete getClient(cid).planDeck333; }, cid);
  net.mode.deckBDown = true; const r2 = await grab(cid); net.mode.deckBDown = false;
  assert.ok(r2.failed.includes('b')); assert.match(r2.html, /<b>ناقص<\/b><span>أفكار المحتوى/); assert.ok(r2.html.includes('الثقة قبل الحجز'));
  n = net.ai.length; const r3 = await grab(cid); const again = deckCalls(n);
  assert.equal(again.length, 1); assert.match(again[0], /^اكتب جزء المحتوى/); assert.ok(r3.html.includes('فكرة 12'));
  const ncid = await page.evaluate(() => { const c = JSON.parse(JSON.stringify(DB.clients.find(x => x.name === 'دكتور العيلة'))); c.id = 'np1'; c.name = 'أفضل الصدقة'; c.answers = { businessType: 'مؤسسة خيرية لحفر الآبار', budgetNext: '60000' }; delete c.planDeck333; DB.clients.push(c); return c.id; });
  n = net.ai.length; const r4 = await grab(ncid);
  assert.ok(deckCalls(n).every(x => /الجمهور متبرعين/.test(x) && /"المتبرع"/.test(x)));
  assert.ok(r4.html.includes('خطة التسويق وجمع التبرعات') && r4.html.includes('رحلة المتبرع'));
  await page.evaluate(() => { DB.clients = DB.clients.filter(x => x.id !== 'np1'); });
  const side = await page.evaluate(cid => { go('client', cid, 'overview'); return document.getElementById('app').innerHTML.includes(`tt333PlanDeck('${cid}')`); }, cid);
  assert.ok(side, 'sidebar button');
});

await check('credit: rerun with the same data reuses the diagnosis and searches; changed answers or «حدّث كل المصادر» ask again', async () => {
  const cid = await page.evaluate(() => DB.clients.find(x => x.name === 'عميل أ').id);
  const evals = from => net.ai.slice(from).filter(x => /^أنت مدقق تسويق رقمي/.test(x)).length;
  await page.evaluate(cid => { const s = bp323State(getClient(cid)); delete s.evaluation329; }, cid);
  await runStudy(page, cid, true);
  let n = net.ai.length, ns = net.search.length;
  await page.evaluate(cid => { delete bp323State(getClient(cid)).evaluation329; }, cid);
  const r1 = await runStudy(page, cid, true); assert.equal(r1.error, ''); assert.ok(r1.report);
  assert.equal(evals(n), 0, 'same input → saved diagnosis answer'); assert.equal(net.search.length, ns, 'no repeated search');
  // survives a reload (stored with the client, not only in memory)
  ({ ctx, page } = await (async () => { await ctx.close(); return open(profile, net); })()); await configure(page);
  n = net.ai.length; await page.evaluate(cid => { delete bp323State(getClient(cid)).evaluation329; }, cid);
  await runStudy(page, cid, true); assert.equal(evals(n), 0, 'still saved after reload');
  n = net.ai.length; await page.evaluate(cid => { const c = getClient(cid); c.answers.offer = 'خصم 15% على أول كشف'; delete bp323State(c).evaluation329; }, cid);
  await runStudy(page, cid, true); assert.ok(evals(n) > 0, 'changed answers → new diagnosis');
  n = net.ai.length; await page.evaluate(cid => { delete bp323State(getClient(cid)).evaluation329; return tt333RefreshAll(cid); }, cid); assert.ok(evals(n) > 0, 'refresh all asks again');
});

await check('live findings: agency offer is not a client claim, places checked, same-first-name doctor excluded, library Markdown parsed', async () => {
  const r = await page.evaluate(() => {
    const msg = 'أهلاً دكتور عماد، تحياتنا لجهودك في خدمة أهالي قنا ونجع حمادي. مع حرص حضرتك على توفير خبرة مستشفى أبو الريش. بنقدم لحضرتك في تيكنو تيم عرض تصميم موقع يبرز سجلك الأكاديمي. • موقع IVF Egypt. السعر: 5,000 جنيه';
    const cls = tt333Reclassify([{ statement: 'السعر 5,000 جنيه', sourceQuote: 'السعر: 5,000 جنيه' }, { statement: 'الموقع يبرز السجل الأكاديمي', sourceQuote: 'يبرز سجلك الأكاديمي' }, { statement: 'وجود مرجع رقمي يمنح الأهالي الاطمئنان', sourceQuote: 'x' }, { statement: 'نماذج حية IVF Egypt', sourceQuote: 'موقع IVF Egypt' }, { statement: 'خبرة أبو الريش', sourceQuote: 'توفير خبرة مستشفى أبو الريش' }], null, msg).map(x => x.subject || 'client');
    const docs = [{ url: 'https://fb.com/x', kind: 'source', text: 'Page · Doctor\nقنا, Qena, Egypt' }];
    const place = tt333PlaceCheck({ statement: 'جهودك الطبية رائدة في خدمة أهالي قنا ونجع حمادي' }, docs);
    const travel = tt333PlaceCheck({ statement: 'توفير خبرة أبو الريش داخل قنا لتجنيب الأهالي السفر للقاهرة' }, docs);
    const c = { name: 'دكتور عماد حمدي الشرقاوي', answers: {}, digitalAudit: { officialName: 'دكتور عماد حمدي الشرقاوي استشاري جراحة العظام' } };
    const other = [tt333OtherPerson(c, 'عن د. عماد يسري استشاري العظام'), tt333OtherPerson(c, 'دكتور عماد حمدى الشرقاوى')];
    const md = 'Library ID: 1089765647031169\n\nStarted running on Sep 30, 2026\n\n* * *\n\n![Image 1: د.زناتى الطوخى](https://x/y.jpg)\n\n[د.زناتى الطوخى لجراحة العظام](https://www.facebook.com/p)\n\n**Sponsored**\n\nلأهالينا في قنا ونجع حمادي\n\nActive\n';
    const lib = bp329ParseLibrary(md).map(x => [x.advertiser, x.status, /قنا/.test(x.text)]);
    return { cls, place: [place.verdict, place.missing], travel, other, lib };
  });
  assert.deepEqual(r.cls, ['agency', 'agency', 'agency', 'agency', 'client']);
  assert.equal(r.place[0], 'partial'); assert.match(r.place[1][0], /نجع حمادي/);
  assert.equal(r.travel, null, 'a city the message travels to is not checked; the place alone does not confirm a hospital claim');
  assert.deepEqual(r.other, ['د. عماد يسري', '']);
  assert.deepEqual(r.lib, [['د.زناتى الطوخى لجراحة العظام', 'active', true]]);
});

await check('Facebook page / Instagram profile go to the server route first and its result is used as is', async () => {
  net.mode.plugin = true; const j0 = net.jina.length;
  const r = await page.evaluate(async () => { const fb = await bp323Read('https://www.facebook.com/plugin_page_test'), ig = await bp323Read('https://www.instagram.com/clinic_ig'); return [fb.status, fb.method333, /٨٫١ ألف متابع/.test(fb.text), /posts\/pfbid0abc/.test(fb.text), ig.status, ig.method333, /223 Followers/.test(ig.text), tt333ServerRoute('https://www.facebook.com/x/posts/1'), tt333ServerRoute('https://maps.app.goo.gl/abc'), tt333ServerRoute('https://x.com/NASA/status/1')]; });
  net.mode.plugin = false;
  assert.deepEqual(r, ['read', 'server_facebook_plugin', true, true, 'read', 'server_instagram_preview', true, false, true, false]);
  assert.equal(net.jina.slice(j0).filter(u => /plugin_page_test|clinic_ig/.test(u)).length, 0, 'no direct read needed');
});

await check('Facebook plugin posts become post rows with exact counts; «حمادى» matches «حمادي»', async () => {
  const r = await page.evaluate(() => {
    const txt = 'عيادة د. عماد\n٨٫١ ألف متابع\nعيادة د. عماد\n3d\nطفل عنده تقوس اتعالج ☎️عياده نجع حمادى ___عماره الاوقاف\n406\n27\n113\nعيادة د. عماد\nSep 16\nالقدم المخلبية\n0:46\n92\n25\n4\nعرض المزيد على فيسبوك';
    const posts = tt333PluginPosts(txt, 'https://www.facebook.com/x', Date.parse('2026-10-08T12:00:00Z')).map(p => [p.date, p.video, p.reactions, p.comments, p.shares]);
    const pc = tt333PlaceCheck({ statement: 'خدمة أهالي قنا ونجع حمادي' }, [{ url: 'https://www.facebook.com/x', kind: 'source', text: 'قنا, Qena, Egypt\n' + txt }]);
    return { posts, verdict: pc.verdict, quote: pc.evidence.map(e => e.quote).join(' | ') };
  });
  assert.deepEqual(r.posts, [['2026-10-05', false, 406, 27, 113], ['2026-09-16', true, 92, 25, 4]]);
  assert.equal(r.verdict, 'confirmed'); assert.match(r.quote, /نجع حمادى/);
});

await check('institutions named in a claim are checked word for word in the client sources', async () => {
  const r = await page.evaluate(() => { const st = 'حرص حضرتك على توفير خبرة مستشفى أبو الريش والقصر العيني في جراحة عظام الأطفال'; const docs = [{ url: 'https://www.facebook.com/x', kind: 'source', text: '- دكتوراه جراحة عظام الاطفال - زميل وحدة جراحات عظام الاطفال ، ابو الريش ، القصر العينى' }]; const a = tt333InstitutionCheck({ statement: st }, docs), b = tt333InstitutionCheck({ statement: st }, [{ url: 'x', kind: 'source', text: 'زميل القصر العيني' }]); return [a.verdict, a.evidence.length, b.verdict, b.missing[0]]; });
  assert.deepEqual(r, ['confirmed', 1, 'partial', 'دليل على ابو الريش']);
});

await check('Instagram reader session: saved from settings, sent only with /api/read', async () => {
  await page.evaluate(() => { openAISettings(); });
  await page.waitForTimeout(200);
  const has = await page.evaluate(() => !!document.getElementById('bpIGSession333'));
  assert.ok(has, 'settings field');
  await page.fill('#bpIGSession333', 'sessionid=12345%3Aabcdefghijk; path=/');
  await page.dispatchEvent('#bpIGSession333', 'input'); await page.dispatchEvent('#bpIGSession333', 'change');
  const stored = await page.evaluate(() => localStorage.getItem('bp_ig_session'));
  assert.equal(stored, '12345%3Aabcdefghijk');
  await page.evaluate(() => closeModal());
  net.mode.plugin = true; const n = (net.readBodies || []).length, a0 = net.ai.length;
  const aiBodies = []; page.on('request', r => { if (r.url().startsWith(SERVER + '/api/ai')) aiBodies.push(r.postData() || ''); });
  await page.evaluate(async () => { TT333.browser.clear(); await bp323Read('https://www.instagram.com/clinic_ig'); await callAI('اكتب تمام فقط.', { maxTokens: 10 }); });
  net.mode.plugin = false;
  const bodies = net.readBodies.slice(n);
  assert.ok(bodies.length && bodies.every(b => b.igSession === '12345%3Aabcdefghijk'), JSON.stringify(bodies));
  assert.ok(aiBodies.length && aiBodies.every(b => !b.includes('12345%3Aabcdefghijk')), 'never sent to /api/ai');
  await page.evaluate(() => localStorage.removeItem('bp_ig_session'));
});

await check('sources that could not be read are not shown and do not add limits', async () => {
  const r = await page.evaluate(() => { const c = DB.clients.find(x => bp323State(x).sources.some(y => y.status === 'unavailable') && bp323State(x).sources.some(y => y.status === 'read')); const s = bp323State(c); const bad = s.sources.find(y => y.status === 'unavailable'); const html = tt333Panel(c); const v = bp324Validate({ claims: [], sections: [], findings: [], positioning: {}, limits: ['تعذر قراءة صفحة Instagram (تسجيل الدخول)', 'لم نقرأ تقييمات مرضى موثقة'], nextQuestions: [] }, [], []); return { failedShown: html.includes(tt333Host(bad.url) + '</a>') || /✕ اتعذّر/.test(html), chip: /اتعذّر \d/.test(html), readShown: /✓ اتقرأ/.test(html), limits: v.limits }; });
  assert.equal(r.failedShown, false); assert.equal(r.chip, false); assert.equal(r.readShown, true);
  assert.deepEqual(r.limits, ['لم نقرأ تقييمات مرضى موثقة']);
});

await check('links keep the Facebook page id; Arabic relative dates in plugin posts; navigation pages are not sources', async () => {
  const r = await page.evaluate(() => {
    const links = bp323Links('[fb](https://www.facebook.com/profile.php?id=61553464153608&ref=x) [yt](https://www.youtube.com/watch?v=abc123&t=3)', 'https://afdal.example/');
    const txt = 'مؤسسة\n٢٦٬٣٥٩ متابعين\nعنوان\nمؤسسة\nمنذ حوالي ‏٩‏ أشهر\nنص البوست\nعرض المزيد\n‏٦‏\nتعليق\nمشاركة\nعنوان تاني\nمؤسسة\nمنذ يومين\nبوست تاني\n12\n3\n1';
    const posts = tt333PluginPosts(txt, 'https://www.facebook.com/x', Date.parse('2026-10-08')).map(p => [p.date, p.reactions, p.text]);
    return { links, posts, nav: ['https://www.youtube.com/feed/you', 'https://www.google.com/maps/embed', 'https://www.youtube.com/@x'].map(u => TT333_NAV.test(u)) };
  });
  assert.ok(r.links.includes('https://www.facebook.com/profile.php?id=61553464153608'), JSON.stringify(r.links));
  assert.ok(r.links.includes('https://www.youtube.com/watch?v=abc123'));
  assert.deepEqual(r.posts, [['2026-01-11', 6, 'نص البوست'], ['2026-10-06', 12, 'بوست تاني']]);
  assert.deepEqual(r.nav, [true, true, false]);
});

await check('charity competitors: same cause as the client, donation ads only, no foreign relief; names read from the profile picture', async () => {
  const r = await page.evaluate(() => {
    const c = { id: 'chx', name: 'مؤسسة المياه', answers: { businessType: 'مؤسسة خيرية', description: 'توصيل المياه النظيفة للقرى وحفر الآبار ووصلات المياه', offer: 'وصلات مياه' }, digitalAudit: {} };
    TT333.compClient = c; const ad = (advertiser, text) => ({ id: '1', advertiser, text, status: 'active', start: 1, branches: [] });
    const v = [ad('مؤسسة إكرام', 'تبرع بوصلة مياه صدقة جارية لقرى مصر'), ad('مركز الأورام', 'تبرع لعلاج مرضى الأورام'), ad('زاد', 'تبرع بشاحنة مياه لأهل غزة'), ad('شركة معالجة', 'حلول تحلية مياه البحر للمصانع'), ad('مؤسسة رسالة', 'اليوميه الاسلامية تبرع لعلاج')].map(a => bp329Eligible(a, bp330Service(''), 'مصر'));
    const md = 'Library ID: 1544840440680143\n\nStarted running on Jun 30, 2026\n\n* * *\n\n![Image 1: مؤسسة إكرام للتنمية](https://x/y.jpg)\n\nتقدر تتخيل يوم من غير مية؟ تبرع\n\nActive\n';
    const names = bp329ParseLibrary(md).map(x => x.advertiser); TT333.compClient = null;
    return { v, service: (TT333.compClient = c, bp330Service('')), names };
  });
  assert.deepEqual(r.v, [true, false, false, false, false]); assert.equal(r.service, 'صدقة جارية مياه'); assert.deepEqual(r.names, ['مؤسسة إكرام للتنمية']);
  await page.evaluate(() => { TT333.compClient = null; });
});

await check('no page errors', async () => { assert.deepEqual(net.errors, []); });

await ctx.close();
for (const r of results) console.log(r[0].padEnd(4), r[1], r[2] ? '— ' + r[2] : '');
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
