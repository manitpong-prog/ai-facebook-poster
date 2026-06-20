export type PantipRiskWarning = {
  code: string;
  message: string;
};

const strongDramaKeywords = [
  "โกง",
  "หลอกลวง",
  "มิจฉาชีพ",
  "ฉ้อโกง",
  "ประจาน",
  "แฉ",
  "ฟ้อง",
  "คุกคาม",
  "ข่มขู่",
  "ล่วงละเมิด",
  "หมิ่นประมาท",
];

const sensitiveTopicKeywords = [
  "การเมือง",
  "พรรคการเมือง",
  "ศาสนา",
  "เชื้อชาติ",
  "โรค",
  "สุขภาพจิต",
  "ฆ่าตัวตาย",
  "ทำร้ายตัวเอง",
];

export function detectPantipRiskWarnings(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const warnings: PantipRiskWarning[] = [];

  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalizedText)) {
    warnings.push({
      code: "email_detected",
      message: "พบรูปแบบอีเมลในข้อความ กรุณาตรวจให้แน่ใจว่าไม่มีข้อมูลส่วนตัวในภาพหรือ caption",
    });
  }

  if (/(?:\+?66|0)\d[\d\s-]{7,}\d/.test(normalizedText)) {
    warnings.push({
      code: "phone_detected",
      message: "พบรูปแบบเบอร์โทรศัพท์ กรุณาข้ามกระทู้ที่มีข้อมูลส่วนตัว",
    });
  }

  const foundDramaKeywords = strongDramaKeywords.filter((keyword) =>
    normalizedText.includes(keyword),
  );

  if (foundDramaKeywords.length > 0) {
    warnings.push({
      code: "strong_drama_keywords",
      message: `พบคำเสี่ยงด้านดราม่า/ข้อกล่าวหา: ${foundDramaKeywords.join(", ")} กรุณาโพสต์เฉพาะกรณีที่ไม่พาดพิงบุคคลจริง`,
    });
  }

  const foundSensitiveKeywords = sensitiveTopicKeywords.filter((keyword) =>
    normalizedText.includes(keyword),
  );

  if (foundSensitiveKeywords.length > 0) {
    warnings.push({
      code: "sensitive_topic_keywords",
      message: `พบคำเกี่ยวกับประเด็นอ่อนไหว: ${foundSensitiveKeywords.join(", ")} แนะนำให้ข้ามหรือเขียนอย่างเป็นกลางมาก ๆ`,
    });
  }

  return warnings;
}
