import { GoogleGenAI } from "@google/genai";

import type { writingProfiles } from "@/db/schema";

type WritingProfile = typeof writingProfiles.$inferSelect;

type GenerateFacebookPostInput = {
  topic: string;
  styleOverride?: string | null;
  writingProfile?: Pick<
    WritingProfile,
    | "name"
    | "tone"
    | "targetAudience"
    | "rules"
    | "favoriteWords"
    | "bannedWords"
    | "callToAction"
    | "samplePosts"
    | "maxWords"
  > | null;
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type GenerateFacebookPostResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  return new GoogleGenAI({ apiKey });
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
}

function cleanGeneratedText(text: string) {
  return text
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function getCtaVariationHint() {
  const hints = [
    "ปิดท้ายด้วยคำถามชวนคอมเมนต์",
    "ปิดท้ายด้วยคำชวนลองนำไปปรับใช้",
    "ปิดท้ายด้วยคำชวนสังเกตปัญหาของตัวเอง",
    "ปิดท้ายด้วยคำชวนทักคุยแบบนุ่ม ๆ",
    "ปิดท้ายด้วยประโยคชวนคิด ไม่ต้องขายของ",
  ];

  return hints[Math.floor(Math.random() * hints.length)];
}

function buildPrompt(input: GenerateFacebookPostInput) {
  const profile = input.writingProfile;
  const maxWords = profile?.maxWords ?? 300;
  const ctaVariationHint = getCtaVariationHint();

  return `คุณคือผู้ช่วยเขียนโพสต์ Facebook Page ภาษาไทย

งานของคุณ:
เขียนโพสต์ Facebook จากหัวข้อที่ผู้ใช้ให้มา โดยให้เหมือนเจ้าของเพจเขียนเอง อ่านง่าย และเหมาะกับมือถือ

หัวข้อโพสต์:
${input.topic}

สไตล์การเขียนหลัก:
- ชื่อสไตล์: ${profile?.name || "สไตล์หลักของฉัน"}
- โทนภาษา: ${profile?.tone || "เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง"}
- กลุ่มเป้าหมาย: ${profile?.targetAudience || "คนอ่าน Facebook Page ทั่วไป"}
- กติกาการเขียน: ${profile?.rules || "ย่อหน้าสั้น อ่านง่าย ไม่ขายของแรง ไม่ใช้คำเกินจริง"}
- คำที่ชอบใช้: ${profile?.favoriteWords || ""}
- คำที่ไม่อยากให้ใช้: ${profile?.bannedWords || ""}
- แนวทาง CTA / ตัวอย่าง CTA: ${profile?.callToAction || "ให้ปิดท้ายแบบนุ่ม ๆ และเข้ากับเนื้อหา"}
- ตัวอย่างโพสต์เก่า/แนวทางเพิ่มเติม: ${profile?.samplePosts || "ไม่มี"}

คำสั่งเฉพาะโพสต์นี้:
${input.styleOverride || "ไม่มี"}

ข้อกำหนดสำคัญ:
1. เขียนเป็นภาษาไทยเท่านั้น
2. ความยาวไม่เกิน ${maxWords} คำ
3. แบ่งย่อหน้าสั้น อ่านง่ายบนมือถือ
4. ไม่ต้องใส่หัวข้ออธิบาย เช่น “โพสต์:” หรือ “นี่คือโพสต์”
5. ไม่ต้องใส่ markdown, bullet ยาว ๆ หรือ code block
6. ห้ามกล่าวอ้างเกินจริง เช่น การันตี, รวยแน่นอน, เปลี่ยนชีวิต ถ้าอยู่ในคำต้องห้าม
7. ปิดท้ายด้วย CTA แบบนุ่ม ๆ ถ้าเหมาะสม
8. ใช้ “แนวทาง CTA / ตัวอย่าง CTA” เป็นแรงบันดาลใจเท่านั้น ห้ามคัดลอกประโยคเดิมตรง ๆ ทุกครั้ง
9. CTA ต้องปรับให้เข้ากับเนื้อหาโพสต์นี้ และให้หลากหลายจากโพสต์ก่อน ๆ
10. สำหรับโพสต์นี้ให้เน้นแนวปิดท้ายแบบ: ${ctaVariationHint}

ส่งออกเป็นข้อความโพสต์อย่างเดียว พร้อมใช้งานบน Facebook Page`;
}


function getReadableGeminiError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Gemini error";
  }
}

