"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileCheck, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { contractService } from "@/services/contract.service";
import type { ContractResponse, ContractStatus } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import AgreementDocumentActions from "./AgreementDocumentActions";

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ người thuê",
  LANDLORD_SIGNATURE_PENDING: "Chờ chủ nhà ký SmartCA",
  TENANT_SIGNATURE_PENDING: "Chờ người thuê ký SmartCA",
  ACTIVE: "Hiệu lực",
  EXPIRED: "Hết thời hạn thuê",
  CLOSED: "Đã kết thúc hợp đồng",
  TERMINATED: "Đã chấm dứt",
  CANCELLED: "Đã hủy",
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  LANDLORD_SIGNATURE_PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  TENANT_SIGNATURE_PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  EXPIRED: "bg-amber-50 text-amber-800 border-amber-200",
  CLOSED: "bg-slate-50 text-slate-700 border-slate-200",
  TERMINATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

function contractStatusLabel(contract: ContractResponse): string {
  if (contract.agreementKind === "DEPOSIT" && contract.status === "ACTIVE") return "Đã ký đủ HĐ cọc";
  if (contract.agreementKind === "DEPOSIT" && contract.status === "DRAFT") return "HĐ cọc · Chờ ký";
  if (contract.status === "PENDING_REVIEW") {
    return contract.paymentStatus === "PAID" || contract.paymentStatus === "PAID_MOCK"
      ? "Chờ ký hợp đồng"
      : "Chờ thanh toán/ký";
  }
  return STATUS_LABEL[contract.status];
}

export default function ContractListView({ perspective }: { perspective: "landlord" | "tenant" }) {
  return <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Đang tải hợp đồng…</p>}><ContractListContent perspective={perspective}/></Suspense>;
}

