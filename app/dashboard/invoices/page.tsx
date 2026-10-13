"use client";
import { useEffect, useRef, useState } from "react";
import { ReceiptText, RefreshCw, Search } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import ContractPaymentCard, { type ContractPaymentBundle } from "@/components/dashboard/invoices/ContractPaymentCard";
import { contractService } from "@/services/contract.service";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import paymentRequestService from "@/services/payment-request.service";
import { contractLifecycleService } from "@/services/contract-lifecycle.service";
import type { ContractStatus } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";

export default function InvoicesPage() {
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const [bundles, setBundles] = useState<ContractPaymentBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<ContractStatus | "">("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const prevRole = useRef(role);
  useEffect(() => {
    if (prevRole.current !== role) { prevRole.current = role; setPage(1); setStatus(""); setSearch(""); setBundles([]); }
  }, [role]);
  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    setLoading(true); setError("");
    void (async () => {
      try {
        const result = await contractService.listContracts({ role: role.toUpperCase() as "LANDLORD" | "TENANT", billableOnly: true, status: status || undefined, page, size: 8 });
        if (cancelled) return;
        const next = await Promise.all((result.result || []).map(async contract => {
          // Read payment amounts after invoice sync has updated fees and transfer obligations.
          const [invoiceResult, lifecycleResult, initialResult] = await Promise.allSettled([
            monthlyInvoiceService.list(contract.id), contractLifecycleService.get(contract.id),
            paymentRequestService.getInitialPaymentByRentalRequestId(contract.rentalRequestId),
          ]);
          const paymentResult = await Promise.allSettled([paymentRequestService.getContractPayments(contract.id)]);
          return { contract, invoices: invoiceResult.status === "fulfilled" ? invoiceResult.value : undefined,
            lifecycle: lifecycleResult.status === "fulfilled" ? lifecycleResult.value : undefined,
            initial: initialResult.status === "fulfilled" ? initialResult.value : undefined,
            payments: paymentResult[0].status === "fulfilled" ? paymentResult[0].value : undefined };
        }));
        if (cancelled) return;
        setBundles(next); setTotalPages(result.totalPages || 1);
      } catch (cause) {
        if (!cancelled) { setError(getApiErrorMessage(cause, "Chưa tải được hồ sơ thanh toán.")); setBundles([]); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [role, status, page, refreshKey]);
  const visible = bundles.filter(bundle => bundle.contract.contractNumber.toLowerCase().includes(search.trim().toLowerCase()));
  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  if (!role) return <div className="rounded-xl border p-5">Chọn vai trò để xem thanh toán. <button type="button" onClick={openRolePicker} className="text-primary underline">Chọn vai trò</button></div>;
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><ReceiptText className="size-6 text-primary" />Hóa đơn & thanh toán</h1><p className="mt-2 text-sm text-muted-foreground">{role === "landlord" ? "Quản lý các khoản thu và hoàn cọc cho người thuê." : "Theo dõi các khoản thanh toán và tiền cọc được hoàn."}</p></div>
      <button type="button" disabled={loading} onClick={() => setRefreshKey(key => key + 1)} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Làm mới</button>
    </header>
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm font-medium">Tìm hợp đồng trong trang này<div className="relative mt-2"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập mã hợp đồng…" className="h-10 w-full rounded-xl border bg-background pl-9 pr-3" /></div></label>
      <label className="text-sm font-medium">Trạng thái hợp đồng<select value={status} onChange={event => { setStatus(event.target.value as ContractStatus | ""); setPage(1); }} className="mt-2 block h-10 w-full rounded-xl border bg-background px-3 sm:w-60"><option value="">Tất cả hợp đồng</option><option value="ACTIVE">Đang thuê</option><option value="EXPIRED">Đã hết thời hạn thuê</option><option value="CLOSED">Đã kết thúc hợp đồng</option><option value="TERMINATED">Đã chấm dứt</option></select></label>
    </div>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error === "Network Error" ? "Chưa kết nối được máy chủ. Kiểm tra kết nối và phiên đăng nhập rồi thử lại." : error} <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="underline">Thử lại</button></div>
      : loading ? <div aria-busy="true" className="space-y-4">{[0, 1].map(key => <div key={key} className="h-56 animate-pulse rounded-2xl border bg-muted/40" />)}</div>
      : visible.length ? visible.map(bundle => <ContractPaymentCard key={role + ":" + bundle.contract.id} bundle={bundle} role={role} />)
      : <div className="rounded-2xl border border-dashed bg-card p-8 text-center"><p className="font-semibold">{search ? "Không tìm thấy mã hợp đồng trên trang này" : "Chưa có hợp đồng phù hợp"}</p><p className="mt-2 text-sm text-muted-foreground">Mỗi hợp đồng có hồ sơ riêng cho thanh toán ban đầu, hóa đơn theo kỳ và hoàn cọc.</p>{(search || status) && <button type="button" onClick={() => { setSearch(""); setStatus(""); setPage(1); }} className="mt-3 text-sm font-semibold text-primary">Xóa bộ lọc</button>}</div>}
    {!loading && !error && totalPages > 1 && <nav aria-label="Phân trang hợp đồng" className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page === 1} onClick={() => { setPage(value => value - 1); setSearch(""); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button><span>Trang {page}/{totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => { setPage(value => value + 1); setSearch(""); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button></nav>}
  </div>;
}
