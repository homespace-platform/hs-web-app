import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import historyService from "@/services/history.service";
import type { RootState } from "@/store";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

const MAX_HISTORY_ITEMS = 40;

interface HistoryState {
  ids: string[];
  count: number;
  status: LoadStatus;
  error: string | null;
  loadedForUserId: string | null;
}

const initialState: HistoryState = {
  ids: [],
  count: 0,
  status: "idle",
  error: null,
  loadedForUserId: null,
};

interface FetchHistoryArgs {
  userId?: string | null;
  force?: boolean;
}

export const fetchHistoryIds = createAsyncThunk<
  string[],
  FetchHistoryArgs | void,
  { state: RootState; rejectValue: string }
>(
  "history/fetchHistoryIds",
  async (_, { rejectWithValue }) => {
    try {
      return await historyService.getHistoryListingIds();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể tải lịch sử xem tin"
      );
    }
  },
  {
    condition: (args, { getState }) => {
      const { history, auth } = getState();
      if (!auth.authenticated) return false;
      if (history.status === "loading") return false;

      const force =
        args && typeof args === "object" && "force" in args
          ? Boolean(args.force)
          : false;
      const targetUserId =
        args && typeof args === "object" && "userId" in args
          ? args.userId
          : auth.userId;

      if (force) return true;
      if (history.status === "succeeded" && history.loadedForUserId === targetUserId) {
        return false;
      }
      return true;
    },
  }
);

export const recordHistoryItem = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: string }
>(
  "history/recordHistoryItem",
  async (listingId, { rejectWithValue }) => {
    try {
      await historyService.recordView(listingId);
      return listingId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể ghi nhận lịch sử xem"
      );
    }
  }
);

export const removeHistoryItemThunk = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: string }
>(
  "history/removeHistoryItem",
  async (listingId, { rejectWithValue }) => {
    try {
      await historyService.removeHistoryItem(listingId);
      return listingId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể xóa tin khỏi lịch sử"
      );
    }
  }
);

export const clearHistoryThunk = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: string }
>(
  "history/clearHistory",
  async (_, { rejectWithValue }) => {
    try {
      await historyService.clearMyHistory();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Không thể xóa toàn bộ lịch sử"
      );
    }
  }
);

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    historyCleared: () => initialState,
    setHistoryIds: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload.slice(0, MAX_HISTORY_ITEMS);
      state.count = state.ids.length;
    },
    historyItemAdded: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      // Đẩy lên đầu danh sách (xem mới nhất), loại bỏ vị trí cũ nếu có
      const remaining = state.ids.filter((id) => id !== listingId);
      state.ids = [listingId, ...remaining].slice(0, MAX_HISTORY_ITEMS);
      state.count = state.ids.length;
    },
    historyItemRemoved: (state, action: PayloadAction<string>) => {
      const listingId = action.payload;
      state.ids = state.ids.filter((id) => id !== listingId);
      state.count = state.ids.length;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchHistoryIds
      .addCase(fetchHistoryIds.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchHistoryIds.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.ids = action.payload.slice(0, MAX_HISTORY_ITEMS);
        state.count = state.ids.length;
        const arg = action.meta.arg;
        state.loadedForUserId =
          arg && typeof arg === "object" && "userId" in arg && arg.userId
            ? arg.userId
            : null;
      })
      .addCase(fetchHistoryIds.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Lỗi tải lịch sử xem tin";
      })

      // recordHistoryItem
      .addCase(recordHistoryItem.fulfilled, (state, action) => {
        const listingId = action.payload;
        const remaining = state.ids.filter((id) => id !== listingId);
        state.ids = [listingId, ...remaining].slice(0, MAX_HISTORY_ITEMS);
        state.count = state.ids.length;
      })

      // removeHistoryItemThunk
      .addCase(removeHistoryItemThunk.fulfilled, (state, action) => {
        const listingId = action.payload;
        state.ids = state.ids.filter((id) => id !== listingId);
        state.count = state.ids.length;
      })

      // clearHistoryThunk
      .addCase(clearHistoryThunk.fulfilled, () => initialState);
  },
});

export const {
  historyCleared,
  setHistoryIds,
  historyItemAdded,
  historyItemRemoved,
} = historySlice.actions;

export default historySlice.reducer;
