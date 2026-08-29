// API Route for Secret Court Game (لعبة المحكمة السرية)
// Environment variable required on Vercel: OPENROUTER_KEY

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 1. Generate AI Clue (توليد الدليل السرّي / المضلل)
      if (action === 'generate_clue') {
        const clueData = await generateAiClue(body);
        return res.status(200).json(clueData);
      }

      // 2. Generate AI Major Event (توليد الحدث الهام)
      if (action === 'generate_event') {
        const eventData = await generateAiEvent(body);
        return res.status(200).json(eventData);
      }

      // 3. Resolve Court Voting & Penalties (حساب نتائج المحكمة والتصويت)
      if (action === 'resolve_vote') {
        const voteResult = resolveCourtVote(body);
        return res.status(200).json(voteResult);
      }
    }

    return res.status(400).json({ error: 'إجراء غير معروف أو طريقة طلب غير صالحة' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ في الخادم' });
  }
}

// Function to call OpenRouter API for Clue Generation
async function generateAiClue(data) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    // Fallback if key is missing in dev mode
    return {
      clue_text: "شوهدت تحركات مريبة حول رصيد أحد اللاعبين الأقوياء في ظلام الجولة.",
      target_player: data.framed_player || "مجهول",
      is_fake: data.is_manipulated || false
    };
  }

  const systemPrompt = `أنت راوي وأستاذ محكمة في لعبة خداع اجتماعي وسرد قصصي غامض.
قم بتوليد "دليل محكمة" قصير وغامض ودرامي للغاية (سطر واحد إلى سطرين باللغة العربية).

البيانات الممررة للجولة:
- سجل الأفعال الحقيقية: ${JSON.stringify(data.round_actions || [])}
- هل الدليل مضلل (كمين/تزوير)؟ ${data.is_manipulated ? 'نعم' : 'لا'}
- اللاعب المراد إدانته في الكمين: ${data.framed_player || 'لا يوجد'}
- الضحية في الخيانة: ${data.victim || 'لا يوجد'}
- الخائن المفبرك: ${data.betrayer || 'لا يوجد'}

القواعد:
1. إذا كان الدليل مضللاً (is_manipulated: true)، صغ الدليل بذكاء ليوجه الشكوك والاتهام نحو ${data.framed_player || 'لاعب بريء'} دون أن يكون فجاً.
2. إذا وجدت خيانة (betrayer & victim)، اذكر نصاً صريحاً أو تلميحاً قوياً مثل: "تمت خيانة ${data.victim} من قبل ${data.betrayer} وسُرقت منه نقاط".
3. أرجع الرد حصرياً بصيغة JSON بدون أي كلام إضافي بالشكل التالي:
{
  "clue_text": "نص الدليل العربي الغامض والدرامي",
  "target_player": "اسم المشتبه به الرئيسي",
  "is_fake": true/false
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bara-chi.vercel.app',
      'X-Title': 'Secret Court Game'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'ولّد الدليل لهذه الجولة الآن.' }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  });

  const result = await response.json();
  try {
    const content = result.choices[0].message.content;
    return JSON.parse(content);
  } catch (e) {
    return {
      clue_text: "أشارت وثائق المحكمة السرية إلى وجود مؤامرة تحاك في الخفاء لسرقة السمعة.",
      target_player: data.framed_player || "لاعب مجهول",
      is_fake: data.is_manipulated || false
    };
  }
}

// Function to call OpenRouter API for Event Generation
async function generateAiEvent(data) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return {
      description: "قرار طارئ من المحكمة العليا: فرض ضريبة طوارئ بمقدار 2 نقطة على صاحب أعلى رصيد!",
      action: "deduct",
      target: "highest_score",
      value: 2
    };
  }

  const systemPrompt = `أنت محكم الدولة العليا في لعبة "المحكمة السرية".
قم بتوليد "حدث هام مفاجئ" يؤثر على أرصدة اللاعبين (مثل: ضرائب، إعادة توزيع، مكافأة مظلوم، تضخم مالي، قلب السمعة).

بيانات اللاعبين الحالية: ${JSON.stringify(data.players || [])}

القواعد:
1. صغ نصاً عربياً حماسياً وسخرياً أو درامياً يصف قرار الدولة/المحكمة.
2. أرجع الرد حصرياً بصيغة JSON بالشكل التالي:
{
  "description": "النص الوصفي للحدث باللغة العربية",
  "action": "deduct" | "add" | "swap" | "bonus_all",
  "target": "highest_score" | "lowest_score" | "random" | "all",
  "value": عدد النقاط (مثال: 1 أو 2 أو 3)
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bara-chi.vercel.app',
      'X-Title': 'Secret Court Game'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'ولّد الحدث الهام لهذه الجولة.' }
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' }
    })
  });

  const result = await response.json();
  try {
    const content = result.choices[0].message.content;
    return JSON.parse(content);
  } catch (e) {
    return {
      description: "قرار طارئ من المحكمة العليا: تم خصم 2 نقطة سمعة من أعلى لاعب رصيداً لتكافؤ الفرص!",
      action: "deduct",
      target: "highest_score",
      value: 2
    };
  }
}

// Logic for Resolving Court Vote and Penalties
function resolveCourtVote(data) {
  const { accusedId, votes, players, trapperId, hostilesThisRound } = data;
  
  // Is the accused actually guilty of hostile actions this round?
  const isGuilty = hostilesThisRound.includes(accusedId);
  const accusedPlayer = players.find(p => p.id === accusedId);

  let updatedPlayers = JSON.parse(JSON.stringify(players));
  let logMessages = [];
  let compensationTotal = 0;

  if (isGuilty) {
    // Guilty: Deduct penalty from accused
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === accusedId) {
        p.score = Math.max(0, p.score - 3);
      }
      return p;
    });
    logMessages.push(`أدانت المحكمة المتهم (${accusedPlayer.name}) لثبوت التهمة عليه! تم خصم 3 نقاط من رصيده.`);
  } else {
    // Innocent: Trapper is immune to penalty when voting against framed victim!
    // All other voters who voted against innocent victim lose 1 point each -> given to victim!
    updatedPlayers = updatedPlayers.map(p => {
      const votedAgainstVictim = votes[p.id] === accusedId;
      const isTrapper = trapperId && (p.id === trapperId);

      if (votedAgainstVictim) {
        if (isTrapper) {
          logMessages.push(`اللاعب (${p.name}) صاحب الكمين حما نفسه من غرامة التصويت الخاطئ!`);
        } else {
          p.score = Math.max(0, p.score - 1);
          compensationTotal += 1;
        }
      }
      return p;
    });

    // Award compensation total to the innocent victim
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === accusedId) {
        p.score += compensationTotal;
      }
      return p;
    });

    logMessages.push(`ثبتت براءة المتهم (${accusedPlayer.name})! حصل على تعويض قدره ${compensationTotal} نقطة مخصومة من المصوتين ضده.`);
  }

  return {
    isGuilty,
    accusedName: accusedPlayer ? accusedPlayer.name : 'مجهول',
    compensationTotal,
    updatedPlayers,
    logMessages
  };
}
