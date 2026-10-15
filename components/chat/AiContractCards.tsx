"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { AiContractCard } from "@/types/ai.type";
import { contractHref, formatCardDate, formatReadAt, safeContractCards } from "@/lib/ai-contract-cards";

export function AiContractCard({ card, position }: { card: AiContractCard; position: number }) {
  const href = contractHref(card);
  const start = formatCardDate(card.leaseStart);
  const last = formatCardDate(card.lastRentalDay);
  const readAt = formatReadAt(card.readAt);
  return <article className="min-w-0 rounded-xl border border-border bg-card p-3 text-xs shadow-2xs" aria-label={`Hợp đồng ${position}`}>
    <div className="flex items-start gap-2">
      <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Hợp đồng {position}: {card.contractNumber}</p>
        {card.property && <p className="line-clamp-2 text-muted-foreground">{card.property}</p>}
      </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Bạn là {card.roleLabel.toLowerCase()}</span>
      <span className="rounded-full bg-muted px-2 py-0.5">{card.statusLabel}</span>
      {card.phaseLabel && card.phaseLabel !== card.statusLabel && <span className="rounded-full bg-muted px-2 py-0.5">{card.phaseLabel}</span>}
    </div>
    {(start || last) && <p className="mt-2 text-muted-foreground">
      Thời hạn thuê: {start ?? "chưa rõ"} – {last ?? "chưa rõ"} <span className="whitespace-nowrap">(ngày thuê cuối)</span>
    </p>}
    <div className="mt-2 flex items-center justify-between gap-2">
      {readAt ? <span className="text-[10px] text-muted-foreground">Đọc lúc {readAt}</span> : <span />}
      {href && <Link href={href} target="_blank" rel="noopener noreferrer" prefetch={false}
        className="shrink-0 rounded-lg border border-primary px-2.5 py-1 font-medium text-primary hover:bg-primary/10">Xem hợp đồng</Link>}
    </div>
  </article>;
}

export default function AiContractCards({ cards }: { cards?: unknown }) {
  const safe = safeContractCards(cards);
  if (!safe.length) return null;
  return <section className="mt-3" aria-label="Hợp đồng liên quan">
    <p className="mb-2 text-[11px] text-muted-foreground">Thông tin tại thời điểm trả lời; trang hợp đồng luôn hiển thị trạng thái mới nhất.</p>
    <div className="grid gap-2">{safe.map((card, index) => <AiContractCard key={card.contractId} card={card} position={index + 1} />)}</div>
  </section>;
}
