"use client";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import PaymentReceiptActions from "@/components/payment/PaymentReceiptActions";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import paymentService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { PaymentRequest } from "@/types/payment-request.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { useNotificationChangeSync } from "@/hooks/useAgreementChangeSync";
import { useActionDialog } from "@/components/common/ActionDialog";
import { paymentStatus, toneClasses } from "@/lib/rental-labels";
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
export default function SettlementPaymentPanel({ payment, isLandlord, refresh }: {
  payment: PaymentRequest; isLandlord: boolean; refresh: () => Promise<void>;
}) {
  const mutex = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useActionDialog();
  const [proof, setProof] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const refund = payment.direction === "LANDLORD_TO_TENANT";
  const payer = refund ? isLandlord : !isLandlord;
  async function perform(action: () => Promise<unknown>) {
    if (mutex.current || !alive.current) return;
    mutex.current = true; setBusy(true);
    try { await action(); if (!alive.current) return; await refresh(); if (alive.current) toast.success("Đã cập nhật khoản quyết toán."); }
    catch (error) { if (alive.current) toast.error(getApiErrorMessage(error, "Chưa thể cập nhật thanh toán.")); }
    finally { mutex.current = false; if (alive.current) setBusy(false); }
  }
  async function report() {
    if (!proof || proof.size > 15 * 1024 * 1024) { toast.error("Chọn chứng từ chuyển khoản không quá 15 MB."); return; }
    await perform(async () => {
      const current = await paymentService.getPaymentRequest(payment.id);
      if (!alive.current) return;
      if (current.id !== payment.id || current.payerId !== payment.payerId || current.payeeId !== payment.payeeId
        || current.direction !== payment.direction || current.totalAmount !== payment.totalAmount
        || !["AWAITING_TRANSFER", "REJECTED", "OVERDUE"].includes(current.status)) throw new Error("Khoản chuyển khoản đã thay đổi; hãy tải lại.");
      const proofStorageId = await storageService.uploadPaymentProof(proof, payment.id);
      if (!alive.current) return;
      return paymentService.reportTransfer(payment.id, { proofStorageId, expectedAmount: payment.totalAmount });
    });
  }
  async function viewProof(id: string) {
    const tab = window.open("", "_blank");
    try { const url = await storageService.getPaymentProofViewUrl(id); if (tab) { tab.opener = null; tab.location.href = url; } }
    catch (error) { tab?.close(); toast.error(getApiErrorMessage(error, "Không mở được chứng từ.")); }
  }
  const status = paymentStatus(payment.status);
  const canTransfer = payer && ["AWAITING_TRANSFER", "REJECTED", "OVERDUE"].includes(payment.status);
  const title = payment.type === "INITIAL_PAYMENT_REFUND" ? refund ? "Hoàn tiền · Chủ nhà → Người thuê" : "Hoàn tiền · Người thuê → Chủ nhà" : payment.type === "DEPOSIT_ADJUSTMENT" ? refund ? "Hoàn chênh lệch cọc · Chủ nhà → Người thuê" : "Bổ sung cọc · Người thuê → Chủ nhà" : refund ? "Hoàn cọc · Chủ nhà → Người thuê" : "Quyết toán còn thiếu · Người thuê → Chủ nhà";
  async function receive() {
    if (await confirm({ title: "Xác nhận đã nhận tiền?", description: `Chỉ xác nhận khi tài khoản của bạn đã nhận đủ ${money(payment.totalAmount)}.`, confirmLabel: "Đã nhận đủ", tone: "warning" }))
      void perform(() => paymentService.confirmReceipt(payment.id));
  }
  return <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h4 className="text-base font-semibold">{title}</h4>
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${toneClasses[status.tone]}`}>{status.label}</span>
    </div>
    <p>Số tiền: <strong className="tabular-nums">{money(payment.totalAmount)}</strong>{payment.status === "OVERDUE" ? " · Đã quá hạn nhưng vẫn phải thanh toán" : ""}</p>
    {payment.status === "CONFIRMED" && <p className="text-emerald-700 dark:text-emerald-300">Đã xác nhận nhận đủ tiền{(payment.payeeConfirmedAt || payment.confirmedAt) ? ` · ${new Date((payment.payeeConfirmedAt || payment.confirmedAt)!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}.</p>}
    <details open={payment.status !== "CONFIRMED"} className="space-y-3"><summary className="cursor-pointer font-medium">Thông tin chuyển khoản & chứng từ</summary>
    {payment.status !== "CONFIRMED" && <p className="text-muted-foreground">Hạn thanh toán: {payment.dueAt ? new Date(payment.dueAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}. Bên nhận cần kiểm tra tài khoản và xác nhận nhận tiền.</p>}
    <p>{payment.payeeBankAccountSnapshot?.bankName} · STK: <strong>{payment.payeeBankAccountSnapshot?.accountNumber}</strong> · {payment.payeeBankAccountSnapshot?.accountHolderName}</p>
    <p>Nội dung chuyển khoản: <strong className="font-mono">{payment.transferReference}</strong></p>
    {canTransfer && payment.qrImageUrl && <Image unoptimized src={payment.qrImageUrl} alt="QR quyết toán" width={180} height={180} className="rounded-xl border border-border" />}
    {canTransfer && <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Chứng từ quyết toán" type="file" accept="image/*,.pdf" className="max-w-full text-sm" onChange={e => setProof(e.target.files?.[0] ?? null)} />
      <button type="button" disabled={busy} onClick={() => void report()} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Tôi đã chuyển khoản</button>
    </div>}
    {(payment.evidences || []).map((e, i) => <button key={e.id} type="button" onClick={() => void viewProof(e.storageObjectId)} className="block min-h-9 text-sm font-semibold text-primary underline">Xem chứng từ {i + 1}</button>)}
    {!payer && payment.status === "TRANSFER_REPORTED" && <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={() => void receive()} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-600/90 disabled:opacity-50">Xác nhận đã nhận tiền</button>
      <input aria-label="Lý do từ chối chứng từ" value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do chưa chấp nhận (từ 10 ký tự)" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
      <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void perform(() => paymentService.rejectReceipt(payment.id, { reason }))} className="inline-flex min-h-11 items-center rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Không chấp nhận chứng từ</button>
    </div>}
    {payment.rejectedReason && <p className="text-destructive">Lý do không chấp nhận chứng từ: {payment.rejectedReason}</p>}
    </details>
    {payment.status==="CONFIRMED" && payment.totalAmount>0 && <PaymentReceiptActions paymentId={payment.id}/>}
    {dialog}
  </div>;
}

export function DepositAdjustmentPayments({ contractId, isLandlord }: { contractId: string; isLandlord: boolean }) {
  const [rows, setRows] = useState<PaymentRequest[]>([]), [error, setError] = useState("");
  const alive=useRef(false),inflight=useRef<Promise<void>|null>(null),dirty=useRef(false);
  const refresh = useCallback(():Promise<void> => {
    if(!alive.current)return Promise.resolve();
    if(inflight.current){dirty.current=true;return inflight.current;}
    const run=(async()=>{try{do{
      dirty.current=false;
      try{const payments=await paymentService.getContractPayments(contractId);if(!alive.current)return;setRows(payments.filter(p=>p.type === "DEPOSIT_ADJUSTMENT"&&p.contractId===contractId));setError("");}
      catch(cause){if(alive.current)setError(getApiErrorMessage(cause,"Chưa tải được khoản chênh lệch cọc."));}
    }while(dirty.current&&alive.current);}finally{inflight.current=null;}})();
    inflight.current=run;return run;
  }, [contractId]);
  useEffect(()=>{alive.current=true;void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},30_000);return()=>{alive.current=false;window.clearInterval(timer);};},[refresh]);
  useNotificationChangeSync(event=>event.type==="payment-changed"||event.type==="agreement-changed"&&(!event.agreementId||event.agreementId===contractId),refresh);
  return <section className="space-y-3" aria-label="Điều chỉnh tiền cọc">
    <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Chênh lệch cọc theo phụ lục</h3><button type="button" onClick={()=>void refresh()} className="min-h-9 text-sm font-semibold text-primary">Làm mới khoản cọc</button></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !rows.length ? <PolicyNotice tone="neutral" title="Chênh lệch cọc theo phụ lục" summary="Chưa có khoản điều chỉnh cọc."><p>Chưa có khoản điều chỉnh cọc. Khi phụ lục đủ chữ ký và đến ngày hiệu lực, phần cọc cần bổ sung hoặc hoàn được quản lý tại đây.</p></PolicyNotice> : rows.map(payment=><SettlementPaymentPanel key={payment.id} payment={payment} isLandlord={isLandlord} refresh={refresh}/>)}
  </section>;
}
