const CARDS_DATABASE = {
  tier1: [
    { id: 'light_shield', name: 'درع خفيف', desc: 'يلغي خصم نقطة واحدة عند التعرض لهجوم' },
    { id: 'whisper', name: 'همسة سرية', desc: 'تتيح لك إرسال إشعار مموه للاعب آخر' },
    { id: 'scout', name: 'استكشاف', desc: 'يكشف رصيد عملات لاعب آخر' }
  ],
  tier4: [
    { id: 'mastermind', name: 'العقل المدبر', desc: 'تحويل صوت واحد من التصويت الجماعي لصالحك' },
    { id: 'sabotage', name: 'تخريب', desc: 'تجميد قدرات لاعب ومنعه من الشراء في الجولة القادمة' },
    { id: 'immunity', name: 'حصانة المحكمة', desc: 'إلغاء جميع الأصوات الموجهة ضدك في هذه الجولة' }
  ]
};

export default async function handler(req, res) {
  // استخدام معيار WHATWG URL الحديث لتفادي تحذير DeprecationWarning (DEP0169)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const currentUrl = new URL(req.url, `${protocol}://${req.headers.host}`);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body || {};

  try {
    switch (action) {
      case 'DEAL_INITIAL_CARDS': {
        const allCards = [...CARDS_DATABASE.tier1, ...CARDS_DATABASE.tier4];
        const card1 = allCards[Math.floor(Math.random() * allCards.length)];
        const card2 = allCards[Math.floor(Math.random() * allCards.length)];
        return res.status(200).json({ cards: [card1, card2] });
      }

      case 'BUY_CARD': {
        const { coins, tierCost } = payload || {};
        if (typeof coins !== 'number' || coins < tierCost) {
          return res.status(400).json({ error: 'رصيد العملات غير كافٍ!' });
        }
        const pool = tierCost === 1 ? CARDS_DATABASE.tier1 : CARDS_DATABASE.tier4;
        const randomCard = pool[Math.floor(Math.random() * pool.length)];
        return res.status(200).json({ card: randomCard, newCoins: coins - tierCost });
      }

      case 'PROCESS_VOTES': {
        const { votes } = payload || {}; // { voterId: targetId }
        const voteCounts = {};
        if (votes) {
          Object.values(votes).forEach(targetId => {
            voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
          });
        }

        let maxVotes = 0;
        let accusedPlayer = null;
        for (const [targetId, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) {
            maxVotes = count;
            accusedPlayer = targetId;
          }
        }
        return res.status(200).json({ accusedPlayer, totalVotes: maxVotes, summary: voteCounts });
      }

      case 'CHECK_BETRAYAL': {
        const { voterId, targetId, alliances } = payload || {};
        const isAllied = Array.isArray(alliances) && alliances.some(
          a => (a.p1 === voterId && a.p2 === targetId) || (a.p1 === targetId && a.p2 === voterId)
        );
        if (isAllied) {
          return res.status(200).json({
            betrayed: true,
            penaltyCoins: 2,
            message: 'لقد خنت حليفك! خُصمت منك عملتان كعقوبة خيانة.'
          });
        }
        return res.status(200).json({ betrayed: false });
      }

      case 'GENERATE_EVIDENCE': {
        const { roundNumber, roundActionsLog } = payload || {};
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
          return res.status(200).json({
            evidence: `[دليل افتراضي للجولة ${roundNumber}]: شوهد تحرك مشبوه في الخفاء وتم استخدام قدرات خفية تؤثر على المجريات.`
          });
        }

        const systemPrompt = `أنت قاضٍ ومحقق غامض في لعبة "المحكمة السرية". صغ دليلاً درامياً للجولة رقم ${roundNumber}.
قواعد صارمة:
1. لا تستخدم قالباً ثابتاً إطلاقاً (صغها كشهادة، تقرير جنائي، أو رسالة مسربة).
2. اعتمد كلياً على سجل الأحداث الحقيقية لهذه الجولة دون ذكر أسماء صريحة بل ألقاب وتلميحات.
3. اجعل النص قصيراً، غامضاً ومثيراً للشكوك.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `سجل أحداث الجولة:\n${(roundActionsLog || []).join('\n')}` }
            ]
          })
        });

        const aiData = await response.json();
        const evidence = aiData.choices?.[0]?.message?.content || "تعذر صياغة الدليل لهذه الجولة.";
        return res.status(200).json({ evidence });
      }

      default:
        return res.status(400).json({ error: 'إجراء غير معروف' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
