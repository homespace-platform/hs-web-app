/**
 * Mã hóa URL video thành endpoint streaming nội bộ của Next.js
 * Giúp phát video HTML5 mượt mà mà không làm lộ URL S3 bucket / AWS ra ngoài browser.
 */
export function getSafeVideoStreamUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("/api/video")) return rawUrl;

  try {
    // Client-safe base64 encoding
    const encoded =
      typeof window !== "undefined"
        ? window.btoa(unescape(encodeURIComponent(rawUrl)))
        : Buffer.from(rawUrl).toString("base64url");
    return `/api/video?v=${encodeURIComponent(encoded)}`;
  } catch {
    return rawUrl;
  }
}
