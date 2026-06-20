const SUPPORTED_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/i;

export function buildImageDataUrl(buffer: Buffer, mimeType: "image/jpeg" | "image/png") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export function parseImageDataUrl(dataUrl: string) {
  const normalizedDataUrl = dataUrl.trim();
  const match = normalizedDataUrl.match(SUPPORTED_IMAGE_DATA_URL_PATTERN);

  if (!match?.[1]) {
    throw new Error("รองรับเฉพาะรูปภาพ data URL แบบ png, jpeg หรือ webp เท่านั้น");
  }

  const mimeSubtype = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
  const base64 = normalizedDataUrl.replace(SUPPORTED_IMAGE_DATA_URL_PATTERN, "");
  const buffer = Buffer.from(base64, "base64");

  if (buffer.length < 1000) {
    throw new Error("ไฟล์รูปภาพเล็กเกินไปหรืออ่านไม่ได้");
  }

  if (buffer.length > 4 * 1024 * 1024) {
    throw new Error("ไฟล์รูปภาพใหญ่เกินไป กรุณาสร้าง preview ใหม่");
  }

  return {
    buffer,
    mimeType: `image/${mimeSubtype}` as "image/jpeg" | "image/png" | "image/webp",
  };
}
