const endpoint = 'https://api.openai.com/v1/responses';
const allowedModels = new Set([
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5', 'gpt-5-mini'
]);

function publicUrl(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) ||
        u.username || u.password || !u.hostname.includes('.') ||
        /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/i.test(u.hostname)) return '';
    u.hash = '';
    return u.href;
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'SEARCH_KEY_MISSING' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'INVALID_JSON' });
  }

  if (!body || typeof body.input !== 'string' ||
      !body.input.trim() || body.input.length > 12000) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const model = allowedModels.has(body.model) ? body.model : 'gpt-4.1';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({
        model,
        input: body.input,
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        max_output_tokens: Math.min(5000, Math.max(400, +body.max_output_tokens || 4000)),
        store: false
      }),
      signal: controller.signal
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(502).json({
        error: 'SEARCH_UPSTREAM',
        upstreamStatus: upstream.status,
        message: String(data.error?.message || 'فشل بحث OpenAI').slice(0, 160)
      });
    }

    const calls = (data.output || [])
      .filter(x => x.type === 'web_search_call' && x.status !== 'failed');
    const messages = (data.output || []).filter(x => x.type === 'message');
    const annotations = messages
      .flatMap(x => x.content || [])
      .flatMap(x => x.annotations || [])
      .filter(x => x.type === 'url_citation');

    const discovered = [
      ...calls.flatMap(x => x.action?.sources || []),
      ...annotations
    ];
    const sources = [...new Map(
      discovered
        .map(x => {
          const url = publicUrl(x.url);
          return [url, { url, title: String(x.title || '').slice(0, 160) }];
        })
        .filter(([url]) => url)
    ).values()].slice(0, 60);

    if (!calls.length || !sources.length) {
      return res.status(422).json({ error: 'SEARCH_SOURCES_MISSING' });
    }

    const text = messages
      .flatMap(x => x.content || [])
      .filter(x => x.type === 'output_text')
      .map(x => x.text || '')
      .join('\n');

    return res.status(200).json({
      output: [
        { type: 'web_search_call', status: 'completed', action: { sources } },
        { type: 'message', content: [{ type: 'output_text', text }] }
      ],
      searchProvider: 'openai',
      searched: true
    });
  } catch (e) {
    return res.status(502).json({
      error: e.name === 'AbortError' ? 'SEARCH_TIMEOUT' : 'SEARCH_FAILED'
    });
  } finally {
    clearTimeout(timer);
  }
}
