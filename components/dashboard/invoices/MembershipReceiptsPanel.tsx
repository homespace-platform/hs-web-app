"use client";

import { useCallback, useEffect, useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  membershipReceiptService,
  type MembershipReceipt,
} from "@/services/membership-receipt.service";
import { getApiErrorMessage } from "@/utils/apiError";

const providerName = (p?: string | null) =>
  p === "ETH" ? "Ví ETH" : p === "SEPAY" ? "SePay" : (p ?? "—");

export function MembershipReceiptList({
  rows,
  busyId,
  onPdf,
  onRetry,
}: {
  rows: MembershipReceipt[];
  busyId?: string | null;
  onPdf: (row: MembershipReceipt) => void;
  onRetry: (row: MembershipReceipt) => void;
}) {
  if (!rows.length)
    return (
      <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <FileCheck2 className="mx-auto size-9 text-muted-foreground" />
        <p className="mt-3 font-semibold">Chưa có biên nhận gói hội viên</p>
        <p className="text-sm text-muted-foreground">
          Biên nhận được tạo ngay khi đơn mua gói hoặc lượt đăng tin được thanh toán thành công.
        </p>
      </div>
    );
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{row.itemName}</span>
            <span className="block break-all font-mono text-xs text-muted-foreground">{row.receiptNumber}</span>
            <span className="block text-sm text-muted-foreground">
              {providerName(row.provider)} ·{" "}
              {new Date(row.issuedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
          </span>
          <span className="text-sm font-bold tabular-nums text-primary">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: row.currency }).format(row.totalAmount)}
          </span>
          {row.pdfStatus === "READY" ? (
            <button type="button" disabled={busyId === row.id} onClick={() => onPdf(row)} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
              Tải PDF
            </button>
          ) : row.pdfStatus === "PENDING" ? (
            <span className="text-sm font-medium text-blue-700">Đang tạo PDF</span>
          ) : (
            <button type="button" disabled={busyId === row.id} onClick={() => onRetry(row)} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">
              Thử tạo lại PDF
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MembershipReceiptsPanel() {
  const [rows, setRows] = useState<MembershipReceipt[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await membershipReceiptService.list({ page, size: 12 });
      setRows(data.result ?? []);
      setPages(Math.max(1, data.totalPages));
      setError("");
    } catch (e) {
      setError(getApiErrorMessage(e, "Chưa tải được biên nhận gói hội viên."));
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && void load(), 15000);
    return () => clearInterval(t);
  }, [load]);
  async function pdf(row: MembershipReceipt) {
    setBusyId(row.id);
    try {
      const url = URL.createObjectURL(await membershipReceiptService.pdf(row.id));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa tải được PDF."));
    } finally {
      setBusyId(null);
    }
  }
  async function retry(row: MembershipReceipt) {
    setBusyId(row.id);
    try {
      await membershipReceiptService.retry(row.id);
      toast.info("Đã xếp hàng tạo lại PDF.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa thể tạo lại PDF."));
    } finally {
      setBusyId(null);
    }
  }
  if (loading)
    return (
      <div aria-busy="true" className="flex h-48 items-center justify-center rounded-2xl border bg-muted/40">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </p>
      )}
      {!error && <MembershipReceiptList rows={rows} busyId={busyId} onPdf={pdf} onRetry={retry} />}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button>
          <span>Trang {page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((v) => v + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Tiếp</button>
        </div>
      )}
    </div>
  );
}
