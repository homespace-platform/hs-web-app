"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import { toneClasses, type Tone } from "@/lib/rental-labels";
import type { RentalOnboarding, RentalStartChange } from "@/services/rental-onboarding.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import {
  calendarDate, canHandleStartChange, canHandleStartChangeView, earlierStartBounds, isValidEarlierStart, startChangeStatus, vietnamTime,
} from "@/lib/rental-start-change-quick-view";

/** The one earlier-start UI (request form, decision list, wording). Used by the quick modal and by the onboarding panel. */
export type StartChangeAction = "approve" | "reject" | "withdraw";
type ConfirmFn = (opts: { title: string; description?: ReactNode; confirmLabel?: string; tone?: "default" | "warning" | "danger" }) => Promise<boolean>;

const STATUS_TONE: Record<RentalStartChange["status"], Tone> = { REQUESTED: "warning", APPROVED: "success", REJECTED: "danger", WITHDRAWN: "neutral", EXPIRED: "neutral" };
const btn = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** Same plain-words confirmation for both screens. Resolves true when the user agrees. */
export function confirmStartChange(confirm: ConfirmFn, change: RentalStartChange, action: StartChangeAction) {
  if (action === "approve")
    return confirm({
      title: `Đổi ngày bắt đầu thuê sang ${calendarDate(change.requestedDate)}?`,
      description: `Thay cho ${calendarDate(change.previousDate)}. Ngày kết thúc và các kỳ hóa đơn đổi theo ngày mới; cọc đã nhận không thu lại.`,
      confirmLabel: "Đồng ý đổi ngày",
    });
  if (action === "reject")
    return confirm({ title: "Không đồng ý đổi ngày?", description: "Ngày thuê hiện tại và cọc được giữ nguyên.", confirmLabel: "Không đồng ý", tone: "warning" });
  return confirm({ title: "Rút đề nghị bắt đầu sớm?", description: "Ngày thuê hiện tại và cọc được giữ nguyên.", confirmLabel: "Rút đề nghị", tone: "warning" });
}

export function StartChangeReview({ request, view, actorId = null, mode, busy, onAction }: {
  request?: RentalRequestResponse; view: RentalOnboarding; actorId?: string | null; mode: "RECEIVED" | "SENT"; busy: boolean;
  onAction: (id: string, action: StartChangeAction) => void;
}) {
  if (view.startChanges.length === 0) return <p className="text-sm text-muted-foreground">Chưa có đề nghị bắt đầu sớm.</p>;
  return <div className="space-y-3">{view.startChanges.map((change) => {
    const actionable = request ? canHandleStartChange(request, view, change, actorId, mode) : canHandleStartChangeView(view, change, mode);
    return <article key={change.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-bold">{calendarDate(change.previousDate)} → {calendarDate(change.requestedDate)}</p>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[STATUS_TONE[change.status] ?? "neutral"]}`}>{startChangeStatus[change.status] || "Cần kiểm tra"}</span>
      </div>
      <p className="whitespace-pre-wrap break-words">{change.reason}</p>
      <p className="text-xs text-muted-foreground">Gửi: {vietnamTime(change.requestedAt)} · Hạn phản hồi: {vietnamTime(change.respondBy)} (giờ Việt Nam)</p>
      {change.decidedAt && <p className="text-xs text-muted-foreground">Đã xử lý: {vietnamTime(change.decidedAt)}</p>}
      {change.responseNote && <p className="break-words">{change.responseNote}</p>}
      {actionable && <div className="flex flex-col gap-2 sm:flex-row">{mode === "RECEIVED" ? <>
        <button type="button" className={btnPrimary} disabled={busy || view.stage !== "WAITING_START"} onClick={() => onAction(change.id, "approve")}>Đồng ý đổi ngày</button>
        <button type="button" className={btn} disabled={busy} onClick={() => onAction(change.id, "reject")}>Không đồng ý</button>
      </> : <button type="button" className={btn} disabled={busy} onClick={() => onAction(change.id, "withdraw")}>Rút đề nghị</button>}</div>}
    </article>;
  })}</div>;
}

/** Request form. Date bounds: not before today, strictly before the current start date. */
export function EarlierStartForm({ view, busy, onSubmit, onCancel }: {
  view: RentalOnboarding; busy: boolean; onSubmit: (startsOn: string, reason: string) => void; onCancel?: () => void;
}) {
  const [startsOn, setStartsOn] = useState("");
  const [reason, setReason] = useState("");
  const { min, max } = earlierStartBounds(view);
  const valid = isValidEarlierStart(startsOn, reason, view);
  return <form className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm" onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(startsOn, reason.trim()); }}>
    <div className="flex items-center gap-2 font-bold"><CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />Đề nghị bắt đầu thuê sớm</div>
    <PolicyNotice tone="neutral" title="Đề nghị bắt đầu thuê sớm" summary="Nếu chủ nhà đồng ý, ngày bắt đầu, ngày kết thúc và kỳ hóa đơn đổi theo ngày mới.">
      <p>Nếu được chấp nhận, ngày bắt đầu, ngày kết thúc thuê và các kỳ hóa đơn sẽ đổi theo ngày mới, không chỉ đổi ngày ký. Số tháng, đơn giá và cọc đã nhận được giữ nguyên.</p>
      <p>Hợp đồng thuê được chuẩn bị khi đã đến ngày vào và xác nhận đủ tiền thuê tháng đầu. Hồ sơ không yêu cầu cọc hoặc cọc 0 đồng bỏ qua hợp đồng cọc.</p>
    </PolicyNotice>
    <label className="block text-sm font-semibold">Ngày bắt đầu thuê mới
      <input required type="date" min={min} max={max} value={startsOn} disabled={busy} onChange={(e) => setStartsOn(e.target.value)}
        className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal sm:w-60" />
      <span className="mt-1 block text-xs font-normal text-muted-foreground">Từ {calendarDate(min)} đến {calendarDate(max)}.</span>
    </label>
    <label className="block text-sm font-semibold">Lý do
      <textarea required minLength={10} maxLength={1000} rows={3} value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal" />
      <span className="mt-1 block text-xs font-normal text-muted-foreground">Ít nhất 10 ký tự.</span>
    </label>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onCancel && <button type="button" className={btn} disabled={busy} onClick={onCancel}>Đóng</button>}
      <button type="submit" className={btnPrimary} disabled={busy || !valid}>Gửi đề nghị bắt đầu sớm</button>
    </div>
  </form>;
}
