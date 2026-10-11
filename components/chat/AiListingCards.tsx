"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import AiListingCompactCard from "@/components/chat/AiListingCompactCard";
import listingService from "@/services/listing.service";
import { cardListingIds, createListingCardLoader } from "@/lib/ai-listing-cards";
import type { ListingDetailResponse } from "@/types/listing.type";

const loadListing = createListingCardLoader(async (id: string) => {
  const listing = await listingService.getById(id);
  if (listing.id.toLowerCase() !== id || listing.status !== "PUBLISHED" || !listing.active
      || (listing.expiresAt && new Date(listing.expiresAt).getTime() <= Date.now())) {
    throw new Error("Listing unavailable");
  }
  return listing;
});

function ListingCard({ id, position }: { id: string; position: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ listing?: ListingDetailResponse; error?: "unavailable" | "network" }>({});

  useEffect(() => {
    if (!container.current || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setState({});
    loadListing(id).then((listing) => {
      if (!cancelled) setState({ listing });
    }).catch((error) => {
      if (cancelled) return;
      const unavailable = !axios.isAxiosError(error) || [403, 404, 410].includes(error.response?.status || 0);
      setState({ error: unavailable ? "unavailable" : "network" });
    });
    return () => { cancelled = true; };
  }, [id, visible, attempt]);

  return <div ref={container} className="min-w-0">
    {state.listing ? <AiListingCompactCard listing={state.listing} position={position} />
      : state.error ? <div className="rounded-2xl border border-border p-4 text-xs text-muted-foreground" role="status">
          <p className="mb-1 font-semibold">Tin {position}</p>
          {state.error === "unavailable" ? "Tin này hiện không còn hiển thị công khai." : "Chưa tải được tin đăng. Nội dung tư vấn vẫn được giữ nguyên."}
          {state.error === "network" && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 block text-primary underline">Thử lại</button>}
        </div>
      : <div className="flex min-h-32 gap-3 rounded-xl border border-border bg-muted/40 animate-pulse p-3" role="status" aria-label={`Đang tải tin ${position}`}>
          <div className="h-24 w-20 shrink-0 rounded-lg bg-muted sm:size-28" />
          <div className="min-w-0 flex-1"><div className="h-3 w-3/4 rounded bg-muted" /><div className="mt-2 h-3 w-1/3 rounded bg-muted" />
          <p className="mt-3 text-xs text-muted-foreground">Đang tải tin {position}…</p></div>
        </div>}
  </div>;
}

export default function AiListingCards({ listingIds, positions }: { listingIds: string[]; positions?: Record<string, number> }) {
  const ids = cardListingIds(listingIds);
  if (!ids.length) return null;
  return <section className="mt-3" aria-label="Tin đăng được đề xuất">
    <p className="mb-2 text-[11px] text-muted-foreground">Bấm thẻ để mở chi tiết trong tab mới.</p>
    <div className="grid gap-2">
      {ids.map((id, index) => <ListingCard key={id} id={id} position={positions?.[id] || index + 1} />)}
    </div>
  </section>;
}
