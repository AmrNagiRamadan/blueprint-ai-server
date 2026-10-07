import { guard } from './_lib/guard.js';

const endpoint = 'https://api.openai.com/v1/responses';
const allowedModels = new Set(['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5', 'gpt-5-mini']);
// Credit: search runs on the cheap model with a small search context unless the owner opts in
// to a bigger one with OPENAI_SEARCH_MODEL (a saved client setting alone can't raise the cost).
export const CHEAP_SEARCH_MODEL = 'gpt-4.1-mini';
export function searchModel(requested, env = process.env) {
  if (env.OPENAI_SEARCH_MODEL) return env.OPENAI_SEARCH_MODEL;
  return requested === 'gpt-4.1-nano' ? requested : CHEAP_SEARCH_MODEL;
}

function publicUrl(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) ||
        u.username || u.password || !u.hostname.includes('.') ||
        /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/i.test(u.hostname)) return '';
    u.hash = '';
    return u.href;
  } catch { return ''; }
}

async function runSearch(key, model, input, maxTokens, toolType, signal) {
  const payload = {
    model, input,
    tools: [{ type: toolType, search_context_size: process.env.OPENAI_SEARCH_CONTEXT || 'low' }],
    tool_choice: 'required',
    max_output_tokens: maxTokens,
    store: false
  };
  if (toolType === 'web_search') payload.include = ['web_search_call.action.sources'];
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(payload),
    signal
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return { ok: false, status: upstream.status, message: String(data.error?.message || 'فشل بحث OpenAI').slice(0, 200) };
  }
  const output = Array.isArray(data.output) ? data.output : [];
  const calls = output.filter(x => x.type === 'web_search_call');
  const okCalls = calls.filter(x => x.status !== 'failed');
  const messages = output.filter(x => x.type === 'message');
  const contents = messages.flatMap(x => x.content || []);
  const annotations = contents.flatMap(x => x.annotations || []).filter(x => x.type === 'url_citation');
  const discovered = [...okCalls.flatMap(x => x.action?.sources || []), ...annotations];
  const sources = [...new Map(
    discovered.map(x => { const url = publicUrl(x.url); return [url, { url, title: String(x.title || '').slice(0, 160) }]; })
              .filter(([url]) => url)
  ).values()].slice(0, 60);
  const text = contents.filter(x => x.type === 'output_text').map(x => x.text || '').join('\n');
  return {
    ok: true, sources, text,
    annotations: annotations.map(a => ({ type: 'url_citation', url: a.url, title: a.title || '' })),
    diag: {
      tool: toolType,
      outputTypes: output.map(x => x.type),
      callStatuses: calls.map(x => x.status),
      actionKeys: calls.map(x => Object.keys(x.action || {}).join('/')),
      annotations: annotations.length,
      textLength: text.length
    }
  };
}

export default async function handler(req, res) {
  if (guard(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'SEARCH_KEY_MISSING' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'INVALID_JSON' }); }
  if (!body || typeof body.input !== 'string' || !body.input.trim() || body.input.length > 12000) {
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const model = searchModel(allowedModels.has(body.model) ? body.model : '');
  const maxTokens = Math.min(5000, Math.max(400, +body.max_output_tokens || 4000));
  const controller = new AbortController();
  // Must finish before Vercel's maxDuration (60s) kills the function.
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const attempts = [];
    for (const toolType of ['web_search', 'web_search_preview']) {
      const r = await runSearch(key, model, body.input, maxTokens, toolType, controller.signal);
      if (!r.ok) {
        attempts.push({ tool: toolType, upstreamStatus: r.status, message: r.message });
        // Only an unsupported-tool error is worth a second paid attempt with the preview tool.
        if (r.status === 400 && /tool|web_search/i.test(r.message)) continue;
        break;
      }
      attempts.push(r.diag);
      // A completed search without sources is an answer; repeating it with the preview tool doubles the cost.
      if (!r.sources.length) break;
      if (r.sources.length) {
        return res.status(200).json({
          output: [
            { type: 'web_search_call', status: 'completed', action: { sources: r.sources } },
            { type: 'message', content: [{ type: 'output_text', text: r.text, annotations: r.annotations }] }
          ],
          searchProvider: 'openai',
          searchTool: toolType,
          searched: true
        });
      }
    }
    return res.status(422).json({ error: 'SEARCH_SOURCES_MISSING', model, attempts });
  } catch (e) {
    return res.status(502).json({ error: e.name === 'AbortError' ? 'SEARCH_TIMEOUT' : 'SEARCH_FAILED' });
  } finally {
    clearTimeout(timer);
  }
}
