"use client";


import React, { useState, useEffect, useCallback, useRef } from "react";
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
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import rentalRequestService from "@/services/rental-request.service";
import RentalRequestDetailModal from "./RentalRequestDetailModal";
import RentalContractFallbackButton from "./RentalContractFallbackButton";
import RentalPaymentModal from "./RentalPaymentModal";
import RentalDepositQuickViewModal, { RentalReceiptNotice } from "./RentalDepositQuickViewModal";
import RentalStartChangeQuickModal, { StartChangeNotice } from "./RentalStartChangeQuickModal";
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
import { contractDetailPath } from "@/lib/contract-routes";
import { canCancelRentalRequest } from "@/lib/rental-request-actions";
import { listingDetailPath } from "@/lib/listing-detail-access";
import { canOpenDepositQuickView } from "@/lib/rental-deposit-quick-view";
import { createRentalContractFallback } from "@/lib/rental-contract-fallback";
import { rentalOnboardingService } from "@/services/rental-onboarding.service";
interface RentalRequestsManagementProps {
  mode: "RECEIVED" | "SENT";
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
    label: "Đã chấp nhận · Chờ nhận nhà",
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
  CANCELLED_BY_OWNER: {
    label: "Chủ nhà đã hủy",
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
  { key: "ACCEPTED", label: "Đang xử lý thuê" },
  { key: "COMPLETED", label: "Đã thuê" },
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
  const cancelActionLock=useRef(false);
  const contractCreationLock=useRef(false);
  const contractCreationRequest=useRef<AbortController|null>(null);
  const [creatingContractFor,setCreatingContractFor]=useState<string|null>(null);
  const [contractsByRequest, setContractsByRequest] = useState<Record<string, ContractResponse | null>>({});
  const [openingContractId, setOpeningContractId] = useState<string | null>(null);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<RentalRequestResponse | null>(null);
  const [depositQuickTarget,setDepositQuickTarget]=useState<RentalRequestResponse|null>(null);
  const [startChangeTarget,setStartChangeTarget]=useState<RentalRequestResponse|null>(null);
  useEffect(()=>()=>{contractCreationRequest.current?.abort();},[]);

  const handleCreateDraft = async (request: RentalRequestResponse) => {
    if (contractCreationLock.current || mode!=="RECEIVED" || request.status!=="ACCEPTED" || contractsByRequest[request.id]) return;
    contractCreationLock.current=true;
    setCreatingContractFor(request.id);
    const controller=new AbortController();
    contractCreationRequest.current=controller;
    try {
      const result=await createRentalContractFallback({
        refresh:()=>rentalOnboardingService.refresh(request.id),
        create:()=>contractService.createDraft({rentalRequestId:request.id},controller.signal),
        find:()=>contractService.getByRentalRequest(request.id),
        completeness:id=>contractService.getCompleteness(id),
        preview:(id,signal)=>contractService.triggerPreview(id,signal),
        previewStatus:(id,signal)=>contractService.getPreviewStatus(id,signal),
      },controller.signal,()=>toast.info("Đang kiểm tra kết quả kết xuất; vui lòng không bấm tạo lại."));
      if(controller.signal.aborted)return;
      setContractsByRequest(previous=>({...previous,[request.id]:result.contract}));
      if(result.fileState==="UNAVAILABLE" || result.fileState==="PENDING")
        toast.warning("Đã có bản nháp nhưng file chưa sẵn sàng. Mở hợp đồng để kiểm tra; không cần tạo lại hay thanh toán thêm.");
      else if(result.fileState==="INCOMPLETE") toast.info("Đã có bản nháp. Vui lòng bổ sung thông tin bắt buộc trước khi kết xuất và ký.");
      else if(result.fileState==="EXISTING") toast.info("Hợp đồng đã tồn tại. Mở để tiếp tục theo trạng thái hiện tại.");
      else toast.success("Bản nháp hợp đồng đã sẵn sàng để kiểm tra.");
      setDetailRequestId(null);
      router.push(contractDetailPath("landlord",result.contract.id));
    } catch(error) {
      if(!controller.signal.aborted)toast.error(getApiErrorMessage(error,"Chưa thể tạo bản nháp hợp đồng. Vui lòng kiểm tra tiến trình nhận nhà và mẫu hợp đồng."));
    } finally {
      contractCreationLock.current=false;
      contractCreationRequest.current=null;
      setCreatingContractFor(null);
    }
  };

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
    void fetchRequests();
  }, [fetchRequests]);

  const handlePaymentSuccess = () => {
    setPaymentTarget(null);
    void fetchRequests();
  };

  // Tra cứu hợp đồng trong suốt vòng đời giữ chỗ và sau khi thuê thành công.
  useEffect(() => {
    const contractRequests = requests.filter(
      (request) =>
        ["ACCEPTED","COMPLETED","CANCELLED_BY_SYSTEM","CANCELLED_BY_RENTER","CANCELLED_BY_OWNER"].includes(request.status) &&
        !contractsByRequest[request.id]
    );
    let cancelled = false;
    const loadContracts = async () => {
      const entries = await Promise.all(
        contractRequests.map(async (r) => {
          try {
            const c = await contractService.getByRentalRequest(r.id);
            return [r.id, c] as const;
          } catch {
            return [r.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setContractsByRequest((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [reqId, contract] of entries) {
          if (contract && next[reqId]?.id !== contract.id) {
            next[reqId] = contract;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    if (contractRequests.length === 0) return;
    void loadContracts();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadContracts();
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [requests, contractsByRequest]);

  // Deadlines come from the business clock, not the browser's real-time clock.
  useEffect(() => {
    if (!requests.some(r => r.status === "ACCEPTED" || r.status === "PENDING")) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchRequests();
    }, 30000);
    return () => window.clearInterval(id);
  }, [requests, fetchRequests]);

  // Handle Accept
  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    setIsProcessing(true);
    try {
      await rentalRequestService.acceptRentalRequest(acceptTarget.id);
      toast.success(
        "Đã chấp nhận và giữ chỗ. Dùng nút Xem thanh toán trên danh sách để theo dõi khoản chuyển; các yêu cầu khác chưa bị hủy."
      );
      setAcceptTarget(null);
      fetchRequests();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { code?: number; message?: string } } } | undefined;
      const code = errObj?.response?.data?.code;
      const msg = String(errObj?.response?.data?.message || "");
      if (code === 7009 || msg.includes("defaultIncoming") || msg.toLowerCase().includes("tài khoản nhận tiền") || msg.toLowerCase().includes("ngân hàng")) {
        toast.error("Bạn cần thiết lập tài khoản nhận tiền mặc định trước khi chấp nhận yêu cầu thuê.", {
          action: {
            label: "Cài đặt tài khoản",
            onClick: () => router.push("/settings/bank-accounts"),
          },
          duration: 7000,
        });
      } else {
        toast.error(getApiErrorMessage(err, "Duyệt yêu cầu thất bại."));
      }
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
    if (!cancelTarget || cancelActionLock.current) return;
    cancelActionLock.current=true;
    setIsProcessing(true);
    try {
      await rentalRequestService.cancelRentalRequest(cancelTarget.id);
      toast.success("Đã hủy yêu cầu thuê của bạn.");
      setCancelTarget(null);
      setPaymentTarget(null);
      setDetailRequestId(null);
      await fetchRequests();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Hủy yêu cầu thất bại."));
      setCancelTarget(null);
      await fetchRequests();
    } finally {
      cancelActionLock.current=false;
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
              ? "Xét duyệt hồ sơ, theo dõi cọc, tiền tháng đầu và ký hợp đồng khi nhận nhà."
              : "Theo dõi yêu cầu thuê, thanh toán cọc và các bước nhận nhà theo ngày đã thống nhất."}
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
            const isContractPending = linkedContract?.status === "PENDING_REVIEW";
            const isContractActive = linkedContract?.status === "ACTIVE";
            const isContractDraft = linkedContract?.status === "DRAFT";
            const isContractPaid =
              linkedContract?.paymentStatus === "PAID_MOCK" ||
              linkedContract?.paymentStatus === "PAID";
            const hasExecutionContract = isContractPending || isContractActive;

            const initialPayment = req.initialPayment;
            const isPaymentPaid =
              initialPayment?.status === "CONFIRMED" ||
              initialPayment?.status === "PAID_MOCK" ||
              initialPayment?.status === "PAID" ||
              isContractPaid;
            const isPaymentReported = initialPayment?.status === "TRANSFER_REPORTED";
            const isPaymentRejected = initialPayment?.status === "REJECTED";
            const isPaymentPending =
              req.status === "ACCEPTED" &&
              !hasExecutionContract &&
              !isPaymentPaid;

            const statusInfo = isContractActive
              ? {
                  label: "Đã thuê thành công",
                  badgeClass:
                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                  icon: CheckCircle2,
                }
              : isContractPending
              ? {
                  label: "Chờ ký hợp đồng",
                  badgeClass:
                    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                  icon: FileText,
                }
              : isContractDraft
              ? {
                  label: "Chủ nhà đang soạn hợp đồng",
                  badgeClass:
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                  icon: FileText,
                }
              : req.status === "ACCEPTED"
              ? isPaymentPaid
                ? {
                    label: "Đã xác nhận khoản giữ chỗ · Xem tiến trình",
                    badgeClass:
                      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                    icon: CheckCircle2,
                  }
                : isPaymentReported
                ? {
                    label: mode === "SENT" ? "Đã gửi chứng từ — chờ xác nhận" : "Khách đã báo chuyển khoản",
                    badgeClass:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                    icon: Clock,
                  }
                : isPaymentRejected
                ? {
                    label: mode === "SENT" ? "Chứng từ bị từ chối" : "Đã từ chối chứng từ",
                    badgeClass:
                      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
                    icon: XCircle,
                  }
                : mode === "SENT"
                ? {
                    label: "Chờ bạn thanh toán",
                    badgeClass:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                    icon: Clock,
                  }
                : {
                    label: "Chờ khách thanh toán",
                    badgeClass:
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                    icon: Clock,
                  }
              : STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={req.id}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                {/* Card Top: Property & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href={listingDetailPath(req.listingId)}
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
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={listingDetailPath(req.listingId)}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 text-left cursor-pointer"
                          title="Xem chi tiết bài đăng"
                        >
                          {req.listingTitle}
                        </Link>
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

                <StartChangeNotice request={req} mode={mode} onOpen={()=>setStartChangeTarget(req)}/>
                {mode==="RECEIVED" && <RentalReceiptNotice request={req} onOpen={()=>setDepositQuickTarget(req)}/>}
                {mode==="SENT" && req.status==="ACCEPTED" && !req.latestStartChange && req.initialPayment?.status==="CONFIRMED" && <button type="button" onClick={()=>setStartChangeTarget(req)} className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5">Đề nghị bắt đầu thuê sớm</button>}
                {req.status === "PENDING" && req.respondBy && <p className="text-xs text-muted-foreground">Hạn chủ nhà phản hồi: {new Date(req.respondBy).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam)</p>}
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
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                    <RentalContractFallbackButton request={req} mode={mode} contract={linkedContract}
                      busy={creatingContractFor===req.id} disabled={isProcessing || creatingContractFor!==null}
                      onCreate={handleCreateDraft} />
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
                    {canCancelRentalRequest(req,linkedContract) && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(req)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Hủy yêu cầu
                      </button>
                    )}

                    {mode === "RECEIVED" && canOpenDepositQuickView(req) && <button type="button"
                      onClick={()=>setDepositQuickTarget(req)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90">
                      <CreditCard className="h-3.5 w-3.5"/><span>{isPaymentReported?"Kiểm tra chuyển khoản":"Xem thanh toán"}</span>
                    </button>}
                    {/* Khách thuê mở phiếu thanh toán/chứng từ khi yêu cầu đã được chấp thuận */}
                    {mode === "SENT" && req.status === "ACCEPTED" && isPaymentPending && (
                      <button
                        type="button"
                        onClick={() => setPaymentTarget(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{isPaymentReported ? "Xem chuyển khoản" : isPaymentRejected ? "Gửi lại chứng từ" : "Thanh toán"}</span>
                      </button>
                    )}

                    {/* Nút Xem chi tiết yêu cầu */}
                    <button
                      type="button"
                      onClick={() => setDetailRequestId(req.id)}
                      className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      title="Xem chi tiết đầy đủ yêu cầu thuê"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Xem chi tiết</span>
                    </button>

                    {/* Nút xem tin đăng */}
                    <Link
                      href={listingDetailPath(req.listingId)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Xem bài đăng
                    </Link>
                  </div>
                </div>

                {req.status === "ACCEPTED" && <p className="rounded-xl border bg-muted/30 p-3 text-sm">Dùng các nút thanh toán và đề nghị bên trên để xử lý nhanh. Hợp đồng tự tạo sau khi chủ nhà xác nhận đủ cọc và tiền tháng đầu.</p>}
                {/* Khối giữ chỗ cũ được thay bằng tiến trình nhận nhà ở trên. */}


                {mode !== "RECEIVED" && isContractDraft && linkedContract && (
                  <div className="p-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span>
                      <strong>Bản nháp · Chưa có hiệu lực.</strong> Chủ nhà đã tạo hợp đồng sau khi xác nhận cọc. Bạn xem được nội dung và đề nghị bắt đầu thuê sớm; chỉ ký được khi đến ngày thuê và đủ điều kiện.
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(contractDetailPath("tenant", linkedContract.id))}
                      className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Xem bản nháp hợp đồng
                    </button>
                  </div>
                )}

                {hasExecutionContract && linkedContract && (
                  <div className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isContractActive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200"
                      : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {isContractActive
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                        : <Send className="w-4 h-4 shrink-0" />}
                      <span>
                        {isContractActive
                          ? "Hợp đồng đã có hiệu lực, giao dịch thuê đã hoàn tất."
                          : mode === "RECEIVED"
                            ? isPaymentPaid
                              ? "Đã xác nhận khoản thanh toán. Kiểm tra tiến trình nhận nhà để biết bước tiếp theo và thời điểm mở ký."
                              : "Theo dõi cọc, tiền tháng đầu và thời điểm mở ký trong tiến trình nhận nhà."
                            : isPaymentPaid
                              ? "Khoản thanh toán đã được xác nhận. Mở hồ sơ để xem bước tiếp theo; chỉ ký khi đủ điều kiện."
                              : "Mở hồ sơ để theo dõi từng khoản và ngày bắt đầu thuê."}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(contractDetailPath(mode === "RECEIVED" ? "landlord" : "tenant", linkedContract.id))}
                      className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {isContractActive
                        ? "Xem hợp đồng hiệu lực"
                        : mode === "RECEIVED"
                          ? "Theo dõi hợp đồng"
                          : "Mở hợp đồng"}
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

            {/* Tóm tắt điều kiện và tài chính yêu cầu thuê */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                Tóm tắt yêu cầu thuê
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Khách thuê:</span>
                  <span className="font-semibold text-foreground">{acceptTarget.renterName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Ngày vào ở:</span>
                  <span className="font-semibold text-foreground">
                    {acceptTarget.moveInDate ? format(new Date(acceptTarget.moveInDate), "dd/MM/yyyy") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Thời hạn:</span>
                  <span className="font-semibold text-foreground">{acceptTarget.leaseMonths} tháng</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Số người ở:</span>
                  <span className="font-semibold text-foreground">{acceptTarget.occupantCount || 1} người</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Xe máy:</span>
                  <span className="font-semibold text-foreground">
                    {acceptTarget.motorbikeCount ? `${acceptTarget.motorbikeCount} xe máy` : "Không đăng ký"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Ô tô:</span>
                  <span className="font-semibold text-foreground">
                    {acceptTarget.carCount ? `${acceptTarget.carCount} ô tô` : "Không đăng ký"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền thuê kỳ đầu:</span>
                  <span className="font-semibold text-foreground">
                    {formatVND(acceptTarget.effectiveMonthlyRent ?? acceptTarget.monthlyRentPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền đặt cọc:</span>
                  <span className="font-semibold text-foreground">
                    {acceptTarget.depositAmount != null ? formatVND(acceptTarget.depositAmount) : "Theo tin đăng"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                  <span className="text-foreground">Tổng cần thanh toán ban đầu:</span>
                  <span className="text-primary font-extrabold">
                    {formatVND(
                      (acceptTarget.effectiveMonthlyRent ?? acceptTarget.monthlyRentPrice) +
                        (acceptTarget.depositAmount ?? 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Quy tắc độc quyền khi duyệt:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>
                  Bài đăng chuyển sang <strong>Đang giữ chỗ</strong>. Người thuê cần báo chuyển trước hạn trên yêu cầu thanh toán.
                </li>
                <li>
                  Nếu ngày vào ở còn ở phía trước, chỉ thu cọc trước; tiền tháng đầu và ký hợp đồng mở vào ngày bắt đầu thuê.
                </li>
                <li>
                  Chưa báo chuyển khi hết hạn thì giải phóng giữ chỗ nếu tin còn hạn đăng. Đã báo chuyển, có tranh chấp hoặc đã nhận cọc thì không tự giải phóng phòng; các yêu cầu chờ khác vẫn giữ hạn phản hồi riêng.
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

      {/* DIALOG HỦY YÊU CẦU (CẢ HAI BÊN) */}
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
                {cancelTarget.status === "ACCEPTED" && <p className="mt-2 text-xs text-muted-foreground">Hủy ngay lượt giữ chỗ chưa chuyển tiền, không cần chờ hết hạn. Tin đăng và chỗ xe sẽ được trả lại nếu đủ điều kiện. Nếu người thuê đã chuyển hoặc chủ nhà đã nhận tiền, không xác nhận hủy ở đây; hãy báo chuyển hoặc yêu cầu đối soát.</p>}
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


      {depositQuickTarget && <RentalDepositQuickViewModal key={depositQuickTarget.id} request={depositQuickTarget}
        onClose={()=>setDepositQuickTarget(null)} onUpdated={fetchRequests}
        onOpenDetail={()=>{setDetailRequestId(depositQuickTarget.id);setDepositQuickTarget(null);}}/>}
      {startChangeTarget && <RentalStartChangeQuickModal key={startChangeTarget.id} request={startChangeTarget} mode={mode}
        onClose={()=>setStartChangeTarget(null)} onUpdated={fetchRequests}/>}

      {/* Modal Thanh Toán Ban Đầu */}
      {paymentTarget && (
        <RentalPaymentModal
          request={paymentTarget}
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Modal Xem Chi Tiết Yêu Cầu Thuê */}
      <RentalRequestDetailModal
        requestId={detailRequestId}
        isOpen={Boolean(detailRequestId)}
        onClose={() => setDetailRequestId(null)}
        mode={mode}
        linkedContract={detailRequestId ? contractsByRequest[detailRequestId] : null}
        isProcessingAction={isProcessing || creatingContractFor!==null}
        creatingContract={creatingContractFor===detailRequestId}
        onCreateDraft={handleCreateDraft}
        onPaymentStatusChange={() => {
          void fetchRequests();
        }}
        onAccept={(req) => {
          setDetailRequestId(null);
          setAcceptTarget(req);
        }}
        onReject={(req) => {
          setDetailRequestId(null);
          setRejectTarget(req);
        }}
        onCancel={(req) => {
          setDetailRequestId(null);
          setCancelTarget(req);
        }}
        onPayMock={(req) => {
          setDetailRequestId(null);
          setPaymentTarget(req);
        }}
        onOpenContract={(contractId) => {
          setDetailRequestId(null);
          router.push(contractDetailPath(mode === "RECEIVED" ? "landlord" : "tenant", contractId));
        }}
      />
    </div>
  );
}
