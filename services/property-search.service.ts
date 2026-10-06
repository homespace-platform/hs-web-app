import axios from "axios";

const baseUrl = `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL}/api/v1/ai/property-search`;

export interface PropertySearchIntent {
  category: "ROOM" | "APARTMENT" | "HOUSE" | null;
  price_max: number | null;
  has_mezzanine: boolean;
  has_balcony: boolean;
  location: string | null;
  landmark: string | null;
}

export interface PropertySearchResult {
  total: number;
  page: number;
  size: number;
  listing_ids: string[];
  intent: PropertySearchIntent;
  query: string;
}

export interface PlaceSuggestion {
  label: string;
  searchText: string;
}

export interface PlaceSuggestionResponse {
  suggestions: PlaceSuggestion[];
  fallbackToProvince: boolean;
}

export const propertySearchService = {
  async search(params: {
    query: string;
    provinceCode: string;
    district?: string;
    category?: string;
    page?: number;
    size?: number;
    sort?: string;
    hasVideo?: boolean;
  }): Promise<PropertySearchResult> {
    const { data } = await axios.post<PropertySearchResult>(baseUrl, params, { timeout: 30000 });
    return data;
  },

  async suggestions(provinceCode: string, district?: string): Promise<PlaceSuggestionResponse> {
    const { data } = await axios.get<PlaceSuggestionResponse>(`${baseUrl}/suggestions`, {
      params: { provinceCode, ...(district ? { district } : {}) },
      timeout: 8000,
    });
    return {
      suggestions: data.suggestions ?? [],
      fallbackToProvince: data.fallbackToProvince ?? false,
    };
  },
};
