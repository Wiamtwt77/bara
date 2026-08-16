export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type, payload } = req.body || {};
  const apiKey = process.env.OPENROUTER_GAME || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(200).json(getFallbackResponse(type, payload));
  }

  try {
    const prompt = buildPrompt(type, payload);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content ? content.match(/\{[\s\S]*\}/) : null;
    
    if (jsonMatch) {
      return res.status(200).json(JSON.parse(jsonMatch[0]));
    }
    throw new Error("Invalid AI response format");
  } catch (error) {
    return res.status(200).json(getFallbackResponse(type, payload));
  }
}

function buildPrompt(type, data) {
  if (type === 'event') {
    return `أنت مدير لعبة "المحكمة السرية". ولد حدثاً سياسياً للجولة ${data.round} بصيغة JSON فقط:
    {"title": "عنوان الحدث", "story": "قصة قصيرة مثيرة", "rule": "قاعدة خاصة لهذه الجولة", "publicClues": ["تلميح 1", "تلميح 2"]}`;
  }
  if (type === 'trial') {
    const actionsSummary = (data.secretActions || []).map(a => `اللاعب ${a.actorId} نفذ فعل: ${a.action} على الهدف ${a.targetId || 'لا يوجد'}`).join(", ");
    return `أنت محكمة الظلال. المتهم الرئيسي هو ${data.accusedName} وحصل على ${data.votesCount} أصوات. سجل الأفعال السرية والأسرار لهذه الجولة هي: [${actionsSummary}]. ولد نتيجة محاكمة مبنية على هذه الأفعال بدقة بصيغة JSON فقط:
    {"verdict": "acquit|light|heavy|deal", "story": "قصة محاكمة درامية تربط بين أصوات المحكمة والأفعال السرية السابقة", "message": "رسالة النتيجة والعقاب", "effects": {"hp": 0, "influence": 0, "reputation": 0}}`;
  }
  if (type === 'cards') {
    return `ولد 3 بطاقات جماعية استراتيجية بصيغة JSON فقط:
    {"cards": [{"name": "اسم", "type": "good|bad|neutral", "description": "وصف", "effect": {"hp":0,"influence":0,"reputation":0}}]}`;
  }
  return "{}";
}

function getFallbackResponse(type, data) {
  if (type === 'event') {
    return {
      title: "أزمة الخزينة الكبرى",
      story: "انتشرت شائعات في أروقة المحكمة عن تلاعب بالموارد، وبدأ الشك يتسلل بين الحلفاء.",
      rule: "تتضاعف تكلفة الأفعال السرية في هذه الجولة.",
      publicClues: ["شوهد أحد الأعضاء يحمل حقيبة ذهب سراً", "تم رصد حركة غير معتادة قرب السجن المركزي"]
    };
  }
  if (type === 'trial') {
    return {
      verdict: "light",
      story: `وقفت المحكمة طويلاً أمام الأدلة التي أُدين بها ${data?.accusedName || "المتهم"}، وتم مطابقة أفعاله السرية مع الشكوك الموجهة ضده.`,
      message: "ثبتت عليه الإدانة وتم خصم من رصيده.",
      effects: { hp: -2, influence: 0, reputation: -5 }
    };
  }
  if (type === 'cards') {
    return {
      cards: [
        { name: "عفو ملكي", type: "good", description: "يستعيد الجميع 2 نقطة حياة.", effect: { hp: 2 } },
        { name: "ضريبة الطمع", type: "bad", description: "كل من يملك أكثر من 5 نفوذ يخسر 2.", effect: { influence: -2 } },
        { name: "صمت الحكماء", type: "neutral", description: "لا شيء يترتب على هذه البطاقة.", effect: {} }
      ]
    };
  }
  return {};
}
