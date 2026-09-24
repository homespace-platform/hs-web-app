"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Copy,
  ExternalLink,
  Landmark,
} from "lucide-react";
import paymentRequestService from "@/services/payment-request.service";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const STATUS_BADGES: Record<
  PaymentStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  AWAITING_TRANSFER: {
    label: "Chờ chuyển khoản",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  TRANSFER_REPORTED: {
    label: "Đã báo chuyển — Chờ xác nhận",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Từ chối xác nhận",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: Ban,
  },
  DISPUTED: {
    label: "Đang đối soát",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    icon: AlertCircle,
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  REFUNDED: {
    label: "Đã hoàn cọc",
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    icon: CheckCircle2,
  },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPayments() {
    setLoading(true);
    try {
      const data = await paymentRequestService.getMyPaymentRequests();
      setPayments(data);
    } catch {
      toast.error("Không thể tải danh sách yêu cầu chuyển khoản.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Yêu cầu chuyển khoản trực tiếp
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Theo dõi các khoản chuyển khoản tiền thuê, đặt cọc giữ chỗ và hoàn cọc trực tiếp giữa chủ nhà và người thuê.
          </p>
        </div>
        <Link
          href="/settings/bank-accounts"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
        >
          <Landmark className="w-4 h-4 text-primary" />
          <span>Tài khoản ngân hàng của bạn</span>
        </Link>
      </div>

      {/* Direct Transfer Principles Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-950 dark:text-blue-100">
              Quy chế giao dịch tại HomeSpace
            </p>
            <p className="leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              HomeSpace <strong>KHÔNG</strong> phải ví điện tử và <strong>KHÔNG</strong> giữ tiền của các bên.
              Tất cả các khoản tiền thuê và đặt cọc được chuyển khoản <strong>trực tiếp 100%</strong> vào tài khoản ngân hàng của đối tác qua VietQR.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          Đang tải dữ liệu...
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-card rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-semibold text-foreground">Chưa có giao dịch chuyển khoản nào</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Khi bạn tạo hoặc chấp thuận một yêu cầu thuê nhà, hệ thống sẽ tự động tạo yêu cầu chuyển khoản và mã VietQR tương ứng.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((p) => {
            const statusConfig = STATUS_BADGES[p.status] || STATUS_BADGES.AWAITING_TRANSFER;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded-lg text-foreground">
                      Ref: {p.transferReference}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.type === "INITIAL" ? "Giữ chỗ ban đầu" : "Thanh toán định kỳ"}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusConfig.className}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Số tiền chuyển:</span>
                    <span className="font-extrabold text-base text-primary">
                      {formatVND(p.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Tài khoản thụ hưởng:</span>
                    {(() => {
                      const payee = p.payeeBankAccountSnapshot || p.payeeAccount;
                      return (
                        <>
                          <span className="font-semibold text-foreground block truncate">
                            {payee ? `${payee.bankCode} • ${payee.accountNumber}` : "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {payee?.accountHolderName}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Thời gian:</span>
                    <span className="text-foreground">
                      {p.createdAt ? format(new Date(p.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                    </span>
                    {p.confirmedAt && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                        Xác nhận: {format(new Date(p.confirmedAt), "dd/MM/yyyy HH:mm")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => copyText(p.transferReference, "nội dung chuyển khoản")}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3 h-3" />
                      Sao chép nội dung CK
                    </button>
                  </div>
                  {p.rentalRequestId && (
                    <Link
                      href={`/dashboard/rental-requests/my-requests`}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>Xem yêu cầu thuê</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
