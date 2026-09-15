// Blueprint OS — AI Proxy (Vercel serverless function) — نسخة OpenAI
// بيقف بين الأداة و OpenAI. المفتاح متخبّي هنا في Environment Variable (مش في الكود).
// المسار: POST /api/ai   body: { messages, model?, max_tokens?, enable_search? }
//
// مهم: البحث الحي (enable_search) مش متاح في Chat Completions العادي عند OpenAI —
// لازم يتعمل عن طريق Responses API (/v1/responses) مع أداة web_search.
// عشان كده الدالة دي بتحوّل تلقائيًا بين الاتنين حسب لو الأداة طلبت بحث ولا لأ،
// وبترجّع الرد دايمًا بنفس شكل chat/completions اللي الأداة (Blueprint_OS.html) متوقعاه —
// يعني مفيش أي تعديل مطلوب في ملف الأداة نفسه.

export default async function handler(req, res) {
  // CORS — نسمح للأداة تكلّم السيرفر ده
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST' }); return; }

  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) { res.status(500).json({ error: 'OPENAI_API_KEY مش متظبط في إعدادات Vercel' }); return; }

  // الموديلات الافتراضية — تقدر تغيّرهم من غير ما تلمس الكود عن طريق Environment Variables اختيارية:
  // OPENAI_MODEL (للمكالمات العادية) و OPENAI_SEARCH_MODEL (لما البحث الحي مفعّل)
  const NORMAL_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const SEARCH_MODEL = process.env.OPENAI_SEARCH_MODEL || 'gpt-4o';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const maxTokens = body.max_tokens || 1200;
    const wantsSearch = !!body.enable_search;

    if (wantsSearch) {
      // ===== مسار البحث الحي: Responses API + أداة web_search =====
      const sys = messages.find(m => m.role === 'system');
      const rest = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      const payload = {
        model: SEARCH_MODEL,
        input: rest,
        tools: [{ type: 'web_search' }],
        max_output_tokens: Math.max(maxTokens, 2000), // البحث محتاج مساحة أكبر عشان يفكر ويلخّص النتائج
      };
      if (sys) payload.instructions = sys.content;

      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { res.status(r.status).json(data); return; }

      // نطلّع النص من شكل رد Responses API (مختلف عن chat/completions) ونعيد تغليفه بنفس الشكل المتوقع
      let text = '';
      if (typeof data.output_text === 'string' && data.output_text) {
        text = data.output_text;
      } else if (Array.isArray(data.output)) {
        const msg = data.output.find(o => o.type === 'message');
        const part = msg && Array.isArray(msg.content) ? msg.content.find(c => c.type === 'output_text') : null;
        text = part ? part.text : '';
      }
      res.status(200).json({ choices: [{ message: { role: 'assistant', content: text } }] });
      return;
    }

    // ===== مسار عادي (من غير بحث): Chat Completions زي المعتاد =====
    const payload = {
      model: (body.model && /^(gpt|o[134])/i.test(body.model)) ? body.model : NORMAL_MODEL,
      max_completion_tokens: maxTokens, // max_tokens اتعمله deprecate عند OpenAI — دي الصيغة الحالية
      messages,
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