export async function generateFacebookPostWithGemini(
  input: GenerateFacebookPostInput,
): Promise<GenerateFacebookPostResult> {
  const client = getGeminiClient();
  const model = getGeminiModel();
  const prompt = buildPrompt(input);

  let response;

  try {
    response = await client.models.generateContent({
      model,
      contents: prompt,
    });
  } catch (error) {
    const message = getReadableGeminiError(error);
    throw new Error(`Gemini generateContent failed with model ${model}: ${message}`);
  }

  const content = cleanGeneratedText(response.text ?? "");

  if (!content) {
    throw new Error("Gemini returned empty content");
  }

  const usageMetadata = response.usageMetadata as GeminiUsageMetadata | undefined;

  return {
    content,
    model,
    inputTokens: usageMetadata?.promptTokenCount ?? 0,
    outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata?.totalTokenCount ?? 0,
  };
}

export type GeneratePantipTeaserInput = {
  title: string;
  excerpt: string;
  sourceUrl: string;
  styleInstructions?: string;
  writingProfile?: Pick<
    WritingProfile,
    | "name"
    | "tone"
    | "targetAudience"
    | "rules"
    | "favoriteWords"
    | "bannedWords"
    | "callToAction"
    | "samplePosts"
    | "maxWords"
  > | null;
};

function normalizeThaiWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildShortPantipCaption(input: GeneratePantipTeaserInput) {
  const sourceText = normalizeThaiWhitespace(input.excerpt || input.title);
  const body =
    sourceText.length > 220 ? `${sourceText.slice(0, 220).trim()}…` : sourceText;

  return `${body}\n\nอ่านต้นทาง: ${input.sourceUrl}`.trim();
}

function isPantipCaptionTooBotLike(content: string) {
  const botLikePhrases = [
    "บทเรียน",
    "ประเด็นที่น่าสนใจ",
    "สถานการณ์",
    "สะท้อนให้เห็น",
    "สังคมควรตระหนัก",
    "จากกรณีดังกล่าว",
    "สิ่งที่น่าสนใจคือ",
    "มุมมองที่น่าสนใจ",
  ];
  const bodyWithoutLink = content.split("อ่านต้นทาง")[0] || content;
  const wordLikeCount = bodyWithoutLink.split(/\s+/).filter(Boolean).length;

  return (
    bodyWithoutLink.length > 260 ||
    wordLikeCount > 55 ||
    botLikePhrases.some((phrase) => content.includes(phrase))
  );
}

