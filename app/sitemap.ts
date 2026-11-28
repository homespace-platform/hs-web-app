import type { MetadataRoute } from "next";
import { publicLinks } from "./(public-info)/_content/navigation";
import { SITE_URL } from "@/lib/listing-public-server";
import { listingDetailPath } from "@/lib/listing-detail-access";
import type { PageResponse } from "@/types/api.type";
import type { PublicListingSummaryResponse } from "@/types/listing.type";
import type { PublicNewsSummary } from "@/types/news.type";

export const revalidate = 3600;

const PAGE_SIZE = 50; // backend caps size at 50 (@Max(50)); larger values return 400
const MAX_PAGES = 100; // bounded cap: at most 5000 listings per sitemap

async function fetchAll<T>(path: string): Promise<T[]> {
  const base = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "";
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${base}${path}?page=${page}&size=${PAGE_SIZE}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) break;
    const body = (await res.json()) as PageResponse<T>;
    items.push(...(body.result ?? []));
    if (!body.hasMore) break;
  }
  return items;
}

const toDate = (...values: Array<string | null | undefined>) => {
  const value = values.find(Boolean);
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["", "/rent", ...Object.values(publicLinks).map(({ href }) => href)];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${SITE_URL}${path}` }));

  try {
    const listings = await fetchAll<PublicListingSummaryResponse>("/api/v1/public/listings");
    for (const l of listings) {
      // Rows without a slug yet would only be legacy id URLs that redirect: keep them out of the sitemap.
      if (l.slug) entries.push({ url: `${SITE_URL}${listingDetailPath(l)}`, lastModified: toDate(l.updatedAt, l.publishedAt) });
    }
  } catch {
    // degrade to static entries
  }

  try {
    const news = await fetchAll<PublicNewsSummary>("/api/v1/public/news");
    for (const n of news) {
      entries.push({ url: `${SITE_URL}/news/${encodeURIComponent(n.slug)}`, lastModified: toDate(n.publishedAt) });
    }
  } catch {
    // degrade to static entries
  }

  return entries;
}
