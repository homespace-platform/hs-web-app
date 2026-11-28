"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { membershipReceiptService, type MembershipReceipt } from "@/services/membership-receipt.service";
import { getApiErrorMessage } from "@/utils/apiError";
import { downloadBlob } from "./ReceiptRow";
import { membershipMoney, membershipStatusLabel, providerName } from "./membership-receipt-format";

/** Receipt view for the membership tab: detail from GET /membership/receipts/{id} plus an embedded PDF preview. */
export default function MembershipReceiptDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [receipt, setReceipt] = useState<MembershipReceipt | null>(null),
    [pdfUrl, setPdfUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    let alive = true,
      url = "";
    setReceipt(null);
    setPdfUrl("");
    setError("");
    (async () => {
      try {
        const detail = await membershipReceiptService.get(id);
        if (!alive) return;
        setReceipt(detail);
        if (detail.pdfStatus === "READY") {
          url = URL.createObjectURL(await membershipReceiptService.pdf(id));
          if (alive) setPdfUrl(url);
          else URL.revokeObjectURL(url);
        }
      } catch (e) {
        if (alive) setError(getApiErrorMessage(e, "Chưa mở được biên nhận. Vui lòng thử lại."));
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  async function retry() {
    if (!receipt || busy) return;
    setBusy(true);
    try {
      await membershipReceiptService.retry(receipt.id);
      toast.info("Đã xếp hàng tạo lại PDF.");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa thể tạo lại PDF."));
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!receipt || busy) return;
    setBusy(true);
    try {
      downloadBlob(await membershipReceiptService.pdf(receipt.id), `${receipt.receiptNumber}.pdf`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa tải được PDF."));
    } finally {
      setBusy(false);
    }
  }
  const field = (label: string, value?: string | number | null) =>
    value ? (
      <p className="text-muted-foreground">
        {label}: <strong className="break-all text-foreground">{value}</strong>
      </p>
    ) : null;
  return (
    <Dialog.Root open={!!id} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-bold">{receipt?.itemName ?? "Biên nhận gói hội viên"}</Dialog.Title>
              {receipt && <p className="break-all font-mono text-sm text-muted-foreground">{receipt.receiptNumber}</p>}
            </div>
            <Dialog.Close aria-label="Đóng" className="rounded-lg border p-2">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {error ? (
            <p role="alert" className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>
          ) : !receipt ? (
            <div aria-busy="true" className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2 px-5 py-4 text-sm">
                <p className="text-xl font-extrabold tabular-nums text-primary">{membershipMoney(receipt)}</p>
                <p className="font-semibold">{membershipStatusLabel(receipt)}</p>
                {field("Loại", receipt.kind === "PLAN" ? "Gói hội viên" : "Lượt đăng tin")}
                {field("Hạng", receipt.tier)}
                {field("Số lượng", receipt.quantity)}
                {field("Thời hạn", receipt.periodDays ? `${receipt.periodDays} ngày` : null)}
                {field("Cổng thanh toán", providerName(receipt.provider))}
                {field("Mã giao dịch", receipt.transactionRef)}
                {field("Phát hành", new Date(receipt.issuedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) + " (giờ Việt Nam)")}
                {field("Ghi chú", receipt.note)}
              </div>
              {pdfUrl && <iframe title={`Biên nhận ${receipt.receiptNumber}`} src={pdfUrl} className="h-[50vh] w-full border-y bg-slate-100" />}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
                {receipt.pdfStatus === "READY" ? (
                  <button type="button" disabled={busy} onClick={() => void download()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                    Tải PDF
                  </button>
                ) : receipt.pdfStatus === "PENDING" ? (
                  <span className="text-sm font-medium text-blue-700">Đang tạo PDF…</span>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void retry()} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                    {busy ? "Đang xử lý…" : "Thử tạo lại PDF"}
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
