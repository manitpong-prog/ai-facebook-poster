type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  userName?: string | null;
};

const debugResetLinks = new Map<
  string,
  {
    url: string;
    createdAt: Date;
  }
>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isPasswordResetDebugEnabled() {
  return process.env.PASSWORD_RESET_DEBUG_LINKS === "1";
}

export function rememberPasswordResetDebugLink(email: string, resetUrl: string) {
  debugResetLinks.set(normalizeEmail(email), {
    url: resetUrl,
    createdAt: new Date(),
  });
}

export function getPasswordResetDebugLink(email: string) {
  if (!isPasswordResetDebugEnabled()) {
    return null;
  }

  const item = debugResetLinks.get(normalizeEmail(email));

  if (!item) {
    return null;
  }

  // Keep the debug link short-lived in memory. Better Auth still validates the
  // real token expiry; this just avoids showing an old helper link in local dev.
  const ageMs = Date.now() - item.createdAt.getTime();
  const maxAgeMs = 15 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    debugResetLinks.delete(normalizeEmail(email));
    return null;
  }

  return item.url;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendViaResend(input: PasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return false;
  }

  const from =
    process.env.PASSWORD_RESET_FROM?.trim() ||
    "AI Facebook Poster <onboarding@resend.dev>";
  const safeName = input.userName?.trim() || "ผู้ใช้งาน";
  const subject = "ตั้งรหัสผ่านใหม่สำหรับ AI Facebook Poster";
  const text = [
    `สวัสดี ${safeName}`,
    "",
    "กดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่:",
    input.resetUrl,
    "",
    "ถ้าคุณไม่ได้ขอเปลี่ยนรหัสผ่าน สามารถมองข้ามอีเมลนี้ได้",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:20px">ตั้งรหัสผ่านใหม่</h1>
      <p>สวัสดี ${escapeHtml(safeName)}</p>
      <p>กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่สำหรับ AI Facebook Poster</p>
      <p>
        <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#2563eb;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
          ตั้งรหัสผ่านใหม่
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">ถ้าปุ่มกดไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดใน browser:</p>
      <p style="font-size:13px;word-break:break-all;color:#334155">${escapeHtml(input.resetUrl)}</p>
      <p style="font-size:13px;color:#64748b">ถ้าคุณไม่ได้ขอเปลี่ยนรหัสผ่าน สามารถมองข้ามอีเมลนี้ได้</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend password reset email failed: ${response.status} ${body}`);
  }

  return true;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  rememberPasswordResetDebugLink(input.to, input.resetUrl);

  const sentByResend = await sendViaResend(input);

  if (sentByResend) {
    return;
  }

  console.warn(
    [
      "[Password Reset] RESEND_API_KEY is not configured.",
      `Email: ${input.to}`,
      `Reset URL: ${input.resetUrl}`,
      "Set RESEND_API_KEY + PASSWORD_RESET_FROM for real email delivery.",
      "For temporary local testing, set PASSWORD_RESET_DEBUG_LINKS=1 to show the reset link on /forgot-password.",
    ].join("\n"),
  );
}
