import type { ListingDetailResponse } from "@/types/listing.type";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTML_SUFFIX_RE = /\.html$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/** Route segment `<slug>.html` (or a legacy id) -> bare slug/id. */
export function stripHtmlSuffix(segment: string) {
  return segment.replace(HTML_SUFFIX_RE, "");
}

type ListingLinkTarget = string | { id: string; slug?: string | null };

/** Single detail link builder: slug URL when known, legacy id URL otherwise (the route redirects it). */
export function listingDetailPath(listing: ListingLinkTarget, slug?: string | null) {
  const id = typeof listing === "string" ? listing : listing.id;
  const resolvedSlug = slug ?? (typeof listing === "string" ? null : listing.slug);
  return resolvedSlug
    ? `/rent/${encodeURIComponent(resolvedSlug)}.html`
    : `/rent/${encodeURIComponent(id)}`;
}

type DetailApi = {
  getAccessibleById(id: string): Promise<ListingDetailResponse>;
  getById(id: string): Promise<ListingDetailResponse>;
};

type SlugDetailApi = {
  getAccessibleBySlug(slug: string): Promise<ListingDetailResponse>;
  getBySlug(slug: string): Promise<ListingDetailResponse>;
};

/** The server decides access; authenticated success does not mean ownership. */
export function fetchListingForViewer(id: string, authenticated: boolean, api: DetailApi) {
  return authenticated ? api.getAccessibleById(id) : api.getById(id);
}

export function fetchListingBySlugForViewer(slug: string, authenticated: boolean, api: SlugDetailApi) {
  return authenticated ? api.getAccessibleBySlug(slug) : api.getBySlug(slug);
}
