import type { ListingDetailResponse } from "@/types/listing.type";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export type PublicListingLookup =
  | { state: "ok"; listing: ListingDetailResponse }
  | { state: "denied" } // 403/404: not public (draft, pending, hidden...) or unknown
  | { state: "error" }; // gateway unreachable / 5xx: let the client flow decide

/** Server-side public detail fetch (no auth). `by` selects the id or the slug endpoint. */
export async function fetchPublicListing(by: "id" | "slug", key: string): Promise<PublicListingLookup> {
  const base = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "";
  const path = by === "slug" ? "by-slug/" : "";
  try {
    const res = await fetch(`${base}/api/v1/public/listings/${path}${encodeURIComponent(key)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 403 || res.status === 404) return { state: "denied" };
    if (!res.ok) return { state: "error" };
    const body = (await res.json()) as { result?: ListingDetailResponse };
    return body.result ? { state: "ok", listing: body.result } : { state: "error" };
  } catch {
    return { state: "error" };
  }
}
