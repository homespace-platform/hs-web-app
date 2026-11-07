"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  paymentReceiptService,
  type PaymentReceipt,
} from "@/services/payment-receipt.service";
import { getApiErrorMessage } from "@/utils/apiError";

type Props = { paymentId: string; receipt?: PaymentReceipt };
export default function PaymentReceiptActions(props: Props) {
  return <ReceiptActions key={props.paymentId} {...props} />;
}

function ReceiptActions({ paymentId, receipt }: Props) {
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<{ url: string; number: string } | null>(
      null,
    );
  const lock = useRef(false),
    sequence = useRef({ value: 0 }),
    trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const counter = sequence.current;
    return () => {
      ++counter.value;
    };
  }, [paymentId]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function open(download: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const counter = sequence.current;
    const token = counter.value;
    try {
      const source =
        receipt ?? (await paymentReceiptService.byPayment(paymentId));
      if (token !== counter.value) return;
      if (source.pdfStatus !== "READY") {
        toast.info(
          source.pdfStatus === "FAILED"
            ? "PDF chưa tạo được. Mở mục Chứng từ đã thanh toán để thử lại."
            : "PDF đang được chuẩn bị. Bạn có thể xem lại sau ít phút.",
        );
        return;
      }
      const blob = await paymentReceiptService.pdf(source.id);
      if (token !== counter.value) return;
      const url = URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = source.receiptNumber + ".pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else setPreview({ url, number: source.receiptNumber });
    } catch (error) {
      if (token === counter.value)
        toast.error(
          getApiErrorMessage(
            error,
            "Chưa mở được chứng từ thanh toán. Vui lòng thử lại.",
          ),
        );
    } finally {
      lock.current = false;
      if (token === counter.value) setBusy(false);
    }
  }
  const button =
    "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={(event) => {
          trigger.current = event.currentTarget;
          void open(false);
        }}
        className={`${button} border-primary/30 text-primary`}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Eye className="size-3.5" />
        )}
        Xem hóa đơn PDF
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void open(true)}
        className={button}
      >
        <Download className="size-3.5" />
        Tải PDF
      </button>
      <Dialog.Root
        open={!!preview}
        onOpenChange={(value) => {
          if (!value) setPreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[111] flex h-[90vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus({ preventScroll: true });
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
              <div>
                <Dialog.Title className="text-sm font-bold">
                  Chứng từ thanh toán
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  {preview?.number} · Có thể in bằng thanh công cụ PDF.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Đóng bản xem PDF"
                className="rounded-lg border p-2"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            {preview && (
              <iframe
                title={`Chứng từ ${preview.number}`}
                src={preview.url}
                className="min-h-0 w-full flex-1 border-0 bg-slate-100"
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
