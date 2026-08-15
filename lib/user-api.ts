import axiosClient from "@/lib/axios-client";
import type { ApiResponse, UserProfile } from "@/lib/types";

export async function getUserProfile() {
  const res = await axiosClient.get<ApiResponse<UserProfile>>(
    "/api/v1/users/me/profile",
  );
  return res.data.result;
}
