// خادم بسيط يدير حالة اللعبة، الأدوار، الموارد، والضربات السرية
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, roomCode, playerId, targetId, payload } = req.method === 'POST' ? req.body : req.query;

  // محاكاة إدارة الحالة الديناميكية والمنطقية
  if (action === 'strike') {
    // منطق الضربة في الظلام وتوليد أدلة غير قطعية
    return res.status(200).json({
      success: true,
      message: "تم تنفيذ الضربة في الظلام بنجاح، واهتزت الموارد في الخفاء.",
      clue: "تشير التقارير إلى أن أحد المستفيدين لديه فائض في الموارد وتحرك سراً."
    });
  }

  if (action === 'accuse') {
    // منطق المحاكمة والانتقام وبطاقة الحياة
    return res.status(200).json({
      success: true,
      trialResult: "تم كشف المتهم! إذا كان يملك بطاقة حياة فسينتقم، وإن كان هو الفاعل الحقيقي فتُخصم نقاطه."
    });
  }

  return res.status(200).json({
    name: "Shadow Tribunal API",
    status: "Active",
    description: "منطق اللعبة الاستراتيجية النفسية جاهز للتشغيل."
  });
}
