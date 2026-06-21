"use client";

import { useMemo, useState } from "react";

import {
  NEWS_CATEGORY_LABELS,
  type NewsFeedItem,
  type NewsSource,
} from "@/lib/news/rss";

type NewsItemsResponse = {
  ok: true;
  source: NewsSource;
  items: NewsFeedItem[];
};

type NewsPostMode = "story" | "short" | "sports";

const NEWS_POST_MODE_OPTIONS: Array<{ id: NewsPostMode; label: string; description: string }> = [
  {
    id: "story",
    label: "เล่าเป็นข่าวแบบเต็มขึ้น",
    description: "เหมาะกับข่าวที่มีรายละเอียด อยากให้เล่าเป็นเรื่องมากกว่าสรุปสั้น",
  },
  {
    id: "short",
    label: "สรุปสั้น",
    description: "เหมาะกับข่าวเร็วหรือข่าวที่ต้องการโพสต์กระชับ",
  },
  {
    id: "sports",
    label: "ข่าวกีฬา / ข่าวบอล",
    description: "เหมาะกับข่าวดีลนักเตะ ทีม โค้ช หรือประเด็นกีฬา",
  },
];

type NewsPreviewResponse = {
  ok: true;
  sourceName: string;
  title: string;
  summary: string;
  articleTextPreview: string;
  sourceUrl: string;
  postMode: NewsPostMode;
  caption: string;
  aiUsage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

type ApiErrorResponse = {
  ok: false;
  error: string;
  technicalMessage?: string;
};

type PublishSuccessResponse = {
  ok: true;
  facebookPostId: string;
  facebookPostUrl: string;
};

type NewsSourceClientProps = {
  sources: NewsSource[];
  hasConnectedFacebookPage: boolean;
  facebookPageLabel: string;
};

type LoadingState = "idle" | "items" | "preview" | "publish";

async function readApiResponse<TSuccess extends { ok: true }>(response: Response) {
  const rawText = await response.text().catch(() => "");
  let payload: TSuccess | ApiErrorResponse | null = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as TSuccess | ApiErrorResponse;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload || payload.ok === false) {
    const errorPayload = payload as ApiErrorResponse | null;

    if (errorPayload?.technicalMessage) {
      throw new Error(`${errorPayload.error}\n\nรายละเอียด: ${errorPayload.technicalMessage}`);
    }

    if (errorPayload?.error) {
      throw new Error(errorPayload.error);
    }

    const textPreview = rawText
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 700);
    const statusDetail = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

    throw new Error(
      textPreview
        ? `Request failed (${statusDetail})\n\nรายละเอียดจาก server: ${textPreview}`
        : `Request failed (${statusDetail}) โดย server ไม่ได้ส่งรายละเอียดกลับมา`,
    );
  }

  return payload as TSuccess;
}

