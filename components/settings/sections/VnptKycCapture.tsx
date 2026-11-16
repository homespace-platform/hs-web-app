"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import axios from "axios";
import kycService from "@/services/kyc.service";
import { VNPT_KYC_STEPS, type VnptKycSession, type VnptKycStep, type KycStatusResponse } from "@/types/kyc.type";

export default function VnptKycCapture({ session, onResult, onCancel }: {
  session: VnptKycSession; onResult: (status: KycStatusResponse) => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const frame = useRef<HTMLIFrameElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const firstStepError = useRef<string | null>(null);
  useEffect(() => {
    const nonce = crypto.randomUUID();
    let disposed = false;
    const requests = new Set<string>();
    const send = (data: object) => frame.current?.contentWindow?.postMessage({ ...data, nonce }, window.location.origin);
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      const data = event.data;
      if (data.type === "vnpt:ready") { send({ type: "vnpt:init", maxImageMb: session.maxImageMb, allowUpload: process.env.NODE_ENV === "development" }); return; }
      if (data.nonce !== nonce || disposed) return;
      if (data.type === "vnpt:error") { setError("Không thể tải SDK VNPT. Vui lòng đóng phiên và thử lại."); return; }
      if (data.type === "vnpt:camera-error") { setError("Không mở được camera. Hãy cấp quyền camera, đóng ứng dụng đang sử dụng camera rồi bắt đầu lại."); return; }
      if (data.type === "vnpt:request") {
        if (typeof data.id !== "string" || data.id.length > 64 || requests.has(data.id) || requests.size >= 30 || !VNPT_KYC_STEPS.includes(data.step)) return;
        requests.add(data.id);
        try {
          let body: unknown = data.body;
          if (data.step === "upload") {
            if (!(data.file instanceof Blob)) throw new Error("Invalid capture");
            if (data.file.size > session.maxImageMb * 1048576) throw new Error("IMAGE_TOO_LARGE");
            const form = new FormData(); form.append("file", data.file, "capture"); body = form;
          }
          const result = await kycService.vnptStep(session.sessionId, data.step as VnptKycStep, body);
          if (!disposed) send({ type: "vnpt:response", id: data.id, result });
        } catch (cause) {
          if (!disposed) {
            const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
            const message = cause instanceof Error && cause.message === "IMAGE_TOO_LARGE"
              ? `Ảnh vượt quá ${session.maxImageMb} MB. Vui lòng đóng phiên và thử lại với ảnh nhỏ hơn.`
              : status === 413 || status === 400 && data.step === "upload" ? "Ảnh tải lên không hợp lệ hoặc quá lớn. Vui lòng đóng phiên và thử lại."
              : status === 400 ? "Dữ liệu bước xác minh không hợp lệ. Vui lòng đóng phiên và thử lại."
              : status === 409 ? "Phiên xác minh đã hết hạn. Vui lòng đóng phiên và bắt đầu lại."
              : status === 502 || status === 503 || status === 504 ? "Dịch vụ VNPT chưa xử lý được yêu cầu. Vui lòng đóng phiên và thử lại."
              : "Không thể xử lý ảnh xác minh. Vui lòng đóng phiên và bắt đầu lại.";
            send({ type: "vnpt:response", id: data.id, error: true });
            firstStepError.current ??= process.env.NODE_ENV === "development" ? `${message} (${data.step}, ${status ? `HTTP ${status}` : cause instanceof Error && cause.message === "IMAGE_TOO_LARGE" ? "local" : "network"})` : message;
            setError(firstStepError.current);
          }
        }
      }
      if (data.type === "vnpt:complete" && !done.current) {
        if (firstStepError.current) return;
        done.current = true; setBusy(true);
        try {
          const result = await kycService.finalizeVnpt(session.sessionId);
          if (!disposed) onResult(result);
        } catch {
          if (!disposed) setError("Chưa đủ bằng chứng xác minh. Vui lòng đóng phiên và thử lại.");
        } finally { if (!disposed) setBusy(false); }
      }
    };
    window.addEventListener("message", onMessage);
    const timeout = window.setTimeout(() => setError("SDK VNPT tải quá lâu. Kiểm tra kết nối rồi thử lại."), 20_000);
    const ready = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === "vnpt:ready") window.clearTimeout(timeout);
    };
    window.addEventListener("message", ready);
    return () => { disposed = true; window.clearTimeout(timeout); window.removeEventListener("message", onMessage); window.removeEventListener("message", ready); };
  }, [session, onResult]);
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} className="m-auto w-[min(96vw,900px)] max-w-none border-0 bg-transparent p-0 backdrop:bg-slate-950/60" aria-label="Xác minh VNPT eKYC">
    <div className="flex h-[min(900px,95dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-4 text-slate-900">
        <h3 className="font-semibold">Xác minh VNPT eKYC</h3>
        <button type="button" onClick={onCancel} disabled={busy} aria-label="Đóng và hủy phiên VNPT" className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </div>
      {error && <p role="alert" className="bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {busy && <div role="status" className="flex items-center gap-2 p-3 text-sm text-slate-700"><LoaderCircle className="h-4 w-4 animate-spin" />Đang kiểm tra kết quả từ VNPT…</div>}
      <iframe ref={frame} src="/kyc/vnpt-frame.html" title="Chụp giấy tờ và khuôn mặt với VNPT" allow="camera" className="min-h-0 flex-1 border-0 bg-white" />
    </div>
  </dialog>;
}
