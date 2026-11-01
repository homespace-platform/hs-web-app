/** Prefer last update so edited/republished cards show "vừa xong" / minutes, not the original publish age. */
export function formatListingTimeAgo(
  ...candidates: Array<string | null | undefined>
): string {
  const stamp = candidates.find((value) => typeof value === "string" && value.trim());
  return stamp ? formatTimeAgo(stamp) : "Vừa xong";
}

export function formatTimeAgo(isoString: string, nowMs = Date.now()): string {
  try {
    const then = new Date(isoString).getTime();
    if (!Number.isFinite(then)) return "Vừa xong";
    const diffMs = nowMs - then;
    if (diffMs < 0) return "Vừa xong";
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "Vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    return new Date(isoString).toLocaleDateString("vi-VN");
  } catch {
    return "Vừa xong";
  }
}
