"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Inbox,
  AlertTriangle,
  FileText,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { vi } from "date-fns/locale";
import rentalRequestService from "@/services/rental-request.service";
import ListingPreviewModal from "@/components/listing/ListingPreviewModal";
import CreateContractFromRequestModal from "@/components/contract/CreateContractFromRequestModal";
import { contractService } from "@/services/contract.service";
import type { ContractResponse } from "@/types/contract.type";
import type {
  RentalRequestResponse,
  RentalRequestStatus,
} from "@/types/rental-request.type";
import {
  RENTAL_HOLD_DURATION_LABEL,
  RENTAL_HOLD_DURATION_SHORT,
} from "@/config/rental-hold.config";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/utils/apiError";
interface RentalRequestsManagementProps {
  mode: "RECEIVED" | "SENT";
}

/** Đếm ngược còn lại tới holdExpiresAt — rõ phút/giây thay vì "khoảng 24 giờ" của date-fns. */
function formatHoldRemaining(expiresAt: string, nowMs: number): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) return "đã hết hạn";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

const STATUS_CONFIG: Record<
  RentalRequestStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: "Chờ duyệt",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  ACCEPTED: {
    label: `Đang giữ chỗ ${RENTAL_HOLD_DURATION_SHORT}`,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Bị từ chối",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: XCircle,
  },
  CANCELLED_BY_SYSTEM: {
    label: "Hủy bởi hệ thống",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  CANCELLED_BY_RENTER: {
    label: "Khách đã hủy",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  EXPIRED: {
    label: "Hết hạn giữ chỗ",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    icon: Clock,
  },
  COMPLETED: {
    label: "Đã thuê thành công",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    icon: CheckCircle2,
  },
};

const formatVND = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);

