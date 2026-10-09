import featuredLocationsData from "@/data/featured-locations.json";

interface PlaceSuggestion {
  label: string;
  searchText: string;
}

export interface FeaturedProvinceData {
  code: string;
  name: string;
  locations: string[];
}

const dataMap = featuredLocationsData as Record<string, FeaturedProvinceData>;

function normalizeProvinceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(thành phố|tỉnh)\s+/i, "")
    .trim();
}

/**
 * Lấy danh sách địa điểm nổi bật hardcode theo mã Tỉnh/Thành hoặc tên Tỉnh/Thành
 */
export function getFeaturedLocationsByProvince(
  provinceCode?: string | number,
  provinceName?: string
): PlaceSuggestion[] {
  // 1. Tìm theo mã code tỉnh (2 chữ số, ví dụ "01", "79", "48")
  if (provinceCode !== undefined && provinceCode !== null) {
    const raw = String(provinceCode).trim();
    if (raw) {
      const padded = raw.padStart(2, "0");
      if (dataMap[padded]?.locations) {
        return dataMap[padded].locations.map((loc) => ({
          label: loc,
          searchText: `Tìm chỗ ở gần ${loc}`,
        }));
      }
    }
  }

  // 2. Tìm theo tên tỉnh nếu mã code chưa khớp
  if (provinceName) {
    const normalizedInput = normalizeProvinceName(provinceName);
    for (const key of Object.keys(dataMap)) {
      const item = dataMap[key];
      const normalizedTarget = normalizeProvinceName(item.name);
      if (
        normalizedInput === normalizedTarget ||
        normalizedInput.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedInput)
      ) {
        return item.locations.map((loc) => ({
          label: loc,
          searchText: `Tìm chỗ ở gần ${loc}`,
        }));
      }
    }
  }

  // 3. Mặc định fallback về TP.HCM ("79")
  const defaultItem = dataMap["79"];
  if (defaultItem?.locations) {
    return defaultItem.locations.map((loc) => ({
      label: loc,
      searchText: `Tìm chỗ ở gần ${loc}`,
    }));
  }

  return [];
}
