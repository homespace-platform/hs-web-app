import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  userId: string | null;
}

type AuthSession = Omit<AuthState, "initialized">;

const initialState: AuthState = {
  initialized: false,
  authenticated: false,
  userId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionInitialized(state, action: PayloadAction<AuthSession>) {
      Object.assign(state, action.payload, { initialized: true });
    },
    sessionCleared(state) {
      Object.assign(state, initialState, { initialized: true });
    },
  },
});

export const { sessionInitialized, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
