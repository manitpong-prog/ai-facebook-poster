import fs from "node:fs";
import path from "node:path";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import { buildImageDataUrl } from "@/lib/pantip/image-data";
import { detectPantipRiskWarnings } from "@/lib/pantip/risk";

export type PantipPreviewSnapshot = {
  sourceUrl: string;
  title: string;
  excerpt: string;
  screenshotDataUrl: string;
  screenshotMimeType: "image/jpeg";
  imageMode: "readable_card";
  warnings: ReturnType<typeof detectPantipRiskWarnings>;
};

const MOBILE_VIEWPORT = {
  width: 430,
  height: 932,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const CARD_VIEWPORT = {
  width: 1080,
  height: 1350,
  deviceScaleFactor: 1,
};

const PANTIP_LAYOUT_PHRASES = [
  "Pantip Download App",
  "Pantip Certified Developer",
  "Download App Pantip",
  "Certified Developer",
  "Explore",
  "เข้าสู่ระบบ",
  "สมัครสมาชิก",
  "ค้นหา",
  "ตั้งกระทู้",
  "Pantip Pick",
  "Pantip Trend",
  "Pantip Mall",
  "Pantip Point",
  "Privacy Policy",
  "Terms of Service",
  "Contact Us",
  "Mobile Application",
  "Official Pantip",
  "Developer",
];

const PANTIP_COMMENT_MARKERS = [
  "ความคิดเห็น",
  "ความคิดเห็นที่",
  "แสดงความคิดเห็น",
  "ตอบกลับ",
  "ถูกใจ",
  "สมาชิกหมายเลข",
  "คอมเมนต์",
  "comment",
  "reply",
];

const TITLE_KEYS = [
  "headline",
  "title",
  "topicTitle",
  "topic_title",
  "topicName",
  "topic_name",
  "subject",
  "name",
];

const EXCERPT_KEYS = [
  "description",
  "excerpt",
  "message",
  "body",
  "articleBody",
  "text",
  "content",
  "topicMessage",
  "topic_message",
  "detail",
];

type Candidate = {
  value: string;
  source: string;
};

type PantipMetadata = {
  title: string;
  excerpt: string;
  source: string;
};

async function getExecutablePath() {
  const envExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();

  if (envExecutablePath) {
    return envExecutablePath;
  }

  const bundledChromiumBinPath = path.join(
    process.cwd(),
    "node_modules",
    "@sparticuz",
    "chromium",
    "bin",
  );

  if (fs.existsSync(bundledChromiumBinPath)) {
    return chromium.executablePath(bundledChromiumBinPath);
  }

  return chromium.executablePath();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

function stripPantipSuffix(value: string) {
  return normalizeText(value)
    .replace(/\s*-\s*Pantip\s*$/i, "")
    .replace(/\s*\|\s*Pantip\s*$/i, "")
    .replace(/^Pantip\s*[:|-]\s*/i, "")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function readHtmlAttributes(tag: string) {
  const attrs = new Map<string, string>();
  const attrPattern = /([\w:-]+)\s*=\s*(["'])(.*?)\2/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(tag))) {
    const name = match[1]?.toLowerCase();
    const value = match[3];

    if (name && value !== undefined) {
      attrs.set(name, decodeHtmlEntities(value));
    }
  }

  return attrs;
}

function readMetaCandidates(
  html: string,
  key: string,
  source: string,
): Candidate[] {
  const candidates: Candidate[] = [];
  const metaTagPattern = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaTagPattern.exec(html))) {
    const attrs = readHtmlAttributes(match[0] || "");
    const marker =
      attrs.get("property") || attrs.get("name") || attrs.get("itemprop") || "";
    const content = attrs.get("content") || "";

    if (marker.toLowerCase() === key.toLowerCase() && content) {
      candidates.push({ value: content, source });
    }
  }

  return candidates;
}

function readTitleCandidates(html: string): Candidate[] {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (!titleMatch?.[1]) {
    return [];
  }

  return [{ value: decodeHtmlEntities(titleMatch[1]), source: "html:title" }];
}

function readHeadingCandidates(html: string): Candidate[] {
  const candidates: Candidate[] = [];
  const headingPattern = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(html))) {
    if (match[1]) {
      candidates.push({
        value: decodeHtmlEntities(stripHtmlTags(match[1])),
        source: "html:heading",
      });
    }
  }

  return candidates;
}

