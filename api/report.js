import { chromium as playwright } from 'playwright-core';
import chromium from '@sparticuz/chromium';
import { guard } from './_lib/guard.js';

const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function clean(value, limit = 3000) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').slice(0, limit);
}

function parseBody(req) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const slides = Array.isArray(body.slides) ? body.slides.slice(0, 12) : [];
  if (slides.length !== 12) throw new Error('التقرير لازم يحتوي على 12 سلايدًا');
  return {
    title: clean(body.title, 180),
    client: { name: clean(body.client?.name, 140), specialty: clean(body.client?.specialty, 180) },
    slides: slides.map((slide, index) => ({
      number: Number(slide.number) || index + 1,
      title: clean(slide.title, 140),
      headline: clean(slide.headline, 500),
      body: clean(slide.body, 5000),
      kind: ['observed', 'inference', 'proposal', 'unverified'].includes(slide.kind) ? slide.kind : 'proposal'
    }))
  };
}

function reportHTML(report) {
  const kind = { observed: 'مرصود', inference: 'قراءتنا', proposal: 'مقترح Techno Team', unverified: 'غير متحقق' };
  const pages = report.slides.map(slide => `<section class="page ${esc(slide.kind)}">
    <div class="glow"></div>
    <header><div><span class="pill">${esc(kind[slide.kind] || slide.kind)}</span><h2>${esc(slide.title)}</h2></div><strong>${String(slide.number).padStart(2, '0')}</strong></header>
    <main><h1>${esc(slide.headline)}</h1><div class="body">${esc(slide.body).replace(/\n/g, '<br>')}</div></main>
    <footer><b>Techno Team</b><span>${esc(report.client.name)}</span></footer>
  </section>`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
  @page{size:13.333in 7.5in;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;font-family:"Noto Sans Arabic","Tahoma","Arial",sans-serif}.page{width:13.333in;height:7.5in;page-break-after:always;padding:.62in .72in;color:#fff;background:linear-gradient(145deg,#0a2144,#123d75);display:flex;flex-direction:column;position:relative;overflow:hidden}.page.observed{background:linear-gradient(145deg,#092b39,#126784)}.page.proposal{background:linear-gradient(145deg,#23165b,#3f2f92)}.page.unverified{background:linear-gradient(145deg,#4d3510,#8a621c)}.glow{position:absolute;width:5in;height:5in;border-radius:50%;background:rgba(75,151,248,.16);left:-1.8in;bottom:-3in}header{display:flex;justify-content:space-between;align-items:flex-start;position:relative}header h2{font-size:18px;margin:13px 0 0;color:#d5e5ff}.pill{display:inline-block;padding:7px 13px;border:1px solid rgba(255,255,255,.23);background:rgba(255,255,255,.12);border-radius:99px;font-size:12px;font-weight:700}header strong{font-size:58px;line-height:1;opacity:.22}main{position:relative;margin-top:.55in;max-width:10.5in}h1{font-size:39px;line-height:1.45;margin:0 0 .28in;font-weight:800}.body{font-size:17px;line-height:2;max-width:10.2in}footer{position:relative;margin-top:auto;border-top:1px solid rgba(255,255,255,.19);padding-top:.18in;display:flex;justify-content:space-between;font-size:12px;color:#dbe8ff}footer b{letter-spacing:.5px}.page:last-child{page-break-after:auto}</style></head><body>${pages}</body></html>`;
}

export default async function handler(req, res) {
  if (guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let browser;
  try {
    const report = parseBody(req);
    browser = await playwright.launch({
      args: chromium.args.filter(arg => arg !== '--single-process'),
      executablePath: await chromium.executablePath(),
      headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.setContent(reportHTML(report), { waitUntil: 'load', timeout: 30000 });
    const pdf = await page.pdf({ printBackground: true, width: '13.333in', height: '7.5in', margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    const slug = (report.client.name || 'Client').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'Client';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Techno_Team_Report_${slug}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(pdf));
  } catch (error) {
    return res.status(500).json({ error: String(error?.message || error) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