function buildPantipTeaserPrompt(input: GeneratePantipTeaserInput) {
  const profile = input.writingProfile;
  const maxWords = Math.min(profile?.maxWords ?? 40, 45);
  const styleInstructions = input.styleInstructions?.trim();

  return `คุณคือผู้ช่วยจัด caption Facebook Page ภาษาไทยสำหรับโพสต์ชวนอ่านกระทู้ Pantip

งานของคุณ:
เขียน caption สั้นมาก โดยยึด “ข้อความตัวอย่างจากต้นทางแบบสั้น” เป็นแกนหลัก ถ้าข้อความตัวอย่างอ่านรู้เรื่องอยู่แล้ว ให้ใช้ความหมายเดิมให้ใกล้ที่สุด ไม่ต้องวิเคราะห์เพิ่ม

ชื่อกระทู้:
${input.title}

ข้อความตัวอย่างจากต้นทางแบบสั้น:
${input.excerpt}

ลิงก์ต้นทาง:
${input.sourceUrl}

สไตล์ของเพจ:
- ชื่อสไตล์: ${profile?.name || "สไตล์หลักของฉัน"}
- โทนภาษา: ${profile?.tone || "เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง"}
- กลุ่มเป้าหมาย: ${profile?.targetAudience || "คนอ่าน Facebook Page ทั่วไป"}
- กติกาการเขียน: ${profile?.rules || "ย่อหน้าสั้น อ่านง่าย ไม่ขายของแรง ไม่ใช้คำเกินจริง"}
- คำที่ชอบใช้: ${profile?.favoriteWords || ""}
- คำที่ไม่อยากให้ใช้: ${profile?.bannedWords || ""}
- แนวทาง CTA / ตัวอย่าง CTA: ${profile?.callToAction || "ไม่จำเป็นต้องมี CTA ถ้าแคปชั่นสั้นพอแล้ว"}
- ตัวอย่างโพสต์เก่า/แนวทางเพิ่มเติม: ${profile?.samplePosts || "ไม่มี"}
- สไตล์เฉพาะรอบนี้จากผู้ใช้: ${styleInstructions || "เอาข้อความตัวอย่างสั้น ๆ มาใช้เป็นแคปชั่นหลักได้เลย เขียนสั้นมาก เหมือนผมหยิบกระทู้นี้มาแปะให้คนอ่านต่อ ไม่ต้องวิเคราะห์ ไม่ต้องสรุปยาว ไม่ต้องใช้คำทางการ"}

กติกาเฉพาะสำหรับโพสต์จาก Pantip:
1. เขียนเป็นภาษาไทยเท่านั้น
2. ความยาวไม่เกิน ${maxWords} คำ ยิ่งสั้นยิ่งดี
3. โครงสร้างที่ต้องการคือ ข้อความสั้น 1 ย่อหน้า แล้วเว้นบรรทัด แล้วตามด้วย “อ่านต้นทาง: <ลิงก์>”
4. ใช้ข้อความตัวอย่างจากต้นทางแบบสั้นเป็นฐานหลัก ห้ามขยายความเป็นบทความ
5. ห้ามวิเคราะห์ยาว ห้ามสอน ห้ามสรุปเหมือนข่าว ห้ามแต่งประเด็นเพิ่ม
6. ห้ามใช้ภาษาทางการหรือภาษารายงาน เช่น “บทเรียน”, “ประเด็นที่น่าสนใจ”, “สถานการณ์”, “สะท้อนให้เห็น”, “สังคมควรตระหนัก”, “จากกรณีดังกล่าว”, “สิ่งที่น่าสนใจคือ”
7. ห้ามคัดข้อความยาวจากกระทู้ ให้ใช้แค่ความหมายสั้น ๆ จาก title/excerpt ที่ให้มาเท่านั้น
8. ห้ามดึงหรืออ้างถึงคอมเมนต์
9. ห้ามกล่าวหา ห้ามฟันธง ห้ามขยายดราม่า และห้ามพาดพิงบุคคลจริง
10. ต้องมีบรรทัด “อ่านต้นทาง:” ตามด้วยลิงก์ต้นทางเต็ม ๆ เสมอ
11. ห้ามใส่ markdown, bullet, emoji เยอะ หรือ code block

ตัวอย่างรูปแบบที่ต้องการ:
ถ้าเราหาเงินค่าสินสอดไม่ครบถึงวันที่จะแต่ง แล้วแฟนไม่ยอมแต่ง ทั้ง ๆ ที่เราพยายามสุดตัวที่สุดแล้ว จะเอายังไง

อ่านต้นทาง: ${input.sourceUrl}

ส่งออกเป็น caption พร้อมโพสต์บน Facebook เท่านั้น`;
}

export async function generatePantipTeaserWithGemini(
  input: GeneratePantipTeaserInput,
): Promise<GenerateFacebookPostResult> {
  const client = getGeminiClient();
  const model = getGeminiModel();
  const prompt = buildPantipTeaserPrompt(input);

  let response;

  try {
    response = await client.models.generateContent({
      model,
      contents: prompt,
    });
  } catch (error) {
    const message = getReadableGeminiError(error);
    throw new Error(`Gemini Pantip teaser failed with model ${model}: ${message}`);
  }

  let content = normalizeThaiWhitespace(cleanGeneratedText(response.text ?? ""));

  if (!content) {
    throw new Error("Gemini returned empty Pantip teaser");
  }

  if (isPantipCaptionTooBotLike(content)) {
    content = buildShortPantipCaption(input);
  }

  if (!content.includes(input.sourceUrl)) {
    content = `${content}\n\nอ่านต้นทาง: ${input.sourceUrl}`.trim();
  }

  content = content.replace(/อ่านต้นทาง:\s*\n\s*/g, "อ่านต้นทาง: ");

  const usageMetadata = response.usageMetadata as GeminiUsageMetadata | undefined;

  return {
    content,
    model,
    inputTokens: usageMetadata?.promptTokenCount ?? 0,
    outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata?.totalTokenCount ?? 0,
  };
}
