const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

type FacebookErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export type PublishFacebookPostInput = {
  pageId: string;
  pageAccessToken: string;
  message: string;
};

export type PublishFacebookPostResult = {
  id: string;
};

export class FacebookApiError extends Error {
  details?: FacebookErrorPayload;

  constructor(message: string, details?: FacebookErrorPayload) {
    super(message);
    this.name = "FacebookApiError";
    this.details = details;
  }
}

function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new FacebookApiError(`${label} is required`);
  }

  return normalized;
}

function buildFacebookApiError(payload: unknown, status: number) {
  const errorPayload = payload as FacebookErrorPayload;
  const metaMessage = errorPayload.error?.message;
  const metaCode = errorPayload.error?.code;
  const metaType = errorPayload.error?.type;

  const details = [
    metaMessage,
    metaType ? `type=${metaType}` : "",
    typeof metaCode === "number" ? `code=${metaCode}` : "",
    `http=${status}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return new FacebookApiError(
    details || `Facebook API request failed with HTTP ${status}`,
    errorPayload,
  );
}

export async function publishTextToFacebookPage({
  pageId,
  pageAccessToken,
  message,
}: PublishFacebookPostInput): Promise<PublishFacebookPostResult> {
  const normalizedPageId = normalizeRequiredText(pageId, "Facebook Page ID");
  const normalizedAccessToken = normalizeRequiredText(
    pageAccessToken,
    "Facebook Page Access Token",
  );
  const normalizedMessage = normalizeRequiredText(message, "Facebook message");

  const body = new URLSearchParams({
    message: normalizedMessage,
    access_token: normalizedAccessToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE_URL}/${encodeURIComponent(normalizedPageId)}/feed`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | PublishFacebookPostResult
    | FacebookErrorPayload
    | null;

  if (!response.ok) {
    throw buildFacebookApiError(payload, response.status);
  }

  if (!payload || !("id" in payload) || !payload.id) {
    throw new FacebookApiError("Facebook API did not return a post id");
  }

  return {
    id: payload.id,
  };
}
