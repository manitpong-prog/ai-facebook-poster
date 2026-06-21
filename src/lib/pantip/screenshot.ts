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
  warnings: ReturnType<typeof detectPantipRiskWarnings>;
};

const MOBILE_VIEWPORT = {
  width: 430,
  height: 932,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

const MIN_RENDERED_TEXT_LENGTH = 80;

const BLOCKED_RESOURCE_TYPES = new Set(["media", "font"]);
const BLOCKED_URL_PARTS = [
  "doubleclick.net",
  "googlesyndication.com",
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "facebook.com/tr",
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

type PantipPageMetadata = {
  title: string;
  excerpt: string;
  captureY: number;
  renderedTextLength: number;
  foundTitleElement: boolean;
  needsFallbackCard: boolean;
};

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
      padding: 28px;
      background: linear-gradient(135deg, #2c2260 0%, #1d1740 48%, #101827 100%);
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        padding: 8px 14px;
        color: #fde68a;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.01em;
      ">Pantip topic</div>
      <h1 style="
        margin: 28px 0 0;
        max-width: 100%;
        font-size: 30px;
        line-height: 1.24;
        font-weight: 800;
        color: #ffffff;
      ">${escapeHtml(input.title)}</h1>
      <p style="
        margin: 22px 0 0;
        max-width: 100%;
        font-size: 18px;
        line-height: 1.58;
        color: #dbeafe;
      ">${escapeHtml(input.excerpt)}</p>
      <div style="
        margin-top: 28px;
        border-radius: 20px;
        background: rgba(15,23,42,0.68);
        border: 1px solid rgba(148,163,184,0.28);
        padding: 16px 18px;
        color: #bfdbfe;
        font-size: 15px;
        line-height: 1.45;
      ">อ่านต้นทาง: ${escapeHtml(input.sourceUrl)}</div>
    </section>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function createPantipPreviewSnapshot(sourceUrl: string) {
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

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
    });
    page.setDefaultNavigationTimeout(22_000);
    page.setDefaultTimeout(12_000);

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const requestUrl = request.url().toLowerCase();
      const resourceType = request.resourceType();

      if (
        BLOCKED_RESOURCE_TYPES.has(resourceType) ||
        BLOCKED_URL_PARTS.some((blockedPart) => requestUrl.includes(blockedPart))
      ) {
        void request.abort();
        return;
      }

      void request.continue();
    });

    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 22_000,
    });
    await page.waitForSelector("body", { timeout: 8_000 });
    await page.waitForFunction(
      () => document.body.innerText.trim().length > 60,
      { timeout: 8_000 },
    ).catch(() => undefined);

    await page.evaluate(() => {
      const style = document.createElement("style");
      style.setAttribute("data-ai-pantip-preview", "true");
      style.textContent = `
        html,
        body {
          width: 430px !important;
          max-width: 430px !important;
          overflow-x: hidden !important;
          background: #f8fafc !important;
        }
        iframe,
        [class*="comment"],
        [id*="comment"],
        [class*="Comment"],
        [id*="Comment"],
        [data-testid*="comment"],
        [data-testid*="Comment"] {
          visibility: hidden !important;
        }
        [class*="ads"],
        [id*="ads"],
        [class*="Ads"],
        [id*="Ads"],
        [class*="banner"],
        [id*="banner"] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    });

    const metadata = (await page.evaluate(() => {
      function normalize(value: string) {
        return value.replace(/\s+/g, " ").trim();
      }

      function readMeta(selector: string) {
        const element = document.querySelector(selector);

        if (element instanceof HTMLMetaElement) {
          return element.content?.trim() || "";
        }

        return "";
      }

      function readSelector(selectors: string[]) {
        for (const selector of selectors) {
          const element = document.querySelector(selector);

          if (!element) {
            continue;
          }

          if (element instanceof HTMLMetaElement) {
            const content = normalize(element.content || "");

            if (content) {
              return content;
            }
          }

          const text = normalize(element.textContent || "");

          if (text) {
            return text;
          }
        }

        return "";
      }

      const title =
        readMeta("meta[property='og:title']") ||
        readSelector(["h1", "title"]);
      const excerpt =
        readMeta("meta[property='og:description']") ||
        readMeta("meta[name='description']") ||
        readSelector(["article", "main", "body"]);
      const cleanTitle = normalize(
        title.replace(/\s*-\s*Pantip\s*$/i, "").replace(/\s*\|\s*Pantip\s*$/i, ""),
      );
      const titleProbe = cleanTitle.slice(0, Math.min(cleanTitle.length, 30));
      let captureY = 0;
      let foundTitleElement = false;

      if (titleProbe.length >= 10) {
        const elements = Array.from(
          document.querySelectorAll("h1,h2,h3,article,main,section,div,span"),
        );
        const targetElement = elements.find((element) =>
          normalize(element.textContent || "").includes(titleProbe),
        );

        if (targetElement) {
          foundTitleElement = true;
          const rect = targetElement.getBoundingClientRect();
          captureY = Math.max(0, rect.top + window.scrollY - 48);
        }
      }

      const renderedTextLength = normalize(document.body.innerText || "").length;

      return {
        title: cleanTitle || title,
        excerpt,
        captureY,
        renderedTextLength,
        foundTitleElement,
        needsFallbackCard: renderedTextLength < 160 || !foundTitleElement,
      };
    })) as PantipPageMetadata;

    const title = truncateText(stripPantipSuffix(metadata.title) || "กระทู้ Pantip", 140);
    const excerpt = truncateText(metadata.excerpt || title, 360);
    const warnings = detectPantipRiskWarnings(`${title}\n${excerpt}`);
    const needsFallbackCard =
      metadata.needsFallbackCard ||
      !metadata.foundTitleElement ||
      metadata.renderedTextLength < MIN_RENDERED_TEXT_LENGTH;

    if (needsFallbackCard) {
      await page.evaluate(
        ({ html }) => {
          document.body.innerHTML = html;
          document.body.style.margin = "0";
          document.documentElement.style.background = "#101827";
        },
        {
          html: buildFallbackCardHtml({
            title,
            excerpt,
            sourceUrl,
          }),
        },
      );
    } else {
      await page.evaluate((captureY) => window.scrollTo(0, captureY), metadata.captureY);
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 82,
        fullPage: false,
        captureBeyondViewport: false,
      }),
    );

    return {
      sourceUrl,
      title,
      excerpt,
      screenshotDataUrl: buildImageDataUrl(screenshotBuffer, "image/jpeg"),
      screenshotMimeType: "image/jpeg" as const,
      warnings,
    } satisfies PantipPreviewSnapshot;
  } finally {
    await browser.close();
  }
}
