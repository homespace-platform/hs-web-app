"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileCheck2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  paymentReceiptService,
  type PaymentReceipt,
} from "@/services/payment-receipt.service";
import PaymentReceiptActions from "@/components/payment/PaymentReceiptActions";
import { getApiErrorMessage } from "@/utils/apiError";
import Pagination from "@/components/common/Pagination";
import { PAGE_SIZE, clampPage } from "@/lib/pagination";
import ReceiptRow, { Badge, downloadBlob } from "./ReceiptRow";

export default function PaymentReceiptsPanel({
  role,
  contractId,
  page,
  onPage,
  refreshKey,
}: {
  role: "landlord" | "tenant";
  contractId?: string;
  page: number;
  onPage: (page: number, replace?: boolean) => void;
  refreshKey: number;
}) {
  const [rows, setRows] = useState<PaymentReceipt[]>([]),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [busyId, setBusyId] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retrying, setRetrying] = useState<string | null>(null),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const sequence = useRef({ value: 0 });
  const load = useCallback(
    async (silent = false) => {
      const counter = sequence.current,
        token = ++counter.value;
      if (!silent) setLoading(true);
      try {
        const data = await paymentReceiptService.list({
          role: role.toUpperCase() as "LANDLORD" | "TENANT",
          contractId,
          page,
          size: PAGE_SIZE,
        });
        if (token !== counter.value) return;
        const count = Math.max(1, data.totalPages);
        // A stale ?page= beyond the last page jumps to the last one.
        if (page > count) return onPage(clampPage(page, count), true);
        setRows(data.result ?? []);
        setPages(count);
        setTotal(data.totalElements ?? 0);
        setError("");
      } catch (e) {
        if (token === counter.value)
          setError(getApiErrorMessage(e, "Chưa tải được chứng từ thanh toán."));
      } finally {
        if (token === counter.value) setLoading(false);
      }
    },
    [role, contractId, page, onPage],
  );
  useEffect(() => {
    const counter = sequence.current;
    setRows([]);
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 15000);
    return () => {
      ++counter.value;
      clearInterval(timer);
    };
    // refreshKey is bumped by the page-level "Làm mới" button.
  }, [load, refreshKey]);
  async function pdf(row: PaymentReceipt) {
    setBusyId(row.id);
    try {
      downloadBlob(await paymentReceiptService.pdf(row.id), `${row.receiptNumber}.pdf`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa tải được PDF."));
    } finally {
      setBusyId(null);
    }
  }
  async function retry(row: PaymentReceipt) {
    if (retrying) return;
    setRetrying(row.id);
    try {
      const result = await paymentReceiptService.retry(row.id);
      toast.info(
        result.pdfStatus === "PENDING"
          ? "Đã xếp hàng tạo lại PDF."
          : "Hệ thống đang chờ lượt thử tiếp theo. Vui lòng thử lại sau ít phút.",
      );
      await load(true);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa thể tạo lại PDF."));
    } finally {
      setRetrying(null);
    }
  }
  const money = (row: PaymentReceipt) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: row.currency,
    }).format(row.totalAmount);
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const selected = rows.find((row) => row.id === selectedId);
  return (
    <section className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div
          aria-busy="true"
          className="h-48 animate-pulse rounded-2xl border bg-muted/40"
        />
      ) : !rows.length && !error ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <FileCheck2 className="mx-auto size-9 text-muted-foreground" />
          <p className="mt-3 font-semibold">Chưa có chứng từ thanh toán</p>
          <PolicyNotice tone="neutral" title="Chưa có chứng từ thanh toán" summary="Phiếu được tạo sau khi bên nhận xác nhận đã nhận đủ tiền."><p>Phiếu được tạo sau khi bên nhận xác nhận đã nhận đủ tiền. Báo chuyển
            khoản chưa tạo phiếu.</p></PolicyNotice>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {rows.map((row) => (
            <ReceiptRow
              key={row.id}
              icon={row.kind === "REFUND" ? <RotateCcw className="size-4" /> : <FileCheck2 className="size-4" />}
              title={row.title}
              subtitle={[row.contractNumber ?? row.propertyAddress, day(row.issuedAt), `${row.payerName} → ${row.payeeName}`]
                .filter(Boolean)
                .join(" · ")}
              amount={money(row)}
              status={<Badge>Đã xác nhận</Badge>}
              pdfStatus={row.pdfStatus}
              busy={busyId === row.id}
              onView={() => setSelectedId(row.id)}
              onPdf={() => void pdf(row)}
            />
          ))}
        </ul>
      )}
      {!loading && total > 0 && <Pagination page={page} pages={pages} total={total} onPage={onPage} />}
      <Dialog.Root open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card shadow-2xl"
          >
            {selected && (
              <>
                <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
                  <div className="min-w-0">
                    <Dialog.Title className="text-base font-bold">{selected.title}</Dialog.Title>
                    <p className="break-all font-mono text-sm text-muted-foreground">{selected.receiptNumber}</p>
                  </div>
                  <Dialog.Close aria-label="Đóng" className="rounded-lg border p-2">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="space-y-2 px-5 py-4 text-sm">
                  <p className="text-xl font-extrabold tabular-nums text-primary">{money(selected)}</p>
                  <p>
                    {selected.payerName} <span className="text-muted-foreground">→</span> {selected.payeeName}
                  </p>
                  <p className="text-muted-foreground">
                    Xác nhận: {new Date(selected.issuedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam)
                  </p>
                  {selected.propertyAddress && <p className="text-muted-foreground">{selected.propertyAddress}</p>}
                  {selected.contractNumber && (
                    <p className="text-muted-foreground">
                      Hợp đồng: {selected.contractNumber}
                    </p>
                  )}
                  {selected.periodLabel && <p className="text-muted-foreground">Kỳ: {selected.periodLabel}</p>}
                  <p className="break-all text-muted-foreground">
                    Nội dung CK: <strong className="font-mono text-foreground">{selected.transferReference}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
                  {selected.pdfStatus === "READY" ? (
                    <PaymentReceiptActions paymentId={selected.paymentId} receipt={selected} />
                  ) : selected.pdfStatus === "PENDING" ? (
                    <span className="text-sm font-medium text-blue-700">Đang tạo PDF…</span>
                  ) : (
                    <button
                      type="button"
                      disabled={retrying === selected.id}
                      onClick={() => void retry(selected)}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {retrying === selected.id ? "Đang xử lý…" : "Thử tạo lại PDF"}
                    </button>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
