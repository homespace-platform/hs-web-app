"use client";

import { useCallback, useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import {
  membershipReceiptService,
  type MembershipReceipt,
} from "@/services/membership-receipt.service";
import { getApiErrorMessage } from "@/utils/apiError";
import Pagination from "@/components/common/Pagination";
import { PAGE_SIZE, clampPage } from "@/lib/pagination";
import ReceiptRow, { Badge, downloadBlob } from "./ReceiptRow";
import MembershipReceiptDialog from "./MembershipReceiptDialog";
import { membershipMoney, membershipStatusLabel, providerName } from "./membership-receipt-format";

export function MembershipReceiptList({
  rows,
  busyId,
  onView,
  onPdf,
}: {
  rows: MembershipReceipt[];
  busyId?: string | null;
  onView: (row: MembershipReceipt) => void;
  onPdf: (row: MembershipReceipt) => void;
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
        <ReceiptRow
          key={row.id}
          icon={<FileCheck2 className="size-4" />}
          title={row.itemName}
          subtitle={[
            row.receiptNumber,
            providerName(row.provider),
            new Date(row.issuedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
          ].join(" · ")}
          amount={membershipMoney(row)}
          status={<Badge tone={row.type === "OVERPAYMENT" ? "warn" : "ok"}>{membershipStatusLabel(row)}</Badge>}
          pdfStatus={row.pdfStatus}
          busy={busyId === row.id}
          onView={() => onView(row)}
          onPdf={() => onPdf(row)}
        />
      ))}
    </ul>
  );
}

export default function MembershipReceiptsPanel({
  page,
  onPage,
  refreshKey,
}: {
  page: number;
  onPage: (page: number, replace?: boolean) => void;
  refreshKey: number;
}) {
  const [rows, setRows] = useState<MembershipReceipt[]>([]),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busyId, setBusyId] = useState<string | null>(null),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await membershipReceiptService.list({ page, size: PAGE_SIZE });
        const count = Math.max(1, data.totalPages);
        // A stale ?page= beyond the last page jumps to the last one.
        if (page > count) return onPage(clampPage(page, count), true);
        setRows(data.result ?? []);
        setPages(count);
        setTotal(data.totalElements ?? 0);
        setError("");
      } catch (e) {
        setError(getApiErrorMessage(e, "Chưa tải được biên nhận gói hội viên."));
      } finally {
        setLoading(false);
      }
    },
    [page, onPage],
  );
  // refreshKey is bumped by the page-level "Làm mới" button.
  useEffect(() => {
    void load();
    const t = setInterval(() => document.visibilityState === "visible" && void load(true), 15000);
    return () => clearInterval(t);
  }, [load, refreshKey]);
  async function pdf(row: MembershipReceipt) {
    setBusyId(row.id);
    try {
      downloadBlob(await membershipReceiptService.pdf(row.id), `${row.receiptNumber}.pdf`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa tải được PDF."));
    } finally {
      setBusyId(null);
    }
  }
  return (
    <section className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </p>
      )}
      {loading ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
      ) : (
        !error && <MembershipReceiptList rows={rows} busyId={busyId} onView={(r) => setSelectedId(r.id)} onPdf={pdf} />
      )}
      {!loading && !error && total > 0 && <Pagination page={page} pages={pages} total={total} onPage={onPage} />}
      <MembershipReceiptDialog id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => void load(true)} />
    </section>
  );
}
