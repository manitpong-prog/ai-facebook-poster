export type NewsSource = {
  id: string;
  name: string;
  category: "world" | "football" | "custom";
  rssUrl: string;
};

export type NewsFeedItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
};

export type NewsArticleContent = {
  title: string;
  summary: string;
  articleText: string;
  sourceUrl: string;
};

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "bbc-world",
    name: "BBC World",
    category: "world",
    rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    id: "bbc-football",
    name: "BBC Football",
    category: "football",
    rssUrl: "https://feeds.bbci.co.uk/sport/football/rss.xml",
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    category: "world",
    rssUrl: "https://www.theguardian.com/world/rss",
  },
  {
    id: "guardian-football",
    name: "The Guardian Football",
    category: "football",
    rssUrl: "https://www.theguardian.com/football/rss",
  },
  {
    id: "cnn-world",
    name: "CNN World",
    category: "world",
    rssUrl: "http://rss.cnn.com/rss/edition_world.rss",
  },
];

const MENU_OR_BOILERPLATE_PATTERNS = [
  /subscribe/i,
  /sign in/i,
  /register/i,
  /privacy policy/i,
  /terms of service/i,
  /cookie/i,
  /advertisement/i,
  /all rights reserved/i,
  /skip to/i,
  /newsletter/i,
];

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, codePoint: string) => {
      const parsed = Number.parseInt(codePoint, 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : "";
    });
}

function stripHtml(value: string) {
  return normalizeText(
    decodeHtmlEntities(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractTag(block: string, tagName: string) {
  const match = block.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );

  return match?.[1] ? stripHtml(match[1]) : "";
}

function extractRawTag(block: string, tagName: string) {
  const match = block.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );

  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : "";
}

function extractLink(block: string) {
  const atomLinkMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);

  if (atomLinkMatch?.[1]) {
    return decodeHtmlEntities(atomLinkMatch[1]).trim();
  }

  return extractTag(block, "link") || extractTag(block, "guid");
}

function buildStableItemId(link: string, title: string) {
  const value = `${link}\n${title}`;
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function ensureHttpUrl(value: string, label = "URL") {
  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`${label} ไม่ถูกต้อง`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} ต้องขึ้นต้นด้วย http หรือ https เท่านั้น`);
  }

  return parsed.toString();
}

export function getNewsSources() {
  return NEWS_SOURCES;
}

export function getNewsSourceById(sourceId: string) {
  return NEWS_SOURCES.find((source) => source.id === sourceId) || null;
}

export function resolveNewsSource(input: {
  sourceId?: string;
  customRssUrl?: string;
  customSourceName?: string;
}) {
  const builtInSource = input.sourceId ? getNewsSourceById(input.sourceId) : null;

  if (builtInSource) {
    return builtInSource;
  }

  if (!input.customRssUrl?.trim()) {
    throw new Error("กรุณาเลือกแหล่งข่าวหรือใส่ RSS URL");
  }

  const rssUrl = ensureHttpUrl(input.customRssUrl, "RSS URL");

  return {
    id: "custom",
    name: input.customSourceName?.trim() || "Custom RSS",
    category: "custom" as const,
    rssUrl,
  } satisfies NewsSource;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8,th-TH;q=0.7,th;q=0.6",
      "User-Agent":
        "Mozilla/5.0 (compatible; AI-Facebook-Poster/1.0; +https://example.com/rss-reader)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`โหลดข้อมูลไม่สำเร็จ (HTTP ${response.status})`);
  }

  return response.text();
}

export async function fetchNewsFeed(source: NewsSource) {
  const rssText = await fetchText(source.rssUrl);
  const itemBlocks = [
    ...rssText.matchAll(/<item\b[\s\S]*?<\/item>/gi),
  ].map((match) => match[0]);
  const atomBlocks = itemBlocks.length
    ? []
    : [...rssText.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(
        (match) => match[0],
      );
  const blocks = itemBlocks.length ? itemBlocks : atomBlocks;

  if (!blocks.length) {
    throw new Error("อ่าน RSS ไม่สำเร็จ: ไม่พบรายการข่าวใน feed นี้");
  }

  return blocks
    .map((block): NewsFeedItem | null => {
      const title = extractTag(block, "title");
      const link = extractLink(block);
      const summary =
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        stripHtml(extractRawTag(block, "content:encoded"));
      const publishedAt =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated") ||
        null;

      if (!title || !link) {
        return null;
      }

      let normalizedLink = link;

      try {
        normalizedLink = new URL(link, source.rssUrl).toString();
      } catch {
        return null;
      }

      return {
        id: buildStableItemId(normalizedLink, title),
        sourceId: source.id,
        sourceName: source.name,
        title: title.slice(0, 240),
        link: normalizedLink,
        summary: summary.slice(0, 700),
        publishedAt,
      };
    })
    .filter((item): item is NewsFeedItem => Boolean(item))
    .slice(0, 30);
}

function extractMetaContent(html: string, key: string) {
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
      return stripHtml(match[1]);
    }
  }

  return "";
}

function extractArticleParagraphs(html: string) {
  const articleMatch = html.match(/<article\b[\s\S]*?<\/article>/i);
  const searchArea = articleMatch?.[0] || html;
  const paragraphMatches = [...searchArea.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];

  return paragraphMatches
    .map((match) => stripHtml(match[1] || ""))
    .filter((paragraph) => {
      if (paragraph.length < 35) {
        return false;
      }

      return !MENU_OR_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(paragraph));
    })
    .join("\n\n");
}

export async function fetchNewsArticleContent(input: {
  title: string;
  summary: string;
  sourceUrl: string;
}) {
  const sourceUrl = ensureHttpUrl(input.sourceUrl, "ลิงก์ข่าว");

  try {
    const html = await fetchText(sourceUrl);
    const metaTitle =
      extractMetaContent(html, "og:title") ||
      extractMetaContent(html, "twitter:title");
    const metaSummary =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "twitter:description");
    const articleText = normalizeText(extractArticleParagraphs(html));

    return {
      title: normalizeText(metaTitle || input.title),
      summary: normalizeText(metaSummary || input.summary || input.title),
      articleText: articleText.slice(0, 6500),
      sourceUrl,
    } satisfies NewsArticleContent;
  } catch (error) {
    console.warn("Failed to fetch full news article; falling back to RSS summary", {
      sourceUrl,
      error,
    });

    return {
      title: normalizeText(input.title),
      summary: normalizeText(input.summary || input.title),
      articleText: "",
      sourceUrl,
    } satisfies NewsArticleContent;
  }
}
