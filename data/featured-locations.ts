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
  // Match by name, not provider ID.
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

  return [];
}
