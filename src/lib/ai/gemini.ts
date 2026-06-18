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