function normalizeJsonString(value: string) {
  return normalizeText(
    decodeHtmlEntities(decodeEscapedUnicode(stripHtmlTags(value))),
  );
}

function collectJsonValues(
  value: unknown,
  keys: string[],
  source: string,
  candidates: Candidate[],
  depth = 0,
) {
  if (depth > 9 || value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    const cleaned = normalizeJsonString(value);

    if (cleaned) {
      candidates.push({ value: cleaned, source });
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonValues(item, keys, source, candidates, depth + 1);
    }
    return;
  }

  if (typeof value === "object") {
    for (const [objectKey, objectValue] of Object.entries(value)) {
      if (keys.some((key) => key.toLowerCase() === objectKey.toLowerCase())) {
        collectJsonValues(
          objectValue,
          keys,
          `${source}:${objectKey}`,
          candidates,
          depth + 1,
        );
        continue;
      }

      if (
        [
          "props",
          "pageProps",
          "data",
          "topic",
          "thread",
          "post",
          "result",
        ].includes(objectKey)
      ) {
        collectJsonValues(objectValue, keys, source, candidates, depth + 1);
      }
    }
  }
}

function extractJsonScriptCandidates(
  html: string,
  keys: string[],
  source: string,
) {
  const candidates: Candidate[] = [];
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    const scriptText = decodeHtmlEntities(match[1] || "").trim();

    if (
      !scriptText ||
      scriptText.length > 900_000 ||
      !/[\[{]/.test(scriptText)
    ) {
      continue;
    }

    try {
      const json = JSON.parse(scriptText);
      collectJsonValues(json, keys, source, candidates);
    } catch {
      // Some Pantip scripts are not JSON. Regex extraction handles JSON-like fragments.
    }
  }

  return candidates;
}

function extractQuotedJsonCandidates(
  payload: string,
  keys: string[],
  source: string,
) {
  const candidates: Candidate[] = [];

  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `"${escapedKey}"\\s*:\\s*"((?:\\\\.|[^"]) {4,900})"`.replace(" ", ""),
        "gi",
      ),
      new RegExp(
        `&quot;${escapedKey}&quot;\\s*:\\s*&quot;([^&]{4,900})&quot;`,
        "gi",
      ),
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(payload))) {
        if (match[1]) {
          candidates.push({
            value: normalizeJsonString(match[1]),
            source: `${source}:${key}`,
          });
        }
      }
    }
  }

  return candidates;
}

function textBlocksFromHtml(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(
        /<\/?(?:p|div|section|article|main|header|footer|h[1-6]|li|br|blockquote)[^>]*>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n+/g)
    .map((block) => cleanPantipContentText(block))
    .filter((block) => block.length >= 16);
}

function extractVisibleTextCandidates(payload: string, source: string) {
  const candidates: Candidate[] = [];

  for (const block of textBlocksFromHtml(payload)) {
    candidates.push({ value: block, source: `${source}:visible-text` });
  }

  const decodedPayload = decodeHtmlEntities(decodeEscapedUnicode(payload));
  const quotedThaiPattern = /["'`]([^"'`]{12,900}[ก-๙][^"'`]{0,900})["'`]/g;
  let match: RegExpExecArray | null;

  while ((match = quotedThaiPattern.exec(decodedPayload))) {
    if (match[1]) {
      candidates.push({
        value: normalizeJsonString(match[1]),
        source: `${source}:quoted-thai`,
      });
    }
  }

  return candidates;
}

function cleanPantipContentText(value: string) {
  let cleaned = decodeHtmlEntities(stripPantipSuffix(stripHtmlTags(value)));

  for (const phrase of PANTIP_LAYOUT_PHRASES) {
    cleaned = cleaned.replace(new RegExp(phrase, "gi"), " ");
  }

  return normalizeText(
    cleaned
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\bwww\.\S+/gi, " ")
      .replace(/\s*[-|]\s*Pantip\s*/gi, " ")
      .replace(/[*•]+/g, " ")
      .replace(/\s\/\s/g, " ")
      .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, " "),
  );
}

function hasCommentMarker(value: string) {
  const normalized = normalizeText(value).toLowerCase();

  return PANTIP_COMMENT_MARKERS.some((marker) =>
    normalized.includes(marker.toLowerCase()),
  );
}

