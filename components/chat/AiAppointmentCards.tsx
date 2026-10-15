"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { AiAppointmentCard } from "@/types/ai.type";
import {
  appointmentHref, appointmentStateText, currentScheduleText, formatReadAt, proposedScheduleText, safeAppointmentCards,
} from "@/lib/ai-appointment-cards";

export function AiAppointmentCardView({ card, position }: { card: AiAppointmentCard; position: number }) {
  const href = appointmentHref(card);
  const current = currentScheduleText(card);
  const proposed = proposedScheduleText(card);
  const readAt = formatReadAt(card.readAt);
  return <article className="min-w-0 rounded-xl border border-border bg-card p-3 text-xs shadow-2xs" aria-label={`Lịch xem nhà ${position}`}>
    <div className="flex items-start gap-2">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{card.listingTitle}</p>
        {card.listingAddress && <p className="line-clamp-2 text-muted-foreground">{card.listingAddress}</p>}
      </div>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Bạn là {card.roleLabel.toLowerCase()}</span>
      <span className="rounded-full bg-muted px-2 py-0.5">{appointmentStateText(card)}</span>
    </div>
    {current && <p className="mt-2"><span className="text-muted-foreground">Thời gian hiện tại: </span><span className="font-medium">{current}</span></p>}
    {proposed && <p className="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
      Đề xuất đổi sang {proposed} (chưa được duyệt, lịch hiện tại vẫn giữ nguyên)
    </p>}
    {!proposed && card.rescheduleRequested && <p className="mt-1 text-muted-foreground">Đang có đề xuất đổi giờ chờ xử lý.</p>}
    <div className="mt-2 flex items-center justify-between gap-2">
      {readAt ? <span className="text-[10px] text-muted-foreground">Đọc lúc {readAt}</span> : <span />}
      {href && <Link href={href} target="_blank" rel="noopener noreferrer" prefetch={false}
        className="shrink-0 rounded-lg border border-primary px-2.5 py-1 font-medium text-primary hover:bg-primary/10">Mở lịch này</Link>}
    </div>
  </article>;
}

export default function AiAppointmentCards({ cards }: { cards?: unknown }) {
  const safe = safeAppointmentCards(cards);
  if (!safe.length) return null;
  return <section className="mt-3" aria-label="Lịch xem nhà liên quan">
    <p className="mb-2 text-[11px] text-muted-foreground">Thông tin tại thời điểm trả lời; trang lịch xem nhà luôn hiển thị trạng thái mới nhất.</p>
    <div className="grid gap-2">{safe.map((card, index) => <AiAppointmentCardView key={card.appointmentId} card={card} position={index + 1} />)}</div>
  </section>;
}
