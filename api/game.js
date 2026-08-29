const CARDS_DATABASE = {
  tier1: [
    { id: 'light_shield', name: '🛡️ درع خفيف', desc: 'يلغي خصم نقطة واحدة عند التعرض لاتهمام' },
    { id: 'whisper', name: '🗣️ همسة سرية', desc: 'تكشف تحرك لاعب واحد في الجولة' },
    { id: 'scout', name: '🔍 استكشاف', desc: 'يكشف رصيد عملات لاعب آخر' },
    { id: 'pickpocket', name: '🤌 سرقة خفيفة', desc: 'سرقة عملة واحدة من لاعب آخر' },
    { id: 'disguise', name: '🎭 تنكر', desc: 'إخفاء تحركك القادم من سجل العلن' },
    { id: 'rumor', name: '💬 إشاعة مضللة', desc: 'إضافة معلومات مضللة في الدليل' }
  ],
  tier4: [
    { id: 'mastermind', name: '🧠 العقل المدبر', desc: 'تحويل صوت واحد من التصويت الجماعي لصالحك' },
    { id: 'sabotage', name: '⚡ تخريب شامل', desc: 'تجميد قدرات لاعب ومنعه من الشراء للجولة القادمة' },
    { id: 'immunity', name: '🏛️ حصانة المحكمة', desc: 'إلغاء جميع الأصوات الموجهة ضدك في هذه الجولة' },
    { id: 'grand_betrayal', name: '🗡️ خيانة كبرى', desc: 'سرقة 3 عملات من حليفك وإلغاء الحلف فوراً' },
    { id: 'coup', name: '💥 انقلاب', desc: 'تحويل العقوبة القادمة لأكثر لاعب صوّت ضدك' }
  ]
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, payload } = body;

    switch (action) {
      // 1. بداية اللعبة: توزيع بطاقتين عشوائيتين كلياً
      case 'DEAL_INITIAL_CARDS': {
        const allCards = [...CARDS_DATABASE.tier1, ...CARDS_DATABASE.tier4];
        const card1 = allCards[Math.floor(Math.random() * allCards.length)];
        const card2 = allCards[Math.floor(Math.random() * allCards.length)];
        return res.status(200).json({ cards: [card1, card2] });
      }

      // 2. الشراء العشوائي حصراً (تكلفة 1 أو 4 عملات)
      case 'BUY_CARD': {
        const { coins, tierCost } = payload || {};
        if (typeof coins !== 'number' || coins < tierCost) {
          return res.status(400).json({ error: 'رصيد العملات غير كافٍ!' });
        }
        const pool = tierCost === 1 ? CARDS_DATABASE.tier1 : CARDS_DATABASE.tier4;
        const drawnCard = pool[Math.floor(Math.random() * pool.length)];
        return res.status(200).json({ card: drawnCard, newCoins: coins - tierCost });
      }

      // 3. معالجة التصويت الجماعي وفحص الخيانة بين اللاعبين الحقيقيين
      case 'PROCESS_COLLECTIVE_VOTES': {
        const { votes, alliances } = payload || {}; 
        const voteCounts = {};
        const betrayals = [];

        if (votes && typeof votes === 'object') {
          Object.entries(votes).forEach(([voter, target]) => {
            if (!target) return;
            voteCounts[target] = (voteCounts[target] || 0) + 1;

            // فحص الخيانة التلقائي إذا صوّت لاعب ضد حليفه النشط
            const isBetrayal = (alliances || []).some(
              a => (a.p1 === voter && a.p2 === target) || (a.p1 === target && a.p2 === voter)
            );

            if (isBetrayal) {
              betrayals.push({
                betrayer: voter,
                victim: target,
                penaltyCoins: 2,
                message: `⚠️ خيانة! قام اللاعب [${voter}] بالتصويت ضد حليفه [${target}]. تُخصم منه 2 عملات وينتهي التحالف.`
              });
            }
          });
        }

        let maxVotes = 0;
        let accusedPlayer = null;
        for (const [target, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) {
            maxVotes = count;
            accusedPlayer = target;
          }
        }

        return res.status(200).json({
          accusedPlayer,
          totalVotes: maxVotes,
          summary: voteCounts,
          betrayals
        });
      }

      // 4. توليد الدليل بالذكاء الاصطناعي بناءً على أحداث الجولة الحقيقية
      case 'GENERATE_EVIDENCE': {
        const { roundNumber, roundActionsLog } = payload || {};
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
          return res.status(200).json({
            evidence: `[دليل قضائي للجولة ${roundNumber}]: شوهدت تحركات سرية وصرف للعملات في الخفاء. تحالفات عقدت بعيداً عن الأعين، والأنظار تتجه نحو جلسة التصويت القادمة.`
          });
        }

        const systemPrompt = `أنت قاضٍ ومحقق غامض في لعبة "المحكمة السرية". صغ "دليل الجولة" رقم ${roundNumber}.
قواعد صارمة:
1. لا تستخدم قالباً ثابتاً إطلاقاً (مرة صغها كشهادة مسربة، مرة كتقرير جنائي، مرة كرسالة غامضة).
2. اعتمد كلياً على سجل الأحداث الحقيقية المرفق للجولة.
3. لا تذكر أسماء صريحة إطلاقاً بل أشار للأحداث بألقاب وتلميحات (مثال: "صاحب الصفقة الكبرى"، "من طلب حلفاً سرياً"، "اللاعب الذي ادخر نفوذه").
4. اجعل الفقرة غامضة، قصيرة (3-4 أسطر)، وتثير الشكك بين جميع الحاضرين.`;

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
              { role: 'user', content: `سجل أحداث الجولة الحقيقية:\n${(roundActionsLog || []).join('\n')}` }
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
