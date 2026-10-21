"use client";
import VndMoneyInput from "@/components/ui/vnd-money-input";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Plus, ReceiptText, RefreshCw, Trash2 } from "lucide-react";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import paymentRequestService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentRequest } from "@/types/payment-request.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { invoiceStatusPresentation, invoicePeriodLabel, invoicePeriodSecondaryLabel } from "@/lib/invoice-status";
import OverdueActionsPanel from "./OverdueActionsPanel";
import PaymentExtensionPanel from "./PaymentExtensionPanel";
import { MeterReadingInput, MeterReadingSummary } from "./MeterReading";
import InvoiceLineCalculation from "./InvoiceLineCalculation";
import { chooseInvoice, paymentModulePath } from "@/lib/payment-module";
import { findInvoicePayment } from "@/lib/invoice-list";

type Extra = { description: string; amount: string };
type Props = {
  contractId: string;
  rentalRequestId: string;
  contractActive: boolean;
  isLandlord: boolean;
  isTenant: boolean;
  electricityRequired: boolean;
  waterRequired: boolean;
  unsupportedWaterRate: boolean;
  initialElectricity?: string | number;
  initialWater?: string | number;
  showInitialPayment?: boolean;
  requestedInvoiceId?: string | null;
  onUpdated?: () => Promise<void>;
};

