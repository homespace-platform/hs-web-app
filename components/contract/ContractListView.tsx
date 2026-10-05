"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCheck, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { contractService } from "@/services/contract.service";
import type { ContractResponse, ContractStatus } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ người thuê",
  LANDLORD_SIGNATURE_PENDING: "Chờ chủ nhà ký SmartCA",
  TENANT_SIGNATURE_PENDING: "Chờ người thuê ký SmartCA",
  ACTIVE: "Hiệu lực",
  TERMINATED: "Đã chấm dứt",
  CANCELLED: "Đã hủy",
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  LANDLORD_SIGNATURE_PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  TENANT_SIGNATURE_PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  TERMINATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

function contractStatusLabel(contract: ContractResponse): string {
  if (contract.status === "PENDING_REVIEW") {
    return Boolean(contract.rentalPaymentId) || contract.paymentStatus === "PAID_MOCK"
      ? "Chờ ký hợp đồng"
      : "Chờ thanh toán/ký";
  }
  return STATUS_LABEL[contract.status];
}

export default function ContractListView({ perspective }: { perspective: "landlord" | "tenant" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContractResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "ALL">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contractService.listContracts({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        role: perspective.toUpperCase() as "LANDLORD" | "TENANT",
        page,
        size: 12,
      });
      setItems(res.result || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải danh sách hợp đồng."));
    } finally {
      setLoading(false);
    }
  }, [page, perspective, statusFilter]);

  useEffect(() => {
    void load();
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
              ? "Hợp đồng bạn lập và quản lý với vai trò bên cho thuê."
              : "Hợp đồng bạn nhận và ký với vai trò bên thuê."}
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

      <div className="flex flex-wrap gap-2">
        {(["ALL", ...(perspective === "landlord" ? ["DRAFT"] as const : []), "LANDLORD_SIGNATURE_PENDING", "TENANT_SIGNATURE_PENDING", "PENDING_REVIEW", "ACTIVE", "TERMINATED", "CANCELLED"] as const).map((key) => (
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
            {key === "ALL" ? "Tất cả" : STATUS_LABEL[key]}
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
          <p className="text-sm font-semibold text-foreground">Chưa có hợp đồng</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {perspective === "landlord"
              ? "Bạn có thể tạo hợp đồng từ yêu cầu thuê đã được chấp thuận. "
              : "Hợp đồng sẽ xuất hiện khi chủ nhà gửi cho bạn xem và ký. "}
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
                    <p className="text-sm font-bold text-foreground truncate">{c.contractNumber}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {role} · Tạo {c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[c.status]}`}
                  >
                    {contractStatusLabel(c)}
                  </span>
                </div>
                </button>
                {(c.status === "ACTIVE" || c.status === "TERMINATED") && <Link href={invoiceDetailPath(c.id)}
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
