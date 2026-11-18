import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import userService from "@/services/user.service";
import type { RootState } from "@/store";
import type { UserProfile } from "@/types/user.type";
import { normalizeOnboardingStatus, type ProfileGateState } from "@/lib/profile-gate";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface UserState {
  profile: UserProfile | null;
  status: LoadStatus;
  error: string | null;
  loadedForUserId: string | null;
  /** null = not loaded (or failed): the UI must not hide anything. */
  permissions: string[] | null;
  /** Latest fetchMyPermissions request; older/out-of-date (e.g. after logout) responses are ignored. */
  permissionsRequestId: string | null;
  /** null = not loaded (or failed): nothing is blocked and no password modal is shown. */
  onboarding: ProfileGateState | null;
  onboardingRequestId: string | null;
}

const initialState: UserState = {
  profile: null,
  status: "idle",
  error: null,
  loadedForUserId: null,
  permissions: null,
  permissionsRequestId: null,
  onboarding: null,
  onboardingRequestId: null,
};

interface FetchCurrentUserArgs {
  userId: string;
  force?: boolean;
}

export const fetchCurrentUser = createAsyncThunk<
  UserProfile,
  FetchCurrentUserArgs,
  { state: RootState; rejectValue: string }
>(
  "user/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getProfile();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể tải thông tin người dùng",
      );
    }
  },
  {
    condition: ({ userId, force = false }, { getState }) => {
      const user = getState().user;
      if (user.status === "loading") return false;
      return force || user.status !== "succeeded" || user.loadedForUserId !== userId;
    },
  },
);

export const fetchMyPermissions = createAsyncThunk<string[], void, { rejectValue: string }>(
  "user/fetchMyPermissions",
  async (_, { rejectWithValue }) => {
    try {
      return await userService.getMyPermissions();
    } catch {
      return rejectWithValue("permissions-unavailable");
    }
  },
);

export const fetchOnboardingStatus = createAsyncThunk<ProfileGateState, void, { rejectValue: string }>(
  "user/fetchOnboardingStatus",
  async (_, { rejectWithValue }) => {
    try {
      return normalizeOnboardingStatus(await userService.getOnboardingStatus());
    } catch {
      return rejectWithValue("onboarding-status-unavailable");
    }
  },
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    userCleared: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        state.loadedForUserId = action.meta.arg.userId;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.status = "succeeded";
        state.error = null;
        state.loadedForUserId = action.meta.arg.userId;
      })
      .addCase(fetchMyPermissions.pending, (state, action) => {
        state.permissionsRequestId = action.meta.requestId;
      })
      .addCase(fetchMyPermissions.fulfilled, (state, action) => {
        if (state.permissionsRequestId !== action.meta.requestId) return;
        state.permissions = action.payload;
      })
      .addCase(fetchOnboardingStatus.pending, (state, action) => {
        state.onboardingRequestId = action.meta.requestId;
      })
      .addCase(fetchOnboardingStatus.fulfilled, (state, action) => {
        if (state.onboardingRequestId !== action.meta.requestId) return;
        state.onboarding = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Không thể tải thông tin người dùng";
      });
  },
});

export const { userCleared } = userSlice.actions;
export default userSlice.reducer;
