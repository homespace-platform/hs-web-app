import "server-only";
import provinceData from "@/data/vietmap/province.json";
import wardData from "@/data/vietmap/ward.json";
import type { AdministrativeCity, AdministrativeWard } from "@/types/administrative-location.type";

// Build-time local snapshot. Neither JSON nor the full ward catalog is bundled into client components.
const provinces: AdministrativeCity[] = Object.values(provinceData)
  .map(item => ({ code: item.code, name: item.name_with_type }))
  .sort((a, b) => a.name.localeCompare(b.name, "vi"));
const wardsByProvince = new Map<string, AdministrativeWard[]>();
for (const ward of Object.values(wardData)) {
  const list = wardsByProvince.get(ward.parent_code) ?? [];
  list.push({ code: ward.code, name: ward.name_with_type, parentCode: ward.parent_code });
  wardsByProvince.set(ward.parent_code, list);
}
for (const list of wardsByProvince.values()) list.sort((a, b) => a.name.localeCompare(b.name, "vi"));

export function getProvinces(): AdministrativeCity[] { return provinces; }
export function hasProvince(code: string): boolean { return provinces.some(city => city.code === code); }
export function getWardsByProvince(code: string): AdministrativeWard[] { return wardsByProvince.get(code) ?? []; }
