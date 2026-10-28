import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import { NEARBY_RADIUS_METERS, NEARBY_PAGE_SIZE, type NearbyGroup, type NearbyPage } from "@/types/nearby.type";
export async function getNearbyPlaces(listingId: string, group: NearbyGroup | "", page: number, signal?: AbortSignal) {
 const response = await axiosClient.get<ApiResponse<NearbyPage>>(
  `/api/v1/public/listings/${encodeURIComponent(listingId)}/nearby-places`,
  {params: {radiusMeters: NEARBY_RADIUS_METERS, ...(group ? {groups: group} : {}), page, size: NEARBY_PAGE_SIZE}, signal});
 return response.data.result;
}
