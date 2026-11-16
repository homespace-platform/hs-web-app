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
import VnptKycCapture from "./VnptKycCapture";
import KycVerifiedDetailsPanel from "@/components/settings/KycVerifiedDetailsPanel";
import type { VnptKycSession, KycStatus, KycStatusResponse } from "@/types/kyc.type";
import { fetchCurrentUser } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function statusMeta(status: KycStatus, rejectionReason?: string | null) {
  switch (status) {
    case "VERIFIED":
      return {
        title: "Danh tính đã được xác minh",
        description: "Hồ sơ KYC của bạn đã được xác nhận thành công.",
        icon: ShieldCheck,
        tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      };
    case "PENDING":
      return {
        title: "Đang xác minh danh tính",
        description: "Hoàn tất giấy tờ và khuôn mặt với VNPT eKYC để nhận kết quả xác minh.",
        icon: LoaderCircle,
        tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
      };
    case "REVIEW_REQUIRED":
      return {
        title: "Đang chờ xét duyệt",
        description: "Hồ sơ đang cần được xem xét thêm.",
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
  const userId = useAppSelector((state) => state.auth.userId);
  return <AccountKycSection key={userId ?? "anonymous"} />;
}

function AccountKycSection() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.userId);
  const profile = useAppSelector((state) => state.user.profile);
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [vnptSession, setVnptSession] = useState<(VnptKycSession & { ownerId: string }) | null>(null);
  const actorRef = useRef(userId);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const refreshKycStatus = useCallback(async () => {
    const status = await kycService.getStatus();
    if (actorRef.current !== userId) return status;
    setKyc(status);
    if (status.status === "VERIFIED" && userId) {
      void dispatch(fetchCurrentUser({ userId, force: true }));
    }
    return status;
  }, [dispatch, userId]);

  useEffect(() => {
    let cancelled = false;
    actorRef.current = userId;
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
    };
  }, [userId]);

  const onVnptResult = useCallback((result: KycStatusResponse) => {
    setVnptSession(null); setKyc(result);
    if (result.status === "VERIFIED" && userId) void dispatch(fetchCurrentUser({ userId, force: true }));
  }, [dispatch, userId]);

  const startKyc = async () => {
    if (!userId) return;
    setStarting(true);
    try {
      const session = await kycService.createVnptSession();
      if (actorRef.current !== userId) return;
      setKyc({ status: "PENDING", verifiedAt: null, provider: "VNPT", sessionId: session.sessionId, sessionUrl: null, rejectionReason: null });
      setVnptSession({ ...session, ownerId: userId });
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : null;
      toast.error(
        axios.isAxiosError(error) && error.response?.data?.code === 2501
          ? "VNPT eKYC chưa được cấu hình trên hệ thống. Vui lòng liên hệ hỗ trợ."
          : typeof msg === "string" && msg.trim()
            ? msg
            : "Không thể mở phiên KYC. Vui lòng thử lại sau."
      );
    } finally {
      setStarting(false);
    }
  };

  const cancelKyc = async () => {
    if (cancelling) return;
    setCancelling(true);
    setVnptSession(null);
    try {
      const status = await kycService.cancelSession();
      if (actorRef.current !== userId) return;
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
      </h3>
      <p className="text-xs text-muted-foreground">
        Xác minh CCCD và khuôn mặt với VNPT eKYC để hoàn tất hồ sơ danh tính của bạn.
      </p>

      {vnptSession?.ownerId === userId && vnptSession && <VnptKycCapture session={vnptSession} onResult={onVnptResult} onCancel={() => void cancelKyc()} />}
      {status !== "VERIFIED" && <fieldset disabled={starting || cancelling || canCancel} className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-3 disabled:opacity-70">
        <legend className="mb-2 text-xs font-semibold">Nhà cung cấp xác minh</legend>
        {[{ value: "VNPT", label: "VNPT eKYC", available: true }, { value: "FPT", label: "FPT AI eKYC", available: false }, { value: "VIETTEL", label: "Viettel AI eKYC", available: false }].map(item => <label key={item.value} className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${item.available ? "border-primary bg-primary/5 text-primary" : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"}`}>
          <input type="radio" name="kyc-provider" value={item.value} checked={item.available} disabled={!item.available} readOnly className="mt-0.5 accent-blue-600" />
          <span>{item.label}{!item.available && <span className="mt-1 block text-[10px] font-normal">Sắp ra mắt</span>}</span>
        </label>)}
      </fieldset>}
      <div className={`rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs ${meta.tone}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-card/80 border border-border/60 shrink-0">
            <Icon className={`w-5 h-5 ${status === "PENDING" ? "animate-spin" : ""}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-bold text-foreground">{meta.title}</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.description}</p>
            {kyc?.sessionId && kyc.provider === "VNPT" && <p className="text-[11px] text-muted-foreground">Nhà cung cấp: VNPT eKYC</p>}
            {status === "VERIFIED" && kyc?.verifiedAt && (
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Xác minh lúc{" "}
                {format(new Date(kyc.verifiedAt), "HH:mm, dd/MM/yyyy", { locale: vi })}
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
      {status === "VERIFIED" && kyc?.provider === "VNPT" && <KycVerifiedDetailsPanel key={userId} cccd={profile?.cccd} verified />}
    </div>
  );
}
