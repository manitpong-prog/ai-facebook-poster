export type PantipTopicUrlResult =
  | {
      ok: true;
      sourceUrl: string;
      topicId: string;
    }
  | {
      ok: false;
      error: "required" | "invalid_url" | "invalid_domain" | "invalid_topic";
    };

export function normalizePantipTopicUrl(value: string): PantipTopicUrlResult {
  const rawValue = value.trim();

  if (!rawValue) {
    return { ok: false, error: "required" };
  }

  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    return { ok: false, error: "invalid_url" };
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname !== "pantip.com" && hostname !== "www.pantip.com") {
    return { ok: false, error: "invalid_domain" };
  }

  const topicMatch = url.pathname.match(/^\/topic\/(\d+)\/?$/);

  if (!topicMatch?.[1]) {
    return { ok: false, error: "invalid_topic" };
  }

  url.protocol = "https:";
  url.hostname = "pantip.com";
  url.hash = "";

  return {
    ok: true,
    sourceUrl: url.toString(),
    topicId: topicMatch[1],
  };
}

export function getPantipUrlErrorMessage(
  error: Extract<PantipTopicUrlResult, { ok: false }>["error"],
) {
  if (error === "required") {
    return "กรุณาใส่ลิงก์กระทู้ Pantip";
  }

  if (error === "invalid_url") {
    return "รูปแบบ URL ไม่ถูกต้อง";
  }

  if (error === "invalid_domain") {
    return "รองรับเฉพาะลิงก์จาก pantip.com เท่านั้น";
  }

  return "รองรับเฉพาะลิงก์รูปแบบ https://pantip.com/topic/เลขกระทู้ เท่านั้น";
}
