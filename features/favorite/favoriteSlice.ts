import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import favoriteService from "@/services/favorite.service";
import type { RootState } from "@/store";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface FavoriteState {
  ids: string[];
  count: number;
  status: LoadStatus;
  error: string | null;
  loadedForUserId: string | null;
}

const initialState: FavoriteState = {
  ids: [],
  count: 0,
  status: "idle",
  error: null,
  loadedForUserId: null,
};

interface FetchFavoritesArgs {
  userId?: string | null;
  force?: boolean;
}

export const fetchFavoriteIds = createAsyncThunk<
  string[],
  FetchFavoritesArgs | void,
  { state: RootState; rejectValue: string }
>(
  "favorite/fetchFavoriteIds",
  async (_, { rejectWithValue }) => {
    try {
      return await favoriteService.getFavoriteListingIds();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể tải danh sách yêu thích"
      );
    }
  },
  {
    condition: (args, { getState }) => {
      const { favorite, auth } = getState();
      if (!auth.authenticated) return false;
      // Tránh lặp call khi đang có request in-flight
      if (favorite.status === "loading") return false;

      const force = args && typeof args === "object" && "force" in args ? Boolean(args.force) : false;
      const targetUserId = args && typeof args === "object" && "userId" in args ? args.userId : auth.userId;

      if (force) return true;
      // Đã tải thành công cho user này rồi thì không gọi lại
      if (favorite.status === "succeeded" && favorite.loadedForUserId === targetUserId) {
        return false;
      }
      return true;
    },
  }
);

export const toggleFavoriteItem = createAsyncThunk<
  { listingId: string; isFavorite: boolean },
  string,
  { state: RootState; rejectValue: string }
>(
  "favorite/toggleFavoriteItem",
  async (listingId, { rejectWithValue }) => {
    try {
      const isFavorite = await favoriteService.toggleFavorite(listingId);
      return { listingId, isFavorite };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể cập nhật yêu thích"
      );
    }
  }
);

const favoriteSlice = createSlice({
  name: "favorite",
  initialState,
  reducers: {
    favoritesCleared: () => initialState,
    favoriteAdded: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      if (!state.ids.includes(listingId)) {
        state.ids.push(listingId);
        state.count = state.ids.length;
      }
    },
    favoriteRemoved: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      state.ids = state.ids.filter((id) => id !== listingId);
      state.count = state.ids.length;
    },
    setFavoriteIds: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload;
      state.count = action.payload.length;
      state.status = "succeeded";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavoriteIds.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFavoriteIds.fulfilled, (state, action) => {
        state.ids = action.payload;
        state.count = action.payload.length;
        state.status = "succeeded";
        state.error = null;
        const arg = action.meta.arg;
        state.loadedForUserId =
          arg && typeof arg === "object" && "userId" in arg && arg.userId
            ? arg.userId
            : state.loadedForUserId;
      })
      .addCase(fetchFavoriteIds.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Lỗi tải yêu thích";
      })
      .addCase(toggleFavoriteItem.fulfilled, (state, action) => {
        const { listingId, isFavorite } = action.payload;
        const exists = state.ids.includes(listingId);
        if (isFavorite && !exists) {
          state.ids.push(listingId);
        } else if (!isFavorite && exists) {
          state.ids = state.ids.filter((id) => id !== listingId);
        }
        state.count = state.ids.length;
      });
  },
});

export const { favoritesCleared, favoriteAdded, favoriteRemoved, setFavoriteIds } =
  favoriteSlice.actions;

export default favoriteSlice.reducer;
