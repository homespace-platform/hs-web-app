"use client";

import { useCallback, useEffect, useState } from "react";
import paymentRequestService from "@/services/payment-request.service";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";
import storageService from "@/services/storage.service";
import { toast } from "sonner";

const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const labels: Record<PaymentStatus, string> = {
  CONFIRMED: "Đã xác nhận thanh toán",
  TRANSFER_REPORTED: "Đã thanh toán · Chờ xác nhận",
  AWAITING_TRANSFER: "Chưa thanh toán",
  REJECTED: "Chứng từ bị từ chối",
  DISPUTED: "Đang đối soát",
  CANCELLED: "Đã hủy",
  OVERDUE: "Quá hạn",
  EXPIRED: "Đã hết hạn",
};

type Props = {
  rentalRequestId: string;
  contractNumber?: string;
  /** When true, start expanded (used on contract invoice detail). */
  defaultOpen?: boolean;
  compact?: boolean;
};

/** Read the original obligation; never create another invoice or collect the deposit/rent twice. */
export default function InitialPaymentHistory({
  rentalRequestId,
  contractNumber,
  defaultOpen = false,
  compact = false,
}: Props) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  const load = useCallback(async () => {
    setPayment(null);
    setError(false);
    try {
      setPayment(await paymentRequestService.getInitialPaymentByRentalRequestId(rentalRequestId));
    } catch {
      setError(true);
    }
  }, [rentalRequestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = payment ? labels[payment.status] : null;
  async function viewProof(id: string) {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try { const url = await storageService.getPaymentProofViewUrl(id); if (tab) tab.location.href = url; }
    catch { tab?.close(); toast.error("Chưa mở được chứng từ thanh toán ban đầu."); }
  }

  return (
    <article className={`rounded-xl border border-border bg-muted/20 text-sm ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="font-semibold text-foreground">
            Cọc + tiền phòng tháng 1
          </h3>
          <p className="text-xs text-muted-foreground">
            Thanh toán ban đầu
            {contractNumber ? ` · ${contractNumber}` : ""}
            {" · "}không thu lại trong hóa đơn hằng tháng
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusLabel && (
            <span
              className={
                payment?.status === "CONFIRMED"
                  ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  : payment
                    ? "text-xs font-semibold text-amber-700 dark:text-amber-400"
                    : "text-xs text-muted-foreground"
              }
            >
              {statusLabel}
            </span>
          )}
          {payment && (
            <span className="text-sm font-bold tabular-nums text-foreground">
              {money(payment.totalAmount)}
            </span>
          )}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? "Thu gọn" : "Xem chi tiết"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Chưa tải được khoản thanh toán ban đầu.{" "}
          <button type="button" onClick={() => void load()} className="underline cursor-pointer">
            Thử lại
          </button>
        </p>
      ) : !payment ? (
        <p className="mt-2 text-xs text-muted-foreground">Đang tải khoản thanh toán ban đầu…</p>
      ) : open ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {payment.lineItems.map((line) => (
            <div key={line.id} className="flex justify-between gap-3 text-xs">
              <span>{line.type === "RENT" ? "Tiền phòng tháng 1" : line.displayName}</span>
              <span className="tabular-nums">{money(line.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Tổng thanh toán ban đầu</span>
            <span className="tabular-nums">{money(payment.totalAmount)}</span>
          </div>
          {(payment.payeeConfirmedAt || payment.confirmedAt) && (
            <p className="text-xs text-muted-foreground">
              Xác nhận lúc:{" "}
              {new Date((payment.payeeConfirmedAt || payment.confirmedAt)!).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
          )}
          {!!payment.evidences?.length && <div className="space-y-2 border-t pt-3"><p className="text-sm font-medium">Chứng từ thanh toán ban đầu</p>{payment.evidences.map((evidence, index) => <button key={evidence.id} type="button" onClick={() => void viewProof(evidence.storageObjectId)} className="block text-sm text-primary underline">Xem chứng từ {index + 1}</button>)}</div>}
        </div>
      ) : null}
    </article>
  );
}
