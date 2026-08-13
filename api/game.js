module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_KEY missing' });

  const { players, categories, usedTopics } = req.body;
  const playerCount = players || 4;
  const cats = categories && categories.length ? categories : ['يوميات'];
  const used = usedTopics || [];

  const systemPrompt = `You are a game generator for "برا السالفة" (Out of Context) in Arabic.

Rules:
- Topics must be SLIGHTLY unusual but still relatable — from daily life but with a funny/weird twist
  Examples: "مطعم برجر يقدم الحلوى مع الوجبات", "مدرسة تدرس الرقص بدلاً من الرياضيات", "حفلة عيد ميلاد في المقبرة", "متجر ملابس يبيع الزي الرسمي فقط"
- The fake topic must be in the SAME category but a DIFFERENT specific thing
- Hints must be very close and subtle
- Avoid these used topics: ${used.join(', ') || 'none'}
- Output ONLY valid JSON

Output format:
{
  "topic": "الموضوع الحقيقي (غريب قليلاً لكن مألوف)",
  "fakeTopic": "الموضوع الخاطئ (نفس التصنيف لكن مختلف)",
  "category": "التصنيف",
  "spyIndex": 0,
  "hints": ["تلميح اللاعب 1", "تلميح اللاعب 2", ...]
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bra-alsalfa.vercel.app',
        'X-Title': 'Bra AlSalfa'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {role: 'system', content: systemPrompt},
          {role: 'user', content: 'Generate a game in Arabic. Categories: ' + cats.join(', ') + '. Players: ' + playerCount + '. Used before: ' + (used.join(', ') || 'none')}
        ],
        temperature: 0.95,
        max_tokens: 900
      })
    });

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '{}';

    let gameData;
    try {
      gameData = JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      gameData = match ? JSON.parse(match[0]) : null;
    }

    if (!gameData || !gameData.topic) {
      const pool = [
        {t:'مطعم برجر يقدم الحلوى مع كل وجبة', f:'مطعم بيتزا يقدم الشوربة مع كل وجبة', c:'مطاعم', h:['البرجر يأتي مع قطعة كيك','الصوص حلو المذاق','الزبائن يطلبون الحلو أولاً','القائمة مقلوبة']},
        {t:'مدرسة تدرس الرقص بدلاً من الرياضيات', f:'مدرسة تدرس الغناء بدلاً من العلوم', c:'مدرسة', h:['الفصل فيه مرآة كبيرة','الطلاب يرتدون أحذية خاصة','الامتحان عرض رقص','المدرس يصفق للإيقاع']},
        {t:'حفلة عيد ميلاد في المقبرة', f:'حفلة زفاف في المستشفى', c:'مناسبات', h:['البالونات سوداء اللون','الكعكة على شكل تابوت','الضيوف يرتدون أسود','الهدايا عبارة عن شموع']},
        {t:'متجر ملابس يبيع الزي الرسمي فقط', f:'متجر أحذية يبيع النعال فقط', c:'تسوق', h:['البنطالون ممنوع','الكل يرتدي بدلة','القمصان بيضاء حصراً','الأسعار غالية جداً']}
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      gameData = {
        topic: pick.t,
        fakeTopic: pick.f,
        category: pick.c,
        spyIndex: Math.floor(Math.random() * playerCount),
        hints: pick.h.slice(0, playerCount)
      };
    }

    while (gameData.hints.length < playerCount) {
      gameData.hints.push('تلميح إضافي عن ' + gameData.topic);
    }
    gameData.hints = gameData.hints.slice(0, playerCount);

    if (gameData.spyIndex === undefined || gameData.spyIndex < 0 || gameData.spyIndex >= playerCount) {
      gameData.spyIndex = Math.floor(Math.random() * playerCount);
    }

    res.status(200).json(gameData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