function formatPublishedAt(value: string | null) {
  if (!value) {
    return "ไม่ทราบเวลา";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NewsSourceClient({
  sources,
  hasConnectedFacebookPage,
  facebookPageLabel,
}: NewsSourceClientProps) {
  const [selectedSourceId, setSelectedSourceId] = useState(sources[0]?.id || "");
  const [customRssUrl, setCustomRssUrl] = useState("");
  const [customSourceName, setCustomSourceName] = useState("");
  const [loadedSource, setLoadedSource] = useState<NewsSource | null>(null);
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsFeedItem | null>(null);
  const [preview, setPreview] = useState<NewsPreviewResponse | null>(null);
  const [caption, setCaption] = useState("");
  const [postMode, setPostMode] = useState<NewsPostMode>("story");
  const [styleInstructions, setStyleInstructions] = useState(
    "เขียนเหมือนเล่าให้เพื่อนอ่าน ไม่ต้องขึ้นต้นด้วยชื่อสำนักข่าวหรือคำว่า มีรายงานว่า ไม่ต้องเขียนเหมือนข่าวทีวี และใส่มุมเล่า/ความเห็นเบา ๆ ได้เล็กน้อย",
  );
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<PublishSuccessResponse | null>(null);

  const isBusy = loadingState !== "idle";
  const isCustomSource = selectedSourceId === "custom";
  const sourceOptions = useMemo(
    () => [
      ...sources,
      {
        id: "custom",
        name: "Custom RSS URL",
        category: "custom" as const,
        rssUrl: "",
      },
    ],
    [sources],
  );
  const groupedSourceOptions = useMemo(() => {
    const groups = new Map<string, NewsSource[]>();

    for (const source of sourceOptions) {
      const label = NEWS_CATEGORY_LABELS[source.category] || source.category;
      groups.set(label, [...(groups.get(label) || []), source]);
    }

    return Array.from(groups.entries());
  }, [sourceOptions]);

  async function loadItems() {
    setErrorMessage("");
    setSuccessResult(null);
    setPreview(null);
    setCaption("");
    setSelectedItem(null);
    setLoadingState("items");

    try {
      const params = new URLSearchParams();

      if (isCustomSource) {
        params.set("rssUrl", customRssUrl);
        params.set("sourceName", customSourceName || "Custom RSS");
      } else {
        params.set("sourceId", selectedSourceId);
      }

      const result = await fetch(`/api/news/items?${params.toString()}`, {
        method: "GET",
      });
      const payload = await readApiResponse<NewsItemsResponse>(result);

      setLoadedSource(payload.source);
      setItems(payload.items);
    } catch (error) {
      setItems([]);
      setLoadedSource(null);
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingState("idle");
    }
  }

  async function createPreview(item: NewsFeedItem) {
    setErrorMessage("");
    setSuccessResult(null);
    setPreview(null);
    setCaption("");
    setSelectedItem(item);
    setLoadingState("preview");

    try {
      const result = await fetch("/api/news/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceName: item.sourceName,
          title: item.title,
          summary: item.summary,
          sourceUrl: item.link,
          postMode,
          styleInstructions,
        }),
      });
      const payload = await readApiResponse<NewsPreviewResponse>(result);

      setPreview(payload);
      setCaption(payload.caption);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingState("idle");
    }
  }

  async function publishToFacebook() {
    if (!preview) {
      return;
    }

    setErrorMessage("");
    setSuccessResult(null);
    setLoadingState("publish");

    try {
      const result = await fetch("/api/news/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption,
          sourceUrl: preview.sourceUrl,
        }),
      });
      const payload = await readApiResponse<PublishSuccessResponse>(result);

      setSuccessResult(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingState("idle");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">เลือกแหล่งข่าว RSS</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              ระบบจะดึงรายการข่าวล่าสุดตามหมวดที่เลือก คุณเลือกข่าวเอง แล้วค่อยให้ AI สรุปเป็นภาษาไทยในสไตล์เพจ
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            Facebook Page: <span className="font-semibold text-white">{facebookPageLabel}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200" htmlFor="news-source">
                หมวด / แหล่งข่าว
              </label>
              <select
                id="news-source"
                value={selectedSourceId}
                onChange={(event) => setSelectedSourceId(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                disabled={isBusy}
              >
                {groupedSourceOptions.map(([categoryLabel, categorySources]) => (
                  <optgroup key={categoryLabel} label={categoryLabel}>
                    {categorySources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {isCustomSource ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200" htmlFor="custom-source-name">
                  ชื่อแหล่งข่าว custom
                </label>
                <input
                  id="custom-source-name"
                  value={customSourceName}
                  onChange={(event) => setCustomSourceName(event.target.value)}
                  placeholder="เช่น My Football Feed"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                  disabled={isBusy}
                />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={loadItems}
            disabled={isBusy}
            className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {loadingState === "items" ? "กำลังโหลดข่าว..." : "โหลดรายการข่าว"}
          </button>
        </div>

        {isCustomSource ? (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-slate-200" htmlFor="custom-rss-url">
              Custom RSS URL
            </label>
            <input
              id="custom-rss-url"
              type="url"
              value={customRssUrl}
              onChange={(event) => setCustomRssUrl(event.target.value)}
              placeholder="https://example.com/rss.xml"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              disabled={isBusy}
            />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200" htmlFor="news-post-mode">
              รูปแบบโพสต์
            </label>
            <select
              id="news-post-mode"
              value={postMode}
              onChange={(event) => setPostMode(event.target.value as NewsPostMode)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              disabled={isBusy}
            >
              {NEWS_POST_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-5 text-slate-500">
              {NEWS_POST_MODE_OPTIONS.find((option) => option.id === postMode)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200" htmlFor="news-style">
              สไตล์โพสต์รอบนี้
            </label>
          <textarea
            id="news-style"
            value={styleInstructions}
            onChange={(event) => setStyleInstructions(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
            disabled={isBusy}
          />
          <p className="text-xs leading-5 text-slate-500">
            ระบบยังใช้ Writing Style หลักของเพจด้วย ช่องนี้ใช้ปรับเฉพาะข่าวรอบนี้ เช่น ให้เล่าเหมือนเพื่อนคุยกัน ห้ามขึ้นต้นแบบบอท หรือให้สั้นลงมาก ๆ
          </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {successResult ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          <p className="font-semibold">โพสต์ลง Facebook Page สำเร็จแล้ว</p>
          <p className="mt-1 text-emerald-200">Facebook Post ID: {successResult.facebookPostId}</p>
          {successResult.facebookPostUrl ? (
            <a
              href={successResult.facebookPostUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-emerald-100 underline underline-offset-4"
            >
              เปิดโพสต์บน Facebook
            </a>
          ) : null}
        </div>
      ) : null}

      {items.length ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">รายการข่าวล่าสุด</h2>
              <p className="mt-1 text-xs text-slate-500">
                {loadedSource ? `${NEWS_CATEGORY_LABELS[loadedSource.category]} · ${loadedSource.name}` : "แหล่งข่าว"} · เลือกข่าวที่อยากทำโพสต์เอง
              </p>
            </div>
            <div className="text-xs text-slate-500">พบ {items.length} ข่าว</div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={
                  selectedItem?.id === item.id
                    ? "rounded-2xl border border-blue-400/50 bg-blue-500/10 p-4"
                    : "rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                }
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {item.sourceName} · {formatPublishedAt(item.publishedAt)}
                    </p>
                    <h3 className="mt-2 text-base font-semibold leading-6 text-white">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                        {item.summary}
                      </p>
                    ) : null}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm text-blue-300 underline underline-offset-4"
                    >
                      เปิดข่าวต้นทาง
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => createPreview(item)}
                    disabled={isBusy}
                    className="shrink-0 rounded-2xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    {loadingState === "preview" && selectedItem?.id === item.id
                      ? "กำลังสร้าง..."
                      : "สร้างโพสต์จากข่าวนี้"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {preview ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Preview Caption</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              ตรวจและแก้ข้อความก่อนกดโพสต์ ระบบนี้ไม่โพสต์อัตโนมัติและไม่ใช้รูปข่าว
            </p>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={12}
              className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              disabled={isBusy}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                AI: {preview.aiUsage.model} · tokens: {preview.aiUsage.totalTokens}
              </p>
              <button
                type="button"
                onClick={publishToFacebook}
                disabled={isBusy || !hasConnectedFacebookPage}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {loadingState === "publish" ? "กำลังโพสต์..." : "โพสต์ลง Facebook Page"}
              </button>
            </div>
            {!hasConnectedFacebookPage ? (
              <p className="mt-3 text-sm text-amber-200">
                ยังไม่ได้เชื่อม Facebook Page กรุณาไปตั้งค่าที่เมนู Facebook Page ก่อนโพสต์
              </p>
            ) : null}
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm leading-6 text-slate-300">
            <div>
              <h3 className="font-semibold text-white">ข้อมูลข่าวที่ใช้</h3>
              <p className="mt-2 text-xs text-slate-500">ระบบใช้ข้อมูลนี้เป็นฐานให้ AI สรุป</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">ที่มา</div>
              <p className="mt-1 text-white">{preview.sourceName}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">หัวข้อ</div>
              <p className="mt-1 text-white">{preview.title}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</div>
              <p className="mt-1 whitespace-pre-wrap text-slate-300">{preview.summary || "ไม่มี summary จาก RSS"}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">บทความที่อ่านได้</div>
              <p className="mt-1 whitespace-pre-wrap text-slate-400">
                {preview.articleTextPreview || "อ่านบทความเต็มไม่ได้ ใช้เฉพาะหัวข้อและ summary จาก RSS"}
              </p>
            </div>
            <a
              href={preview.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-blue-300 underline underline-offset-4"
            >
              เปิดข่าวต้นทาง
            </a>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
