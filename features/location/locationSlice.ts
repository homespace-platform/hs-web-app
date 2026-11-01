import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const CITY_STORAGE_KEY = "homespace_selected_city_vietmap";
export const WARD_STORAGE_KEY = "homespace_selected_ward_vietmap";

export type LocationPlace = { code: string; name: string };

export type LocationState = {
  cityId: string;
  cityName: string;
  wardId: string;
  wardName: string;
  hydrated: boolean;
};

const empty: LocationState = {
  cityId: "",
  cityName: "",
  wardId: "",
  wardName: "",
  hydrated: false,
};

function readStoredLocation(): Omit<LocationState, "hydrated"> {
  if (typeof window === "undefined") {
    return { cityId: "", cityName: "", wardId: "", wardName: "" };
  }
  try {
    const cityRaw = localStorage.getItem(CITY_STORAGE_KEY);
    const city = cityRaw ? JSON.parse(cityRaw) : null;
    const cityId = city?.code ? String(city.code) : "";
    const cityName = city?.name ? String(city.name) : "";
    if (!cityId) {
      return { cityId: "", cityName: "", wardId: "", wardName: "" };
    }
    const wardRaw = localStorage.getItem(WARD_STORAGE_KEY);
    const ward = wardRaw ? JSON.parse(wardRaw) : null;
    const wardMatchesCity = ward?.code && String(ward.cityId ?? "") === cityId;
    return {
      cityId,
      cityName,
      wardId: wardMatchesCity ? String(ward.code) : "",
      wardName: wardMatchesCity ? String(ward.name ?? "") : "",
    };
  } catch {
    return { cityId: "", cityName: "", wardId: "", wardName: "" };
  }
}

export function persistLocation(state: Pick<LocationState, "cityId" | "cityName" | "wardId" | "wardName">) {
  if (typeof window === "undefined") return;
  try {
    if (state.cityId) {
      localStorage.setItem(
        CITY_STORAGE_KEY,
        JSON.stringify({ code: state.cityId, name: state.cityName }),
      );
    } else {
      localStorage.removeItem(CITY_STORAGE_KEY);
    }
    if (state.cityId && state.wardId) {
      localStorage.setItem(
        WARD_STORAGE_KEY,
        JSON.stringify({
          code: state.wardId,
          name: state.wardName,
          cityId: state.cityId,
        }),
      );
    } else {
      localStorage.removeItem(WARD_STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

const locationSlice = createSlice({
  name: "location",
  initialState: empty,
  reducers: {
    hydrateLocation(state) {
      Object.assign(state, readStoredLocation(), { hydrated: true });
    },
    setGlobalCity(state, action: PayloadAction<LocationPlace>) {
      state.cityId = action.payload.code;
      state.cityName = action.payload.name;
      state.wardId = "";
      state.wardName = "";
      state.hydrated = true;
      persistLocation(state);
    },
    setGlobalWard(state, action: PayloadAction<LocationPlace | null>) {
      if (!action.payload) {
        state.wardId = "";
        state.wardName = "";
      } else {
        state.wardId = action.payload.code;
        state.wardName = action.payload.name;
      }
      state.hydrated = true;
      persistLocation(state);
    },
  },
});

export const { hydrateLocation, setGlobalCity, setGlobalWard } = locationSlice.actions;
export default locationSlice.reducer;
