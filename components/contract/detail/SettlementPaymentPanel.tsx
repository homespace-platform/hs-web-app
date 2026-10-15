"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import paymentService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { PaymentRequest } from "@/types/payment-request.type";
import { getApiErrorMessage } from "@/utils/apiError";
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
export default function SettlementPaymentPanel({ payment, isLandlord, refresh }: {
  payment: PaymentRequest; isLandlord: boolean; refresh: () => Promise<void>;
}) {
  const mutex = useRef(false);
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const refund = payment.direction === "LANDLORD_TO_TENANT";
  const payer = refund ? isLandlord : !isLandlord;
  async function perform(action: () => Promise<unknown>) {
    if (mutex.current) return;
    mutex.current = true; setBusy(true);
    try { await action(); await refresh(); toast.success("Đã cập nhật khoản quyết toán."); }
    catch (error) { toast.error(getApiErrorMessage(error, "Chưa thể cập nhật thanh toán.")); }
    finally { mutex.current = false; setBusy(false); }
  }
  async function report() {
    if (!proof || proof.size > 15 * 1024 * 1024) { toast.error("Chọn chứng từ không quá 15 MB."); return; }
    await perform(async () => {
      const current = await paymentService.getPaymentRequest(payment.id);
      if (current.totalAmount !== payment.totalAmount) throw new Error("Số tiền đã thay đổi; hãy tải lại.");
      const proofStorageId = await storageService.uploadPaymentProof(proof, payment.id);
      return paymentService.reportTransfer(payment.id, { proofStorageId, expectedAmount: payment.totalAmount });
    });
  }
  async function viewProof(id: string) {
    const tab = window.open("", "_blank");
    try { const url = await storageService.getPaymentProofViewUrl(id); if (tab) { tab.opener = null; tab.location.href = url; } }
    catch (error) { tab?.close(); toast.error(getApiErrorMessage(error, "Không mở được chứng từ.")); }
  }
  return <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4 text-sm">
    <h4 className="font-semibold">{payment.type === "DEPOSIT_ADJUSTMENT" ? refund ? "Hoàn chênh lệch cọc · Chủ nhà → Người thuê" : "Bổ sung cọc · Người thuê → Chủ nhà" : refund ? "Hoàn cọc · Chủ nhà → Người thuê" : "Quyết toán còn thiếu · Người thuê → Chủ nhà"}</h4>
    <p>Số tiền: <strong>{money(payment.totalAmount)}</strong> · Trạng thái: {payment.status === "CONFIRMED" ? "Đã nhận tiền" : payment.status === "TRANSFER_REPORTED" ? "Chờ bên nhận xác nhận" : payment.status === "OVERDUE" ? "Quá hạn, vẫn phải thanh toán" : "Chờ chuyển khoản"}</p>
    {payment.status === "CONFIRMED" && <p className="text-emerald-700">Đã xác nhận nhận đủ tiền{(payment.payeeConfirmedAt || payment.confirmedAt) ? ` · ${new Date((payment.payeeConfirmedAt || payment.confirmedAt)!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}.</p>}
    <details open={payment.status !== "CONFIRMED"} className="space-y-3"><summary className="cursor-pointer font-medium">Thông tin chuyển khoản & chứng từ</summary>
    {payment.status !== "CONFIRMED" && <p className="text-xs">Hạn thanh toán: {payment.dueAt ? new Date(payment.dueAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}. Bên nhận cần kiểm tra tài khoản và xác nhận nhận tiền.</p>}
    <p>{payment.payeeBankAccountSnapshot?.bankName} · STK: <strong>{payment.payeeBankAccountSnapshot?.accountNumber}</strong> · {payment.payeeBankAccountSnapshot?.accountHolderName}</p>
    <p>Nội dung chuyển khoản: <strong className="font-mono">{payment.transferReference}</strong></p>
    {payer && payment.status !== "CONFIRMED" && payment.qrImageUrl && <Image unoptimized src={payment.qrImageUrl} alt="QR quyết toán" width={180} height={180} className="rounded-lg border" />}
    {payer && ["AWAITING_TRANSFER", "REJECTED", "OVERDUE"].includes(payment.status) && <div className="flex flex-wrap gap-2">
      <input aria-label="Chứng từ quyết toán" type="file" accept="image/*,.pdf" onChange={e => setProof(e.target.files?.[0] ?? null)} />
      <button type="button" disabled={busy} onClick={() => void report()} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Tôi đã chuyển khoản</button>
    </div>}
    {(payment.evidences || []).map((e, i) => <button key={e.id} type="button" onClick={() => void viewProof(e.storageObjectId)} className="block text-xs text-primary underline">Xem chứng từ {i + 1}</button>)}
    {!payer && payment.status === "TRANSFER_REPORTED" && <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => { if (window.confirm("Bạn đã thực sự nhận đủ số tiền vào tài khoản?")) void perform(() => paymentService.confirmReceipt(payment.id)); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Xác nhận đã nhận tiền</button>
      <input aria-label="Lý do từ chối chứng từ" value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do chưa xác nhận" className="rounded-lg border px-3 py-2 text-xs" />
      <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => void perform(() => paymentService.rejectReceipt(payment.id, { reason }))} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">Từ chối chứng từ</button>
    </div>}
    {payment.rejectedReason && <p className="text-xs text-rose-700">Lý do từ chối: {payment.rejectedReason}</p>}
    {payment.status === "DISPUTED" && <p className="text-xs text-rose-700">Đang tranh chấp; cần đối soát, không tự đóng hồ sơ.</p>}
    </details>
  </div>;
}

export function DepositAdjustmentPayments({ contractId, isLandlord }: { contractId: string; isLandlord: boolean }) {
  const [rows, setRows] = useState<PaymentRequest[]>([]), [error, setError] = useState("");
  const generation=useRef(0);
  const refresh = useCallback(async () => {
    const token=++generation.current;
    try { const payments=await paymentService.getContractPayments(contractId);if(token===generation.current){setRows(payments.filter(p=>p.type === "DEPOSIT_ADJUSTMENT")); setError("");} }
    catch (cause) { if(token===generation.current)setError(getApiErrorMessage(cause,"Chưa tải được khoản chênh lệch cọc.")); }
  }, [contractId]);
  useEffect(()=>{ const current=generation;void refresh(); const timer=window.setInterval(()=>void refresh(),30_000); return ()=>{current.current++;window.clearInterval(timer);}; },[refresh]);
  return <section className="space-y-3" aria-label="Điều chỉnh tiền cọc">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Chênh lệch cọc theo phụ lục</h3><button type="button" onClick={()=>void refresh()} className="text-sm text-primary">Làm mới khoản cọc</button></div>
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : !rows.length ? <p className="text-sm text-muted-foreground">Chưa có khoản điều chỉnh cọc. Khi phụ lục đủ chữ ký và đến ngày hiệu lực, phần cọc cần bổ sung hoặc hoàn được quản lý tại đây.</p> : rows.map(payment=><SettlementPaymentPanel key={payment.id} payment={payment} isLandlord={isLandlord} refresh={refresh}/>)}
  </section>;
}
