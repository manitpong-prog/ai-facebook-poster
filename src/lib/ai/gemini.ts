import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from "@google/genai";

import type { writingProfiles } from "@/db/schema";
import { resolveGeminiConfiguration } from "@/lib/ai/settings";

type WritingProfile = typeof writingProfiles.$inferSelect;

type GenerateFacebookPostInput = {
  workspaceId: string;
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
  thoughtsTokenCount?: number;
};

type GeminiTextRequest = {
  client: GoogleGenAI;
  model: string;
  contents: string;
  operation: string;
  config?: GenerateContentConfig;
  maxAttempts?: number;
};

type GeminiResponseDiagnostics = {
  responseId: string | null;
  modelVersion: string | null;
  promptBlockReason: string | null;
  finishReasons: string[];
  finishMessages: string[];
  blockedSafetyCategories: string[];
  candidateCount: number;
  textPartCount: number;
  thoughtPartCount: number;
  nonTextPartTypes: string[];
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
};

const NON_RETRYABLE_EMPTY_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "LANGUAGE",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
]);

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function extractGeminiText(response: GenerateContentResponse) {
  const directText = response.text?.trim();

  if (directText) {
    return cleanGeneratedText(directText);
  }

  const reconstructedText = (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  return cleanGeneratedText(reconstructedText);
}

function getGeminiResponseDiagnostics(
  response: GenerateContentResponse,
): GeminiResponseDiagnostics {
  const candidates = response.candidates ?? [];
  const parts = candidates.flatMap((candidate) => candidate.content?.parts ?? []);
  const usage = response.usageMetadata as GeminiUsageMetadata | undefined;
  const blockedSafetyCategories = candidates
    .flatMap((candidate) => candidate.safetyRatings ?? [])
    .filter((rating) => rating.blocked)
    .map((rating) => String(rating.category ?? "UNKNOWN"));
  const nonTextPartTypes = parts.flatMap((part) => {
    const types: string[] = [];

    if (part.inlineData) types.push("inlineData");
    if (part.fileData) types.push("fileData");
    if (part.functionCall) types.push("functionCall");
    if (part.functionResponse) types.push("functionResponse");
    if (part.executableCode) types.push("executableCode");
    if (part.codeExecutionResult) types.push("codeExecutionResult");
    if (part.toolCall) types.push("toolCall");
    if (part.toolResponse) types.push("toolResponse");

    return types;
  });

  return {
    responseId: response.responseId ?? null,
    modelVersion: response.modelVersion ?? null,
    promptBlockReason: response.promptFeedback?.blockReason
      ? String(response.promptFeedback.blockReason)
      : null,
    finishReasons: candidates
      .map((candidate) => candidate.finishReason)
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .map(String),
    finishMessages: candidates
      .map((candidate) => candidate.finishMessage?.trim())
      .filter((value): value is string => Boolean(value)),
    blockedSafetyCategories: [...new Set(blockedSafetyCategories)],
    candidateCount: candidates.length,
    textPartCount: parts.filter(
      (part) => !part.thought && typeof part.text === "string",
    ).length,
    thoughtPartCount: parts.filter((part) => part.thought).length,
    nonTextPartTypes: [...new Set(nonTextPartTypes)],
    promptTokenCount: usage?.promptTokenCount ?? 0,
    candidatesTokenCount: usage?.candidatesTokenCount ?? 0,
    thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0,
    totalTokenCount: usage?.totalTokenCount ?? 0,
  };
}

function formatGeminiEmptyResponseError(
  model: string,
  diagnostics: GeminiResponseDiagnostics,
) {
  const finishReason = diagnostics.finishReasons.join(", ") || "NONE";
  const responseId = diagnostics.responseId || "unknown";

  if (diagnostics.promptBlockReason) {
    return `Gemini ไม่สร้างข้อความเพราะ prompt ถูกบล็อก (${diagnostics.promptBlockReason}) · model=${model} · responseId=${responseId}`;
  }

  if (
    diagnostics.finishReasons.some((reason) =>
      NON_RETRYABLE_EMPTY_FINISH_REASONS.has(reason),
    )
  ) {
    const safetyDetails = diagnostics.blockedSafetyCategories.length
      ? ` · safety=${diagnostics.blockedSafetyCategories.join(",")}`
      : "";

    return `Gemini ไม่คืนข้อความเพราะระบบหยุดคำตอบ (${finishReason})${safetyDetails} · model=${model} · responseId=${responseId}`;
  }

  if (diagnostics.nonTextPartTypes.length) {
    return `Gemini คืนผลลัพธ์ที่ไม่ใช่ข้อความ (${diagnostics.nonTextPartTypes.join(", ")}) กรุณาตรวจว่าเลือกโมเดล Text เช่น gemini-2.5-flash-lite · model=${model} · responseId=${responseId}`;
  }

  if (
    diagnostics.finishReasons.includes("MAX_TOKENS") &&
    diagnostics.thoughtsTokenCount > 0
  ) {
    return `Gemini ใช้โทเคนกับการคิดจนไม่มีข้อความตอบกลับ กรุณาลองใหม่หรือเปลี่ยนเป็น gemini-2.5-flash-lite · model=${model} · thoughtsTokens=${diagnostics.thoughtsTokenCount} · responseId=${responseId}`;
  }

  return `Gemini returned empty content after retry · model=${model} · finishReason=${finishReason} · candidates=${diagnostics.candidateCount} · textParts=${diagnostics.textPartCount} · thoughtParts=${diagnostics.thoughtPartCount} · responseId=${responseId}`;
}

function shouldRetryEmptyGeminiResponse(
  diagnostics: GeminiResponseDiagnostics,
) {
  if (diagnostics.promptBlockReason) {
    return false;
  }

  if (
    diagnostics.finishReasons.some((reason) =>
      NON_RETRYABLE_EMPTY_FINISH_REASONS.has(reason),
    )
  ) {
    return false;
  }

  if (diagnostics.nonTextPartTypes.length) {
    return false;
  }

  return true;
}

async function generateGeminiText({
  client,
  model,
  contents,
  operation,
  config,
  maxAttempts = 3,
}: GeminiTextRequest) {
  let lastDiagnostics: GeminiResponseDiagnostics | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: GenerateContentResponse;

    try {
      response = await client.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (error) {
      const message = getReadableGeminiError(error);
      throw new Error(`${operation} failed with model ${model}: ${message}`);
    }

    const content = extractGeminiText(response);

    if (content) {
      return { response, content };
    }

    lastDiagnostics = getGeminiResponseDiagnostics(response);
    console.warn(`${operation} returned empty Gemini content`, {
      attempt,
      maxAttempts,
      model,
      ...lastDiagnostics,
    });

    if (
      attempt >= maxAttempts ||
      !shouldRetryEmptyGeminiResponse(lastDiagnostics)
    ) {
      throw new Error(formatGeminiEmptyResponseError(model, lastDiagnostics));
    }

    await sleep(250 * attempt);
  }

  throw new Error(
    formatGeminiEmptyResponseError(
      model,
      lastDiagnostics ?? {
        responseId: null,
        modelVersion: null,
        promptBlockReason: null,
        finishReasons: [],
        finishMessages: [],
        blockedSafetyCategories: [],
        candidateCount: 0,
        textPartCount: 0,
        thoughtPartCount: 0,
        nonTextPartTypes: [],
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        thoughtsTokenCount: 0,
        totalTokenCount: 0,
      },
    ),
  );
}

export type GenerateFacebookPostResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

async function getGeminiRuntime(
  workspaceId: string,
  overrides?: { apiKey?: string | null; model?: string | null },
) {
  const configuration = await resolveGeminiConfiguration(workspaceId, {
    apiKeyOverride: overrides?.apiKey,
    modelOverride: overrides?.model,
  });

  return {
    client: new GoogleGenAI({ apiKey: configuration.apiKey }),
    model: configuration.model,
    source: configuration.source,
  };
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
  const { client, model } = await getGeminiRuntime(input.workspaceId);
  const prompt = buildPrompt(input);
  const { response, content } = await generateGeminiText({
    client,
    model,
    contents: prompt,
    operation: "Gemini Facebook post generation",
    config: {
      responseMimeType: "text/plain",
      maxOutputTokens: 2048,
    },
  });

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
  workspaceId: string;
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
  const { client, model } = await getGeminiRuntime(input.workspaceId);
  const prompt = buildPantipTeaserPrompt(input);
  const generated = await generateGeminiText({
    client,
    model,
    contents: prompt,
    operation: "Gemini Pantip teaser generation",
    config: {
      responseMimeType: "text/plain",
      maxOutputTokens: 1024,
    },
  });
  const response = generated.response;
  let content = normalizeThaiWhitespace(generated.content);

  const usageMetadata = response.usageMetadata as GeminiUsageMetadata | undefined;

  if (!content || isPantipCaptionTooBotLike(content)) {
    content = buildShortPantipCaption(input);
  } else {
    content = removePantipSourceLinkLine(content, input.sourceUrl);
    content = ensurePantipCaptionStartsWithTitle(content, input.title);
    content = `${content}\n\nอ่านต้นทาง: ${input.sourceUrl}`.trim();
    content = content.replace(/อ่านต้นทาง:\s*\n\s*/g, "อ่านต้นทาง: ");
  }

  return {
    content,
    model,
    inputTokens: usageMetadata?.promptTokenCount ?? 0,
    outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata?.totalTokenCount ?? 0,
  };
}

export type NewsPostMode = "story" | "short" | "sports";

export type GenerateNewsSourcePostInput = {
  workspaceId: string;
  sourceName: string;
  title: string;
  summary: string;
  articleText?: string;
  sourceUrl: string;
  postMode?: NewsPostMode;
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

function getNewsModeSettings(mode: NewsPostMode | undefined) {
  switch (mode) {
    case "short":
      return {
        label: "สรุปสั้น",
        maxWords: 95,
        paragraphRule: "เขียนประมาณ 1-2 ย่อหน้าสั้น ๆ เน้นเข้าใจไว ไม่ต้องลงรายละเอียดเยอะ",
        angleRule: "ใส่มุมเล่าให้เพื่อนฟังได้ 1 ประโยคสั้น ๆ ถ้าเหมาะสม",
      };
    case "sports":
      return {
        label: "ข่าวกีฬา / ข่าวบอล",
        maxWords: 150,
        paragraphRule: "เขียนประมาณ 2-3 ย่อหน้าสั้น ๆ เหมือนเล่าข่าวบอลให้เพื่อนฟัง",
        angleRule: "ใส่มุมแฟนบอลหรือความเห็นเบา ๆ ได้ แต่ต้องไม่ฟันธงเกินข่าวต้นทาง",
      };
    case "story":
    default:
      return {
        label: "เล่าเป็นข่าวแบบเต็มขึ้น",
        maxWords: 210,
        paragraphRule: "เขียนประมาณ 3-5 ย่อหน้าสั้น ๆ ให้มีน้ำหนักมากกว่าสรุปสั้น แต่ยังอ่านง่ายบน Facebook",
        angleRule: "ใส่มุมเล่าให้เพื่อนฟังหรือมุมชวนคิดเล็กน้อยได้ โดยต้องแยกจากข้อเท็จจริงและไม่แต่งข้อมูลเพิ่ม",
      };
  }
}

function stripNewsBotLeadIn(content: string, sourceName: string) {
  const sourceFirstWord = sourceName.split(/[·|\-]/)[0]?.trim() || sourceName;
  const escapedSource = sourceFirstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leadInPatterns = [
    new RegExp(`^${escapedSource}\\s*(?:รายงานว่า|ระบุว่า|เผยว่า)\\s*`, "i"),
    /^(?:CNN|BBC|The Guardian|Guardian|Reuters|AP|AFP|Sky Sports|ESPN)\s*(?:รายงานว่า|ระบุว่า|เผยว่า)\s*/i,
    /^มีรายงานว่า\s*/i,
    /^สำนักข่าว(?:ต่างประเทศ)?รายงานว่า\s*/i,
    /^รายงานข่าวระบุว่า\s*/i,
  ];

  let cleaned = content.trim();

  for (const pattern of leadInPatterns) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  return cleaned;
}

function buildNewsFallbackCaption(input: GenerateNewsSourcePostInput) {
  const title = normalizeThaiWhitespace(input.title);
  const summarySource = normalizeThaiWhitespace(input.summary || input.articleText || title);
  const maxSummaryLength = input.postMode === "story" ? 420 : input.postMode === "sports" ? 320 : 240;
  const summary = summarySource.length > maxSummaryLength
    ? `${summarySource.slice(0, maxSummaryLength).trim()}…`
    : summarySource;
  const intro = title || "มีข่าวที่น่าสนใจจากต้นทางนี้";

  if (input.postMode === "short") {
    return `${intro}

${summary}

ที่มา: ${input.sourceName}
อ่านต่อ: ${input.sourceUrl}`.trim();
  }

  const angle = input.postMode === "sports"
    ? "ถ้าเรื่องนี้ขยับต่อจริง ก็น่าตามว่าทีมหรือคนที่เกี่ยวข้องจะตัดสินใจกันยังไงต่อ"
    : "ถ้าเล่าแบบง่าย ๆ เรื่องนี้ยังมีรายละเอียดให้ตามต่อ เพราะผลลัพธ์อาจกระทบมากกว่าแค่ประเด็นในพาดหัว";

  return `${intro}

${summary}

${angle}

ที่มา: ${input.sourceName}
อ่านต่อ: ${input.sourceUrl}`.trim();
}

function removeNewsSourceLines(content: string, sourceUrl: string) {
  return content
    .split("\n")
    .filter((line) => {
      const normalizedLine = normalizeThaiWhitespace(line);

      return !(
        normalizedLine.startsWith("ที่มา:") ||
        (normalizedLine.startsWith("อ่านต่อ:") && normalizedLine.includes(sourceUrl))
      );
    })
    .join("\n")
    .trim();
}

function isNewsCaptionTooRiskyOrBotLike(content: string) {
  const botLikePhrases = [
    "ข่าวต่างประเทศน่าสนใจวันนี้",
    "อัปเดตข่าวต่างประเทศ",
    "ประเด็นนี้น่าจับตา",
    "CNN รายงานว่า",
    "BBC รายงานว่า",
    "The Guardian รายงานว่า",
    "มีรายงานว่า",
    "สำนักข่าวรายงานว่า",
    "สถานการณ์ดังกล่าว",
    "จากกรณีดังกล่าว",
    "สะท้อนให้เห็น",
    "สังคมควรตระหนัก",
    "บทเรียน",
  ];
  const bodyWithoutSource = content.split("ที่มา:")[0] || content;
  const wordLikeCount = bodyWithoutSource.split(/\s+/).filter(Boolean).length;

  return (
    bodyWithoutSource.length > 900 ||
    wordLikeCount > 170 ||
    botLikePhrases.some((phrase) => content.includes(phrase))
  );
}

function buildNewsSourcePostPrompt(input: GenerateNewsSourcePostInput) {
  const profile = input.writingProfile;
  const modeSettings = getNewsModeSettings(input.postMode);
  const profileMaxWords = profile?.maxWords ?? modeSettings.maxWords;
  const maxWords = Math.min(profileMaxWords, modeSettings.maxWords);
  const styleInstructions = input.styleInstructions?.trim();
  const articleText = normalizeThaiWhitespace(input.articleText || "").slice(0, 5500);

  return `คุณคือผู้ช่วยเขียนโพสต์ Facebook Page ภาษาไทยจากข่าวต่างประเทศ

งานของคุณ:
อ่าน/แปล/ทำความเข้าใจข่าวต้นทางเท่าที่ให้มา แล้วเขียนใหม่เป็นโพสต์ภาษาไทยในสไตล์ของเพจ เหมือนเล่าให้เพื่อนอ่าน ไม่ใช่แปลทั้งบทความ ไม่ใช่ภาษาข่าวแข็ง ๆ และไม่ใช่บอทสรุปข่าว

รูปแบบโพสต์ที่ผู้ใช้เลือก:
${modeSettings.label}

แหล่งข่าว:
${input.sourceName}

หัวข้อข่าว:
${input.title}

สรุปจาก RSS / metadata:
${input.summary || "ไม่มี"}

เนื้อหาข่าวที่อ่านได้จากต้นทาง:
${articleText || "อ่านบทความเต็มไม่ได้ ใช้เฉพาะหัวข้อและ summary ที่มี"}

ลิงก์ต้นทาง:
${input.sourceUrl}

สไตล์ของเพจ:
- ชื่อสไตล์: ${profile?.name || "สไตล์หลักของฉัน"}
- โทนภาษา: ${profile?.tone || "เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง"}
- กลุ่มเป้าหมาย: ${profile?.targetAudience || "คนอ่าน Facebook Page ทั่วไป"}
- กติกาการเขียน: ${profile?.rules || "ย่อหน้าสั้น อ่านง่าย ไม่ขายของแรง ไม่ใช้คำเกินจริง"}
- คำที่ชอบใช้: ${profile?.favoriteWords || ""}
- คำที่ไม่อยากให้ใช้: ${profile?.bannedWords || ""}
- แนวทาง CTA / ตัวอย่าง CTA: ${profile?.callToAction || "ไม่จำเป็นต้องมี CTA ถ้าโพสต์จบดีแล้ว"}
- ตัวอย่างโพสต์เก่า/แนวทางเพิ่มเติม: ${profile?.samplePosts || "ไม่มี"}
- สไตล์เฉพาะรอบนี้จากผู้ใช้: ${styleInstructions || "เขียนเหมือนเล่าให้เพื่อนอ่าน ไม่เป็นทางการเกินไป ไม่ต้องเขียนเหมือนข่าวทีวี และใส่มุมเล่า/ความเห็นเบา ๆ ได้เล็กน้อย"}

กติกาตามรูปแบบที่เลือก:
- ${modeSettings.paragraphRule}
- ${modeSettings.angleRule}
- ความยาวไม่เกิน ${maxWords} คำ

กติกาสำคัญ:
1. เขียนเป็นภาษาไทยเท่านั้น
2. ห้ามขึ้นต้นด้วยชื่อสำนักข่าวหรือประโยคแบบบอท เช่น “CNN รายงานว่า”, “BBC รายงานว่า”, “The Guardian รายงานว่า”, “มีรายงานว่า”, “สำนักข่าวรายงานว่า”
3. ให้เริ่มย่อหน้าแรกด้วยแก่นของข่าวทันที เช่น ผลที่เกิดขึ้น เหตุการณ์หลัก ดีลที่กำลังขยับ หรือประเด็นที่คนอ่านควรรู้
4. ไม่ต้องขึ้นต้นด้วยคำหัวข้อแบบบอท เช่น “ข่าวต่างประเทศน่าสนใจวันนี้”, “อัปเดตฟุตบอลต่างประเทศ”, “ประเด็นนี้น่าจับตา”
5. AI อ่านหรือแปลข่าวทั้งบทความเพื่อทำความเข้าใจได้ แต่ห้ามแปลข่าวทั้งบทความไปโพสต์ และห้ามคัดลอกข้อความยาวจากต้นทาง
6. สรุป/เขียนใหม่เฉพาะประเด็นสำคัญเท่าที่ข้อมูลรองรับ ห้ามแต่งข้อมูลเพิ่ม
7. ใส่มุมเล่าให้เพื่อนอ่านได้ แต่ต้องไม่ฟันธงเกินข่าวต้นทาง
8. ห้ามใช้รูปแบบ bullet/markdown/code block
9. ห้ามใช้ภาษาทางการเกินไปหรือภาษารายงาน เช่น “สถานการณ์ดังกล่าว”, “จากกรณีดังกล่าว”, “สะท้อนให้เห็น”, “สังคมควรตระหนัก”
10. ต้องปิดท้ายด้วยรูปแบบนี้เสมอ:
ที่มา: ${input.sourceName}
อ่านต่อ: ${input.sourceUrl}

ตัวอย่างโครงสร้างที่ต้องการ:
[เปิดด้วยประเด็นของข่าวเลย ไม่ต้องบอกว่าสำนักข่าวรายงานว่า]

[เล่าเนื้อหาข่าวเป็นภาษาคน อ่านง่าย ตามรูปแบบที่เลือก]

[มุมเล่าให้เพื่อนฟังหรือความเห็นเบา ๆ โดยไม่ฟันธงเกินข่าว]

ที่มา: ${input.sourceName}
อ่านต่อ: ${input.sourceUrl}

ส่งออกเป็น caption พร้อมโพสต์บน Facebook เท่านั้น`;
}

export async function generateNewsSourcePostWithGemini(
  input: GenerateNewsSourcePostInput,
): Promise<GenerateFacebookPostResult> {
  const { client, model } = await getGeminiRuntime(input.workspaceId);
  const prompt = buildNewsSourcePostPrompt(input);
  const generated = await generateGeminiText({
    client,
    model,
    contents: prompt,
    operation: "Gemini news source post generation",
    config: {
      responseMimeType: "text/plain",
      maxOutputTokens: 1536,
    },
  });
  const response = generated.response;
  let content = normalizeThaiWhitespace(generated.content);
  content = stripNewsBotLeadIn(content, input.sourceName);
  const usageMetadata = response.usageMetadata as GeminiUsageMetadata | undefined;

  if (!content || isNewsCaptionTooRiskyOrBotLike(content)) {
    content = buildNewsFallbackCaption(input);
  } else {
    content = removeNewsSourceLines(content, input.sourceUrl);
    content = `${content}\n\nที่มา: ${input.sourceName}\nอ่านต่อ: ${input.sourceUrl}`.trim();
    content = content.replace(/ที่มา:\s*\n\s*/g, "ที่มา: ");
    content = content.replace(/อ่านต่อ:\s*\n\s*/g, "อ่านต่อ: ");
  }

  return {
    content,
    model,
    inputTokens: usageMetadata?.promptTokenCount ?? 0,
    outputTokens: usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: usageMetadata?.totalTokenCount ?? 0,
  };
}
export async function testGeminiConnection(input: {
  workspaceId: string;
  apiKey?: string | null;
  model?: string | null;
}) {
  const { client, model, source } = await getGeminiRuntime(input.workspaceId, {
    apiKey: input.apiKey,
    model: input.model,
  });
  const { content } = await generateGeminiText({
    client,
    model,
    contents: "ตอบเพียงคำว่า OK เพื่อทดสอบการเชื่อมต่อ API",
    operation: "Gemini connection test",
    config: {
      responseMimeType: "text/plain",
      maxOutputTokens: 128,
      temperature: 0,
    },
  });

  return {
    ok: true as const,
    model,
    source,
    responseText: content.slice(0, 80),
  };
}