function removeTextAfterCommentMarkers(value: string) {
  const lowerValue = value.toLowerCase();
  const markerIndexes = PANTIP_COMMENT_MARKERS.map((marker) =>
    lowerValue.indexOf(marker.toLowerCase()),
  ).filter((index) => index >= 0);

  if (markerIndexes.length === 0) {
    return value;
  }

  return value.slice(0, Math.min(...markerIndexes));
}

function getHtmlTagEndIndex(html: string, startIndex: number) {
  const tagEndIndex = html.indexOf(">", startIndex);

  return tagEndIndex >= 0 ? tagEndIndex + 1 : -1;
}

function extractBalancedDivHtml(html: string, startIndex: number) {
  const firstTagEndIndex = getHtmlTagEndIndex(html, startIndex);

  if (firstTagEndIndex < 0) {
    return "";
  }

  const divTagPattern = /<\/?div\b[^>]*>/gi;
  divTagPattern.lastIndex = startIndex;
  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = divTagPattern.exec(html))) {
    const tag = match[0] || "";
    const isClosingTag = /^<\/div/i.test(tag);
    const isSelfClosingTag = /\/>$/.test(tag);

    if (isClosingTag) {
      depth -= 1;

      if (depth === 0) {
        return html.slice(startIndex, divTagPattern.lastIndex);
      }

      continue;
    }

    if (!isSelfClosingTag) {
      depth += 1;
    }
  }

  return html.slice(startIndex, Math.min(html.length, startIndex + 8_000));
}

function extractDisplayPostStoryCandidates(payload: string, source: string) {
  const candidates: Candidate[] = [];

  const markerPattern =
    /__AI_MAIN_POST_STORY_START__([\s\S]*?)__AI_MAIN_POST_STORY_END__/gi;
  let markerMatch: RegExpExecArray | null;

  while ((markerMatch = markerPattern.exec(payload))) {
    const text = cleanPantipContentText(markerMatch[1] || "");

    if (text) {
      candidates.push({
        value: text,
        source: `${source}:display-post-story-wrapper:not-comment:dom`,
      });
    }
  }

  const displayPostStoryWrapperPattern =
    /<div\b[^>]*class=(?:"[^"]*\bdisplay-post-story-wrapper\b[^"]*"|'[^']*\bdisplay-post-story-wrapper\b[^']*')[^>]*>/gi;
  let wrapperMatch: RegExpExecArray | null;

  while ((wrapperMatch = displayPostStoryWrapperPattern.exec(payload))) {
    const openingTag = wrapperMatch[0] || "";

    // Pantip comments also use display-post-story, but their story wrapper has
    // the extra comment-wrapper class. Do not reject based on arbitrary words in
    // the story text itself, because the main topic can naturally mention words
    // like "ความคิดเห็น". Reject only by structural comment markers.
    if (/\bcomment-wrapper\b/i.test(openingTag)) {
      continue;
    }

    const blockHtml = extractBalancedDivHtml(payload, wrapperMatch.index);

    if (
      /<span\b[^>]*class=(?:"[^"]*\bdisplay-post-number\b[^"]*"|'[^']*\bdisplay-post-number\b[^']*')[^>]*>\s*ความคิดเห็นที่/i.test(
        blockHtml,
      )
    ) {
      continue;
    }

    const storyMatch = blockHtml.match(
      /<div\b[^>]*class=(?:"[^"]*\bdisplay-post-story\b[^"]*"|'[^']*\bdisplay-post-story\b[^']*')[^>]*>[\s\S]*?<\/div>/i,
    );
    const text = cleanPantipContentText(storyMatch?.[0] || blockHtml);

    if (text) {
      candidates.push({
        value: text,
        source: `${source}:display-post-story-wrapper:not-comment:html`,
      });
    }
  }

  return candidates;
}

function pickFirstTopicBodyStart(candidates: Candidate[], maxLength: number) {
  for (const candidate of candidates) {
    const rawValue = cleanPantipContentText(candidate.value);
    const isStrictMainStory = candidate.source.includes(
      "display-post-story-wrapper:not-comment",
    );
    const value = isStrictMainStory
      ? rawValue
      : cleanPantipContentText(removeTextAfterCommentMarkers(rawValue));

    if (
      value &&
      countThaiCharacters(value) >= 4 &&
      !hasLayoutNoise(value) &&
      !isGenericPantipShell(value)
    ) {
      return {
        value: truncateText(value, maxLength),
        source: candidate.source,
      };
    }
  }

  return null;
}

function countThaiCharacters(value: string) {
  return (value.match(/[ก-๙]/g) || []).length;
}

