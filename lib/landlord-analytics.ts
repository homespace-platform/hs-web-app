export type AnalyticsMoney = string | number;
export type AnalyticsReport =
  "revenue" | "receivables" | "occupancy" | "listings" | "funnel";
export type AnalyticsFilters = {
  from: string;
  to: string;
  branchId: string;
  listingId: string;
};

/** Preserve decimal tokens before JSON.parse turns them into floating-point numbers. */
export function parseAnalyticsResponse(raw: string) {
  return JSON.parse(
    raw.replace(
      /("(?:[A-Za-z]*Vnd|vnd)"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      '$1"$2"',
    ),
  );
}

export function analyticsMoney(
  value: AnalyticsMoney | null | undefined,
): string {
  if (value == null) return "—";
  let text = String(value);
  const scientific = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(text);
  if (scientific) {
    const [, sign, integer, fraction = "", exponent] = scientific;
    const digits = integer + fraction;
    const point = integer.length + Number(exponent);
    if (Math.abs(point) > 1000) return `${text} ₫`;
    text =
      sign +
      (point <= 0
        ? `0.${"0".repeat(-point)}${digits}`
        : point >= digits.length
          ? digits + "0".repeat(point - digits.length)
          : `${digits.slice(0, point)}.${digits.slice(point)}`);
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return "—";
  const [whole, fraction] = text.split(".");
  const decimals = fraction?.replace(/0+$/, "");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${decimals ? `,${decimals}` : ""} ₫`;
}

export function analyticsRangeError(from: string, to: string): string | null {
  const month = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;
  if ((from && !month.test(from)) || (to && !month.test(to)))
    return "Chọn tháng hợp lệ.";
  if (!from && !to) return null;
  if (!from || !to) return "Chọn đủ tháng bắt đầu và kết thúc.";
  const index = (value: string) =>
    Number(value.slice(0, 4)) * 12 + Number(value.slice(5));
  const span = index(to) - index(from);
  if (span < 0) return "Tháng kết thúc phải bằng hoặc sau tháng bắt đầu.";
  if (span > 23) return "Mỗi báo cáo hỗ trợ tối đa 24 tháng.";
  return null;
}

export function analyticsDetailHref(
  href: string | null | undefined,
  fallback: string,
): string {
  return href?.startsWith("/dashboard/") && !href.includes("\\")
    ? href
    : fallback;
}

export const analyticsReports: { value: AnalyticsReport; label: string }[] = [
  { value: "revenue", label: "Doanh thu" },
  { value: "receivables", label: "Công nợ" },
  { value: "occupancy", label: "Tỉ lệ lấp đầy" },
  { value: "listings", label: "Hiệu quả tin đăng" },
  { value: "funnel", label: "Chuyển đổi" },
];
