import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";

export type AddressSuggestion = { refId: string; display: string; name: string; address: string };
export type VietmapAddress = {
  refId: string; display: string; name?: string | null; houseNumber?: string | null;
  street: string; address: string; cityId: string; city: string; districtId?: string | null;
  district?: string | null; wardId: string; ward: string; latitude: number; longitude: number;
  addressNote?: string | null;
};
async function get<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal) {
  const response = await axiosClient.get<ApiResponse<T>>(`/api/v1/locations/${path}`, { params, signal, timeout: 12000 });
  return response.data.result;
}
export const vietmapService = {
  autocomplete: (text: string, signal?: AbortSignal) => get<AddressSuggestion[]>("autocomplete", { text }, signal),
  geocode: (text: string, signal?: AbortSignal) => get<AddressSuggestion[]>("geocode", { text }, signal),
  place: (refId: string, signal?: AbortSignal) => get<VietmapAddress>("place", { refId }, signal),
  reverse: (latitude: number, longitude: number, signal?: AbortSignal) => get<AddressSuggestion[]>("reverse", { latitude, longitude }, signal),
};
