"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { contractService } from "@/services/contract.service";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import type { ContractResponse } from "@/types/contract.type";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";

type InvoiceGroup = { contract: ContractResponse; invoices: MonthlyInvoice[] };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Date(`${value}T00:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const STATUS: Record<MonthlyInvoice["status"], string> = {
  DRAFT: "Chờ phát hành", UNPAID: "Chưa thanh toán", OVERDUE: "Quá hạn", PAID: "Đã thanh toán", ROLLED_OVER: "Đã chuyển nợ",
};

export default function InvoicesPage() {
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const [groups, setGroups] = useState<InvoiceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      const result = await contractService.listContracts({ role: role.toUpperCase() as "LANDLORD" | "TENANT", billableOnly: true, page, size: 12 });
      const contracts = result.result || [];
      const invoiceResults = await Promise.allSettled(contracts.map((contract) => monthlyInvoiceService.list(contract.id)));
      setGroups(contracts.map((contract, index) => ({
        contract,
        invoices: invoiceResults[index].status === "fulfilled" ? invoiceResults[index].value : [],
      })));
      if (invoiceResults.some((item) => item.status === "rejected")) {
        toast.warning("Một số hóa đơn chưa tải được. Hãy thử làm mới.");
      }
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải danh sách hóa đơn."));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [role, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setGroups([]); }, [role]);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  if (!role) return <div className="rounded-2xl border border-border bg-card p-6 text-sm">
    Chọn vai trò cho thuê hoặc đi thuê để xem hóa đơn. {" "}
    <button type="button" onClick={openRolePicker} className="font-semibold text-primary underline">Chọn vai trò</button>
  </div>;

  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ReceiptText className="h-6 w-6 text-primary" />Hóa đơn {role === "landlord" ? "cho thuê" : "đi thuê"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Theo dõi hóa đơn từng kỳ và mở chi tiết để {role === "landlord" ? "phát hành, xác nhận thanh toán hoặc xử lý quá hạn" : "xem số tiền, QR và báo chuyển khoản"}.</p>
      </div>
      <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" />Làm mới</button>
    </div>
    {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải hóa đơn…</div>
      : groups.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">Chưa có hóa đơn cho hợp đồng ở trang này. Hóa đơn xuất hiện khi hợp đồng có hiệu lực và đến kỳ chốt chỉ số.</div>
      : groups.map(({ contract, invoices }) => <section key={contract.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold">{contract.contractNumber}</p>
              <p className="text-xs text-muted-foreground">{role === "landlord" ? "Hợp đồng cho thuê" : "Hợp đồng đi thuê"} · {invoices.length} kỳ hóa đơn</p>
            </div>
            <div className="flex gap-3 text-xs font-semibold">
              <Link href={contractDetailPath(role, contract.id)} className="text-muted-foreground hover:underline">Xem hợp đồng</Link>
              <Link href={invoiceDetailPath(contract.id)} className="text-primary hover:underline">Quản lý hóa đơn →</Link>
            </div>
          </div>
          {invoices.length === 0 ? <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">Chưa có kỳ hóa đơn. Mở chi tiết để theo dõi khi đến ngày chốt chỉ số.</p>
            : <div className="divide-y divide-border">{invoices.map((invoice) => <Link key={invoice.id} href={invoiceDetailPath(contract.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-primary">
              <span>Kỳ {invoice.periodIndex + 1}: {date(invoice.periodStart)} – {date(invoice.periodEndExclusive)}</span>
              <span className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{STATUS[invoice.status]}</span><strong>{money(invoice.totalAmount)}</strong></span>
            </Link>)}</div>}
        </section>)}
    {totalPages > 1 && <div className="flex items-center justify-end gap-3 text-xs">
      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Trước</button>
      <span>{page}/{totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Sau</button>
    </div>}
  </div>;
}
