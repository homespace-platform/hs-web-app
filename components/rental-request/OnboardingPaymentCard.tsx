"use client";

import { Clock, Eye } from "lucide-react";
import PaymentReceiptActions from "@/components/payment/PaymentReceiptActions";
import { reservationPaymentTitle } from "@/lib/rental-deposit-quick-view";
import { paymentStatus, toneClasses } from "@/lib/rental-labels";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import type { PaymentRequest } from "@/types/payment-request.type";

const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const instant = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—");
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const ghost = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

function span(ms: number) {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000), h = Math.floor((abs % 86_400_000) / 3_600_000), m = Math.floor((abs % 3_600_000) / 60_000);
  return d > 0 ? `${d} ngày ${h} giờ` : h > 0 ? `${h} giờ ${m} phút` : `${Math.max(m, 1)} phút`;
}

// Refunds have no per-payment confirmation deadline to show; the server auto-confirms after a silent period.
const isRefundPayment = (p: PaymentRequest) => p.type === "INITIAL_PAYMENT_REFUND" || p.type === "DEPOSIT_REFUND";

export type PaymentCardAction = "pay" | "confirm" | "reject" | "reviewOk" | "reviewReopen" | "proof";

/** One payment: what it is, how much, until when, its status and ONE main button for the viewer. */
export default function OnboardingPaymentCard({ payment: p, view, isOwner, busy, onAction }: {
  payment: PaymentRequest; view: RentalOnboarding; isOwner: boolean; busy: boolean;
  onAction: (action: PaymentCardAction, payment: PaymentRequest, evidenceStorageId?: string) => void;
}) {
  const now = new Date(view.serverNow).getTime();
  const due = p.dueAt ? new Date(p.dueAt).getTime() : null;
  const overdue = p.status === "AWAITING_TRANSFER" && due !== null && now >= due;
  const status = paymentStatus(overdue ? "OVERDUE" : p.status);
  const refund = p.type === "INITIAL_PAYMENT_REFUND";

  const canPay = (p.direction === "LANDLORD_TO_TENANT" ? isOwner : !isOwner && !view.cancellationRequestedAt) && p.totalAmount > 0
    && (p.status === "AWAITING_TRANSFER" || refund && p.status === "REJECTED") && (refund || due === null || now < due);
  const canReceive = (p.direction === "LANDLORD_TO_TENANT" ? !isOwner : isOwner) && p.status === "TRANSFER_REPORTED";
  const canReview = isOwner && p.direction === "TENANT_TO_LANDLORD" && (p.status === "REJECTED" || overdue);

  const open = p.status === "AWAITING_TRANSFER" || p.status === "REJECTED";
  const countdown = open && due !== null ? (now >= due ? { late: true, text: `Quá hạn ${span(now - due)}` } : { late: false, text: `Còn ${span(due - now)}` }) : null;

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-base font-bold">{reservationPaymentTitle(p)}</h4>
          <p className="mt-0.5 text-sm text-muted-foreground">{p.direction === "LANDLORD_TO_TENANT" ? "Chủ nhà chuyển cho người thuê" : "Người thuê chuyển cho chủ nhà"}</p>
        </div>
        <p className="text-xl font-extrabold text-foreground">{money(p.totalAmount)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[status.tone]}`}>{status.label}</span>
        {countdown ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[countdown.late ? "danger" : "warning"]}`}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />{countdown.text}<span className="font-normal opacity-80">· hạn {instant(p.dueAt)}</span>
          </span>
        ) : null}
        {p.status === "CONFIRMED" ? <span className="text-xs text-muted-foreground">Xác nhận lúc {instant(p.confirmedAt)}</span> : null}
        {p.status === "TRANSFER_REPORTED" && p.confirmationDueAt && !isRefundPayment(p) ? <span className="text-xs text-muted-foreground">Hạn xác nhận {instant(p.confirmationDueAt)}</span> : null}
      </div>
      {p.transferReference ? (
        <p className="break-all rounded-xl bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">Nội dung chuyển khoản: </span><span className="font-mono font-semibold">{p.transferReference}</span></p>
      ) : null}
      {p.rejectedReason ? <p className="text-sm text-muted-foreground">Lý do chưa xác nhận: {p.rejectedReason}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {canPay ? <button type="button" className={primary} disabled={busy} onClick={() => onAction("pay", p)}>{p.status === "REJECTED" ? "Gửi lại chứng từ" : "Chuyển khoản / Gửi chứng từ"}</button> : null}
        {canReceive ? <button type="button" className={primary} disabled={busy} onClick={() => onAction("confirm", p)}>Xác nhận đã nhận đủ tiền</button> : null}
        {canReceive ? <button type="button" className={ghost} disabled={busy} onClick={() => onAction("reject", p)}>Chưa nhận đủ / Từ chối chứng từ</button> : null}
        {canReview ? <button type="button" className={primary} disabled={busy} onClick={() => onAction("reviewOk", p)}>Xác nhận đã nhận đủ</button> : null}
        {canReview ? <button type="button" className={ghost} disabled={busy} onClick={() => onAction("reviewReopen", p)}>Chưa nhận: mở lại thanh toán</button> : null}
        {p.evidences?.map((e, i) => (
          <button key={e.id} type="button" className={ghost} onClick={() => onAction("proof", p, e.storageObjectId)}>
            <Eye className="h-4 w-4" aria-hidden="true" />{p.evidences!.length > 1 ? `Xem chứng từ ${i + 1}` : "Xem chứng từ"}
          </button>
        ))}
      </div>
      {p.status === "CONFIRMED" && p.totalAmount > 0 ? <PaymentReceiptActions paymentId={p.id} /> : null}
    </article>
  );
}