function countDigits(value: string) {
  return (value.match(/[0-9]/g) || []).length;
}

function hasLayoutNoise(value: string) {
  const lowerValue = value.toLowerCase();

  return PANTIP_LAYOUT_PHRASES.some((phrase) =>
    lowerValue.includes(phrase.toLowerCase()),
  );
}

function isGenericPantipShell(value: string) {
  const normalized = normalizeText(value).toLowerCase();

  return (
    normalized === "pantip" ||
    normalized === "กระทู้ pantip" ||
    normalized.includes("pantip download app") ||
    normalized.includes("pantip certified developer") ||
    normalized.includes("download app") ||
    normalized.includes("certified developer")
  );
}

function isUsefulPantipContent(value: string, minimumThaiCharacters: number) {
  const raw = normalizeText(value);
  const normalized = cleanPantipContentText(value);

  if (normalized.length < 10) {
    return false;
  }

  if (isGenericPantipShell(raw) || isGenericPantipShell(normalized)) {
    return false;
  }

  if (hasLayoutNoise(raw)) {
    return false;
  }

  if (countThaiCharacters(normalized) < minimumThaiCharacters) {
    return false;
  }

  const digitRatio =
    normalized.length > 0 ? countDigits(normalized) / normalized.length : 0;

  return digitRatio <= 0.22;
}

function scoreContentCandidate(value: string) {
  const raw = normalizeText(value);
  const normalized = cleanPantipContentText(value);
  const thaiCharacters = countThaiCharacters(normalized);
  const lengthScore = Math.min(normalized.length, 320) / 20;
  const questionBonus = /[?？]|ไหม|ยังไง|ทำไม|ควร|หรือ|ใคร|อะไร/.test(
    normalized,
  )
    ? 18
    : 0;
  const noisePenalty = hasLayoutNoise(raw) ? 500 : 0;
  const digitPenalty = countDigits(normalized) * 1.6;

  return (
    thaiCharacters + lengthScore + questionBonus - noisePenalty - digitPenalty
  );
}

function pickBestPantipContent(
  candidates: Candidate[],
  options: { minimumThaiCharacters: number; maxLength: number },
) {
  const cleanedCandidates = candidates
    .map((candidate) => ({
      source: candidate.source,
      value: cleanPantipContentText(candidate.value),
      score: scoreContentCandidate(candidate.value),
    }))
    .filter((candidate) =>
      isUsefulPantipContent(candidate.value, options.minimumThaiCharacters),
    )
    .sort((a, b) => b.score - a.score);

  const bestCandidate = cleanedCandidates[0];

  if (!bestCandidate) {
    return null;
  }

  return {
    value: truncateText(bestCandidate.value, options.maxLength),
    source: bestCandidate.source,
  };
}

function extractMetadataCandidatesFromPayload(
  payload: string,
  source: string,
  titleForTopicBody = "",
) {
  const titleCandidates: Candidate[] = [];
  const excerptCandidates: Candidate[] = [];
  const topicBodyCandidates: Candidate[] = [];

  for (const key of ["og:title", "twitter:title"]) {
    titleCandidates.push(
      ...readMetaCandidates(payload, key, `${source}:${key}`),
    );
  }

  for (const key of ["og:description", "twitter:description", "description"]) {
    excerptCandidates.push(
      ...readMetaCandidates(payload, key, `${source}:${key}`),
    );
  }

  titleCandidates.push(...readTitleCandidates(payload));
  titleCandidates.push(...readHeadingCandidates(payload));
  titleCandidates.push(
    ...extractJsonScriptCandidates(
      payload,
      TITLE_KEYS,
      `${source}:script-json`,
    ),
  );
  titleCandidates.push(
    ...extractQuotedJsonCandidates(
      payload,
      TITLE_KEYS,
      `${source}:quoted-json`,
    ),
  );
  excerptCandidates.push(
    ...extractJsonScriptCandidates(
      payload,
      EXCERPT_KEYS,
      `${source}:script-json`,
    ),
  );
  excerptCandidates.push(
    ...extractQuotedJsonCandidates(
      payload,
      EXCERPT_KEYS,
      `${source}:quoted-json`,
    ),
  );
  excerptCandidates.push(...extractVisibleTextCandidates(payload, source));

  topicBodyCandidates.push(...extractDisplayPostStoryCandidates(payload, source));

  // Use only the main topic story container for card details.
  // Do not scan the whole page after the title here, because Pantip comments and
  // navigation text can appear after the title and may be accidentally selected.
  void titleForTopicBody;

  return { titleCandidates, excerptCandidates, topicBodyCandidates };
}

