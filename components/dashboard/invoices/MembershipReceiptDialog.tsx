"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { membershipReceiptService, type MembershipReceipt } from "@/services/membership-receipt.service";
import { getApiErrorMessage } from "@/utils/apiError";

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

  // Same viewer as rental receipts (PaymentReceiptActions): full-size PDF, title "Chứng từ thanh toán".
  return (
    <Dialog.Root open={!!id} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[111] flex h-[90vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
            <div>
              <Dialog.Title className="text-sm font-bold">Chứng từ thanh toán</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {receipt ? `${receipt.receiptNumber} · Có thể in bằng thanh công cụ PDF.` : "Đang tải…"}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Đóng bản xem PDF" className="rounded-lg border p-2">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {error ? (
            <p role="alert" className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>
          ) : !receipt || (receipt.pdfStatus === "READY" && !pdfUrl) ? (
            <div aria-busy="true" className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : pdfUrl ? (
            <iframe title={`Chứng từ ${receipt.receiptNumber}`} src={pdfUrl} className="min-h-0 w-full flex-1 border-0 bg-slate-100" />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              {receipt.pdfStatus === "PENDING" ? (
                <p className="font-medium text-blue-700">PDF đang được chuẩn bị. Bạn có thể xem lại sau ít phút.</p>
              ) : (
                <>
                  <p className="text-muted-foreground">PDF chưa tạo được.</p>
                  <button type="button" disabled={busy} onClick={() => void retry()} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">
                    {busy ? "Đang xử lý…" : "Thử tạo lại PDF"}
                  </button>
                </>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
