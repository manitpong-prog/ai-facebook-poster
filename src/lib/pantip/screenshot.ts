import fs from "node:fs";
import path from "node:path";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer-core";

import { buildImageDataUrl } from "@/lib/pantip/image-data";
import { detectPantipRiskWarnings } from "@/lib/pantip/risk";

export type PantipPreviewSnapshot = {
  sourceUrl: string;
  title: string;
  excerpt: string;
  screenshotDataUrl: string;
  screenshotMimeType: "image/jpeg";
  imageMode: "pantip_screenshot" | "readable_card";
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
      padding: 20px;
      background: #0f172a;
      color: #ffffff;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="
        overflow: hidden;
        min-height: 892px;
        border-radius: 34px;
        border: 1px solid rgba(148,163,184,0.36);
        background: #1f2f5f;
        box-shadow: 0 22px 70px rgba(0,0,0,0.36);
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: #2f245f;
          color: #fde68a;
          font-size: 15px;
          font-weight: 800;
        ">
          <span>Pantip</span>
          <span style="font-size: 12px; color: #d8b4fe; font-weight: 600;">กระทู้น่าอ่าน</span>
        </div>
        <div style="padding: 26px 22px 22px;">
          <div style="
            display: inline-flex;
            border-radius: 999px;
            background: rgba(253,224,71,0.16);
            border: 1px solid rgba(253,224,71,0.28);
            padding: 7px 12px;
            color: #fde047;
            font-size: 13px;
            font-weight: 750;
          ">จากลิงก์ต้นทาง</div>
          <h1 style="
            margin: 24px 0 0;
            font-size: 28px;
            line-height: 1.28;
            font-weight: 850;
            color: #ffffff;
            letter-spacing: -0.01em;
          ">${escapeHtml(input.title)}</h1>
          <p style="
            margin: 22px 0 0;
            font-size: 20px;
            line-height: 1.62;
            color: #dbeafe;
            font-weight: 520;
          ">${escapeHtml(input.excerpt)}</p>
          <div style="
            margin-top: 30px;
            border-radius: 22px;
            background: rgba(15,23,42,0.68);
            border: 1px solid rgba(191,219,254,0.28);
            padding: 16px 18px;
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
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


type VisibleViewportProbe = {
  titleVisible: boolean;
  thaiTextLength: number;
  digitCount: number;
  textLength: number;
  visibleTextPreview: string;
};

async function readVisibleViewportProbe(page: Page, title: string) {
  return (await page.evaluate((titleValue) => {
    function normalize(value: string) {
      return value.replace(/\s+/g, " ").trim();
    }

    function isVisibleElement(element: Element) {
      const rect = element.getBoundingClientRect();

      if (rect.width < 2 || rect.height < 2) {
        return false;
      }

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return false;
      }

      const style = window.getComputedStyle(element);

      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0.05
      );
    }

    const visibleText = normalize(
      Array.from(document.querySelectorAll("body *"))
        .filter(isVisibleElement)
        .map((element) => element.textContent || "")
        .join(" "),
    );
    const titleProbe = normalize(titleValue).slice(0, 18);
    const thaiTextLength = (visibleText.match(/[ก-๙]/g) || []).length;
    const digitCount = (visibleText.match(/[0-9]/g) || []).length;

    return {
      titleVisible: titleProbe.length < 8 || visibleText.includes(titleProbe),
      thaiTextLength,
      digitCount,
      textLength: visibleText.length,
      visibleTextPreview: visibleText.slice(0, 180),
    } satisfies VisibleViewportProbe;
  }, title)) as VisibleViewportProbe;
}

function shouldUseReadableCard(probe: VisibleViewportProbe) {
  const digitRatio = probe.textLength > 0 ? probe.digitCount / probe.textLength : 0;

  return !probe.titleVisible || probe.thaiTextLength < 45 || digitRatio > 0.28;
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
        BLOCKED_URL_PARTS.some((blockedPart) =>
          requestUrl.includes(blockedPart),
        )
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
    await page
      .waitForFunction(() => document.body.innerText.trim().length > 60, {
        timeout: 8_000,
      })
      .catch(() => undefined);

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
        readMeta("meta[property='og:title']") || readSelector(["h1", "title"]);
      const excerpt =
        readMeta("meta[property='og:description']") ||
        readMeta("meta[name='description']") ||
        readSelector(["article", "main", "body"]);
      const cleanTitle = normalize(
        title
          .replace(/\s*-\s*Pantip\s*$/i, "")
          .replace(/\s*\|\s*Pantip\s*$/i, ""),
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

      const renderedTextLength = normalize(
        document.body.innerText || "",
      ).length;

      return {
        title: cleanTitle || title,
        excerpt,
        captureY,
        renderedTextLength,
        foundTitleElement,
        needsFallbackCard: renderedTextLength < 160 || !foundTitleElement,
      };
    })) as PantipPageMetadata;

    const title = truncateText(
      stripPantipSuffix(metadata.title) || "กระทู้ Pantip",
      140,
    );
    const excerpt = truncateText(metadata.excerpt || title, 360);
    const warnings = detectPantipRiskWarnings(`${title}\n${excerpt}`);
    const needsFallbackCard =
      metadata.needsFallbackCard ||
      !metadata.foundTitleElement ||
      metadata.renderedTextLength < MIN_RENDERED_TEXT_LENGTH;

    let imageMode: PantipPreviewSnapshot["imageMode"] = "pantip_screenshot";

    if (needsFallbackCard) {
      imageMode = "readable_card";
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
      await page.evaluate(
        (captureY) => window.scrollTo(0, captureY),
        metadata.captureY,
      );
      await new Promise((resolve) => setTimeout(resolve, 900));

      const visibleProbe = await readVisibleViewportProbe(page, title);

      if (shouldUseReadableCard(visibleProbe)) {
        console.info(
          "[pantip-preview] switching to readable card because rendered screenshot looks incomplete",
          {
            titleVisible: visibleProbe.titleVisible,
            thaiTextLength: visibleProbe.thaiTextLength,
            digitCount: visibleProbe.digitCount,
            textLength: visibleProbe.textLength,
            visibleTextPreview: visibleProbe.visibleTextPreview,
          },
        );
        imageMode = "readable_card";
        await page.evaluate(
          ({ html }) => {
            document.body.innerHTML = html;
            document.body.style.margin = "0";
            document.documentElement.style.background = "#101827";
            window.scrollTo(0, 0);
          },
          {
            html: buildFallbackCardHtml({
              title,
              excerpt,
              sourceUrl,
            }),
          },
        );
      }
    }

    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 84,
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
      imageMode,
      warnings,
    } satisfies PantipPreviewSnapshot;
  } finally {
    await browser.close();
  }
}
