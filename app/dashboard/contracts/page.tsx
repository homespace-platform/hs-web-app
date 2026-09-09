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
import { useAuth } from "@/features/auth/useAuth";

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ người thuê",
  ACTIVE: "Hiệu lực",
  TERMINATED: "Đã chấm dứt",
  CANCELLED: "Đã hủy",
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  TERMINATED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

function contractStatusLabel(contract: ContractResponse): string {
  if (contract.status === "PENDING_REVIEW") {
    return contract.paymentStatus === "PAID_MOCK" ? "Chờ ký hợp đồng" : "Chờ thanh toán/ký";
  }
  return STATUS_LABEL[contract.status];
}

export default function ContractsPage() {
  const router = useRouter();
  const { profile } = useAuth();
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
  }, [page, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-primary" />
            Hợp đồng của tôi
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bản nháp và hợp đồng gắn với yêu cầu thuê (vai trò chủ nhà hoặc người thuê).
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
        {(["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "CANCELLED"] as const).map((key) => (
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
            Chủ nhà tạo hợp đồng từ yêu cầu thuê đã chấp thuận (giữ chỗ).{" "}
            <Link href="/dashboard/rental-requests" className="text-primary font-semibold hover:underline">
              Mở yêu cầu thuê
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const role =
              profile?.id === c.landlordId ? "Chủ nhà (Bên A)" : profile?.id === c.tenantId ? "Người thuê (Bên B)" : "—";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/dashboard/contracts/${c.id}`)}
                className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors cursor-pointer shadow-2xs"
              >
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