function ContractListContent({ perspective }: { perspective: "landlord" | "tenant" }) {
  const router = useRouter();
  const searchParams=useSearchParams();
  const agreementKind=searchParams.get("kind")==="DEPOSIT"?"DEPOSIT":"LEASE";
  const sequence=useRef({value:0});
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContractResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">("ALL");
  const statusOptions=agreementKind==="DEPOSIT"
    ? (["ALL","DRAFT","LANDLORD_SIGNATURE_PENDING","TENANT_SIGNATURE_PENDING","ACTIVE","TERMINATED","CANCELLED"] as const)
    : (["ALL","DRAFT","LANDLORD_SIGNATURE_PENDING","TENANT_SIGNATURE_PENDING","PENDING_REVIEW","ACTIVE","EXPIRED","CLOSED","TERMINATED","CANCELLED"] as const);

  const load = useCallback(async (silent = false) => {
    const current=++sequence.current.value;
    if (!silent) setLoading(true);
    try {
      const res = await contractService.listContracts({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        role: perspective.toUpperCase() as "LANDLORD" | "TENANT",
        page,
        size: 12,
        agreementKind,
      });
      if(current!==sequence.current.value)return;
      setItems(res.result || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      if (current===sequence.current.value && !silent) toast.error(getApiErrorMessage(err, "Không thể tải danh sách hợp đồng."));
    } finally {
      if (current===sequence.current.value) setLoading(false);
    }
  }, [page, perspective, statusFilter, agreementKind]);

  useEffect(() => {
    const counter=sequence.current;
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 30000);
    return () => {++counter.value;window.clearInterval(timer);};
  }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-primary" />
            {perspective === "landlord" ? "Quản lý hợp đồng cho thuê" : "Quản lý hợp đồng đi thuê"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {perspective === "landlord"
              ? "Xem và ký hợp đồng cọc, hợp đồng thuê của các hồ sơ cho thuê."
              : "Xem hợp đồng cọc giữ phòng và hợp đồng thuê của bạn."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 px-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Làm mới
        </button>
      </div>

      <div className="flex gap-2 rounded-2xl border bg-card p-2" role="tablist" aria-label="Loại hợp đồng">
        {(["LEASE","DEPOSIT"] as const).map(kind=><button key={kind} type="button" role="tab" aria-selected={agreementKind===kind}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${agreementKind===kind?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted"}`}
          onClick={()=>{setPage(1);setStatusFilter("ALL");router.replace(`/dashboard/${perspective}/contracts?kind=${kind}`,{scroll:false});}}>
          {kind==="DEPOSIT"?"Hợp đồng cọc":"Hợp đồng thuê"}
        </button>)}
      </div>
      {agreementKind==="DEPOSIT" && <p className="text-sm text-muted-foreground">Xem và ký cọc, theo dõi hạn vào ở, thanh toán tháng đầu và xử lý hồ sơ giữ phòng tại đây. Sau khi ký cọc, bạn cần hoàn tất nghĩa vụ đúng hạn.</p>}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setPage(1);
              setStatusFilter(key);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
              statusFilter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {key === "ALL" ? "Tất cả" : agreementKind==="DEPOSIT" && key==="DRAFT" ? "Chờ chủ nhà ký" : key === "ACTIVE" ? agreementKind==="DEPOSIT"?"Đã ký đủ HĐ cọc":"Đã ký / Hiệu lực" : key === "DRAFT" && perspective === "tenant" ? "Bản nháp để xem trước" : STATUS_LABEL[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Đang tải...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center shadow-2xs space-y-2">
          <p className="text-sm font-semibold text-foreground">{agreementKind==="DEPOSIT"?"Chưa có hợp đồng cọc":"Chưa có hợp đồng thuê"}</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {perspective === "landlord"
              ? "Với hồ sơ có cọc, hợp đồng cọc sẽ xuất hiện sau khi xác nhận nhận cọc. Hồ sơ không đặt cọc hoặc cọc 0 đồng bỏ qua hợp đồng cọc. Hợp đồng thuê được chuẩn bị khi đến ngày bắt đầu và xác nhận đủ tiền thuê. "
              : "Với hồ sơ có cọc, bạn xem và ký hợp đồng cọc sau khi chủ nhà xác nhận nhận cọc. Không đặt cọc hoặc cọc 0 đồng thì bỏ qua bước này. Hợp đồng thuê xuất hiện khi đến ngày bắt đầu và xác nhận đủ tiền thuê. "}
            <Link href={perspective === "landlord" ? "/dashboard/rental-requests" : "/dashboard/rental-requests/my-requests"} className="text-primary font-semibold hover:underline">
              Xem yêu cầu thuê
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const role = perspective === "landlord" ? "Bên cho thuê" : "Bên đi thuê";
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <button type="button" onClick={() => router.push(contractDetailPath(perspective, c.id))}
                  className="w-full text-left hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary mb-1">{c.agreementKind === "DEPOSIT" ? "Hợp đồng đặt cọc · Giữ phòng" : "Hợp đồng thuê"}</p>
                    <p className="text-sm font-bold text-foreground truncate">{c.contractNumber}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {role} · Tạo {c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[c.status]}`}
                  >
                    {c.agreementKind !== "DEPOSIT" && c.status === "DRAFT" && perspective === "tenant" ? "Bản nháp · Chưa có hiệu lực" : contractStatusLabel(c)}
                  </span>
                </div>
                </button>
                <div className="mt-3 border-t border-border/60 pt-3"><AgreementDocumentActions contract={c} perspective={perspective}/></div>
                {c.agreementKind !== "DEPOSIT" && c.status === "DRAFT" && perspective === "tenant" && <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                  <p className="text-muted-foreground">Đây là bản đang soạn, chưa phải hợp đồng đã ký. Bạn được xem nội dung; chỉ mở ký khi đã đến ngày thuê và xác nhận đủ tiền.</p>
                  <Link href={contractDetailPath(perspective,c.id)} className="inline-flex font-semibold text-primary hover:underline">Xem hợp đồng & đề nghị bắt đầu thuê sớm →</Link>
                </div>}
                {c.agreementKind !== "DEPOSIT" && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(c.status) && <Link href={invoiceDetailPath(c.id)}
                  className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">
                  Xem hóa đơn tháng →
                </Link>}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
