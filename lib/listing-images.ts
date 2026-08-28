import type { ListingImage } from "@/types/listing.type";

export function getListingImageUrls(
  images: ListingImage[],
  urlsByStorageId: Record<string, string>,
  fallback: string,
) {
  const urls = images
    .map((image) => urlsByStorageId[image.storageId])
    .filter((url): url is string => Boolean(url));
  return urls.length ? urls : [fallback];
}
