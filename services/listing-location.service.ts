import type { AdministrativeCity, AdministrativeWard } from "@/types/administrative-location.type";

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();
function catalog<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value as Promise<T>;
  // Same-origin Next.js endpoint: never use the Gateway axios client or a provider key.
  const value = fetch(path).then(async response => {
    if (!response.ok) throw new Error("Không thể tải danh mục địa chỉ.");
    return await response.json() as T;
  });
  const entry = { expires: Date.now() + CACHE_MS, value };
  cache.set(path, entry);
  void value.catch(() => { if (cache.get(path) === entry) cache.delete(path); });
  return value;
}

/** Local Vietmap snapshot served by Next.js. Runtime never calls GitHub or location service. */
const listingLocationService = {
  async getCities(): Promise<AdministrativeCity[]> {
    const cities = await catalog<AdministrativeCity[]>("/api/locations/provinces");
    return [{ code: "", name: "Toàn quốc" }, ...cities];
  },
  async getWards(cityId: string): Promise<AdministrativeWard[]> {
    if (!cityId) return [];
    return catalog<AdministrativeWard[]>(`/api/locations/provinces/${encodeURIComponent(cityId)}/wards`);
  },
};
export default listingLocationService;
