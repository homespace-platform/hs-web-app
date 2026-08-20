import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  OnboardingRequest,
  SetInitialPasswordRequest,
  UpdatePasswordRequest,
  UpdateUserAvatarRequest,
  UpdateUserProfileRequest,
  UserProfile,
} from "@/types/user.type";

let profileRequest: Promise<UserProfile> | null = null;

const userService = {
  async getProfile(): Promise<UserProfile> {
    if (!profileRequest) {
      profileRequest = axiosClient
        .get<ApiResponse<UserProfile>>("/api/v1/users/me/profile")
        .then((response) => response.data.result)
        .finally(() => {
          profileRequest = null;
        });
    }
    return profileRequest;
  },

  async updateProfile(request: UpdateUserProfileRequest): Promise<void> {
    await axiosClient.post<ApiResponse<null>>(
      "/api/v1/users/me/profile",
      request,
    );
  },

  async updateAvatar(request: UpdateUserAvatarRequest): Promise<void> {
    await axiosClient.put<ApiResponse<null>>(
      "/api/v1/users/me/avatar",
      request,
    );
  },

  async completeOnboarding(request: OnboardingRequest): Promise<void> {
    await axiosClient.put<ApiResponse<null>>(
      "/api/v1/users/me/onboarding",
      request,
    );
  },

  async hasPassword(): Promise<boolean> {
    const response = await axiosClient.get<ApiResponse<boolean>>(
      "/api/v1/users/me/password/status",
    );
    return response.data.result;
  },

  async setInitialPassword(request: SetInitialPasswordRequest): Promise<void> {
    await axiosClient.post<ApiResponse<null>>(
      "/api/v1/users/me/password/initial",
      request,
    );
  },

  async updatePassword(request: UpdatePasswordRequest): Promise<void> {
    await axiosClient.post<ApiResponse<null>>(
      "/api/v1/users/me/password",
      request,
    );
  },
};

export default userService;
