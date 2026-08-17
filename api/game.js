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
أنت مدير أحداث لعبة "المحكمة السرية: الأدوار الملعونة".
هذه لعبة اجتماعية استراتيجية.

قواعد العالم:
- 6 أدوار سرية: المحقق (يجمع 3 أدلة)، القاتل (يقتل 2)، التاجر (يجمع 10 ذهب)، السياسي (يجمع 5 نفوذ)، المنشق (يبقى أخيراً)، الحارس (يحمي لاعباً).
- البطاقات: فعل (هجوم/علاج/سرقة/درع/كشف)، مورد (دليل/ذهب/نفوذ)، ملعونة (قنبلة/سم/لعنة).
- الحد: 3 بطاقات في اليد. القنبلة تنفجر إذا امتلأت اليد.
- السم يخسر 1 حياة كل جولة حتى يُستخدم.
- اللعنة تمنع السحب.

مهم جداً: أعد JSON صالحاً فقط، بلا Markdown.

لحدث جديد:
{
  "title": "عنوان",
  "story": "وصف قصير ومثير",
  "twist": "قاعدة الجولة الخاصة",
  "ban": "attack|attack_poison|none",
  "bonus": {"gold": 0, "influence": 0},
  "plague": false,
  "auction": false,
  "treasure": false,
  "revealBonus": false
}
`;

  const task = body?.task || "new_event";
  const game = body?.game || {};

  try {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.com",
        "X-Title": "Secret Court Cursed"
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ task, game }) }
        ]
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: "فشل اتصال OpenRouter.", details: raw });
    }

    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "لم تصل نتيجة من الذكاء الاصطناعي." });

    let result;
    try { result = typeof content === "string" ? JSON.parse(content) : content; }
    catch { return res.status(502).json({ error: "الذكاء الاصطناعي أعاد نتيجة غير صالحة.", raw: content }); }

    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "خطأ داخلي في API." });
  }
}
