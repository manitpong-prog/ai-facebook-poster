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

const VIEWPORT = {
  width: 1080,
  height: 720,
  deviceScaleFactor: 1,
};

const BLOCKED_RESOURCE_TYPES = new Set(["image", "media", "font"]);
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

export async function createPantipPreviewSnapshot(sourceUrl: string) {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--hide-scrollbars",
      "--disable-web-security",
      "--disable-features=Translate,BackForwardCache,AcceptCHFrame",
    ],
    defaultViewport: VIEWPORT,
    executablePath: await getExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
    });
    page.setDefaultNavigationTimeout(18_000);
    page.setDefaultTimeout(10_000);

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
      timeout: 18_000,
    });
    await page.waitForSelector("body", { timeout: 8_000 });

    await page.evaluate(() => {
      const selectorsToHide = [
        "iframe",
        "[class*='comment']",
        "[id*='comment']",
        ".pt-list-item__title ~ * [class*='comment']",
      ];

      for (const selector of selectorsToHide) {
        document.querySelectorAll(selector).forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.visibility = "hidden";
          }
        });
      }
    });

    await page.evaluate(() => window.scrollTo(0, 0));

    const metadata = await page.evaluate(() => {
      const titleSelectors = [
        "h1",
        "meta[property='og:title']",
        "title",
      ];
      const descriptionSelectors = [
        "meta[property='og:description']",
        "meta[name='description']",
        "article",
        "main",
        "body",
      ];

      function readSelector(selectors: string[]) {
        for (const selector of selectors) {
          const element = document.querySelector(selector);

          if (!element) {
            continue;
          }

          if (element instanceof HTMLMetaElement) {
            const content = element.content?.trim();

            if (content) {
              return content;
            }
          }

          const text = element.textContent?.trim();

          if (text) {
            return text;
          }
        }

        return "";
      }

      return {
        title: readSelector(titleSelectors),
        excerpt: readSelector(descriptionSelectors),
      };
    });

    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 70,
        fullPage: false,
        captureBeyondViewport: false,
        clip: {
          x: 0,
          y: 0,
          width: VIEWPORT.width,
          height: 620,
        },
      }),
    );

    const title = truncateText(metadata.title || "กระทู้ Pantip", 140);
    const excerpt = truncateText(metadata.excerpt || title, 360);
    const warnings = detectPantipRiskWarnings(`${title}\n${excerpt}`);

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
