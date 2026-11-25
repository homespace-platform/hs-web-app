import type { KycStatusResponse, VnptKycSession } from "@/types/kyc.type";
import { buildAppReturnUrl, toAppStatus, type AppKycStatus, type KycParams } from "@/lib/kyc-return";

export type KycErrorCode =
  | "LOAD_FAILED" | "START_FAILED" | "FORBIDDEN" | "UNAUTHORIZED" | "NOT_CONFIGURED" | "ACCOUNT_MISMATCH";
export type KycFlowError = { code: KycErrorCode; message: string; fatal: boolean };

/** loading -> needsLogin | ready -> starting -> capturing -> finalizing -> result | cancelled | error */
export type KycFlowState =
  | { phase: "loading" }
  | { phase: "needsLogin" }
  | { phase: "ready"; kyc: KycStatusResponse; notice?: string }
  | { phase: "starting"; kyc: KycStatusResponse }
  | { phase: "capturing"; kyc: KycStatusResponse; session: VnptKycSession }
  | { phase: "finalizing"; kyc: KycStatusResponse; session: VnptKycSession }
  | { phase: "result"; kyc: KycStatusResponse }
  | { phase: "cancelled"; kyc?: KycStatusResponse | null; warning?: string }
  | { phase: "error"; code: KycErrorCode; message: string };

export type KycFlowAction =
  | { type: "LOGIN_REQUIRED" }
  | { type: "LOADED"; kyc: KycStatusResponse }
  | { type: "LOAD_FAILED"; error: KycFlowError }
  | { type: "RETRY" }
  | { type: "START" }
  | { type: "SESSION_CREATED"; session: VnptKycSession }
  | { type: "START_FAILED"; error: KycFlowError }
  | { type: "FINALIZING" }
  | { type: "RESULT"; kyc: KycStatusResponse }
  | { type: "CANCEL_DONE"; kyc?: KycStatusResponse | null; warning?: string }
  | { type: "EXIT" }
  | { type: "FATAL"; error: KycFlowError };

export const initialKycFlowState: KycFlowState = { phase: "loading" };

/** Already verified or waiting for review: nothing to start. */
export function canStartKyc(kyc: KycStatusResponse): boolean {
  return kyc.status !== "VERIFIED" && kyc.status !== "REVIEW_REQUIRED";
}

export function screenForStatus(kyc: KycStatusResponse): KycFlowState {
  return canStartKyc(kyc) ? { phase: "ready", kyc } : { phase: "result", kyc };
}

const toError = (error: KycFlowError): KycFlowState => ({ phase: "error", code: error.code, message: error.message });

/** Invalid transitions return the same state object. */
export function kycFlowReducer(state: KycFlowState, action: KycFlowAction): KycFlowState {
  switch (state.phase) {
    case "loading":
      if (action.type === "LOGIN_REQUIRED") return { phase: "needsLogin" };
      if (action.type === "LOADED") return screenForStatus(action.kyc);
      if (action.type === "LOAD_FAILED" || action.type === "FATAL") return toError(action.error);
      return state;
    case "needsLogin":
      return action.type === "RETRY" ? initialKycFlowState : state;
    case "ready":
      if (action.type === "START") return canStartKyc(state.kyc) ? { phase: "starting", kyc: state.kyc } : state;
      if (action.type === "EXIT") return { phase: "cancelled", kyc: state.kyc };
      if (action.type === "CANCEL_DONE") return { phase: "cancelled", kyc: action.kyc ?? state.kyc, warning: action.warning };
      if (action.type === "FATAL") return toError(action.error);
      return state;
    case "starting":
      if (action.type === "SESSION_CREATED") {
        const kyc = { ...state.kyc, status: "PENDING" as const, sessionId: action.session.sessionId };
        return { phase: "capturing", kyc, session: action.session };
      }
      if (action.type === "START_FAILED") {
        return action.error.fatal ? toError(action.error) : { phase: "ready", kyc: state.kyc, notice: action.error.message };
      }
      if (action.type === "FATAL") return toError(action.error);
      return state;
    case "capturing":
    case "finalizing":
      if (action.type === "FINALIZING") return { phase: "finalizing", kyc: state.kyc, session: state.session };
      if (action.type === "RESULT") return { phase: "result", kyc: action.kyc };
      if (action.type === "CANCEL_DONE") return { phase: "cancelled", kyc: action.kyc ?? state.kyc, warning: action.warning };
      if (action.type === "FATAL") return toError(action.error);
      return state;
    case "error":
      return action.type === "RETRY" && state.code === "LOAD_FAILED" ? initialKycFlowState : state;
    default:
      return state;
  }
}

/** Status reported to the app for a finished flow; null while the flow is still running. */
export function appStatusFor(state: KycFlowState): AppKycStatus | null {
  if (state.phase === "result") return toAppStatus(state.kyc.status, true);
  if (state.phase === "cancelled") return "CANCELLED";
  if (state.phase === "error") return "ERROR";
  return null;
}

export type KycReturn = { href: string; external: boolean; autoMs: number | null };
export const APP_AUTO_RETURN_MS = 1500;
export const WEB_VERIFIED_AUTO_RETURN_MS = 3000;

/** Where a finished flow sends the user. App: only a validated state ever produces a scheme URL. */
export function resolveReturn(params: KycParams, state: KycFlowState): KycReturn | null {
  const status = appStatusFor(state);
  if (!status) return null;
  if (params.client === "app") {
    const href = buildAppReturnUrl(params.state, status);
    return href ? { href, external: true, autoMs: APP_AUTO_RETURN_MS } : null;
  }
  return { href: params.returnTo, external: false, autoMs: status === "VERIFIED" ? WEB_VERIFIED_AUTO_RETURN_MS : null };
}

/** Maps an HTTP failure (fields extracted by the caller) to a Vietnamese message and severity. */
export function classifyKycError(
  failure: { status?: number; code?: unknown; message?: unknown },
  context: "load" | "start",
): KycFlowError {
  if (failure.status === 401) return { code: "UNAUTHORIZED", fatal: true, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  if (failure.status === 403) {
    return {
      code: "FORBIDDEN", fatal: true,
      message: "Tài khoản này không có quyền xác minh danh tính (KYC) hoặc không khớp với phiên xác minh. Vui lòng đăng nhập đúng tài khoản rồi thử lại.",
    };
  }
  if (failure.code === 2501) {
    return { code: "NOT_CONFIGURED", fatal: true, message: "VNPT eKYC chưa được cấu hình trên hệ thống. Vui lòng liên hệ hỗ trợ." };
  }
  const server = typeof failure.message === "string" && failure.message.trim() ? failure.message : null;
  return context === "load"
    ? { code: "LOAD_FAILED", fatal: true, message: server ?? "Không tải được trạng thái KYC." }
    : { code: "START_FAILED", fatal: false, message: server ?? "Không thể mở phiên KYC. Vui lòng thử lại sau." };
}

export const ACCOUNT_MISMATCH_ERROR: KycFlowError = {
  code: "ACCOUNT_MISMATCH", fatal: true,
  message: "Tài khoản đăng nhập đã thay đổi so với phiên xác minh. Vui lòng mở lại liên kết bằng đúng tài khoản.",
};
