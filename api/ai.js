// Blueprint OS — AI Proxy (Vercel serverless function)
// بيقف بين الأداة و Qwen. المفتاح متخبّي هنا في Environment Variable (مش في الكود).
// المسار: POST /api/ai   body: { messages, model?, max_tokens?, enable_search? }

export default async function handler(req, res) {
  // CORS — نسمح للأداة تكلّم السيرفر ده
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST' }); return; }

  const API_KEY = process.env.QWEN_API_KEY;
  const ENDPOINT = process.env.QWEN_ENDPOINT ||
    'https://ws-o9s20r2sxw2n4cgk.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';

  if (!API_KEY) { res.status(500).json({ error: 'QWEN_API_KEY مش متظبط في إعدادات Vercel' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const payload = {
      model: body.model || 'qwen-plus',
      max_tokens: body.max_tokens || 1200,
      messages: body.messages || [],
    };
    if (body.enable_search) payload.enable_search = true;

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
