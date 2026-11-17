import type { FilterState } from "@/components/rent/RentFilterSidebar";

export const DEFAULT_RENT_FILTER: FilterState = {
  category: "all", minPrice: 0, maxPrice: 100, areaRange: "all", wardId: "", beds: "all", baths: "all",
  furnishingStatus: "all", direction: "all", balconyDirection: "all", restroomType: "all", kitchenType: "all",
  accessType: "all", legalStatus: "all", hasMezzanine: false, hasRooftop: false, hasGarage: false,
  tab: "all", hasVideoOnly: false, sortBy: "newest", viewMode: "grid", searchQuery: "",
};
const allowed: Partial<Record<keyof FilterState, readonly string[]>> = {
  category: ["all", "house", "apartment", "room"],
  areaRange: ["all", "under_30", "30_50", "50_80", "80_100", "100_150", "150_200", "200_250", "over_250"],
  beds: ["all", "1", "2", "3"], baths: ["all", "1", "2", "3"],
  furnishingStatus: ["all", "UNFURNISHED", "BASIC", "PARTIALLY_FURNISHED", "FULLY_FURNISHED", "LUXURY"],
  direction: ["all", "EAST", "WEST", "NORTH", "SOUTH", "NORTH_EAST", "NORTH_WEST", "SOUTH_EAST", "SOUTH_WEST"],
  restroomType: ["all", "PRIVATE", "SHARED"], kitchenType: ["all", "PRIVATE", "SHARED", "NONE"],
  accessType: ["all", "PRIVATE", "SHARED"], legalStatus: ["all", "PINK_BOOK", "CONTRACT", "PENDING"],
  tab: ["all", "owner", "verified"], sortBy: ["newest", "price_asc", "price_desc", "area_desc"], viewMode: ["grid", "collage"],
};
export const administrativeCode = (value: string | null): string => value && /^[1-9]\d{0,19}$/.test(value) ? value : "";

/** Old shared links carried cityId/wardId in the URL; the location store is now the source of truth. */
export function legacyLocationFromSearch(search: string): { cityId: string; wardId: string } | null {
  const params = new URLSearchParams(search);
  if (!params.has("cityId") && !params.has("wardId")) return null;
  const cityId = administrativeCode(params.get("cityId"));
  return { cityId, wardId: cityId ? administrativeCode(params.get("wardId")) : "" };
}

export function stripLegacyLocation(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("cityId"); params.delete("wardId");
  return params.toString();
}

export function readRentState(search: string) {
  const params = new URLSearchParams(search);
  const filter = { ...DEFAULT_RENT_FILTER };
  for (const key of Object.keys(filter) as (keyof FilterState)[]) {
    if (key === "wardId") continue; // ward comes from the location store, never from the URL
    const value = params.get(key === "searchQuery" ? "q" : key);
    if (value === null) continue;
    if (key === "searchQuery") filter.searchQuery = value.slice(0, 255).trim();
    else if (key === "minPrice" || key === "maxPrice") {
      const number = Number(value); if (value.trim() && Number.isFinite(number) && number >= 0 && number <= 100) filter[key] = number;
    } else if (typeof filter[key] === "boolean") Object.assign(filter, { [key]: value === "true" });
    else if ((allowed[key] ?? (key === "balconyDirection" ? allowed.direction : []) ?? []).includes(value)) Object.assign(filter, { [key]: value });
  }
  if (filter.minPrice > filter.maxPrice) { filter.minPrice = 0; filter.maxPrice = 100; }
  const rawPage = Number(params.get("page") ?? 1);
  return { legacy: legacyLocationFromSearch(search), filter, page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1 };
}

export function writeRentState(search: string, filter: FilterState, page = 1): string {
  const params = new URLSearchParams(search);
  for (const key of Object.keys(filter) as (keyof FilterState)[]) {
    const name = key === "searchQuery" ? "q" : key, value = filter[key];
    if (key === "wardId" || value === DEFAULT_RENT_FILTER[key]) params.delete(name);
    else params.set(name, String(value));
  }
  for (const key of ["cityId", "city", "ward", "district"]) params.delete(key); // location lives in the store; legacy labels are not identifiers
  if (page <= 1) params.delete("page"); else params.set("page", String(page));
  return params.toString();
}
