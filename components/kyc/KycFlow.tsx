"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LoaderCircle, ShieldAlert, ShieldCheck, X } from "lucide-react";
import kycService from "@/services/kyc.service";
import VnptKycCapture from "@/components/settings/sections/VnptKycCapture";
import { statusMeta } from "@/components/kyc/kycStatusMeta";
import { fetchCurrentUser, fetchOnboardingStatus } from "@/features/user/userSlice";
import { useAuth } from "@/features/auth/useAuth";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import {
  ACCOUNT_MISMATCH_ERROR, classifyKycError, initialKycFlowState, kycFlowReducer, resolveReturn,
} from "@/lib/kyc-flow";
import type { KycParams } from "@/lib/kyc-return";
import type { KycStatusResponse } from "@/types/kyc.type";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const failureOf = (error: unknown) => axios.isAxiosError(error)
  ? { status: error.response?.status, code: error.response?.data?.code, message: error.response?.data?.message }
  : {};

const card = "mx-auto w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xs sm:p-6 space-y-4";
const primaryBtn = "h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-xs hover:bg-primary/90 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1.5";
const ghostBtn = "h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-1.5";

/** Shared KYC flow for the /kyc page (web and mobile). Reuses VnptKycCapture unchanged in its "page" variant. */
export default function KycFlow({ params }: { params: KycParams }) {
  const router = useRouter();
  const appDispatch = useAppDispatch();
  const { login } = useAuth();
  const kycGate = useFeatureGate(PERMISSIONS.KYC_SUBMIT);
  const userId = useAppSelector((s) => s.auth.userId);
  const [state, dispatch] = useReducer(kycFlowReducer, initialKycFlowState);
  const owner = useRef<string | null>(null);
  const busy = useRef(false);
  const [cancelling, setCancelling] = useState(false);

  const refreshProfile = useCallback(() => {
    if (!userId) return;
    void appDispatch(fetchCurrentUser({ userId, force: true }));
    void appDispatch(fetchOnboardingStatus());
  }, [appDispatch, userId]);

  useEffect(() => {
    if (state.phase !== "loading") return;
    if (!userId) { dispatch({ type: "LOGIN_REQUIRED" }); return; }
    owner.current = userId;
    let stale = false;
    kycService.getStatus()
      .then((kyc) => { if (!stale) dispatch({ type: "LOADED", kyc }); })
      .catch((error) => { if (!stale) dispatch({ type: "LOAD_FAILED", error: classifyKycError(failureOf(error), "load") }); });
    return () => { stale = true; };
  }, [state.phase, userId]);

  // The account changed while a session was open: never finish a session under another identity.
  useEffect(() => {
    if (owner.current && userId !== owner.current) dispatch({ type: "FATAL", error: ACCOUNT_MISMATCH_ERROR });
  }, [userId]);

  const ret = useMemo(() => resolveReturn(params, state), [params, state]);
  useEffect(() => {
    if (!ret || ret.autoMs == null) return;
    const timer = window.setTimeout(() => {
      if (ret.external) window.location.assign(ret.href);
      else router.replace(ret.href);
    }, ret.autoMs);
    return () => window.clearTimeout(timer);
  }, [ret, router]);

  const start = async () => {
    if (state.phase !== "ready" || !userId || busy.current) return;
    busy.current = true;
    dispatch({ type: "START" });
    try {
      const session = await kycService.createVnptSession();
      if (owner.current === userId) dispatch({ type: "SESSION_CREATED", session });
    } catch (error) {
      dispatch({ type: "START_FAILED", error: classifyKycError(failureOf(error), "start") });
    } finally {
      busy.current = false;
    }
  };

  const cancel = async () => {
    if (busy.current) return;
    busy.current = true;
    setCancelling(true);
    try {
      dispatch({ type: "CANCEL_DONE", kyc: await kycService.cancelSession() });
    } catch (error) {
      const message = failureOf(error).message;
      dispatch({ type: "CANCEL_DONE", warning: typeof message === "string" && message.trim() ? message : "Không thể hủy phiên KYC trên hệ thống." });
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  };

  const onResult = useCallback((kyc: KycStatusResponse) => {
    dispatch({ type: "RESULT", kyc });
    if (kyc.status === "VERIFIED") refreshProfile();
  }, [refreshProfile]);
  const onFinalizing = useCallback(() => dispatch({ type: "FINALIZING" }), []);

  if (state.phase === "capturing" || state.phase === "finalizing") {
    return (
      <>
        <VnptKycCapture variant="page" session={state.session} onResult={onResult} onFinalizing={onFinalizing} onCancel={() => void cancel()} />
        {cancelling && <div role="status" className="fixed inset-0 z-[110] flex items-center justify-center gap-2 bg-white/80 text-sm text-slate-800"><LoaderCircle className="h-4 w-4 animate-spin" />Đang hủy phiên…</div>}
      </>
    );
  }

  if (state.phase === "loading" || state.phase === "starting") {
    return (
      <div role="status" className={`${card} flex items-center justify-center gap-2 text-sm text-muted-foreground`}>
        <LoaderCircle className="h-4 w-4 animate-spin" />
        {state.phase === "loading" ? "Đang tải trạng thái KYC…" : "Đang mở phiên xác minh…"}
      </div>
    );
  }

  if (state.phase === "needsLogin") {
    return (
      <div className={card}>
        <h1 className="text-base font-bold">Cần đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Vui lòng đăng nhập để xác minh danh tính (KYC).</p>
        <button type="button" className={primaryBtn} onClick={() => login(`${window.location.pathname}${window.location.search}`)}>Đăng nhập</button>
      </div>
    );
  }

  if (state.phase === "ready") {
    const { kyc } = state;
    const meta = statusMeta(kyc.status, kyc.rejectionReason);
    const Icon = meta.icon;
    const label = kyc.status === "PENDING" ? "Tiếp tục xác minh" : kyc.status === "REJECTED" || kyc.status === "EXPIRED" ? "Xác minh lại" : "Xác minh ngay";
    return (
      <div className={card}>
        <div className={`flex items-start gap-3 rounded-xl border p-3 ${meta.tone}`}>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${kyc.status === "PENDING" ? "animate-spin" : ""}`} />
          <div className="min-w-0 space-y-1">
            <h1 className="text-sm font-bold text-foreground">{meta.title}</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        {state.notice && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{state.notice}</p>}
        {!kycGate.allowed && kycGate.title && <p className="text-xs text-muted-foreground">{kycGate.title}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={`${primaryBtn} sm:flex-1`} onClick={() => void start()} disabled={cancelling || !kycGate.allowed} title={kycGate.title}>
            <ShieldCheck className="h-4 w-4" />{label}
          </button>
          {kyc.status === "PENDING" && (
            <button type="button" className={`${ghostBtn} border-rose-500/30 text-rose-700`} onClick={() => void cancel()} disabled={cancelling}>
              {cancelling ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}Hủy phiên
            </button>
          )}
          <button type="button" className={ghostBtn} onClick={() => dispatch({ type: "EXIT" })} disabled={cancelling}>Thoát</button>
        </div>
      </div>
    );
  }

  // result | cancelled | error: always ends with a way back.
  let title: string;
  let description: string;
  let Icon = ShieldAlert;
  let tone = "text-rose-600 bg-rose-500/10 border-rose-500/20";
  if (state.phase === "result") {
    const meta = statusMeta(state.kyc.status, state.kyc.rejectionReason);
    ({ title, description, icon: Icon, tone } = meta);
    if (state.kyc.status === "PENDING" || state.kyc.status === "NOT_VERIFIED") description = "Hồ sơ đang được xử lý. Bạn có thể quay lại và kiểm tra trạng thái sau.";
  } else if (state.phase === "cancelled") {
    title = "Bạn đã dừng xác minh";
    description = state.warning ?? "Bạn có thể bắt đầu lại bất cứ lúc nào.";
    tone = "text-orange-600 bg-orange-500/10 border-orange-500/20";
  } else {
    title = "Không thể hoàn tất xác minh";
    description = state.message;
  }
  return (
    <div className={card}>
      <div className={`flex items-start gap-3 rounded-xl border p-3 ${tone}`} role={state.phase === "error" ? "alert" : "status"}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <h1 className="text-sm font-bold text-foreground">{title}</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {ret?.autoMs != null && <p className="text-xs text-muted-foreground">{ret.external ? "Đang quay lại ứng dụng…" : "Đang quay lại…"}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {state.phase === "error" && state.code === "LOAD_FAILED" && (
          <button type="button" className={primaryBtn} onClick={() => dispatch({ type: "RETRY" })}>Thử lại</button>
        )}
        {ret && (ret.external
          // A plain anchor: some mobile browsers block scheme redirects that are not a user gesture.
          ? <a href={ret.href} className={primaryBtn}>Quay lại ứng dụng</a>
          : <Link href={ret.href} replace className={primaryBtn}>Quay lại</Link>)}
      </div>
    </div>
  );
}
