export type UserAddress = import("@/services/vietmap.service").VietmapAddress & { id: string; createdAt?: string | null; updatedAt?: string | null };

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarStorageId?: string | null;
  phone?: string | null;
  /** Citizen ID confirmed by the backend after successful KYC. */
  cccd?: string | null;
  roleId?: string | null;
  role?: string | null;
  onBoarded?: boolean | null;
  active?: boolean | null;
  kycVerified?: boolean | null;
  /** Compatibility field; KYC is required for every role. */
  kycOptional?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  address?: UserAddress | null;
};

export type PublicUserProfile = {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  kycVerified?: boolean | null;
  createdAt?: string | null;
  provinceName?: string | null;
};

export type UpsertUserAddressRequest = { refId: string; addressNote?: string };

export type UpdateUserProfileRequest = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

export type OnboardingRequest = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export type SetInitialPasswordRequest = {
  newPassword: string;
};

export type UpdatePasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type UpdateUserAvatarRequest = {
  storageId: string;
};

export type OnboardingStatusResponse = {
  completed: boolean;
  version: number;
  requiredSteps: string[];
  completedSteps: string[];
  nextStep: "PROFILE" | "ADDRESS" | "PASSWORD" | "BANK_ACCOUNT" | "COMPLETED";
  /** Absent on older backends; see normalizeOnboardingStatus. */
  passwordSet?: boolean;
  missingRequirements?: Array<"PROFILE" | "ADDRESS" | "BANK_ACCOUNT" | "KYC">;
  serviceReady?: boolean;
};

