import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import userReducer from "@/features/user/userSlice";
import favoriteReducer from "@/features/favorite/favoriteSlice";
import historyReducer from "@/features/history/historySlice";
import locationReducer from "@/features/location/locationSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      user: userReducer,
      favorite: favoriteReducer,
      history: historyReducer,
      location: locationReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
