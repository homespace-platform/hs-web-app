"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Plus, ReceiptText, RefreshCw, Trash2 } from "lucide-react";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import paymentRequestService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentRequest } from "@/types/payment-request.type";
import { getApiErrorMessage } from "@/utils/apiError";

type Extra = { description: string; amount: string };
type Props = {
  contractId: string;
  isLandlord: boolean;
  isTenant: boolean;
  electricityRequired: boolean;
  waterRequired: boolean;
  unsupportedWaterRate: boolean;
  initialElectricity?: string | number;
  initialWater?: string | number;
};

const money = (n: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(n);
const date = (s?: string) => s ? new Date(s).toLocaleDateString("vi-VN") : "—";

export default function MonthlyInvoicesSection({ contractId, isLandlord, isTenant,
  electricityRequired, waterRequired, unsupportedWaterRate, initialElectricity, initialWater }: Props) {
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [electricity, setElectricity] = useState<Record<string, string>>({});
  const [water, setWater] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, Extra[]>>({});
  const [proofs, setProofs] = useState<Record<string, File | null>>({});
  const [rejection, setRejection] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const [bills, paymentList] = await Promise.all([
        monthlyInvoiceService.list(contractId), paymentRequestService.getContractPayments(contractId),
      ]);
      setInvoices(bills);
      setPayments(paymentList);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải hóa đơn tháng."));
    } finally { setLoading(false); }
  }, [contractId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (window.location.hash === "#monthly-invoices") {
      document.getElementById("monthly-invoices")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  async function perform(id: string, action: () => Promise<unknown>, success: string) {
    setBusy(id);
    try { await action(); toast.success(success); await refresh(); }
    catch (err) { toast.error(getApiErrorMessage(err, "Thao tác chưa thành công.")); }
    finally { setBusy(null); }
  }

  function previousEnd(invoice: MonthlyInvoice, kind: "electricity" | "water") {
    if (invoice.periodIndex === 0) return kind === "electricity" ? initialElectricity : initialWater;
    const previous = invoices.find((i) => i.periodIndex === invoice.periodIndex - 1);
    return kind === "electricity" ? previous?.electricityEnd : previous?.waterEnd;
  }

  async function issue(invoice: MonthlyInvoice) {
    const electricText = electricity[invoice.id]?.trim();
    const waterText = water[invoice.id]?.trim();
    if (electricityRequired && (!electricText || Number(electricText) < Number(previousEnd(invoice, "electricity")))) {
      toast.error("Vui lòng nhập chỉ số điện cuối kỳ không thấp hơn đầu kỳ."); return;
    }
    if (waterRequired && (!waterText || Number(waterText) < Number(previousEnd(invoice, "water")))) {
      toast.error("Vui lòng nhập chỉ số nước cuối kỳ không thấp hơn đầu kỳ."); return;
    }
    if (unsupportedWaterRate) {
      toast.error("Biểu phí nước theo giá nhà nước chưa có đơn giá số đã chốt; vui lòng liên hệ quản trị viên."); return;
    }
    const extraCharges = (extras[invoice.id] || []).map((x) => ({
      description: x.description.trim(), amount: Number(x.amount),
    }));
    if (extraCharges.some((x) => !x.description || !Number.isFinite(x.amount) || x.amount <= 0)) {
      toast.error("Mỗi khoản phát sinh cần tên và số tiền dương."); return;
    }
    if (!window.confirm("Xác nhận phát hành? Hãy kiểm tra kỹ chỉ số và các khoản phí; hóa đơn đã phát hành hiện chưa thể sửa.")) return;
    await perform(invoice.id, () => monthlyInvoiceService.issue(invoice.id, {
      electricityEnd: electricityRequired ? Number(electricText) : undefined,
      waterEnd: waterRequired ? Number(waterText) : undefined,
      extraCharges,
    }), "Đã phát hành hóa đơn.");
  }

  async function report(payment: PaymentRequest) {
    const file = proofs[payment.id];
    if (!file) { toast.error("Vui lòng chọn chứng từ chuyển khoản."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Chứng từ tối đa 15 MB."); return; }
    await perform(payment.id, async () => {
      const storageId = await storageService.uploadPaymentProof(file, payment.id);
      await paymentRequestService.reportTransfer(payment.id, { proofStorageId: storageId });
      setProofs((prev) => ({ ...prev, [payment.id]: null }));
    }, "Đã gửi chứng từ. Chờ chủ nhà xác nhận nhận tiền.");
  }

  async function viewProof(storageId: string) {
    const tab = window.open("", "_blank");
    try {
      const url = await storageService.getPaymentProofViewUrl(storageId);
      if (tab) { tab.opener = null; tab.location.href = url; }
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      toast.error(getApiErrorMessage(err, "Không thể mở chứng từ."));
    }
  }

  const outstanding = invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return <section id="monthly-invoices" className="space-y-4 scroll-mt-24">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Hóa đơn hằng tháng</h2>
        <p className="text-xs text-muted-foreground mt-1">Mỗi kỳ có một hóa đơn riêng. Kỳ đầu không thu lại tiền thuê đã trả trước; phí dịch vụ, điện/nước và khoản phát sinh được quyết toán cuối kỳ.</p>
      </div>
      <button type="button" onClick={() => void refresh()} aria-label="Làm mới hóa đơn"
        className="rounded-lg border border-border p-2 hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
    </div>
    {outstanding > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Tổng chưa xác nhận thanh toán: <strong>{money(outstanding)}</strong>. Các kỳ vẫn được theo dõi riêng.
    </div>}
    {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải hóa đơn…</div>
      : invoices.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Chưa có kỳ đã kết thúc. Hóa đơn nháp sẽ xuất hiện khi hết kỳ thuê đầu tiên.
      </div> : invoices.map((invoice) => {
        const payment = payments.find((p) => p.invoiceId === invoice.id || p.id === invoice.paymentRequestId);
        const rows = extras[invoice.id] || [];
        return <article key={invoice.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-semibold">Kỳ {invoice.periodIndex + 1}: {date(invoice.periodStart)} – {date(invoice.periodEndExclusive)} (không gồm ngày cuối)</h3>
              <p className="text-xs text-muted-foreground">{invoice.status === "DRAFT" ? "Chủ nhà cần chốt chỉ số và phát hành" : `Hạn thanh toán: ${date(invoice.dueAt)}`}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700" : invoice.status === "OVERDUE" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
              {{ DRAFT: "Chờ phát hành", UNPAID: "Chưa thanh toán", OVERDUE: "Quá hạn", PAID: "Đã thanh toán" }[invoice.status]}
            </span>
          </div>
          {invoice.status === "DRAFT" && isLandlord && <div className="space-y-3 rounded-xl bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Chốt chỉ số cuối kỳ; đơn giá lấy từ biểu phí đã chốt khi ký hợp đồng. Khoản phát sinh sẽ hiển thị riêng cho người thuê.</p>
            {unsupportedWaterRate && <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">Biểu phí nước theo giá nhà nước chưa có đơn giá số cố định trong hợp đồng. Chưa thể phát hành tự động để tránh tính sai; vui lòng liên hệ quản trị viên.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {electricityRequired && <label className="text-xs font-medium">Điện cuối kỳ (đầu kỳ: {String(previousEnd(invoice, "electricity") ?? "chưa có")})
                <input type="number" min={0} step="any" value={electricity[invoice.id] || ""}
                  onChange={(e) => setElectricity((s) => ({ ...s, [invoice.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>}
              {waterRequired && <label className="text-xs font-medium">Nước cuối kỳ (đầu kỳ: {String(previousEnd(invoice, "water") ?? "chưa có")})
                <input type="number" min={0} step="any" value={water[invoice.id] || ""}
                  onChange={(e) => setWater((s) => ({ ...s, [invoice.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label>}
            </div>
            {rows.map((row, index) => <div key={index} className="flex flex-wrap gap-2">
              <input aria-label="Tên khoản phát sinh" placeholder="Tên khoản phát sinh" value={row.description}
                onChange={(e) => setExtras((s) => ({ ...s, [invoice.id]: rows.map((x, n) => n === index ? { ...x, description: e.target.value } : x) }))}
                className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input aria-label="Số tiền phát sinh" type="number" min={1} placeholder="Số tiền (đ)" value={row.amount}
                onChange={(e) => setExtras((s) => ({ ...s, [invoice.id]: rows.map((x, n) => n === index ? { ...x, amount: e.target.value } : x) }))}
                className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <button type="button" aria-label="Xóa khoản phát sinh" onClick={() => setExtras((s) => ({ ...s, [invoice.id]: rows.filter((_, n) => n !== index) }))}
                className="rounded-lg border border-border px-3"><Trash2 className="h-4 w-4" /></button>
            </div>)}
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setExtras((s) => ({ ...s, [invoice.id]: [...rows, { description: "", amount: "" }] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-4 w-4" />Thêm phí phát sinh</button>
              <button type="button" disabled={busy === invoice.id || unsupportedWaterRate} onClick={() => void issue(invoice)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Phát hành hóa đơn</button>
            </div>
          </div>}
          {invoice.status !== "DRAFT" && <>
            <div className="divide-y divide-border text-sm">{invoice.lines.map((line, index) => <div key={index} className="flex justify-between gap-3 py-2">
              <span>{line.description} <small className="text-muted-foreground">({line.quantity} × {money(line.unitPrice)})</small></span>
              <strong>{money(line.amount)}</strong></div>)}
              <div className="flex justify-between pt-3 font-bold"><span>Tổng hóa đơn</span><span>{money(invoice.totalAmount)}</span></div>
            </div>
            {payment && invoice.status !== "PAID" && <div className="rounded-xl border border-border p-3 space-y-3 text-sm">
              <p className="font-semibold">Chuyển khoản trực tiếp cho chủ nhà</p>
              <p>Ngân hàng: {payment.payeeBankAccountSnapshot?.bankName || payment.payeeBankAccountSnapshot?.bankCode} • STK: <strong>{payment.payeeBankAccountSnapshot?.accountNumber}</strong></p>
              <p>Người nhận: {payment.payeeBankAccountSnapshot?.accountHolderName}</p>
              <p>Nội dung chuyển khoản: <strong className="font-mono">{payment.transferReference}</strong></p>
              <p>Số tiền: <strong>{money(payment.totalAmount)}</strong></p>
              {isTenant && payment.qrImageUrl && <Image unoptimized src={payment.qrImageUrl} width={180} height={180} alt="VietQR thanh toán hóa đơn" className="rounded-lg border border-border" />}
              {isTenant && ["AWAITING_TRANSFER", "OVERDUE", "REJECTED"].includes(payment.status) && <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*,.pdf" aria-label="Chứng từ chuyển khoản"
                  onChange={(e) => setProofs((s) => ({ ...s, [payment.id]: e.target.files?.[0] || null }))} className="text-xs" />
                <button type="button" disabled={busy === payment.id} onClick={() => void report(payment)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Tôi đã chuyển khoản</button>
              </div>}
              {payment.status === "TRANSFER_REPORTED" && <p className="text-blue-700">Đã gửi chứng từ — chờ chủ nhà xác nhận.</p>}
              {payment.status === "REJECTED" && <p className="text-rose-700">Chủ nhà từ chối chứng từ: {payment.rejectedReason || "Vui lòng kiểm tra và gửi lại."}</p>}
              {payment.evidences?.length > 0 && <div className="space-y-1">
                <p className="text-xs font-semibold">Chứng từ đã gửi:</p>
                {payment.evidences.map((evidence, index) => <button key={evidence.id} type="button"
                  onClick={() => void viewProof(evidence.storageObjectId)}
                  className="block text-xs font-semibold text-primary underline underline-offset-2">Xem chứng từ {index + 1}</button>)}
              </div>}
              {isLandlord && payment.status === "TRANSFER_REPORTED" && <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy === payment.id} onClick={() => void perform(payment.id,
                  () => paymentRequestService.confirmReceipt(payment.id), "Đã xác nhận thanh toán.")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Xác nhận đã nhận tiền</button>
                <input value={rejection[payment.id] || ""} onChange={(e) => setRejection((s) => ({ ...s, [payment.id]: e.target.value }))}
                  placeholder="Lý do từ chối" className="rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                <button type="button" disabled={busy === payment.id || !rejection[payment.id]?.trim()} onClick={() => void perform(payment.id,
                  () => paymentRequestService.rejectReceipt(payment.id, { reason: rejection[payment.id] }), "Đã từ chối chứng từ.")}
                  className="rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">Từ chối</button>
              </div>}
            </div>}
          </>}
        </article>;
      })}
  </section>;
}
