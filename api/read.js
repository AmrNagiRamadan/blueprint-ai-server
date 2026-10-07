// Blueprint OS — server-side browser reader (fallback #2 after direct reading).
// POST /api/read   body: { url, includeHtml? }
// Loads the page in headless Chromium, tries to close dismissible login / cookie dialogs,
// scrolls a little to load content, and returns the visible text + links.
// It never logs in and never bypasses a wall that cannot be closed: the response says so
// (loginWall: true) and the app moves to the next fallback.
import puppeteer from 'puppeteer-core';
import { guard } from './_lib/guard.js';
import { publicHost, publicUrl } from './_lib/public-url.js';

const NAV_TIMEOUT = 20000;
const TOTAL_BUDGET = 45000;
const MAX_TEXT = 60000;
const MAX_HTML = 400000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

let browserPromise = null;

async function launch() {
  // Local runs / tests: CHROME_PATH points at an installed Chromium.
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  }
  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    executablePath: await chromium.executablePath(),
    headless: 'shell'
  });
}

async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b && b.connected) return b;
  }
  browserPromise = launch();
  return browserPromise;
}

// Runs inside the page: clicks close / "not now" / decline-cookies controls and removes
// large fixed overlays that contain a login form. Returns what it did.
function dismissInPage() {
  const clicked = [];
  const re = /^(?:close|close dialog|dismiss|not now|ليس الآن|إغلاق|اغلاق|إغلاق النافذة|decline optional cookies|only allow essential cookies|reject all|رفض الكل|رفض ملفات تعريف الارتباط الاختيارية|السماح بملفات تعريف الارتباط الأساسية فقط)$/i;
  for (const el of document.querySelectorAll('[aria-label],button,[role=button]')) {
    const t = String(el.getAttribute('aria-label') || el.textContent || '').trim();
    if (t && t.length <= 60 && re.test(t)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { el.click(); clicked.push(t); }
    }
  }
  let removed = 0;
  const area = innerWidth * innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < area * 0.3) continue;
    const loginLike = el.getAttribute('role') === 'dialog' || el.querySelector('input[type=password],[role=dialog],form') ||
      /log ?in|sign ?up|create new account|تسجيل الدخول|إنشاء حساب/i.test(String(el.innerText || '').slice(0, 800));
    if (loginLike) { el.remove(); removed++; }
  }
  for (const el of [document.documentElement, document.body]) if (el) { el.style.overflow = 'auto'; el.style.position = 'static'; }
  return { clicked: clicked.slice(0, 10), removed };
}

function extractInPage(maxText) {
  const meta = n => document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.getAttribute('content') || '';
  const links = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.href;
    if (!/^https?:/i.test(href) || seen.has(href)) continue;
    seen.add(href);
    links.push({ href, text: String(a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80) });
    if (links.length >= 300) break;
  }
  const pw = [...document.querySelectorAll('input[type=password]')].some(x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const text = String(document.body?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  return {
    title: document.title || meta('og:title'),
    description: meta('og:description') || meta('description'),
    text: text.slice(0, maxText),
    links,
    passwordVisible: pw
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function readPage(url, includeHtml) {
  const started = Date.now();
  const browser = await getBrowser();
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,en;q=0.8' });
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', async req => {
      try {
        const u = new URL(req.url());
        if (u.protocol === 'data:' || u.protocol === 'blob:') return req.continue();
        if (!['http:', 'https:'].includes(u.protocol)) return req.abort();
        if (['image', 'media', 'font'].includes(req.resourceType())) return req.abort();
        if (!(await publicHost(u.hostname))) return req.abort('blockedbyclient');
        return req.continue();
      } catch { try { await req.abort(); } catch {} }
    });

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 5000 }).catch(() => {});
    const dismissed = { clicked: [], removed: 0 };
    const dismiss = async () => {
      const d = await page.evaluate(dismissInPage).catch(() => null);
      if (d) { dismissed.clicked.push(...d.clicked); dismissed.removed += d.removed; }
    };
    await page.keyboard.press('Escape').catch(() => {});
    await dismiss();
    for (let i = 0; i < 3 && Date.now() - started < TOTAL_BUDGET - 8000; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight)).catch(() => {});
      await sleep(700);
    }
    await dismiss();
    const data = await page.evaluate(extractInPage, MAX_TEXT);
    const finalUrl = page.url();
    const loginUrl = /\/(?:login|accounts\/login|checkpoint|signin|auth)(?:[/?.]|$)/i.test(new URL(finalUrl).pathname);
    const loginWall = loginUrl || (data.passwordVisible && data.text.length < 1500);
    const out = {
      ok: true, method: 'browser', url, finalUrl,
      status: response ? response.status() : null,
      title: data.title, description: data.description, text: data.text, links: data.links,
      loginWall, dismissed, ms: Date.now() - started
    };
    if (includeHtml) out.html = (await page.content()).slice(0, MAX_HTML);
    return out;
  } finally {
    await context.close().catch(() => {});
  }
}

export default async function handler(req, res) {
  if (guard(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'INVALID_JSON' }); }
  const url = await publicUrl(body && body.url);
  if (!url) return res.status(400).json({ error: 'INVALID_URL' });

  let timer;
  try {
    const result = await Promise.race([
      readPage(url, !!body.includeHtml),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('READ_TIMEOUT')), TOTAL_BUDGET + 5000); })
    ]);
    return res.status(200).json(result);
  } catch (e) {
    const message = String(e && e.message || e);
    if (/READ_TIMEOUT|Navigation timeout/i.test(message)) return res.status(504).json({ error: 'READ_TIMEOUT' });
    if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_BLOCKED|ERR_ABORTED|net::/i.test(message)) return res.status(502).json({ error: 'NAVIGATION_FAILED', message: message.slice(0, 200) });
    browserPromise = null; // browser may be broken; relaunch on next request
    return res.status(500).json({ error: 'READ_FAILED', message: message.slice(0, 200) });
  } finally {
    clearTimeout(timer);
  }
}