function buildFallbackCardHtml(input: {
  title: string;
  excerpt: string;
  sourceUrl: string;
}) {
  const safeExcerpt = input.excerpt || "อ่านรายละเอียดต่อได้ที่ลิงก์ต้นทาง";
  const displayUrl = input.sourceUrl.replace(/^https?:\/\//i, "");

  return `<!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; width: 1080px; height: 1350px; overflow: hidden; }
          body {
            background: #070b18;
            color: #ffffff;
            font-family: 'Noto Sans Thai', Tahoma, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }
          .canvas {
            width: 1080px;
            height: 1350px;
            padding: 72px;
            background:
              radial-gradient(circle at top left, rgba(253,224,71,0.18), transparent 34%),
              radial-gradient(circle at bottom right, rgba(96,165,250,0.22), transparent 38%),
              linear-gradient(180deg, #111827 0%, #0f172a 100%);
          }
          .card {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 54px;
            border: 2px solid rgba(191,219,254,0.28);
            background: linear-gradient(180deg, #293f95 0%, #1e3a8a 48%, #172554 100%);
            box-shadow: 0 34px 92px rgba(0,0,0,0.46);
          }
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 26px 34px;
            background: #32235f;
            border-bottom: 1px solid rgba(255,255,255,0.12);
          }
          .brand {
            color: #fde68a;
            font-size: 24px;
            line-height: 1;
            font-weight: 900;
          }
          .tag {
            color: #e9d5ff;
            font-size: 22px;
            line-height: 1;
            font-weight: 800;
          }
          .content { padding: 58px 58px 48px; }
          .pill {
            display: inline-flex;
            border-radius: 999px;
            border: 1px solid rgba(253,224,71,0.36);
            background: rgba(253,224,71,0.17);
            padding: 12px 22px;
            color: #fef08a;
            font-size: 22px;
            line-height: 1;
            font-weight: 800;
          }
          h1 {
            margin: 44px 0 0;
            color: #ffffff;
            font-size: 58px;
            line-height: 1.28;
            letter-spacing: -0.02em;
            font-weight: 900;
            overflow-wrap: anywhere;
          }
          .detailBox {
            margin-top: 46px;
            border-radius: 34px;
            border: 1px solid rgba(191,219,254,0.30);
            background: rgba(15,23,42,0.50);
            padding: 34px 38px 36px;
          }
          .detailLabel {
            margin-bottom: 18px;
            color: #bfdbfe;
            font-size: 23px;
            line-height: 1;
            font-weight: 800;
          }
          .detailText {
            margin: 0;
            color: #e2e8f0;
            font-size: 36px;
            line-height: 1.6;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          .source {
            position: absolute;
            left: 58px;
            right: 58px;
            bottom: 48px;
            border-radius: 28px;
            border: 1px solid rgba(191,219,254,0.30);
            background: rgba(15,23,42,0.76);
            padding: 22px 26px;
            color: #bfdbfe;
            font-size: 24px;
            line-height: 1.45;
            font-weight: 650;
            overflow-wrap: anywhere;
          }
        </style>
      </head>
      <body>
        <main class="canvas">
          <section class="card" aria-label="Pantip readable card">
            <div class="topbar"><div class="brand">Pantip</div><div class="tag">กระทู้น่าอ่าน</div></div>
            <div class="content">
              <div class="pill">สรุปจากลิงก์ Pantip</div>
              <h1>${escapeHtml(input.title)}</h1>
              <div class="detailBox">
                <div class="detailLabel">รายละเอียดในกระทู้</div>
                <p class="detailText">${escapeHtml(safeExcerpt)}</p>
              </div>
            </div>
            <div class="source">อ่านต้นทาง: ${escapeHtml(displayUrl)}</div>
          </section>
        </main>
      </body>
    </html>`;
}

async function fetchPantipHtml(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`โหลดหน้า Pantip ไม่สำเร็จ (HTTP ${response.status})`);
  }

  return response.text();
}

