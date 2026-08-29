import type { ListingResponse } from "@/types/listing.type";

export function getListingDisplayImages(
  listing: Pick<ListingResponse, "imageUrls">,
  fallback: string,
) {
  return listing.imageUrls?.length ? listing.imageUrls : [fallback];
}
