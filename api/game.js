export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_KEY غير مضبوط." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "JSON غير صالح." }); } }

  const systemPrompt = `
أنت مدير أحداث لعبة "المحكمة السرية V2 — أثر الشبهة".
نظام الشبهة: كل فعل خطير يرفع شبهة اللاعب (+1 هجوم، +1 سرقة، +2 قتل، −1 علاج، −1 درع).
الشبهة مرئية للجميع. الاتهام يكلّف شبهة (1 عادي، 3 قوي). الفضح النهائي: كل الشبهة = ضرر.
بطاقات جديدة: 📋 تتبع (+2 شبهة للهدف)، 🔑 مفتاح (−2 شبهة)، 🤝 شراكة (−1/−1)، 🎫 إعفاء (+2 شبهة لك).
إعادة JSON صالحاً فقط:
{ "title": "...", "story": "...", "twist": "...", "ban": "atk_pois|none", "susA": 0, "susR": 0, "noG": false, "panic": false, "noS": false }
`;

  const task = body?.task || "new_event";
  try {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://vercel.com", "X-Title": "Secret Court V2" },
      body: JSON.stringify({ model, temperature: 0.85, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: JSON.stringify({ task, game: body?.game || {} }) }] })
    });
    const raw = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: "فشل الاتصال.", details: raw });
    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "لا نتيجة." });
    let result; try { result = typeof content === "string" ? JSON.parse(content) : content; } catch { return res.status(502).json({ error: "نتيجة غير صالحة.", raw: content }); }
    return res.status(200).json({ ok: true, result });
  } catch (e) { console.error(e); return res.status(500).json({ error: "خطأ داخلي." }); }
}
