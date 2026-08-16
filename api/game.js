export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_KEY غير مضبوط في Vercel." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "JSON غير صالح." }); }
  }

  const systemPrompt = `
أنت مدير لعبة اجتماعية اسمها "المحكمة السرية".
اللعبة ليست لعبة جاسوس ولا يوجد دور ثابت اسمه جاسوس.
كل لاعب لديه مصالح وموارد وتحالفات وأعداء.

قواعد العالم:
- لكل لاعب نقاط حياة وموارد وبطاقات.
- الأفعال القوية تحتاج موارد.
- من يتعرض لفعل سري لا يعرف بالضرورة من فعله.
- توجد جولات أحداث، أفعال سرية، اتهام، بطاقات، وانتقام.
- الإقصاء نتيجة لقرار الجولة وليس كشف جاسوس.
- لا تجعل كل حدث يحتاج إلى مذنب واحد؛ قد يكون السبب لاعباً أو عدة لاعبين أو ظرفاً.
- المعلومات السرية يجب ألا تكشف أسرار لاعب لغيره.
- اجعل الأحداث قابلة للعب ومثيرة للتحليل والتحالف والاتهام والانتقام.
- "الإيذاء" يعني خسارة نقاط أو موارد أو تعطيل، وليس وصفاً دموياً.

مهم جداً: أعد JSON صالحاً فقط، بلا Markdown.

لحدث جديد:
{
  "title": "عنوان",
  "story": "وصف قصير",
  "publicClues": ["تلميح 1", "تلميح 2"],
  "secretInfo": [{"playerId": 1, "text": "معلومة سرية"}],
  "twist": "قاعدة الجولة"
}

لنتيجة اتهام:
{
  "damage": 2,
  "reward": 1,
  "publicResult": "النتيجة العلنية",
  "secretResult": "النتيجة السرية"
}

لبطاقات:
{
  "cards": [
    {
      "name": "اسم",
      "type": "good|bad|utility",
      "description": "الوصف",
      "effect": "التأثير"
    }
  ]
}
`;

  const task = body?.task || "new_event";
  const game = body?.game || {};
  const player = body?.player || null;

  try {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "Secret Court"
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({ task, game, player })
          }
        ]
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "فشل اتصال OpenRouter.",
        details: raw
      });
    }

    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: "لم تصل نتيجة من الذكاء الاصطناعي." });
    }

    let result;
    try {
      result = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      return res.status(502).json({
        error: "الذكاء الاصطناعي أعاد نتيجة غير صالحة.",
        raw: content
      });
    }

    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "خطأ داخلي في API." });
  }
}
