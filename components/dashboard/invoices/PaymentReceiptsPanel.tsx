"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileCheck2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  paymentReceiptService,
  type PaymentReceipt,
} from "@/services/payment-receipt.service";
import PaymentReceiptActions from "@/components/payment/PaymentReceiptActions";
import { getApiErrorMessage } from "@/utils/apiError";

export default function PaymentReceiptsPanel({
  role,
  contractId,
}: {
  role: "landlord" | "tenant";
  contractId?: string;
}) {
  const [rows, setRows] = useState<PaymentReceipt[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retrying, setRetrying] = useState<string | null>(null);
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
          size: 12,
        });
        if (token !== counter.value) return;
        setRows(data.result ?? []);
        setPages(Math.max(1, data.totalPages));
        setError("");
      } catch (e) {
        if (token === counter.value)
          setError(getApiErrorMessage(e, "Chưa tải được chứng từ thanh toán."));
      } finally {
        if (token === counter.value) setLoading(false);
      }
    },
    [role, contractId, page],
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
  }, [load]);
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
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Chứng từ đã thanh toán</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi khoản tiền đã được bên nhận xác nhận có một phiếu riêng. Dữ liệu
            trên phiếu được giữ nguyên để đối chiếu.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Phiếu được tạo sau khi bên nhận xác nhận đã nhận đủ tiền. Báo chuyển
            khoản chưa tạo phiếu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    {row.kind === "REFUND" ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <FileCheck2 className="size-4" />
                    )}
                    {row.title}
                  </div>
                  <h3 className="break-all font-mono text-sm font-bold">
                    {row.receiptNumber}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Xác nhận:{" "}
                    {new Date(row.issuedAt).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}{" "}
                    (giờ Việt Nam)
                  </p>
                  <p className="pt-1 text-sm">
                    {row.payerName}{" "}
                    <span className="text-muted-foreground">→</span>{" "}
                    {row.payeeName}
                  </p>
                  {row.propertyAddress && (
                    <p className="max-w-2xl text-xs text-muted-foreground">
                      {row.propertyAddress}
                    </p>
                  )}
                  {row.contractNumber && (
                    <p className="text-xs text-muted-foreground">
                      Hợp đồng: {row.contractNumber}
                    </p>
                  )}
                  {row.periodLabel && (
                    <p className="text-xs text-muted-foreground">
                      Kỳ: {row.periodLabel}
                    </p>
                  )}
                </div>
                <div className="shrink-0 space-y-2 sm:text-right">
                  <p className="text-xl font-extrabold tabular-nums text-primary">
                    {money(row)}
                  </p>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                    Đã xác nhận thanh toán
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
                <p className="break-all text-xs text-muted-foreground">
                  Nội dung CK:{" "}
                  <strong className="font-mono text-foreground">
                    {row.transferReference}
                  </strong>
                </p>
                {row.pdfStatus === "READY" ? (
                  <PaymentReceiptActions
                    paymentId={row.paymentId}
                    receipt={row}
                  />
                ) : row.pdfStatus === "PENDING" ? (
                  <span className="text-xs font-medium text-blue-700">
                    Đang tạo PDF…
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={retrying === row.id}
                    onClick={() => void retry(row)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {retrying === row.id ? "Đang xử lý…" : "Thử tạo lại PDF"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((v) => v - 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span>
            Trang {page} / {pages}
          </span>
          <button
            type="button"
            disabled={loading || page >= pages}
            onClick={() => setPage((v) => v + 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Tiếp
          </button>
        </div>
      )}
    </section>
  );
}
