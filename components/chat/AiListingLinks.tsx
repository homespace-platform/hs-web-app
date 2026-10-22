"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Reused results: a compact link per listing, opening the detail page in a new tab like a card. */
export default function AiListingLinks({ listingIds, positions }: { listingIds: string[]; positions?: Record<string, number> }) {
  if (!listingIds.length) return null;
  return <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground" aria-label="Tin đã hiển thị trước đó">
    <span>Tin đã xem ở trên:</span>
    {listingIds.map((id, index) => (
      <Link key={id} href={`/rent/${id}`} target="_blank" rel="noopener noreferrer" prefetch={false}
        className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 font-medium text-primary hover:border-primary/40 hover:bg-primary/5">
        Tin {positions?.[id] || index + 1}
        <ArrowUpRight className="size-3" aria-hidden="true" />
      </Link>
    ))}
  </p>;
}