const money = (n: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(n);
const date = (s?: string) => s ? new Date(s).toLocaleDateString("vi-VN") : "—";
const dateTime = (s?: string) => s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

export default function MonthlyInvoicesSection({ contractId, contractActive, isLandlord, isTenant,
  electricityRequired, waterRequired, unsupportedWaterRate, initialElectricity, initialWater,
  requestedInvoiceId, onUpdated }: Props) {
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [electricity, setElectricity] = useState<Record<string, string>>({});
  const [water, setWater] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, Extra[]>>({});
  const [proofs, setProofs] = useState<Record<string, File | null>>({});
  const [rejection, setRejection] = useState<Record<string, string>>({});
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const requestGeneration = useRef(0);
  const actionMutex = useRef(false);

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      // Billing sync may increase a late fee and regenerate VietQR; fetch payments afterwards.
      const bills = await monthlyInvoiceService.list(contractId);
      const paymentList = await paymentRequestService.getContractPayments(contractId);
      if (generation !== requestGeneration.current) return;
      setLoadError("");
      setInvoices(bills);
      setPayments(paymentList);
      setElectricity(Object.fromEntries(bills.filter((bill) => bill.status === "DRAFT" && bill.electricityEnd != null)
        .map((bill) => [bill.id, String(bill.electricityEnd)])));
      setWater(Object.fromEntries(bills.filter((bill) => bill.status === "DRAFT" && bill.waterEnd != null)
        .map((bill) => [bill.id, String(bill.waterEnd)])));
      setExtras(Object.fromEntries(bills.filter((bill) => bill.status === "DRAFT")
        .map((bill) => [bill.id, (bill.draftExtraCharges || [])
          .map((row) => ({ description: row.description, amount: String(row.amount) }))])));
    } catch (err) {
      if (generation === requestGeneration.current) setLoadError(getApiErrorMessage(err, "Không thể tải hóa đơn và trạng thái thanh toán."));
    } finally { if (generation === requestGeneration.current) setLoading(false); }
  }, [contractId]);

  useEffect(() => { const pending = requestGeneration; void refresh(); return () => { pending.current++; }; }, [refresh]);
  useEffect(() => {
    if (window.location.hash === "#monthly-invoices") {
      document.getElementById("monthly-invoices")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  async function perform(id: string, action: () => Promise<unknown>, success: string) {
    if (actionMutex.current) return;
    actionMutex.current = true;
    setBusy(id);
    try { await action(); toast.success(success); await refresh(); if (onUpdated) await onUpdated(); }
    catch (err) { toast.error(getApiErrorMessage(err, "Thao tác chưa thành công.")); await refresh(); }
    finally { actionMutex.current = false; setBusy(null); }
  }

  function previousEnd(invoice: MonthlyInvoice, kind: "electricity" | "water") {
    if (invoice.periodIndex === 0) return kind === "electricity" ? initialElectricity : initialWater;
    const previous = invoices.find((i) => i.periodIndex === invoice.periodIndex - 1);
    return kind === "electricity" ? previous?.electricityEnd : previous?.waterEnd;
  }

  function payload(invoice: MonthlyInvoice) {
    const electricText = electricity[invoice.id]?.trim();
    const waterText = water[invoice.id]?.trim();
    if (electricityRequired && (!electricText || Number(electricText) < Number(previousEnd(invoice, "electricity")))) {
      toast.error("Vui lòng nhập chỉ số điện cuối kỳ không thấp hơn đầu kỳ."); return null;
    }
    if (waterRequired && (!waterText || Number(waterText) < Number(previousEnd(invoice, "water")))) {
      toast.error("Vui lòng nhập chỉ số nước cuối kỳ không thấp hơn đầu kỳ."); return null;
    }
    if (unsupportedWaterRate) {
      toast.error("Biểu phí nước theo giá nhà nước chưa có đơn giá số đã chốt; vui lòng liên hệ quản trị viên."); return null;
    }
    const extraCharges = (extras[invoice.id] || []).map((x) => ({
      description: x.description.trim(), amount: Number(x.amount),
    }));
    if (extraCharges.some((x) => !x.description || !Number.isFinite(x.amount) || x.amount <= 0)) {
      toast.error("Mỗi khoản phát sinh cần tên và số tiền dương."); return null;
    }
    return {
      electricityEnd: electricityRequired ? Number(electricText) : undefined,
      waterEnd: waterRequired ? Number(waterText) : undefined,
      extraCharges,
    };
  }

  async function prepare(invoice: MonthlyInvoice) {
    const data = payload(invoice);
    if (!data) return;
    await perform(invoice.id, () => monthlyInvoiceService.prepare(invoice.id, data),
      "Đã lưu bản nháp. Người thuê chưa thấy hóa đơn; hãy chốt và phát hành khi chỉ số đã chính xác.");
  }

  async function issue(invoice: MonthlyInvoice) {
    const data = payload(invoice);
    if (!data) return;
    if (!window.confirm("Chốt chỉ số và phát hành hóa đơn ngay cho người thuê? Hãy kiểm tra kỹ các khoản phí; hóa đơn đã phát hành hiện chưa thể sửa.")) return;
    await perform(invoice.id, () => monthlyInvoiceService.issue(invoice.id, data), "Đã phát hành hóa đơn.");
  }

  async function report(payment: PaymentRequest) {
    const file = proofs[payment.id];
    if (!file) { toast.error("Vui lòng chọn chứng từ chuyển khoản."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Chứng từ tối đa 15 MB."); return; }
    try {
      const current = await paymentRequestService.getPaymentRequest(payment.id);
      if (current.totalAmount !== payment.totalAmount) {
        toast.error("Số tiền hóa đơn đã thay đổi. Vui lòng kiểm tra lại QR và số tiền trước khi báo chuyển khoản.");
        await refresh();
        return;
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể kiểm tra số tiền mới nhất."));
      return;
    }
    await perform(payment.id, async () => {
      const storageId = await storageService.uploadPaymentProof(file, payment.id);
      await paymentRequestService.reportTransfer(payment.id, { proofStorageId: storageId, expectedAmount: payment.totalAmount });
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
  const selected = chooseInvoice(invoices, payments, isLandlord ? "landlord" : "tenant", selectedInvoiceId ?? requestedInvoiceId);

  return <section id="monthly-invoices" className="space-y-4 scroll-mt-24">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Hóa đơn theo kỳ</h2>
        <p className="text-sm text-muted-foreground mt-1">Chọn kỳ để xem chi tiết, chốt chỉ số hoặc xác nhận thanh toán.</p>
      </div>
      <button type="button" onClick={() => void refresh()} aria-label="Làm mới hóa đơn"
        className="rounded-lg border border-border p-2 hover:bg-muted"><RefreshCw className="h-4 w-4" /></button>
    </div>
    {outstanding > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Tổng chưa xác nhận thanh toán: <strong>{money(outstanding)}</strong>. Khoản đã chuyển nợ chỉ tính trong hóa đơn mới.
    </div>}
    {loadError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError} <button type="button" onClick={() => void refresh()} className="font-semibold underline">Thử lại</button></div>
      : loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải hóa đơn…</div>
      : invoices.length === 0 ? <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        {isTenant ? "Chưa có hóa đơn được phát hành. Sau khi chủ nhà chốt chỉ số và phát hành, bạn sẽ thấy số tiền và QR thanh toán tại đây."
          : "Chưa đến ngày cuối của kỳ thuê đầu tiên. Hóa đơn nháp sẽ xuất hiện để chủ nhà chốt chỉ số."}
      </div> : <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <label className="text-sm font-semibold lg:hidden">Chọn kỳ hóa đơn<select value={selected || ""} disabled={busy !== null} onChange={event => {
          setSelectedInvoiceId(event.target.value);
          window.history.replaceState(null, "", paymentModulePath(contractId, "monthly", event.target.value));
        }} className="mt-2 block h-11 w-full rounded-xl border bg-card px-3">{[...invoices].sort((a, b) => b.periodIndex - a.periodIndex).map(bill => <option key={bill.id} value={bill.id}>{invoicePeriodLabel(bill)} · {money(bill.totalAmount)}</option>)}</select></label>
        <nav aria-label="Chọn kỳ hóa đơn" className="hidden space-y-2 rounded-2xl border bg-card p-3 lg:sticky lg:top-24 lg:block">
          {[...invoices].sort((a, b) => b.periodIndex - a.periodIndex).map(bill => {
            const status = invoiceStatusPresentation(bill, findInvoicePayment(bill, payments)?.status);
            return <button key={bill.id} type="button" disabled={busy !== null} aria-pressed={selected === bill.id} onClick={() => {
              setSelectedInvoiceId(bill.id);
              window.history.replaceState(null, "", paymentModulePath(contractId, "monthly", bill.id));
            }} className={`block w-full space-y-2 rounded-xl border p-3 text-left disabled:opacity-50 ${selected === bill.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"}`}>
              <span className="block text-sm font-semibold">{invoicePeriodLabel(bill)}</span><span className="block text-sm font-bold tabular-nums">{money(bill.totalAmount)}</span><span className={`inline-block rounded-full border px-2 py-1 text-xs ${status.className}`}>{status.label}</span>
            </button>;
          })}
        </nav>
        <div className="min-w-0">{invoices.filter(invoice => invoice.id === selected).map((invoice) => {
        const payment = payments.find((p) => p.invoiceId === invoice.id || p.id === invoice.paymentRequestId);
        const presentation = invoiceStatusPresentation(invoice, payment?.status);
        const rows = extras[invoice.id] || [];
        const firstRent=invoice.billingPeriod?.kind === "INITIAL_RENT";
        const canIssue = new Date(invoice.serverNow).getTime() >=
          new Date(`${invoice.periodEndExclusive}T00:00:00+07:00`).getTime() - 86_400_000;
        const workflowMessage: Record<MonthlyInvoice["workflowState"], string> = {
          CANCELLED: "Khoản tiền thuê này đã hủy / hết hạn. Kiểm tra nghĩa vụ hoàn tiền ở mục Cọc & hoàn cọc.",
          UPCOMING: "Kỳ thuê chưa đến ngày chốt chỉ số.",
          METER_REQUIRED: `Chủ nhà cần lưu chỉ số và phí phát sinh trước ${dateTime(invoice.meterDeadlineAt)}.`,
          READY_FOR_ISSUE: `Đã lưu bản nháp. Bạn có thể chốt và phát hành ngay; nếu không, hệ thống tự phát hành từ ${dateTime(invoice.meterDeadlineAt)}.`,
          METER_DEADLINE_MISSED: "Đã hết 24 giờ nhập chỉ số. Hệ thống sẽ tạm điền chỉ số cũ cho phần còn thiếu và phát hành; nếu thiếu chỉ số đầu hoặc biểu phí hợp lệ, cần bổ sung dữ liệu.",
          EXTENSION_PENDING: "Đang chờ chủ nhà duyệt gia hạn. Phí phạt tạm dừng; nếu từ chối hoặc hết hạn phản hồi, phí sẽ được tính bù.",
          PAYMENT_EXTENDED: "Đã gia hạn thanh toán. Giữ nguyên khoản phạt đã chốt, không tăng phí phạt thêm cho hóa đơn này.",
          UNPAID: "Hóa đơn đã phát hành, đang chờ người thuê thanh toán.",
          PAYMENT_REMINDER: "Sắp đến hạn thanh toán. Người thuê vui lòng kiểm tra số tiền và chuyển khoản.",
          OVERDUE: invoice.lateFeeExempt ? "Đã trễ hạn gia hạn. Khoản phạt đã chốt không tăng; nghĩa vụ thanh toán vẫn còn." : "Hóa đơn quá hạn. Khoản phạt (nếu có trong hợp đồng) sẽ được tính riêng và cập nhật trên QR.",
          OVERDUE_ACTION_REQUIRED: "Đã quá hạn 5 ngày: chủ nhà cần ghi nhận phương án xử lý bên dưới; hợp đồng, tiền cọc và tin đăng không tự thay đổi.",
          UNDER_REVIEW: payment?.status === "TRANSFER_REPORTED"
            ? "Đã báo chuyển và gửi chứng từ, đang chờ chủ nhà xác nhận nhận tiền. Phí phạt tạm dừng tăng trong lúc chờ xử lý."
            : "Khoản thanh toán đang chờ xác nhận hoặc đối soát; phí phạt tạm dừng tăng trong lúc chờ xử lý.",
          PAID: "Đã xác nhận thanh toán.",
          DEFERRED: `${invoice.overdueActions.some((action) => action.type === "AUTOMATIC_ROLLOVER") ? "Hệ thống đã tự chốt công nợ sau 10 ngày quá hạn" : "Chủ nhà đã cho phép cộng dồn khoản nợ này"} để cộng vào hóa đơn kỳ kế tiếp. Phí phạt đã dừng tăng; bạn vẫn có thể thanh toán hóa đơn này trước khi chuyển nợ.`,
          ROLLED_OVER: "Khoản nợ đã được cộng vào hóa đơn kỳ kế tiếp. QR của hóa đơn này đã hủy; vui lòng thanh toán theo hóa đơn mới.",
        };
        return <article key={invoice.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-semibold">{invoicePeriodLabel(invoice)}</h3>
              {invoicePeriodSecondaryLabel(invoice) && <p className="text-xs text-muted-foreground">{invoicePeriodSecondaryLabel(invoice)}</p>}
              <p className="text-xs text-muted-foreground">{firstRent ? "Tiền thuê tháng 1" : invoice.finalCostSupplement ? "Chi phí bổ sung" : `Chi phí tháng ${invoice.periodIndex + 1}`}: {date(invoice.periodStart)} – trước {date(invoice.periodEndExclusive)}</p>
              {invoice.billingPeriod?.kind === "RECURRING" && <p className="text-xs text-muted-foreground">Tiền phòng tháng {invoice.billingPeriod.paymentPeriodNumber}: {date(invoice.billingPeriod.rentPeriodStart || undefined)} – trước {date(invoice.billingPeriod.rentPeriodEndExclusive || undefined)}</p>}
              {invoice.billingPeriod?.kind === "FINAL_SETTLEMENT" && <p className="text-xs font-semibold text-primary">Chỉ thu chi phí kỳ cuối và công nợ (nếu có), không thu tiền phòng tháng kế tiếp. Thanh toán đủ trước khi hoàn cọc.</p>}
              <p className="text-xs text-muted-foreground">{invoice.status === "DRAFT" ? "Chỉ chủ nhà thấy bản nháp; người thuê sẽ thấy sau khi phát hành" : `Hạn thanh toán: ${dateTime(invoice.dueAt)}`}</p></div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${presentation.className}`}>
              {presentation.label}
            </span>
          </div>
          <p className={`rounded-lg px-3 py-2 text-xs ${["OVERDUE", "OVERDUE_ACTION_REQUIRED", "METER_DEADLINE_MISSED"].includes(invoice.workflowState) ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-800"}`}>
            {firstRent ? invoice.status === "PAID" ? "Đã xác nhận tiền thuê tháng 1. Không thu lại trong các kỳ sau; cọc theo dõi riêng." : invoice.status === "CANCELLED" ? workflowMessage.CANCELLED : "Tiền thuê tháng đầu được mở theo tiến trình nhận nhà. Quá hạn cần đối soát, không áp dụng cộng dồn nợ hay phạt của kỳ thuê đang có hiệu lực." : workflowMessage[invoice.workflowState]}
          </p>
          {!firstRent && ["UNPAID", "PAYMENT_REMINDER", "OVERDUE", "OVERDUE_ACTION_REQUIRED"].includes(invoice.workflowState) && <p className="text-xs text-muted-foreground">
            Phạt chậm thanh toán tối đa 10 ngày theo đơn giá và mức trần của hợp đồng. Hết 10 ngày quá hạn chưa có phương án xử lý, hệ thống tự chốt nợ để cộng dồn nếu còn kỳ sau chưa phát hành; kỳ cuối giữ hóa đơn riêng để quyết toán.
          </p>}
          {invoice.status === "DRAFT" && isLandlord && <div className="space-y-3 rounded-xl bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Chủ nhà có 24 giờ từ đầu ngày cuối kỳ để nhập chỉ số cuối kỳ. Có thể chốt và phát hành ngay; nếu chỉ lưu bản nháp, hệ thống tự phát hành từ {dateTime(invoice.meterDeadlineAt)} và tạm dùng chỉ số đầu kỳ cho phần chưa nhập. Đơn giá lấy từ hợp đồng đã ký.</p>
            {unsupportedWaterRate && <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">Biểu phí nước theo giá nhà nước chưa có đơn giá số cố định trong hợp đồng. Chưa thể phát hành tự động để tránh tính sai; vui lòng liên hệ quản trị viên.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {electricityRequired && <MeterReadingInput name="điện" unit="kWh"
                start={previousEnd(invoice, "electricity")} end={electricity[invoice.id] ?? ""}
                onChange={(value) => setElectricity((s) => ({ ...s, [invoice.id]: value }))} />}
              {waterRequired && <MeterReadingInput name="nước" unit="m³"
                start={previousEnd(invoice, "water")} end={water[invoice.id] ?? ""}
                onChange={(value) => setWater((s) => ({ ...s, [invoice.id]: value }))} />}
            </div>
            {rows.map((row, index) => <div key={index} className="flex flex-wrap gap-2">
              <input aria-label="Tên khoản phát sinh" placeholder="Tên khoản phát sinh" value={row.description}
                onChange={(e) => setExtras((s) => ({ ...s, [invoice.id]: rows.map((x, n) => n === index ? { ...x, description: e.target.value } : x) }))}
                className="min-w-40 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <VndMoneyInput ariaLabel="Số tiền phát sinh" min={1} max={Number.MAX_SAFE_INTEGER} placeholder="Số tiền (đ)" value={row.amount}
                onValueChange={amount => setExtras((s) => ({ ...s, [invoice.id]: rows.map((x, n) => n === index ? { ...x, amount } : x) }))}
                className="w-44 max-w-full" />
              <button type="button" aria-label="Xóa khoản phát sinh" onClick={() => setExtras((s) => ({ ...s, [invoice.id]: rows.filter((_, n) => n !== index) }))}
                className="rounded-lg border border-border px-3"><Trash2 className="h-4 w-4" /></button>
            </div>)}
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" onClick={() => setExtras((s) => ({ ...s, [invoice.id]: [...rows, { description: "", amount: "" }] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-4 w-4" />Thêm phí phát sinh</button>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy === invoice.id || unsupportedWaterRate || !canIssue} onClick={() => void issue(invoice)}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Chốt và phát hành ngay</button>
                <button type="button" disabled={busy === invoice.id || unsupportedWaterRate} onClick={() => void prepare(invoice)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">Lưu bản nháp</button>
              </div>
            </div>
          </div>}
          {invoice.status !== "DRAFT" && <>
            <div className="divide-y divide-border text-sm">{invoice.lines.map((line, index) => <div key={index} className="flex justify-between gap-3 py-2">
              <div className="min-w-0">{line.description} <InvoiceLineCalculation line={line} />
                {line.type === "ELECTRICITY" && <MeterReadingSummary start={invoice.electricityStart}
                  end={invoice.electricityEnd} quantity={line.quantity} unit="kWh" />}
                {line.type === "WATER" && <MeterReadingSummary start={invoice.waterStart}
                  end={invoice.waterEnd} quantity={line.quantity} unit="m³" />}
              </div>
              <strong className="shrink-0">{money(line.amount)}</strong></div>)}
              <div className="flex justify-between pt-3 font-bold"><span>{invoice.status === "ROLLED_OVER" ? "Đã chuyển sang kỳ sau" : "Tổng hóa đơn"}</span><span>{money(invoice.totalAmount)}</span></div>
            </div>
            {(invoice.electricityAutoFilled || invoice.waterAutoFilled) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Chỉ số {invoice.electricityAutoFilled && invoice.waterAutoFilled ? "điện và nước" : invoice.electricityAutoFilled ? "điện" : "nước"} được hệ thống tạm điền bằng chỉ số đầu kỳ do chưa cập nhật trong 24 giờ. Phần tiêu thụ tạm tính bằng 0, không phải số đo thực tế.
            </p>}
            {invoice.lateFeeAmount > 0 && invoice.status !== "ROLLED_OVER" && <p className="text-xs text-rose-700">Trong tổng trên có {money(invoice.lateFeeAmount)} phí chậm thanh toán. {invoice.lateFeeExempt ? "Phí đã chốt, không tăng thêm cho hóa đơn này." : "Nếu đã chuyển tiền, hãy gửi chứng từ để tạm dừng tăng phí."}</p>}
            {!firstRent && <PaymentExtensionPanel invoice={invoice} isLandlord={isLandlord} isTenant={isTenant} refresh={refresh} />}
            {!firstRent && <OverdueActionsPanel invoice={invoice} contractActive={contractActive} isLandlord={isLandlord} isTenant={isTenant} refresh={refresh} />}
            {firstRent && payment && payment.totalAmount !== invoice.totalAmount && <p className="rounded-lg bg-muted p-3 text-sm">Khoản chuyển gốc {money(payment.totalAmount)} bao gồm tiền thuê {money(invoice.totalAmount)} và cọc theo bảng kê. Chỉ chuyển một lần theo QR gốc; không cộng cọc vào tổng hóa đơn tiền thuê.</p>}
            {firstRent && payment && invoice.status === "PAID" && <div className="space-y-2 rounded-xl border p-3 text-sm"><p>Khoản chuyển gốc: <strong>{payment.transferReference}</strong> · Đã xác nhận: {dateTime(payment.confirmedAt)}</p>{payment.evidences?.map((e,index)=><button type="button" key={e.id} className="block text-primary underline" onClick={()=>void viewProof(e.storageObjectId)}>Xem chứng từ {index+1}</button>)}</div>}
            {payment && !["PAID","ROLLED_OVER","CANCELLED"].includes(invoice.status) && <div className="rounded-xl border border-border p-3 space-y-3 text-sm">
              <p className="font-semibold">Chuyển khoản trực tiếp cho chủ nhà</p>
              <p>Ngân hàng: {payment.payeeBankAccountSnapshot?.bankName || payment.payeeBankAccountSnapshot?.bankCode} • STK: <strong>{payment.payeeBankAccountSnapshot?.accountNumber}</strong></p>
              <p>Người nhận: {payment.payeeBankAccountSnapshot?.accountHolderName}</p>
              <p>Nội dung chuyển khoản: <strong className="font-mono">{payment.transferReference}</strong></p>
              <p>Số tiền: <strong>{money(payment.totalAmount)}</strong></p>
              {isTenant && payment.qrImageUrl && <Image unoptimized src={payment.qrImageUrl} width={180} height={180} alt="VietQR thanh toán hóa đơn" className="rounded-lg border border-border" />}
              {isTenant && ["AWAITING_TRANSFER", "OVERDUE", "REJECTED"].includes(payment.status) && (!firstRent || !payment.dueAt || new Date(invoice.serverNow)<new Date(payment.dueAt)) && <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*,.pdf" aria-label="Chứng từ chuyển khoản"
                  onChange={(e) => setProofs((s) => ({ ...s, [payment.id]: e.target.files?.[0] || null }))} className="text-xs" />
                <button type="button" disabled={busy === payment.id} onClick={() => void report(payment)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Tôi đã chuyển khoản</button>
              </div>}
              {payment.status === "TRANSFER_REPORTED" && <p className="text-blue-700">{isLandlord ? "Người thuê đã báo chuyển và gửi chứng từ — vui lòng kiểm tra và xác nhận đã nhận tiền." : "Đã báo chuyển, đã gửi chứng từ — chờ chủ nhà xác nhận."}</p>}
              {payment.status === "REJECTED" && <p className="text-rose-700">Chủ nhà từ chối chứng từ: {payment.rejectedReason || "Vui lòng kiểm tra và gửi lại."}</p>}
              {payment.evidences?.length > 0 && <div className="space-y-1">
                <p className="text-xs font-semibold">Chứng từ đã gửi:</p>
                {payment.evidences.map((evidence, index) => <button key={evidence.id} type="button"
                  onClick={() => void viewProof(evidence.storageObjectId)}
                  className="block text-xs font-semibold text-primary underline underline-offset-2">Xem chứng từ {index + 1}</button>)}
              </div>}
              {isLandlord && payment.status === "TRANSFER_REPORTED" && <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy === payment.id} onClick={() => {
                  if (window.confirm(`Bạn đã kiểm tra tài khoản và nhận đủ ${money(payment.totalAmount)} của khoản chuyển này?`)) void perform(payment.id,
                    () => paymentRequestService.confirmReceipt(payment.id), "Đã xác nhận thanh toán.");
                }}
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
      })}</div></div>}
  </section>;
}
