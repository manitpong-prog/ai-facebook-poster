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
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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

function buildFallbackCardHtml(input: {
  title: string;
  excerpt: string;
  sourceUrl: string;
}) {
  return `
    <section id="ai-pantip-source-card" style="
      box-sizing: border-box;
      width: 100%;
      min-height: 932px;
      padding: 18px;
      background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="
        overflow: hidden;
        min-height: 892px;
        border-radius: 34px;
        border: 1px solid rgba(148,163,184,0.28);
        background: #1e3a8a;
        box-shadow: 0 22px 70px rgba(0,0,0,0.34);
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 18px;
          background: #2f245f;
          color: #fde68a;
          font-size: 15px;
          font-weight: 800;
        ">
          <span>Pantip</span>
          <span style="font-size: 12px; color: #ddd6fe; font-weight: 700;">กระทู้น่าอ่าน</span>
        </div>
        <div style="padding: 24px 22px 22px;">
          <div style="
            display: inline-flex;
            border-radius: 999px;
            background: rgba(253,224,71,0.16);
            border: 1px solid rgba(253,224,71,0.30);
            padding: 7px 12px;
            color: #fde047;
            font-size: 13px;
            font-weight: 760;
          ">จากลิงก์ต้นทาง</div>
          <h1 style="
            margin: 22px 0 0;
            font-size: 27px;
            line-height: 1.3;
            font-weight: 860;
            color: #ffffff;
            letter-spacing: -0.01em;
          ">${escapeHtml(input.title)}</h1>
          <div style="
            margin-top: 18px;
            padding: 18px;
            border-radius: 22px;
            background: rgba(15,23,42,0.35);
            border: 1px solid rgba(191,219,254,0.22);
          ">
            <div style="
              margin-bottom: 10px;
              color: #cbd5e1;
              font-size: 13px;
              font-weight: 700;
            ">ตัวอย่างข้อความสั้น ๆ</div>
            <p style="
              margin: 0;
              font-size: 19px;
              line-height: 1.62;
              color: #e2e8f0;
              font-weight: 520;
            ">${escapeHtml(input.excerpt)}</p>
          </div>
          <div style="
            margin-top: 22px;
            border-radius: 20px;
            background: rgba(15,23,42,0.68);
            border: 1px solid rgba(191,219,254,0.28);
            padding: 14px 16px;
            color: #bfdbfe;
            font-size: 14px;
            line-height: 1.5;
            word-break: break-word;
          ">อ่านต้นทาง: ${escapeHtml(input.sourceUrl)}</div>
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

  const ogTitle = matchMetaContent(html, "og:title");
  const ogDescription = matchMetaContent(html, "og:description");
  const description = matchMetaContent(html, "description");
  const rawTitle = stripPantipSuffix(ogTitle || matchTitle(html) || "กระทู้ Pantip");

  const bodyText = normalizeText(decodeHtmlEntities(stripHtmlTags(html)));
  const rawExcerpt = ogDescription || description || bodyText || rawTitle;

  const title = truncateText(rawTitle || "กระทู้ Pantip", 140) || "กระทู้ Pantip";
  let excerpt = truncateText(rawExcerpt || title, 320) || title;

  if (excerpt === title && bodyText) {
    const withoutTitle = bodyText.replace(title, "").trim();
    excerpt = truncateText(withoutTitle || title, 320) || title;
  }

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
