"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, ReceiptText, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { contractService } from "@/services/contract.service";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { invoiceMatchesPeriodFilter } from "@/lib/invoice-period-filter";
import type { ContractResponse } from "@/types/contract.type";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";

type InvoiceGroup = { contract: ContractResponse; invoices: MonthlyInvoice[] };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Date(`${value}T00:00:00+07:00`).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const STATUS: Record<MonthlyInvoice["status"], string> = {
  DRAFT: "Chờ phát hành", UNPAID: "Chưa thanh toán", OVERDUE: "Quá hạn", PAID: "Đã thanh toán", ROLLED_OVER: "Đã chuyển nợ",
};
const STATUS_STYLE: Record<MonthlyInvoice["status"], string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  UNPAID: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  OVERDUE: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  ROLLED_OVER: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function InvoicesPage() {
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const [groups, setGroups] = useState<InvoiceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

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
  useEffect(() => {
    setPage(1);
    setGroups([]);
    setSelectedDate("");
    setSelectedMonth("");
  }, [role]);

  const filteredGroups = useMemo(() => {
    if (!selectedDate && !selectedMonth) return groups;

    return groups
      .map((group) => ({
        ...group,
        invoices: group.invoices.filter((invoice) =>
          invoiceMatchesPeriodFilter(invoice, selectedDate, selectedMonth),
        ),
      }))
      .filter((group) => group.invoices.length > 0);
  }, [groups, selectedDate, selectedMonth]);

  const hasDateFilter = Boolean(selectedDate || selectedMonth);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  if (!role) return <div className="rounded-2xl border border-border bg-card p-6 text-sm">
    Chọn vai trò cho thuê hoặc đi thuê để xem hóa đơn. {" "}
    <button type="button" onClick={openRolePicker} className="font-semibold text-primary underline">Chọn vai trò</button>
  </div>;

  return <div className="space-y-6 pb-28 animate-in fade-in-50 duration-200">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl"><ReceiptText className="h-6 w-6 text-primary" />Hóa đơn {role === "landlord" ? "cho thuê" : "đi thuê"}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Theo dõi hóa đơn từng kỳ và mở chi tiết để {role === "landlord" ? "phát hành, xác nhận thanh toán hoặc xử lý quá hạn" : "xem số tiền, QR và báo chuyển khoản"}.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 cursor-pointer items-center gap-1.5 self-start rounded-xl border border-border bg-card px-3 text-xs font-semibold shadow-2xs transition-colors hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />Làm mới</button>
    </div>

    <div className="rounded-2xl border border-border bg-card p-3 shadow-2xs sm:p-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            Lọc theo kỳ hóa đơn
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Chọn một ngày nằm trong kỳ hoặc chọn cả tháng cần xem.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">
            <span className="block">Theo ngày</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                if (event.target.value) setSelectedMonth("");
              }}
              className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <span className="hidden h-9 items-center text-xs text-muted-foreground sm:flex">hoặc</span>
          <label className="space-y-1 text-xs font-semibold text-muted-foreground">
            <span className="block">Theo tháng</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                if (event.target.value) setSelectedDate("");
              }}
              className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          {hasDateFilter && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate("");
                setSelectedMonth("");
              }}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Xóa lọc
            </button>
          )}
        </div>
      </div>
    </div>

    {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Đang tải hóa đơn…</div>
      : groups.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">Chưa có hóa đơn cho hợp đồng ở trang này. Hóa đơn xuất hiện khi hợp đồng có hiệu lực và đến kỳ chốt chỉ số.</div>
      : filteredGroups.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-2xs">
          <p className="text-sm font-semibold text-foreground">Không có hóa đơn phù hợp</p>
          <p className="mt-1 text-xs text-muted-foreground">Không tìm thấy kỳ hóa đơn chứa ngày hoặc tháng đã chọn ở trang này.</p>
        </div>
      : filteredGroups.map(({ contract, invoices }) => <section key={contract.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs sm:p-5">
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
            : <div className="divide-y divide-border">{invoices.map((invoice) => <Link key={invoice.id} href={invoiceDetailPath(contract.id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition-colors hover:text-primary">
              <span>Kỳ {invoice.periodIndex + 1}: {date(invoice.periodStart)} – {date(invoice.periodEndExclusive)}</span>
              <span className="flex items-center gap-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[invoice.status]}`}>{STATUS[invoice.status]}</span><strong>{money(invoice.totalAmount)}</strong></span>
            </Link>)}</div>}
        </section>)}
    {totalPages > 1 && <div className="flex items-center justify-end gap-3 text-xs">
      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Trước</button>
      <span>{page}/{totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-2 disabled:opacity-40">Sau</button>
    </div>}
  </div>;
}
