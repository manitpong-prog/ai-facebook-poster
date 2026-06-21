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

const PANTIP_LAYOUT_PHRASES = [
  "Pantip Download App",
  "Pantip Certified Developer",
  "Download App Pantip",
  "Explore",
  "เข้าสู่ระบบ",
  "สมัครสมาชิก",
  "ค้นหา",
  "Pantip Pick",
  "Pantip Trend",
  "Pantip Mall",
  "Pantip Point",
];

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

function stripHtmlTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function matchMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedKey}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedKey}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return "";
}

function matchTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1]).trim() : "";
}

function matchFirstHeading(html: string) {
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return headingMatch?.[1]
    ? decodeHtmlEntities(stripHtmlTags(headingMatch[1])).trim()
    : "";
}

function extractQuotedJsonValue(html: string, keys: string[]) {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`"${escapedKey}"\\s*:\\s*"([^"]{12,500})"`, "i"),
      new RegExp(`&quot;${escapedKey}&quot;\\s*:\\s*&quot;([^&]{12,500})&quot;`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match?.[1]) {
        return decodeHtmlEntities(match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        )).trim();
      }
    }
  }

  return "";
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
      .replace(/\s\/\s/g, " "),
  );
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

function isUsefulPantipContent(value: string, minimumThaiCharacters: number) {
  const normalized = cleanPantipContentText(value);

  if (normalized.length < 10) {
    return false;
  }

  if (countThaiCharacters(normalized) < minimumThaiCharacters) {
    return false;
  }

  if (hasLayoutNoise(normalized)) {
    return false;
  }

  const digitRatio =
    normalized.length > 0 ? countDigits(normalized) / normalized.length : 0;

  return digitRatio <= 0.22;
}

function scoreContentCandidate(value: string) {
  const normalized = cleanPantipContentText(value);
  const thaiCharacters = countThaiCharacters(normalized);
  const lengthScore = Math.min(normalized.length, 260) / 20;
  const noisePenalty = hasLayoutNoise(normalized) ? 300 : 0;
  const digitPenalty = countDigits(normalized) * 1.6;

  return thaiCharacters + lengthScore - noisePenalty - digitPenalty;
}

function pickBestPantipContent(
  candidates: string[],
  fallback: string,
  options?: { minimumThaiCharacters?: number; maxLength?: number },
) {
  const minimumThaiCharacters = options?.minimumThaiCharacters ?? 12;
  const maxLength = options?.maxLength ?? 220;
  const cleanedCandidates = candidates
    .map((candidate) => cleanPantipContentText(candidate))
    .filter((candidate) =>
      isUsefulPantipContent(candidate, minimumThaiCharacters),
    )
    .sort((a, b) => scoreContentCandidate(b) - scoreContentCandidate(a));

  return truncateText(
    cleanedCandidates[0] || cleanPantipContentText(fallback) || "กระทู้ Pantip",
    maxLength,
  );
}

