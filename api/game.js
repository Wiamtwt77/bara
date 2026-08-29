// قاعدة بيانات واسعة للبطاقات مقسمة للفئتين (1 عملة و 4 عملات)
const CARDS_DATABASE = {
  tier1: [
    { id: 'light_shield', name: '🛡️ درع خفيف', desc: 'يلغي خصم نقطة واحدة عند التعرض لاتهام' },
    { id: 'whisper', name: '🗣️ همسة سرية', desc: 'تكشف حقيقة تحرك لاعب واحد في الجولة' },
    { id: 'scout', name: '🔍 استكشاف', desc: 'يكشف رصيد عملات لاعب آخر' },
    { id: 'pickpocket', name: '🤌 سرقة خفيفة', desc: 'سرقة عملة واحدة من لاعب عشوائي' },
    { id: 'disguise', name: '🎭 تنكر', desc: 'إخفاء تحركك القادم من السجل العلن' },
    { id: 'rumor', name: '💬 إشاعة مضللة', desc: 'تضيف تلميحاً مزيفاً في دليل الذكاء الاصطناعي' }
  ],
  tier4: [
    { id: 'mastermind', name: '🧠 العقل المدبر', desc: 'تحويل صوت واحد من التصويت الجماعي لصالحك' },
    { id: 'sabotage', name: '⚡ تخريب شامل', desc: 'تجميد قدرات لاعب ومنعه من الشراء في الجولة القادمة' },
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
      // 1. بدء اللعبة وتوزيع بطاقتين عشوائيتين كلياً
      case 'DEAL_INITIAL_CARDS': {
        const allCards = [...CARDS_DATABASE.tier1, ...CARDS_DATABASE.tier4];
        const random1 = allCards[Math.floor(Math.random() * allCards.length)];
        let random2 = allCards[Math.floor(Math.random() * allCards.length)];
        return res.status(200).json({ cards: [random1, random2] });
      }

      // 2. شراء عشوائي حصراً (بـ 1 أو 4 عملات) دون إمكانية اختيار البطاقة
      case 'BUY_CARD': {
        const { coins, tierCost } = payload || {};
        if (typeof coins !== 'number' || coins < tierCost) {
          return res.status(400).json({ error: 'رصيد العملات غير كافٍ!' });
        }
        const pool = tierCost === 1 ? CARDS_DATABASE.tier1 : CARDS_DATABASE.tier4;
        const drawnCard = pool[Math.floor(Math.random() * pool.length)];
        return res.status(200).json({ card: drawnCard, newCoins: coins - tierCost });
      }

      // 3. التصويت الجماعي الموحد وفحص الخيانة التلقائي
      case 'PROCESS_COLLECTIVE_VOTES': {
        const { votes, alliances } = payload || {}; // votes = { "اللاعب 1": "سارة", "سارة": "محمد", ... }
        const voteCounts = {};
        const betrayals = [];

        if (votes) {
          Object.entries(votes).forEach(([voter, target]) => {
            // حساب الأصوات
            voteCounts[target] = (voteCounts[target] || 0) + 1;

            // فحص الخيانة البرمجي: إذا صوّت لاعب ضد حليفه النشط
            const activeAllianceIndex = (alliances || []).findIndex(
              a => (a.p1 === voter && a.p2 === target) || (a.p1 === target && a.p2 === voter)
            );

            if (activeAllianceIndex !== -1) {
              betrayals.push({
                betrayer: voter,
                victim: target,
                penaltyCoins: 2,
                message: `⚠️ خيانة! صوّت [${voter}] ضد حليفه [${target}]. تم خصم 2 عملة وإلغاء التحالف.`
              });
            }
          });
        }

        // تحديد المتهم بالأغلبية
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

      // 4. توليد الدليل بالذكاء الاصطناعي بناءً على أحداث الجولة الواقعية (بدون قالب ثابت)
      case 'GENERATE_EVIDENCE': {
        const { roundNumber, roundActionsLog } = payload || {};
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
          return res.status(200).json({
            evidence: `[دليل استثماري افتراضي للجولة ${roundNumber}]: رُصدت حركة تحالفات سرية وصرف للعملات في الخفاء. أحد الحاضرين يخطط لضربة قاضية في التصويت المقبل!`
          });
        }

        const systemPrompt = `أنت قاضٍ ومحقق درامي غامض في لعبة "المحكمة السرية". مهمتك صياغة "دليل المحكمة" للجولة رقم ${roundNumber}.

قواعد صارمة جداً:
1. يمنع استخدام القوالب الثابتة أو الصيغ المكررة. صغ النص مرة كتقرير جنائي مسرب، ومرة كشهادة شاهد عيان، ومرة كرسالة سريعة من مجهول.
2. اعتمِد تماماً على سجل الأحداث الحقيقية للجولة المرفق لك.
3. لا تذكر أسماء اللاعبين الصريحة مطلقاً! استخدم بدلاً منها ألقاباً أو إشارات للتحركات (مثل: "صاحب الصفقة الصغرى"، "من أنفق 4 عملات للحصول على نفوذ"، "الطرف الذي وافق على الحلف الخفي").
4. اجعل الفقرة قصيرة (3-5 أسطر)، مليئة بالأجواء الغامضة، وتثير الشكوك بين الجميع.`;

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
