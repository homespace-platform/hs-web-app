import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import userService from "@/services/user.service";
import type { RootState } from "@/store";
import type { UserProfile } from "@/types/user.type";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface UserState {
  profile: UserProfile | null;
  status: LoadStatus;
  error: string | null;
  loadedForUserId: string | null;
}

const initialState: UserState = {
  profile: null,
  status: "idle",
  error: null,
  loadedForUserId: null,
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
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        if (action.meta.condition) return;
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Không thể tải thông tin người dùng";
      });
  },
});

export const { userCleared } = userSlice.actions;
export default userSlice.reducer;
