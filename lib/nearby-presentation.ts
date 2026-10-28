import type { NearbyGroup } from "@/types/nearby.type";

export const NEARBY_COLORS: Record<NearbyGroup, string> = {
  EDUCATION: "#16a34a", HEALTHCARE: "#dc2626", SHOPPING: "#ca8a04", FOOD_DRINK: "#ea580c",
  FINANCE: "#0891b2", TRANSPORT: "#64748b", RECREATION: "#9333ea", SPORTS: "#0d9488",
};

export function nearbyColor(groups: NearbyGroup[], activeGroup: NearbyGroup | "" = "") {
  return NEARBY_COLORS[activeGroup || groups[0]] ?? "#64748b";
}

export function nearbyDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} km`;
}

// Coordinates in GeoJSON are always longitude first.
export function nearbyRadiusRing(latitude: number, longitude: number, radius: number) {
  const lat = latitude * Math.PI / 180, lon = longitude * Math.PI / 180, angle = radius / 6371008.8;
  const ring = Array.from({ length: 64 }, (_, i) => {
    const bearing = 2 * Math.PI * i / 64;
    const y = Math.asin(Math.sin(lat) * Math.cos(angle) + Math.cos(lat) * Math.sin(angle) * Math.cos(bearing));
    const x = lon + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat), Math.cos(angle) - Math.sin(lat) * Math.sin(y));
    return [x * 180 / Math.PI, y * 180 / Math.PI];
  });
  return [...ring, ring[0]];
}