const STATUS_FILTER_TABS: Array<{
  key: RentalRequestStatus | "ALL";
  label: string;
}> = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "ACCEPTED", label: `Đang giữ chỗ ${RENTAL_HOLD_DURATION_SHORT}` },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "EXPIRED", label: "Hết hạn" },
];

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export default function RentalRequestsManagement({ mode }: RentalRequestsManagementProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<RentalRequestStatus | "ALL">("ALL");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(8);
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<RentalRequestResponse[]>([]);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Dialog states for Actions
  const [acceptTarget, setAcceptTarget] = useState<RentalRequestResponse | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RentalRequestResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RentalRequestResponse | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewListingId, setPreviewListingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [contractTarget, setContractTarget] = useState<RentalRequestResponse | null>(null);
  const [contractsByRequest, setContractsByRequest] = useState<Record<string, ContractResponse>>({});
  const [openingContractId, setOpeningContractId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "SENT") {
        const res = await rentalRequestService.getMyRequests({
          status: statusFilter,
          page,
          size: pageSize,
        });
        setRequests(res.result || []);
        setTotalElements(res.totalElements || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        const res = await rentalRequestService.getOwnerRequests({
          status: statusFilter,
          page,
          size: pageSize,
        });
        setRequests(res.result || []);
        setTotalElements(res.totalElements || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch {
      toast.error("Không thể tải danh sách yêu cầu thuê nhà.");
    } finally {
      setLoading(false);
    }
  }, [mode, statusFilter, page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRequests();
  }, [fetchRequests]);

  // Tra cứu hợp đồng đã gắn với các yêu cầu ACCEPTED (chủ nhà tạo / cả hai bên xem)
  useEffect(() => {
    const accepted = requests.filter((r) => r.status === "ACCEPTED");
    if (accepted.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        accepted.map(async (r) => {
          try {
            const c = await contractService.getByRentalRequest(r.id);
            return c?.id ? ([r.id, c] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setContractsByRequest((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          if (entry) next[entry[0]] = entry[1];
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [requests]);

  // Tick mỗi giây để countdown giữ chỗ cập nhật
  useEffect(() => {
    const hasActiveHold = requests.some(
      (r) => r.status === "ACCEPTED" && r.holdExpiresAt && !isPast(new Date(r.holdExpiresAt))
    );
    if (!hasActiveHold) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      const anyJustExpired = requests.some(
        (r) =>
          r.status === "ACCEPTED" &&
          r.holdExpiresAt &&
          new Date(r.holdExpiresAt).getTime() <= t
      );
      if (anyJustExpired) {
        void fetchRequests();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [requests, fetchRequests]);

  // Handle Accept
  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    setIsProcessing(true);
    try {
      await rentalRequestService.acceptRentalRequest(acceptTarget.id);
      toast.success(
        `Chấp thuận thành công! Bài đăng đã chuyển sang trạng thái Giữ chỗ ${RENTAL_HOLD_DURATION_SHORT} và các yêu cầu song song đã được tự động hủy.`
      );
      setAcceptTarget(null);
      fetchRequests();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Duyệt yêu cầu thất bại."));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setIsProcessing(true);
    try {
      await rentalRequestService.rejectRentalRequest(rejectTarget.id, rejectReason);
      toast.success("Đã từ chối yêu cầu thuê.");
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Từ chối yêu cầu thất bại."));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsProcessing(true);
    try {
      await rentalRequestService.cancelRentalRequest(cancelTarget.id);
      toast.success("Đã hủy yêu cầu thuê của bạn.");
      setCancelTarget(null);
      fetchRequests();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Hủy yêu cầu thất bại."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            {mode === "RECEIVED" ? (
              <Inbox className="w-6 h-6 text-primary" />
            ) : (
              <Send className="w-6 h-6 text-primary" />
            )}
            <span>
              {mode === "RECEIVED"
                ? "Yêu cầu thuê từ khách (Chủ nhà)"
                : "Yêu cầu thuê tôi đã gửi (Khách thuê)"}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {mode === "RECEIVED"
              ? `Theo dõi, xét duyệt hồ sơ thuê nhà và quản lý trạng thái giữ chỗ độc quyền ${RENTAL_HOLD_DURATION_LABEL} cho bài đăng của bạn.`
              : `Theo dõi tiến độ xét duyệt và thời hạn giữ chỗ ${RENTAL_HOLD_DURATION_LABEL} cho các căn nhà bạn đang gửi yêu cầu thuê.`}
          </p>
        </div>

        {/* Nút Làm mới */}
        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. STATUS FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border ${
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. LIST VIEW */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border bg-card/60 animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Home className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">Chưa có yêu cầu nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {mode === "RECEIVED"
              ? "Hiện chưa có khách thuê nào gửi yêu cầu thuê nhà đến các bài đăng của bạn."
              : "Bạn chưa gửi yêu cầu thuê nhà nào. Hãy khám phá các căn hộ đang cho thuê ngay!"}
          </p>
          {mode === "SENT" && (
            <Link
              href="/rent"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm nhà cho thuê</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const linkedContract = contractsByRequest[req.id];
            const isContractSent = linkedContract?.status === "PENDING_REVIEW";
            const statusInfo = isContractSent
              ? {
                  label: "Đã gửi hợp đồng",
                  badgeClass:
                    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
                  icon: Send,
                }
              : STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusInfo.icon;
            const isHoldActive =
              req.status === "ACCEPTED" &&
              !isContractSent &&
              req.holdExpiresAt &&
              !isPast(new Date(req.holdExpiresAt));

            return (
              <div
                key={req.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                {/* Card Top: Property & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={() => setPreviewListingId(req.listingId)}
                      className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/50 cursor-pointer hover:opacity-85 transition-opacity"
                      title="Xem chi tiết bài đăng"
                    >
                      {isValidImageUrl(req.listingThumbnail) ? (
                        <Image
                          src={req.listingThumbnail!}
                          alt={req.listingTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Home className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewListingId(req.listingId)}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 text-left cursor-pointer"
                          title="Xem chi tiết bài đăng"
                        >
                          {req.listingTitle}
                        </button>
                      </div>
                      {req.listingAddress && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {req.listingAddress}
                        </p>
                      )}
                      {req.listingPrice && (
                        <p className="text-xs font-extrabold text-primary mt-1">
                          {formatVND(req.listingPrice)}
                          <span className="text-[10px] font-normal text-muted-foreground">/tháng</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(req.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </span>
                  </div>
                </div>

                {/* Card Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-muted/20 p-3 rounded-xl border border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Dọn vào:</span>
                    <span className="font-semibold text-foreground">
                      {req.moveInDate ? format(new Date(req.moveInDate), "dd/MM/yyyy") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Thời hạn:</span>
                    <span className="font-semibold text-foreground">{req.leaseMonths} tháng</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Số người ở:</span>
                    <span className="font-semibold text-foreground">{req.occupantCount || 1} người</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tiền cọc:</span>
                    <span className="font-semibold text-foreground">
                      {req.depositAmount != null ? formatVND(req.depositAmount) : "Theo tin đăng"}
                    </span>
                  </div>
                </div>

                {/* Card Info: Renter & Note */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{req.renterName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <a
                          href={`tel:${req.renterPhone}`}
                          className="hover:text-primary transition-colors"
                        >
                          {req.renterPhone}
                        </a>
                      </span>
                      {req.renterEmail && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{req.renterEmail}</span>
                        </span>
                      )}
                    </div>
                    {req.renterNote && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        &quot;{req.renterNote}&quot;
                      </p>
                    )}
                    {req.rejectReason && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        Lý do từ chối: {req.rejectReason}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Chủ nhà xét duyệt khi PENDING */}
                    {mode === "RECEIVED" && req.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectTarget(req)}
                          className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcceptTarget(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Chấp thuận (Giữ chỗ {RENTAL_HOLD_DURATION_SHORT})</span>
                        </button>
                      </>
                    )}

                    {/* Khách thuê hủy đơn khi PENDING */}
                    {mode === "SENT" && req.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(req)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Hủy yêu cầu
                      </button>
                    )}

                    {/* Nút xem tin đăng */}
                    <button
                      type="button"
                      onClick={() => setPreviewListingId(req.listingId)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Xem bài đăng
                    </button>
                  </div>
                </div>

                {/* Khối Thông Báo Đếm Ngược Giữ Chỗ (Khi ACCEPTED) */}
                {isHoldActive && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                        <span>
                          Thời hạn giữ chỗ độc quyền:{" "}
                          <strong>còn {formatHoldRemaining(req.holdExpiresAt!, nowMs)}</strong>{" "}
                          (hết hạn lúc {format(new Date(req.holdExpiresAt!), "HH:mm:ss, dd/MM/yyyy")})
                        </span>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0">
                        Giữ chỗ {RENTAL_HOLD_DURATION_SHORT}
                      </span>
                    </div>
                    {mode === "RECEIVED" && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {linkedContract ? (
                          <button
                            type="button"
                            disabled={openingContractId === req.id}
                            onClick={() => {
                              setOpeningContractId(req.id);
                              router.push(`/dashboard/contracts/${linkedContract.id}`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Xem / tiếp tục hợp đồng
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setContractTarget(req)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Tạo hợp đồng
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isContractSent && linkedContract && (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 shrink-0" />
                      <span>
                        {mode === "RECEIVED"
                          ? "Hợp đồng đã gửi, đang chờ người thuê xem."
                          : "Chủ nhà đã gửi hợp đồng cho bạn."}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/contracts/${linkedContract.id}`)}
                      className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {mode === "RECEIVED" ? "Đã gửi / xem hợp đồng" : "Xem hợp đồng"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* 4. PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs">
              <span className="text-muted-foreground">
                Tổng cộng {totalElements} yêu cầu
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-foreground">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DIALOG CHẤP THUẬN GIỮ CHỖ */}
      {acceptTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isProcessing && setAcceptTarget(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Xác nhận duyệt yêu cầu & giữ chỗ {RENTAL_HOLD_DURATION_SHORT}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bạn đang chấp thuận yêu cầu thuê của khách hàng <strong>{acceptTarget.renterName}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Quy tắc độc quyền khi duyệt:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>
                  Bài đăng sẽ chuyển sang trạng thái <strong>&quot;Đang giữ chỗ&quot; (RESERVED)</strong> trong {RENTAL_HOLD_DURATION_LABEL}.
                </li>
                <li>
                  Toàn bộ các yêu cầu thuê khác đang chờ xét duyệt của căn này sẽ <strong>tự động bị hủy</strong>.
                </li>
                <li>
                  Nếu sau {RENTAL_HOLD_DURATION_LABEL} người thuê không hoàn tất thủ tục, hệ thống sẽ tự động mở lại bài đăng sang trạng thái Đang hiển thị.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setAcceptTarget(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmAccept}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận chấp thuận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG TỪ CHỐI */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isProcessing && setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Từ chối yêu cầu thuê
                </h3>
                <p className="text-xs text-muted-foreground">
                  Từ chối yêu cầu của <strong>{rejectTarget.renterName}</strong> cho căn {rejectTarget.listingTitle}.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Lý do từ chối (tuỳ chọn)
              </label>
              <textarea
                rows={3}
                placeholder="VD: Căn hộ hiện đã có khách đặt cọc trước hoặc không đáp ứng thời gian dọn vào..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG HỦY YÊU CẦU (KHÁCH THUÊ) */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isProcessing && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Hủy yêu cầu thuê nhà
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bạn có chắc chắn muốn hủy yêu cầu thuê cho căn <strong>{cancelTarget.listingTitle}</strong>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Trước Bài Đăng */}
      <ListingPreviewModal
        listingId={previewListingId}
        isOpen={Boolean(previewListingId)}
        onClose={() => setPreviewListingId(null)}
      />

      {contractTarget && (
        <CreateContractFromRequestModal
          request={contractTarget}
          onClose={() => setContractTarget(null)}
        />
      )}
    </div>
  );
}
