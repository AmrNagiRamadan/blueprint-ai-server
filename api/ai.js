// Blueprint OS — AI Proxy (Vercel serverless) — نسخة OpenAI
// بيقف بين الأداة و OpenAI. المفتاح متخبّي هنا في Environment Variable (مش في الكود).
// المسار: POST /api/ai   body: { model, messages, max_tokens?, ... }

export default async function handler(req, res) {
  // CORS — نسمح للأداة تكلّم السيرفر ده
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST' }); return; }

  const API_KEY = process.env.OPENAI_API_KEY;
  const ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1';

  if (!API_KEY) { res.status(500).json({ error: 'OPENAI_API_KEY مش متظبط في إعدادات Vercel' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // بنمرّر اللي الأداة بعتته زي ما هو (model, messages, max_tokens, ...)
    // enable_search بتاع Qwen مش موجود في OpenAI فبنشيله لو جه.
    const payload = {
      model: body.model || 'gpt-4o-mini',
      max_tokens: body.max_tokens || 1200,
      messages: body.messages || [],
    };
    if (typeof body.temperature === 'number') payload.temperature = body.temperature;
    if (body.response_format) payload.response_format = body.response_format;

    const r = await fetch(ENDPOINT.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
