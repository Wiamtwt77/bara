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
- Topics must be from DAILY LIFE, familiar to everyone (school, restaurant, travel, work, family, shopping, weather, hobbies, movies, music, food, sports, etc.)
- The fake topic must be in the SAME category but a DIFFERENT specific thing
- Hints must be very close and subtle - the spy hint should align with fakeTopic without being obviously wrong
- Avoid these already-used topics: ${used.join(', ') || 'none'}
- Output ONLY valid JSON

Output format:
{
  "topic": "الموضوع الحقيقي (معروف ويومي)",
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

    // Fallback data
    if (!gameData || !gameData.topic) {
      const pool = [
        {t:'مطعم البرجر الشهير', f:'مطعم البيتزا الشهير', c:'مطاعم', h:['البرجر يُحضر باللحم المشوي','الصوص سرّ العائلة','البطاطس مقرمشة','الجبنة تذوب فوق اللحم']},
        {t:'امتحان الرياضيات الصعب', f:'امتحان اللغة العربية الصعب', c:'مدرسة', h:['المعادلات تحتاج تركيزاً','الآلة الحاسبة مسموحة','الوقت 90 دقيقة','الأسئلة مقالية']},
        {t:'رحلة البحر الأسبوعية', f:'رحلة البر الأسبوعية', c:'سفر', h:['الأمواج هادئة اليوم','الشمس ساطعة على الماء','الصيد متوقع','الغداء على متن القارب']},
        {t:'شراء ملابس العيد', f:'شراء أثاث المنزل', c:'تسوق', h:['المقاسات تختلف بين المحلات','التخفيضات مغرية','الألوان هذا الموسم زاهية','الدفع كان بالبطاقة']},
        {t:'مباراة كرة القدم', f:'مباراة كرة السلة', c:'رياضة', h:['الملعب ممتلئ بالجماهير','الحكم أعلن ركلة جزاء','التبديل في الدقيقة 70','الهدف الأخير في الوقت بدل الضائع']}
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
