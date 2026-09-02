/**
 * Formats rental price in VND cleanly for display in Vietnamese:
 * - >= 1,000,000,000 (tỷ): e.g. "1 tỷ/tháng", "1,5 tỷ/tháng"
 * - >= 1,000,000 (triệu): e.g. "5 triệu/tháng", "15,5 triệu/tháng"
 * - >= 1,000 (k / nghìn): e.g. "500k/tháng"
 * - < 1,000: e.g. "500 đ/tháng"
 * Handles special cases like 999,999,999 as "1 tỷ/tháng", never showing ugly floats like "999.999999 triệu/tháng".
 */
export function formatVietnamesePrice(
  amountInVnd: number | null | undefined,
  unit: string = "tháng"
): string {
  if (amountInVnd == null || isNaN(amountInVnd) || amountInVnd <= 0) {
    return "Thỏa thuận";
  }

  // Gần 1 tỷ hoặc lớn hơn (>= 999,900,000) làm tròn thành tỷ
  if (amountInVnd >= 999_900_000) {
    const billions = amountInVnd / 1_000_000_000;
    const rounded = Math.round(billions * 100) / 100;
    const formatted = rounded.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    return `${formatted} tỷ/${unit}`;
  }

  // 1 triệu trở lên
  if (amountInVnd >= 1_000_000) {
    const millions = amountInVnd / 1_000_000;
    const rounded = Math.round(millions * 100) / 100;
    const formatted = rounded.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    return `${formatted} triệu/${unit}`;
  }

  // 1 nghìn trở lên
  if (amountInVnd >= 1_000) {
    const thousands = Math.round(amountInVnd / 1_000);
    return `${thousands}k/${unit}`;
  }

  return `${amountInVnd.toLocaleString("vi-VN")} đ/${unit}`;
}
