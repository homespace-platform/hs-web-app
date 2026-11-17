import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  isUuid,
  listingDetailPath,
  stripHtmlSuffix,
} from "@/lib/listing-detail-access";
import { SITE_URL, fetchPublicListing } from "@/lib/listing-public-server";
import type { ListingDetailResponse } from "@/types/listing.type";
import RentDetailClient from "./RentDetailClient";

type PageProps = { params: Promise<{ slug: string }> };

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveParam(segment: string) {
  const key = stripHtmlSuffix(safeDecode(segment));
  return { key, byId: isUuid(key) };
}

function summarize(listing: ListingDetailResponse) {
  const text = (listing.description || "").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function firstImage(listing: ListingDetailResponse) {
  const images = (listing.media ?? []).filter((m) => m.mediaType === "IMAGE" && m.url);
  return (images.find((m) => m.cover) ?? images[0])?.url ?? undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key, byId } = resolveParam((await params).slug);
  const lookup = await fetchPublicListing(byId ? "id" : "slug", key);
  // Private, unknown or unreachable: never index; the page itself shows the real state.
  if (lookup.state !== "ok") return { title: "Tin đăng | HomeSpace", robots: { index: false, follow: false } };

  const { listing } = lookup;
  const canonical = `${SITE_URL}${listingDetailPath(listing)}`;
  const description = summarize(listing) || "Tin cho thuê trên HomeSpace.";
  const image = firstImage(listing);
  return {
    title: `${listing.title} | HomeSpace`,
    description,
    alternates: { canonical },
    robots: listing.status === "PUBLISHED" ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title: listing.title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

function buildJsonLd(listing: ListingDetailResponse) {
  const image = firstImage(listing);
  const address = listing.address as { display?: string } | null | undefined;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: summarize(listing) || undefined,
    url: `${SITE_URL}${listingDetailPath(listing)}`,
    datePosted: listing.publishedAt ?? undefined,
    dateModified: listing.updatedAt ?? undefined,
    image,
    ...(address?.display ? { contentLocation: { "@type": "Place", address: address.display } } : {}),
    offers: {
      "@type": "Offer",
      price: listing.pricing?.amount,
      priceCurrency: listing.pricing?.currency || "VND",
      availability: listing.status === "PUBLISHED" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
    },
  };
}

export default async function RentDetailPage({ params }: PageProps) {
  const rawSegment = (await params).slug;
  const { key, byId } = resolveParam(rawSegment);
  const lookup = await fetchPublicListing(byId ? "id" : "slug", key);

  if (lookup.state === "ok") {
    // Legacy id URL (or slug without `.html`) -> canonical slug URL. Not inside try/catch: redirect throws.
    if (lookup.listing.slug && safeDecode(rawSegment) !== `${lookup.listing.slug}.html`) {
      permanentRedirect(listingDetailPath(lookup.listing));
    }
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(lookup.listing)).replace(/</g, "\u003c") }}
        />
        <RentDetailClient id={key} mode={byId ? "id" : "slug"} initialListing={lookup.listing} />
      </>
    );
  }

  // Not public (403/404) or gateway error: existing authenticated client flow decides (owner preview, errors).
  return <RentDetailClient id={key} mode={byId ? "id" : "slug"} />;
}
