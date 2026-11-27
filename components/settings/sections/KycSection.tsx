"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, LoaderCircle, ShieldCheck, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import kycService from "@/services/kyc.service";
import { statusMeta } from "@/components/kyc/kycStatusMeta";
import KycVerifiedDetailsPanel from "@/components/settings/KycVerifiedDetailsPanel";
import type { KycStatusResponse } from "@/types/kyc.type";
import { fetchCurrentUser, fetchOnboardingStatus } from "@/features/user/userSlice";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function KycSection() {
  const userId = useAppSelector((state) => state.auth.userId);
  return <AccountKycSection key={userId ?? "anonymous"} />;
}

function AccountKycSection() {
  const kycGate = useFeatureGate(PERMISSIONS.KYC_SUBMIT);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.userId);
  const profile = useAppSelector((state) => state.user.profile);
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const actorRef = useRef(userId);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const refreshKycStatus = useCallback(async () => {
    const status = await kycService.getStatus();
    if (actorRef.current !== userId) return status;
    setKyc(status);
    if (status.status === "VERIFIED" && userId) {
      void dispatch(fetchCurrentUser({ userId, force: true }));
      void dispatch(fetchOnboardingStatus());
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

  // Capture lives on the shared /kyc page; Settings only links to it and returns here.
  const openKyc = () => router.push(`/kyc?returnTo=${encodeURIComponent(pathname)}`);

  const cancelKyc = async () => {
    if (cancelling) return;
    setCancelling(true);
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

      {status !== "VERIFIED" && <fieldset disabled={cancelling || canCancel} className="grid grid-cols-1 gap-2 py-2 sm:grid-cols-3 disabled:opacity-70">
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
            {status === "VERIFIED" && (kyc?.providerLabel ?? kyc?.provider) && <p className="text-[11px] text-muted-foreground">Nhà cung cấp: {kyc?.providerLabel ?? kyc?.provider}</p>}
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
              onClick={openKyc}
              disabled={cancelling || !kycGate.allowed}
              title={kycGate.title}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
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
              disabled={cancelling}
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
      {status === "VERIFIED" && <KycVerifiedDetailsPanel key={userId} cccd={profile?.cccd} verified />}
    </div>
  );
}