async function readBrowserPayloads(sourceUrl: string, topicId: string) {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--hide-scrollbars",
      "--disable-web-security",
      "--disable-features=Translate,BackForwardCache,AcceptCHFrame",
    ],
    defaultViewport: MOBILE_VIEWPORT,
    executablePath: await getExecutablePath(),
    headless: true,
  });

  const networkPayloads: string[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
    });
    page.setDefaultNavigationTimeout(24_000);
    page.setDefaultTimeout(12_000);

    page.on("response", (response) => {
      const url = response.url().toLowerCase();
      const contentType = response.headers()["content-type"] || "";

      if (
        networkPayloads.length >= 18 ||
        !url.includes("pantip") ||
        (!contentType.includes("json") &&
          !contentType.includes("text") &&
          !contentType.includes("html"))
      ) {
        return;
      }

      void response
        .text()
        .then((text) => {
          if (
            text &&
            text.length < 800_000 &&
            (text.includes(topicId) || /[ก-๙]/.test(text))
          ) {
            networkPayloads.push(text);
          }
        })
        .catch(() => undefined);
    });

    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 24_000,
    });
    await page
      .waitForSelector("body", { timeout: 8_000 })
      .catch(() => undefined);
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 80, {
        timeout: 8_000,
      })
      .catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const domPayload = await page.evaluate(() => {
      function readMeta(selector: string) {
        const element = document.querySelector(selector);
        return element instanceof HTMLMetaElement ? element.content || "" : "";
      }

      const mainPostStoryElement = Array.from(
        document.querySelectorAll(
          ".display-post-story-wrapper:not(.comment-wrapper) .display-post-story",
        ),
      ).find((element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        if (
          element.closest(
            ".section-comment,.comment-wrapper,[id^='comment-'],[id^='reply-']",
          )
        ) {
          return false;
        }

        const wrapperInner = element.closest(".display-post-wrapper-inner");

        if (wrapperInner?.querySelector(".display-post-number")) {
          return false;
        }

        return (element.textContent || "").trim().length > 0;
      });
      const displayPostStoryText = mainPostStoryElement?.textContent || "";
      const displayPostStoryHtml = mainPostStoryElement?.outerHTML || "";
      const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
        .map((element) => element.textContent || "")
        .join("\n");
      const scripts = Array.from(document.scripts)
        .map((script) => script.textContent || "")
        .filter(
          (text) =>
            text.includes("topic") ||
            text.includes("title") ||
            /[ก-๙]/.test(text),
        )
        .slice(0, 8)
        .join("\n");

      return [
        "__AI_MAIN_POST_STORY_START__",
        displayPostStoryText,
        "__AI_MAIN_POST_STORY_END__",
        displayPostStoryHtml,
        headings,
        document.body.innerText,
        document.title,
        readMeta("meta[property='og:title']"),
        readMeta("meta[property='og:description']"),
        readMeta("meta[name='description']"),
        scripts,
      ].join("\n");
    });

    return [domPayload, ...networkPayloads].filter(Boolean);
  } finally {
    await browser.close();
  }
}

