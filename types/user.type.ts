export type UserAddress = {
  id: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
  fullAddress: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarStorageId?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  roleId?: string | null;
  role?: string | null;
  onBoarded?: boolean | null;
  active?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  address?: UserAddress | null;
};

export type UpsertUserAddressRequest = {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
};

export type UpdateUserProfileRequest = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dob: string | null;
  gender: "FEMALE" | "MALE" | "OTHER" | null;
};

export type OnboardingRequest = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dob: string | null;
  gender: "FEMALE" | "MALE" | "OTHER" | null;
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