function buildFallbackCardHtml(input: {
  title: string;
  excerpt: string;
  sourceUrl: string;
}) {
  const safeTitle = input.title || "กระทู้ Pantip";
  const safeExcerpt = input.excerpt || input.title || "อ่านรายละเอียดต่อได้ที่ลิงก์ต้นทาง";
  const displayUrl = input.sourceUrl.replace(/^https?:\/\//i, "");

  return `
    <section id="ai-pantip-source-card" style="
      box-sizing: border-box;
      width: 100%;
      min-height: 932px;
      padding: 18px;
      background: #0f172a;
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="
        overflow: hidden;
        min-height: 892px;
        border-radius: 34px;
        border: 1px solid rgba(148,163,184,0.30);
        background: linear-gradient(180deg, #243f96 0%, #1e3a8a 42%, #172554 100%);
        box-shadow: 0 22px 70px rgba(0,0,0,0.38);
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 18px;
          background: #31235e;
          color: #fde68a;
          font-size: 15px;
          font-weight: 850;
        ">
          <span>Pantip</span>
          <span style="font-size: 12px; color: #ddd6fe; font-weight: 750;">กระทู้น่าอ่าน</span>
        </div>

        <div style="padding: 26px 22px 22px;">
          <div style="
            display: inline-flex;
            border-radius: 999px;
            background: rgba(253,224,71,0.16);
            border: 1px solid rgba(253,224,71,0.34);
            padding: 7px 12px;
            color: #fde047;
            font-size: 13px;
            font-weight: 780;
          ">สรุปจากหัวข้อกระทู้</div>

          <h1 style="
            margin: 22px 0 0;
            font-size: 29px;
            line-height: 1.30;
            font-weight: 880;
            color: #ffffff;
            letter-spacing: -0.01em;
          ">${escapeHtml(safeTitle)}</h1>

          <div style="
            margin-top: 22px;
            padding: 18px;
            border-radius: 24px;
            background: rgba(15,23,42,0.44);
            border: 1px solid rgba(191,219,254,0.24);
          ">
            <div style="
              margin-bottom: 10px;
              color: #cbd5e1;
              font-size: 13px;
              font-weight: 760;
            ">ตัวอย่างข้อความสั้น ๆ</div>
            <p style="
              margin: 0;
              font-size: 20px;
              line-height: 1.62;
              color: #e2e8f0;
              font-weight: 540;
            ">${escapeHtml(safeExcerpt)}</p>
          </div>

          <div style="
            margin-top: 24px;
            border-radius: 22px;
            background: rgba(15,23,42,0.72);
            border: 1px solid rgba(191,219,254,0.30);
            padding: 15px 16px;
            color: #bfdbfe;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
          ">อ่านต้นทาง: ${escapeHtml(displayUrl)}</div>
        </div>
      </div>
    </section>
  `;
}

type PantipMetadata = {
  title: string;
  excerpt: string;
};

async function fetchPantipMetadata(sourceUrl: string): Promise<PantipMetadata> {
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

  const html = await response.text();
  const titleCandidates = [
    matchTitle(html),
    matchMetaContent(html, "og:title"),
    matchMetaContent(html, "twitter:title"),
    matchFirstHeading(html),
    extractQuotedJsonValue(html, ["headline", "title", "topic_title"]),
  ];
  const title = pickBestPantipContent(titleCandidates, "กระทู้ Pantip", {
    minimumThaiCharacters: 8,
    maxLength: 140,
  });

  const descriptionCandidates = [
    matchMetaContent(html, "og:description"),
    matchMetaContent(html, "twitter:description"),
    matchMetaContent(html, "description"),
    extractQuotedJsonValue(html, ["description", "excerpt", "message", "body"]),
  ];
  const excerpt = pickBestPantipContent(descriptionCandidates, title, {
    minimumThaiCharacters: 14,
    maxLength: 260,
  });

  return {
    title,
    excerpt,
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
    defaultViewport: MOBILE_VIEWPORT,
    executablePath: await getExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(MOBILE_VIEWPORT);
    await page.setContent(buildFallbackCardHtml(input), {
      waitUntil: "load",
    });
    await page.evaluate(() => {
      document.body.style.margin = "0";
      document.documentElement.style.background = "#0f172a";
      window.scrollTo(0, 0);
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

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
  const title = metadata.title;
  const excerpt = metadata.excerpt;
  const warnings = detectPantipRiskWarnings(`${title}\n${excerpt}`);
  const screenshotBuffer = await renderReadableCardImage({
    title,
    excerpt,
    sourceUrl,
  });

  return {
    sourceUrl,
    title,
    excerpt,
    screenshotDataUrl: buildImageDataUrl(screenshotBuffer, "image/jpeg"),
    screenshotMimeType: "image/jpeg" as const,
    imageMode: "readable_card" as const,
    warnings,
  } satisfies PantipPreviewSnapshot;
}