async function fetchPantipMetadata(sourceUrl: string): Promise<PantipMetadata> {
  const topicId = sourceUrl.match(/\/topic\/(\d+)/)?.[1] || "";
  const payloads: { payload: string; source: string }[] = [];

  try {
    payloads.push({
      payload: await fetchPantipHtml(sourceUrl),
      source: "fetch-html",
    });
  } catch (error) {
    console.info(
      "[pantip-preview] direct fetch failed, trying browser extraction",
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  const titleCandidates: Candidate[] = [];
  const fallbackExcerptCandidates: Candidate[] = [];

  for (const payloadInfo of payloads) {
    const extracted = extractMetadataCandidatesFromPayload(
      payloadInfo.payload,
      payloadInfo.source,
    );
    titleCandidates.push(...extracted.titleCandidates);
    fallbackExcerptCandidates.push(...extracted.excerptCandidates);
  }

  let title = pickBestPantipContent(titleCandidates, {
    minimumThaiCharacters: 6,
    maxLength: 150,
  });

  if (!title) {
    const browserPayloads = await readBrowserPayloads(sourceUrl, topicId);

    for (const [index, payload] of browserPayloads.entries()) {
      payloads.push({ payload, source: `browser:${index}` });
      const extracted = extractMetadataCandidatesFromPayload(
        payload,
        `browser:${index}`,
      );
      titleCandidates.push(...extracted.titleCandidates);
      fallbackExcerptCandidates.push(...extracted.excerptCandidates);
    }

    title = pickBestPantipContent(titleCandidates, {
      minimumThaiCharacters: 6,
      maxLength: 150,
    });
  }

  if (!title) {
    throw new Error(
      "อ่านหัวข้อกระทู้ Pantip ไม่สำเร็จ ระบบจะไม่สร้างการ์ดจากข้อความเมนูหรือ footer ของ Pantip กรุณาลองลิงก์อื่นหรือเปิด Runtime Logs เพื่อตรวจรายละเอียด",
    );
  }

  const topicBodyCandidates: Candidate[] = [];

  for (const payloadInfo of payloads) {
    const extracted = extractMetadataCandidatesFromPayload(
      payloadInfo.payload,
      payloadInfo.source,
      title.value,
    );
    topicBodyCandidates.push(...extracted.topicBodyCandidates);
  }

  let topicBodyStart = pickFirstTopicBodyStart(topicBodyCandidates, 520);

  if (!topicBodyStart) {
    const browserPayloads = await readBrowserPayloads(sourceUrl, topicId);

    for (const [index, payload] of browserPayloads.entries()) {
      const source = `browser-retry:${index}`;
      const extracted = extractMetadataCandidatesFromPayload(
        payload,
        source,
        title.value,
      );
      topicBodyCandidates.push(...extracted.topicBodyCandidates);
      fallbackExcerptCandidates.push(...extracted.excerptCandidates);
    }

    topicBodyStart = pickFirstTopicBodyStart(topicBodyCandidates, 520);
  }

  const metadataFallbackExcerptCandidates = fallbackExcerptCandidates.filter(
    (candidate) =>
      [
        "fetch-html:og:description",
        "fetch-html:twitter:description",
        "fetch-html:description",
      ].includes(candidate.source),
  );
  const fallbackExcerpt = pickBestPantipContent(
    metadataFallbackExcerptCandidates,
    {
      minimumThaiCharacters: 8,
      maxLength: 300,
    },
  );
  const safeExcerpt =
    topicBodyStart?.value ||
    (fallbackExcerpt?.value &&
    !fallbackExcerpt.value.includes(title.value) &&
    fallbackExcerpt.value !== title.value &&
    !hasCommentMarker(fallbackExcerpt.value)
      ? fallbackExcerpt.value
      : "อ่านรายละเอียดต่อได้ที่ลิงก์ต้นทาง");

  console.info("[pantip-preview] metadata extracted", {
    titleSource: title.source,
    excerptSource:
      topicBodyStart?.source || fallbackExcerpt?.source || "fallback",
    titleLength: title.value.length,
    excerptLength: safeExcerpt.length,
    usedStrictTopicBodyStart: Boolean(topicBodyStart),
  });

  return {
    title: title.value,
    excerpt: safeExcerpt,
    source: `${title.source}/${topicBodyStart?.source || fallbackExcerpt?.source || "fallback"}`,
  };
}

async function renderReadableCardImage(input: {
  title: string;
  excerpt: string;
  sourceUrl: string;
}) {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--hide-scrollbars",
      "--disable-web-security",
      "--disable-features=Translate,BackForwardCache,AcceptCHFrame",
    ],
    defaultViewport: CARD_VIEWPORT,
    executablePath: await getExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(CARD_VIEWPORT);
    await page.setContent(buildFallbackCardHtml(input), { waitUntil: "load" });
    await page.evaluate(async () => {
      document.body.style.margin = "0";
      document.documentElement.style.background = "#0f172a";
      window.scrollTo(0, 0);

      if ("fonts" in document) {
        await document.fonts.ready;
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 400));

    return Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 88,
        fullPage: false,
        captureBeyondViewport: false,
      }),
    );
  } finally {
    await browser.close();
  }
}

export async function createPantipPreviewSnapshot(sourceUrl: string) {
  const metadata = await fetchPantipMetadata(sourceUrl);
  const warnings = detectPantipRiskWarnings(
    `${metadata.title}\n${metadata.excerpt}`,
  );
  const screenshotBuffer = await renderReadableCardImage({
    title: metadata.title,
    excerpt: metadata.excerpt,
    sourceUrl,
  });

  return {
    sourceUrl,
    title: metadata.title,
    excerpt: metadata.excerpt,
    screenshotDataUrl: buildImageDataUrl(screenshotBuffer, "image/jpeg"),
    screenshotMimeType: "image/jpeg" as const,
    imageMode: "readable_card" as const,
    warnings,
  } satisfies PantipPreviewSnapshot;
}
