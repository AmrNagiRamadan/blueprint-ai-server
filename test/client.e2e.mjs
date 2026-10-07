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
      net.read.push(body.url);
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
  await page.evaluate(cid => { delete bp323State(getClient(cid)).evaluation329; STATE.clientId = null; go('dashboard'); }, cid);
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
  assert.equal(net.read.length, before.read, 'no browser call needed once direct read worked');
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

await check('no page errors', async () => { assert.deepEqual(net.errors, []); });

await ctx.close();
for (const r of results) console.log(r[0].padEnd(4), r[1], r[2] ? '— ' + r[2] : '');
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
