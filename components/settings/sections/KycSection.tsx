"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import kycService from "@/services/kyc.service";
import type { KycStatus, KycStatusResponse } from "@/types/kyc.type";
import { fetchCurrentUser } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_MS = 60_000;

function statusMeta(status: KycStatus, rejectionReason?: string | null) {
  switch (status) {
    case "VERIFIED":
      return {
        title: "Danh tính đã được xác minh",
        description: "Hồ sơ KYC của bạn đã được Didit xác nhận thành công.",
        icon: ShieldCheck,
        tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      };
    case "PENDING":
      return {
        title: "Đang xác minh danh tính",
        description: "Hoàn tất CCCD / selfie trên Didit. Kết quả sẽ cập nhật tự động qua webhook.",
        icon: LoaderCircle,
        tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      };
    case "REVIEW_REQUIRED":
      return {
        title: "Đang chờ xét duyệt",
        description: "Didit cần xem xét thêm. Bạn không cần làm gì lúc này.",
        icon: ShieldQuestion,
        tone: "text-sky-600 bg-sky-500/10 border-sky-500/20",
      };
    case "REJECTED":
      return {
        title: "Xác minh không thành công",
        description:
          rejectionReason?.trim() ||
          "Bạn có thể thử lại với giấy tờ rõ hơn hoặc ánh sáng tốt hơn.",
        icon: ShieldAlert,
        tone: "text-rose-600 bg-rose-500/10 border-rose-500/20",
      };
    case "EXPIRED":
      return {
        title: "Phiên xác minh đã hết hạn / đã hủy",
        description:
          rejectionReason?.trim() ||
          "Vui lòng bắt đầu lại quy trình KYC.",
        icon: RefreshCw,
        tone: "text-orange-600 bg-orange-500/10 border-orange-500/20",
      };
    default:
      return {
        title: "Xác minh danh tính",
        description:
          "Xác minh CCCD + khuôn mặt để tăng độ tin cậy khi thuê / cho thuê trên HomeSpace.",
        icon: BadgeCheck,
        tone: "text-primary bg-primary/10 border-primary/20",
      };
  }
}

