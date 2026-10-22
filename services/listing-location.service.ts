import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { Province, District } from "@/types/province.type";

/** Search facets from published listing addresses, not an administrative location service. */
const listingLocationService = {
  async getCities(): Promise<Province[]> {
    const response = await axiosClient.get<ApiResponse<Province[]>>("/api/v1/public/locations/cities");
    return [{ code: "", name: "Toàn quốc" }, ...response.data.result];
  },
  async getWards(cityId: string | number): Promise<District[]> {
    if (!cityId) return [];
    const response = await axiosClient.get<ApiResponse<District[]>>(
      `/api/v1/public/locations/cities/${encodeURIComponent(String(cityId))}/wards`);
    return response.data.result;
  },
};
export default listingLocationService;
