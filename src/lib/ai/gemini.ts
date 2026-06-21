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
  const title = normalizeThaiWhitespace(input.title);
  const excerpt = normalizeThaiWhitespace(input.excerpt);
  const summarySource =
    excerpt && excerpt !== title
      ? excerpt
      : "อ่านแล้วชวนคิดต่อว่าถ้าเป็นเราอยู่ในเรื่องนี้ จะมองหรือเลือกทางไหน";
  const summary =
    summarySource.length > 190
      ? `${summarySource.slice(0, 190).trim()}…`
      : summarySource;

  return `${title}\n\n${summary}\n\nอ่านต้นทาง: ${input.sourceUrl}`.trim();
}

function ensurePantipCaptionStartsWithTitle(content: string, title: string) {
  const normalizedTitle = normalizeThaiWhitespace(title);

  if (!normalizedTitle) {
    return content;
  }

  const normalizedContent = normalizeThaiWhitespace(content);
  const titleProbe = normalizedTitle.slice(0, Math.min(normalizedTitle.length, 24));

  if (titleProbe.length >= 8 && normalizedContent.startsWith(titleProbe)) {
    return content;
  }

  return `${normalizedTitle}\n\n${content}`.trim();
}

function removePantipSourceLinkLine(content: string, sourceUrl: string) {
  return content
    .split("\n")
    .filter((line) => {
      const normalizedLine = normalizeThaiWhitespace(line);

      return !(normalizedLine.startsWith("อ่านต้นทาง:") && normalizedLine.includes(sourceUrl));
    })
    .join("\n")
    .trim();
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
    bodyWithoutLink.length > 420 ||
    wordLikeCount > 90 ||
    botLikePhrases.some((phrase) => content.includes(phrase))
  );
}

function buildPantipTeaserPrompt(input: GeneratePantipTeaserInput) {
  const profile = input.writingProfile;
  const maxWords = Math.min(profile?.maxWords ?? 80, 90);
  const styleInstructions = input.styleInstructions?.trim();

  return `คุณคือผู้ช่วยจัด caption Facebook Page ภาษาไทยสำหรับโพสต์ชวนอ่านกระทู้ Pantip

งานของคุณ:
เขียน caption สั้น กระชับ และดูเหมือนเจ้าของเพจหยิบกระทู้นี้มาเล่าเอง โดยเริ่มต้นด้วยชื่อกระทู้แบบเต็มตามที่ให้มา แล้วค่อยต่อด้วยสรุปหรือมุมชวนคิดจากเนื้อหาอีก 1-2 ประโยคสั้น ๆ เพื่อให้โพสต์ไม่ห้วนเกินไป

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
- สไตล์เฉพาะรอบนี้จากผู้ใช้: ${styleInstructions || "ขึ้นต้นด้วยหัวข้อกระทู้แบบเต็มก่อน แล้วเพิ่มสรุปหรือมุมชวนคิดสั้น ๆ อีก 1-2 ประโยค ให้เหมือนผมหยิบกระทู้นี้มาเล่าเอง ไม่ต้องเป็นทางการ ไม่ต้องยาว"}

กติกาเฉพาะสำหรับโพสต์จาก Pantip:
1. เขียนเป็นภาษาไทยเท่านั้น
2. ความยาวไม่เกิน ${maxWords} คำ
3. โครงสร้างที่ต้องการคือ 2 ย่อหน้าสั้น ๆ แล้วเว้นบรรทัด แล้วตามด้วย “อ่านต้นทาง: <ลิงก์>”
4. ย่อหน้าแรกต้องเป็นชื่อกระทู้แบบเต็มตามที่ให้มา ห้ามย่อ ห้ามเขียนใหม่ ห้ามตัดให้สั้นลง
5. ย่อหน้าที่สองให้เพิ่มสรุปหรือมุมชวนคิดจากข้อความตัวอย่างอีก 1-2 ประโยคสั้น ๆ โดยไม่แต่งข้อเท็จจริงใหม่เกินข้อมูลที่ให้มา
6. ห้ามวิเคราะห์ยาว ห้ามสอน ห้ามสรุปเหมือนข่าว ห้ามแต่งประเด็นเพิ่ม
7. ห้ามใช้ภาษาทางการหรือภาษารายงาน เช่น “บทเรียน”, “ประเด็นที่น่าสนใจ”, “สถานการณ์”, “สะท้อนให้เห็น”, “สังคมควรตระหนัก”, “จากกรณีดังกล่าว”, “สิ่งที่น่าสนใจคือ”
8. ห้ามคัดข้อความยาวจากกระทู้ ให้ใช้แค่ความหมายสั้น ๆ จาก title/excerpt ที่ให้มาเท่านั้น
9. ห้ามดึงหรืออ้างถึงคอมเมนต์
10. ห้ามกล่าวหา ห้ามฟันธง ห้ามขยายดราม่า และห้ามพาดพิงบุคคลจริง
11. ต้องมีบรรทัด “อ่านต้นทาง:” ตามด้วยลิงก์ต้นทางเต็ม ๆ เสมอ
12. ห้ามใส่ markdown, bullet, emoji เยอะ หรือ code block

ตัวอย่างรูปแบบที่ต้องการ:
[ชื่อกระทู้แบบเต็มจากต้นทาง]

[สรุปหรือมุมชวนคิดสั้น ๆ จากเนื้อหา 1-2 ประโยค]

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

  content = removePantipSourceLinkLine(content, input.sourceUrl);
  content = ensurePantipCaptionStartsWithTitle(content, input.title);
  content = `${content}\n\nอ่านต้นทาง: ${input.sourceUrl}`.trim();
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