export default function KycSection() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.userId);
  const profile = useAppSelector((state) => state.user.profile);
  const kycOptional = Boolean(profile?.kycOptional || profile?.role === "ADMIN");
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pollUntilRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollUntilRef.current = null;
    setConfirming(false);
  }, []);

  const refreshKycStatus = useCallback(async () => {
    const status = await kycService.getStatus();
    setKyc(status);
    if (
      status.status === "VERIFIED" ||
      status.status === "REJECTED" ||
      status.status === "EXPIRED" ||
      status.status === "REVIEW_REQUIRED"
    ) {
      stopPolling();
    }
    if (status.status === "VERIFIED" && userId) {
      void dispatch(fetchCurrentUser({ userId, force: true }));
    }
    return status;
  }, [dispatch, stopPolling, userId]);

  const startPolling = useCallback(() => {
    stopPolling();
    setConfirming(true);
    pollUntilRef.current = Date.now() + POLL_MAX_MS;
    pollTimerRef.current = window.setInterval(() => {
      if (pollUntilRef.current != null && Date.now() > pollUntilRef.current) {
        stopPolling();
        toast.message("Đang chờ webhook Didit. Bạn có thể tải lại trạng thái sau.");
        return;
      }
      void refreshKycStatus().catch(() => {});
    }, POLL_INTERVAL_MS);
  }, [refreshKycStatus, stopPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await kycService.getStatus();
        if (!cancelled) setKyc(status);
      } catch (error) {
        if (!cancelled) {
          const msg = axios.isAxiosError(error)
            ? error.response?.data?.message
            : null;
          toast.error(
            typeof msg === "string" && msg.trim()
              ? msg
              : "Không tải được trạng thái KYC."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [stopPolling]);

  const startKyc = async () => {
    setStarting(true);
    try {
      const session = await kycService.createSession();
      setKyc((prev) =>
        prev
          ? {
              ...prev,
              status: session.status,
              sessionId: session.sessionId,
              sessionUrl: session.url,
              rejectionReason: null,
            }
          : {
              status: session.status,
              verifiedAt: null,
              provider: "DIDIT",
              sessionId: session.sessionId,
              sessionUrl: session.url,
              rejectionReason: null,
            }
      );

      const { DiditSdk } = await import("@didit-protocol/sdk-web");

      DiditSdk.shared.onComplete = async () => {
        // SDK completion ≠ VERIFIED. Authoritative state = webhook → DB.
        startPolling();
        try {
          await refreshKycStatus();
        } catch {
          // polling continues
        }
      };

      DiditSdk.shared.startVerification({
        url: session.url,
        configuration: {
          closeModalOnComplete: true,
          showExitConfirmation: true,
        },
      });
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(
        typeof msg === "string" && msg.trim()
          ? msg
          : "Không thể mở phiên KYC. Kiểm tra cấu hình Didit trên server."
      );
    } finally {
      setStarting(false);
    }
  };

  const cancelKyc = async () => {
    if (cancelling) return;
    setCancelling(true);
    stopPolling();
    try {
      const status = await kycService.cancelSession();
      setKyc(status);
      toast.success("Đã hủy phiên xác minh");
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(
        typeof msg === "string" && msg.trim()
          ? msg
          : "Không thể hủy phiên KYC."
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <LoaderCircle className="w-4 h-4 animate-spin" />
        Đang tải trạng thái KYC…
      </div>
    );
  }

  const status = kyc?.status ?? "NOT_VERIFIED";
  const meta = statusMeta(status, kyc?.rejectionReason);
  const Icon = meta.icon;
  const canStart =
    status === "NOT_VERIFIED" ||
    status === "REJECTED" ||
    status === "EXPIRED" ||
    status === "PENDING";
  const canCancel = status === "PENDING" || status === "REVIEW_REQUIRED";

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <BadgeCheck className="w-4 h-4 text-primary" />
        <span>Xác minh danh tính (KYC)</span>
        {kycOptional && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md">
            Tùy chọn
          </span>
        )}
      </h3>
      <p className="text-xs text-muted-foreground">
        {kycOptional
          ? "Tài khoản Admin không bắt buộc KYC. Bạn vẫn có thể xác minh nếu muốn đồng bộ CCCD."
          : "HomeSpace dùng Didit để xác minh CCCD và khuôn mặt. Trạng thái chính thức chỉ cập nhật sau webhook từ Didit — trình duyệt không tự đánh dấu đã xác minh."}
      </p>

      <div className={`rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs ${meta.tone}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-card/80 border border-border/60 shrink-0">
            <Icon className={`w-5 h-5 ${status === "PENDING" || confirming ? "animate-spin" : ""}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-bold text-foreground">{meta.title}</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.description}</p>
            {status === "VERIFIED" && kyc?.verifiedAt && (
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Xác minh lúc{" "}
                {format(new Date(kyc.verifiedAt), "HH:mm, dd/MM/yyyy", { locale: vi })}
              </p>
            )}
            {confirming && status === "PENDING" && (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Đang xác nhận kết quả từ webhook…
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {canStart && (
            <button
              type="button"
              onClick={() => void startKyc()}
              disabled={starting || cancelling}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
            >
              {starting ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>
                {status === "PENDING"
                  ? "Tiếp tục xác minh"
                  : status === "REJECTED" || status === "EXPIRED"
                    ? "Xác minh lại"
                    : "Xác minh ngay"}
              </span>
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => void cancelKyc()}
              disabled={cancelling || starting}
              className="h-9 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-500/15 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
            >
              {cancelling ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={() => void refreshKycStatus().then(() => toast.success("Đã cập nhật trạng thái KYC"))}
            disabled={cancelling}
            className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>
    </div>
  );
}
