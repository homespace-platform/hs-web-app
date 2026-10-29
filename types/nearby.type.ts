export const NEARBY_RADIUS_METERS = 2000;
export const NEARBY_PAGE_SIZE = 10;
export type NearbyGroup = "EDUCATION" | "HEALTHCARE" | "SHOPPING" | "FOOD_DRINK" | "FINANCE" | "TRANSPORT" | "RECREATION" | "SPORTS";
export const NEARBY_GROUPS: Record<NearbyGroup, string> = {
 EDUCATION: "Giáo dục", HEALTHCARE: "Y tế", SHOPPING: "Mua sắm", FOOD_DRINK: "Ăn uống",
 FINANCE: "Ngân hàng", TRANSPORT: "Đi lại", RECREATION: "Giải trí", SPORTS: "Thể thao",
};
export interface NearbyPlace {
 id: string; name: string; latitude: number; longitude: number; address?: string | null;
 distanceMeters: number; distanceType: "STRAIGHT_LINE"; groups: NearbyGroup[]; attribution: string;
}
export interface NearbySummary {
 listingId: string; enabled: boolean; radiusRequestedMeters: number; limitation: string;
 groups: Array<{code: NearbyGroup; knownCount: number; coverageStatus: string; dataAsOf?: string | null; radiusCoveredMeters?: number | null}>;
}
export interface NearbyPage {
 enabled: boolean; items: NearbyPlace[]; total: number; page: number; size: number; coverage: NearbySummary;
}
