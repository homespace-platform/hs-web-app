export function getListingDisplayImages(
  listing: { imageUrls?: string[] },
  fallback: string,
) {
  return listing.imageUrls?.length ? listing.imageUrls : [fallback];
}
