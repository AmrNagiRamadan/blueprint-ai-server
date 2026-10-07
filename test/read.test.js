// Run: CHROME_PATH=/path/to/chromium npm test
// Serves local fixture pages and calls the /api/read handler directly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.BLUEPRINT_TEST_ALLOW_HOSTS = '127.0.0.1';
const { default: handler } = await import('../api/read.js');
const guardMod = await import('../api/_lib/guard.js');

const pages = {
  '/login-wall': `<!doctype html><html><head><title>Clinic Page</title></head><body>
    <main><h1>عيادة الابتسامة</h1><p>${'خدمات تقويم وزراعة أسنان في المهندسين. '.repeat(20)}</p>
    <a href="https://www.facebook.com/smileclinic">Facebook</a></main>
    <div id="wall" role="dialog" style="position:fixed;inset:0;background:#fff;z-index:99">
      <button aria-label="Close" onclick="document.getElementById('wall').remove()">x</button>
      <form><input type="password"></form><p>Log in to continue</p></div></body></html>`,
  '/hard-wall': `<!doctype html><html><head><title>Log in</title></head><body>
    <form><input name="u"><input type="password"></form></body></html>`,
  '/redirect-private': ''
};

let server, base;
before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/redirect-private') { res.writeHead(302, { Location: 'http://10.0.0.1/' }); return res.end(); }
    if (!(req.url in pages)) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pages[req.url]);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

function call(body, headers = {}) {
  return new Promise(resolve => {
    const res = { code: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; },
      json(d) { resolve({ code: this.code, body: d }); }, end() { resolve({ code: this.code }); } };
    handler({ method: 'POST', headers, body }, res);
  });
}

test('closes a dismissible login dialog and returns page text + links', async () => {
  const r = await call({ url: base + '/login-wall', includeHtml: true });
  assert.equal(r.code, 200);
  assert.match(r.body.text, /عيادة الابتسامة/);
  assert.equal(r.body.loginWall, false);
  assert.ok(r.body.dismissed.clicked.includes('Close') || r.body.dismissed.removed > 0);
  assert.ok(r.body.links.some(l => l.href === 'https://www.facebook.com/smileclinic'));
  assert.match(r.body.html, /<html/);
});

test('reports a wall it cannot close instead of pretending it read the page', async () => {
  const r = await call({ url: base + '/hard-wall' });
  assert.equal(r.code, 200);
  assert.equal(r.body.loginWall, true);
});

test('rejects private and malformed URLs', async () => {
  assert.equal((await call({ url: 'http://169.254.169.254/latest' })).code, 400);
  assert.equal((await call({ url: 'file:///etc/passwd' })).code, 400);
  assert.equal((await call({ url: 'not a url' })).code, 400);
});

test('does not follow redirects into private networks', async () => {
  const r = await call({ url: base + '/redirect-private' });
  assert.notEqual(r.code, 200);
});

test('token is enforced only when BLUEPRINT_TOKEN is set', async () => {
  process.env.BLUEPRINT_TOKEN = 'secret';
  try {
    assert.equal(guardMod.authorized({ headers: {} }), false);
    assert.equal(guardMod.authorized({ headers: { 'x-blueprint-token': 'secret' } }), true);
    assert.equal((await call({ url: base + '/login-wall' })).code, 401);
  } finally { delete process.env.BLUEPRINT_TOKEN; }
  assert.equal(guardMod.authorized({ headers: {} }), true);
});

// The handler keeps one warm browser between requests (like on Vercel); let the process exit anyway.
after(() => { setTimeout(() => process.exit(0), 200).unref(); });
