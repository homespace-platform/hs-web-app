import type { ListingDetailResponse } from "@/types/listing.type";

export function listingDetailPath(listingId: string) {
  return `/rent/${encodeURIComponent(listingId)}`;
}

type DetailApi = {
  getAccessibleById(id: string): Promise<ListingDetailResponse>;
  getById(id: string): Promise<ListingDetailResponse>;
};

/** The server decides access; authenticated success does not mean ownership. */
export function fetchListingForViewer(id: string, authenticated: boolean, api: DetailApi) {
  return authenticated ? api.getAccessibleById(id) : api.getById(id);
}
