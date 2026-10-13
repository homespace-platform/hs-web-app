"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarPlus, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { contractLifecycleService as api } from "@/services/contract-lifecycle.service";
import type { ClosureDeduction, ContractLifecycle } from "@/types/contract-lifecycle.type";
import storageService from "@/services/storage.service";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { getApiErrorMessage } from "@/utils/apiError";
import SettlementPaymentPanel from "./SettlementPaymentPanel";
import { MeterReadingInput } from "./MeterReading";
import { invoicePeriodLabel } from "@/lib/invoice-status";
const dt = (value?: string) => value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const money = (value?: number) => (value ?? 0).toLocaleString("vi-VN") + " đ";
const renewalLabels = { REQUESTED: "Chờ chủ nhà duyệt", APPROVED: "Chờ ký văn bản gia hạn", APPLIED: "Đã ký đủ · Đã áp dụng", REJECTED: "Chủ nhà từ chối", EXPIRED: "Đã hết hạn duyệt/ký" };
const closureLabels = { WAITING_HANDOVER: "Chờ bàn giao và lập đề xuất", PROPOSED: "Chờ người thuê xác nhận", DISPUTED: "Chưa thống nhất · Cần đối soát", REFUND_PENDING: "Chờ hoàn cọc", BALANCE_PENDING: "Chờ thanh toán khoản còn thiếu", CLOSED: "Đã hoàn tất xử lý tiền cọc" };
const eventLabels: Record<string, string> = { PROPOSED: "Chủ nhà gửi đề xuất", LEGACY_PROPOSAL: "Đề xuất trước khi bổ sung lịch sử", DISPUTED: "Người thuê yêu cầu đối soát", ACCEPTED: "Người thuê đồng ý quyết toán", COSTS_ADDED: "Phát hành chi phí bổ sung · cần đối chiếu lại", RESPONSE_OVERDUE: "Quá hạn phản hồi · cần xử lý", PAYMENT_OVERDUE: "Quá hạn chuyển tiền", CLOSED: "Hoàn tất quyết toán" };
type DeductionDraft = ClosureDeduction & { key: string; files: File[] };
function EvidenceLinks({ ids }: { ids?: string[] }) {
  return <div className="flex flex-wrap gap-3">{ids?.map((id, i) => <button key={id} type="button" className="text-primary underline" onClick={async () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try { const url = await storageService.getViewUrl(id); if (tab) tab.location.href = url; }
    catch (error) { tab?.close(); toast.error(getApiErrorMessage(error, "Không mở được minh chứng.")); }
  }}>Xem minh chứng {i + 1} ↗</button>)}</div>;
}
export default function ContractLifecyclePanel({ contractId, isLandlord, onUpdated, mode = "all" }: {
  contractId: string; isLandlord: boolean; onUpdated?: () => Promise<void>; mode?: "all" | "renewal" | "settlement";
}) {
  const [data, setData] = useState<ContractLifecycle | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutex = useRef(false);
  const [months, setMonths] = useState(3);
  const [note, setNote] = useState("");
  const [electricity, setElectricity] = useState("");
  const [water, setWater] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const supplementRetry = useRef<{ body: string; requestId: string } | null>(null);
  const [deductions, setDeductions] = useState<DeductionDraft[]>([]);
  const [closureNote, setClosureNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeFiles, setDisputeFiles] = useState<File[]>([]);
  const uploadedEvidence = useRef(new Map<File, string>());
  const deduction = deductions.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const [handover, setHandover] = useState(false);
  // Consent belongs to the proposal the tenant actually read, not the next refreshed revision.
  const [consent, setConsent] = useState<string | null>(null);
  const proposalKey = `${contractId}:${data?.closure?.proposalVersion ?? 0}`;
  // Use the latest billed reading (including supplements), not the previous calendar month's bill.
  const lastBilled = data?.billing.bills.reduce<ContractLifecycle["billing"]["bills"][number] | undefined>(
    (latest, bill) => !latest || bill.periodIndex > latest.periodIndex ? bill : latest, undefined);
  const refresh = useCallback(async () => {
    try { setData(await api.get(contractId)); setError(""); if (onUpdated) await onUpdated(); }
    catch (error) { setError(getApiErrorMessage(error, "Chưa tải được vòng đời hợp đồng.")); }
  }, [contractId, onUpdated]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function perform(action: () => Promise<unknown>) {
    if (mutex.current) return;
    mutex.current = true; setBusy(true);
    try { await action(); await refresh(); setConsent(null); toast.success("Đã cập nhật hồ sơ hợp đồng."); }
    catch (error) { toast.error(getApiErrorMessage(error, "Thao tác chưa thành công.")); }
    finally { mutex.current = false; setBusy(false); }
  }
  function requestRenewal() {
    if (!Number.isInteger(months) || months < 1 || months > 36 || note.trim().length < 10) { toast.error("Chọn 1–36 tháng và nhập lý do ít nhất 10 ký tự."); return; }
    void perform(() => api.request(contractId, months, note.trim()));
  }
  function propose() {
    if (!handover || closureNote.trim().length < 10 || !Number.isFinite(deduction) || deduction > 1_000_000_000
      || deductions.some(row => row.description.trim().length < 3 || !Number.isFinite(row.amount) || row.amount <= 0)
      || new Set(deductions.map(row => row.description.trim().toLowerCase())).size !== deductions.length) {
      toast.error("Xác nhận bàn giao, nhập nội dung ít nhất 10 ký tự; mỗi khoản cần mô tả riêng và số tiền dương. Tổng tối đa 1 tỷ đồng."); return;
    }
    void perform(async () => {
      const rows = await Promise.all(deductions.map(async row => ({ description: row.description.trim(), amount: row.amount,
        evidenceIds: [...row.evidenceIds, ...await uploadEvidence(row.files)] })));
      await api.propose(contractId, { otherDeduction: deduction, deductions: rows, expectedProposalVersion: data?.closure?.proposalVersion ?? 0,
        note: closureNote.trim(), vacantPossessionConfirmed: true });
      setDeductions([]); setClosureNote(""); setHandover(false);
    });
  }
  async function uploadEvidence(files: File[]) {
    const ids: string[] = [];
    for (const file of files) {
      let id = uploadedEvidence.current.get(file);
      if (!id) { id = await storageService.uploadClosureEvidence(file, contractId); uploadedEvidence.current.set(file, id); }
      ids.push(id);
    }
    return ids;
  }
  function selectFiles(files: FileList | null, existing = 0): File[] | null {
    const picked = Array.from(files ?? []);
    if (picked.length + existing > 5 || picked.some(file => file.size <= 0 || file.size > 15 * 1024 * 1024
      || !/\.(jpe?g|png|webp|pdf)$/i.test(file.name))) {
      toast.error("Tối đa 5 ảnh JPG/PNG/WebP hoặc PDF, mỗi tệp không quá 15 MB."); return null;
    }
    return picked;
  }
  function dispute() {
    if (disputeReason.trim().length < 10) { toast.error("Nhập lý do cần đối soát ít nhất 10 ký tự."); return; }
    void perform(async () => {
      await api.dispute(contractId, data!.closure!.proposalVersion, disputeReason.trim(), await uploadEvidence(disputeFiles));
      setDisputeReason(""); setDisputeFiles([]);
    });
  }
  function issueSupplement() {
    const values = [electricity, water, extraAmount].filter(value => value.trim());
    if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)
      || ((extraDescription.trim() || extraAmount.trim()) && (!extraDescription.trim() || Number(extraAmount) <= 0))) {
      toast.error("Nhập chỉ số hợp lệ; khoản phát sinh cần mô tả và số tiền lớn hơn 0."); return;
    }
    for (const [value, start] of [[electricity, lastBilled?.electricityEnd], [water, lastBilled?.waterEnd]] as const) {
      if (value.trim() && (start == null || Number(value) < start)) {
        toast.error(start == null ? "Chưa có chỉ số đã tính để đối chiếu; hãy kiểm tra hóa đơn." : "Chỉ số mới không được thấp hơn chỉ số đã tính trên hóa đơn."); return;
      }
    }
    const payload = { electricityEnd: electricity.trim() ? Number(electricity) : undefined,
      waterEnd: water.trim() ? Number(water) : undefined,
      extraCharges: extraDescription.trim() ? [{ description: extraDescription.trim(), amount: Number(extraAmount) }] : [] };
    const body = JSON.stringify(payload);
    if (supplementRetry.current?.body !== body) supplementRetry.current = { body, requestId: crypto.randomUUID() };
    const requestId = supplementRetry.current.requestId;
    void perform(async () => { await api.finalCosts(contractId, { ...payload, requestId });
      supplementRetry.current = null; setElectricity(""); setWater(""); setExtraDescription(""); setExtraAmount(""); });
  }
  return <section className="space-y-4 rounded-2xl border border-primary/20 bg-card p-4 sm:p-5">
    <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><CalendarPlus className="h-5 w-5 text-primary" />{mode === "renewal" ? "Gia hạn hợp đồng" : mode === "settlement" ? "Hoàn cọc & bàn giao" : "Gia hạn & quyết toán hợp đồng"}</h2>
      <button type="button" aria-label="Làm mới vòng đời hợp đồng" onClick={() => void refresh()} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></div>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!data && !error && <p className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</p>}
    {data && <>
      {mode !== "settlement" && <>
      <div className="grid gap-3 rounded-xl bg-primary/5 p-3 text-xs sm:grid-cols-3">
        <p>Mốc hết thời hạn thuê<br /><strong>{data.endExclusive} · 00:00 (không bao gồm ngày này)</strong></p>
        <p>Mở yêu cầu trước 30 ngày<br /><strong>{dt(data.renewalOpensAt)}</strong></p>
        <p>Hạn ký đủ văn bản gia hạn<br /><strong>{dt(data.renewalSignBy)}</strong></p>
      </div>
      <p className="text-xs text-muted-foreground">Gia hạn thời gian thuê khác gia hạn thanh toán. Giữ nguyên giá/chính sách và cọc, tạo văn bản mới liên kết bản gốc; chỉ áp dụng sau đủ chữ ký SmartCA. Hạn ký trước ngày chốt công tơ kỳ cuối để không thiếu tiền thuê kỳ tiếp theo.</p>
      {!isLandlord && !data.canRequestRenewal && !data.closure && <div className="space-y-2 rounded-xl border p-3 text-xs text-muted-foreground">
        <button type="button" disabled className="rounded-lg border px-4 py-2 opacity-50">Gia hạn hợp đồng</button>
        <p>{new Date(data.serverNow) < new Date(data.renewalOpensAt)
          ? `Mở yêu cầu từ ${dt(data.renewalOpensAt)} (30 ngày trước khi hết hạn).`
          : new Date(data.serverNow) >= new Date(data.renewalSignBy)
            ? "Đã hết thời gian yêu cầu/ký gia hạn; tiếp tục thanh toán chi phí kỳ cuối và bàn giao."
            : "Chưa thể gửi yêu cầu mới. Kiểm tra hồ sơ gia hạn hoặc phương án chấm dứt đang xử lý bên dưới."}</p>
      </div>}
      {!isLandlord && data.canRequestRenewal && <div className="space-y-2 rounded-xl border p-3 text-sm">
        <p className="font-semibold">Gửi yêu cầu gia hạn thời gian thuê</p>
        <label className="block text-xs">Số tháng thêm<input aria-label="Số tháng gia hạn thuê" type="number" min={1} max={36} value={months} onChange={e => setMonths(Number(e.target.value))} className="ml-3 w-24 rounded-lg border px-3 py-2" /></label>
        <textarea aria-label="Lý do gia hạn thuê" maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="Nhu cầu tiếp tục thuê (ít nhất 10 ký tự)" className="w-full rounded-lg border p-3" />
        <button type="button" disabled={busy} onClick={requestRenewal} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Gửi yêu cầu gia hạn</button>
      </div>}
      {data.renewals.map(r => <article key={r.id} className="space-y-2 rounded-xl border p-3 text-sm">
        <p className="font-semibold">Thêm {r.months} tháng · {renewalLabels[r.status]}</p>
        <p className="text-xs">Từ {r.startsOn} đến trước {r.endExclusive}. Hạn duyệt: {dt(r.respondBy)} · Hạn ký: {dt(r.signBy)}</p>
        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{r.note}</p>
        {isLandlord && r.status === "REQUESTED" && <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => { if (window.confirm("Duyệt yêu cầu và tạo văn bản gia hạn giữ nguyên giá/chính sách? Hợp đồng chưa kéo dài cho đến khi ký đủ hai bên.")) void perform(() => api.decide(contractId, r.id, true)); }} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">Duyệt & tạo văn bản</button>
          <button type="button" disabled={busy} onClick={() => void perform(() => api.decide(contractId, r.id, false))} className="rounded-lg border px-3 py-2 text-xs">Từ chối</button>
        </div>}
        {r.agreementContractId && (isLandlord || r.agreementStatus === "TENANT_SIGNATURE_PENDING" || r.agreementStatus === "ACTIVE") && <Link href={contractDetailPath(isLandlord ? "landlord" : "tenant", r.agreementContractId)} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-semibold text-primary underline">Mở văn bản gia hạn · xem PDF & ký SmartCA ↗</Link>}
        {!isLandlord && r.status === "APPROVED" && r.agreementStatus !== "TENANT_SIGNATURE_PENDING" && <p className="text-xs text-muted-foreground">Chờ chủ nhà kết xuất PDF và ký trước; sau đó bạn sẽ ký trên văn bản đã có chữ ký chủ nhà.</p>}
      </article>)}
      </>}
      {mode === "settlement" && !data.closure && <div className="space-y-3 rounded-xl bg-muted/30 p-4 text-sm"><p>Cọc đang giữ: <strong>{money(data.heldDeposit)}</strong></p><p className="text-muted-foreground">Hồ sơ hoàn cọc mở khi kết thúc thời hạn thuê. Hai bên hoàn tất chi phí cuối, bàn giao và thống nhất khoản khấu trừ trước khi chuyển tiền hoàn.</p></div>}
      {mode !== "renewal" && data.closure && <div className="space-y-3 border-t pt-4">
        <details open={!data.billing.allPaid} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-xs">
          <summary className="cursor-pointer font-semibold">Bước 1 · Hoàn tất hóa đơn kỳ cuối{data.billing.allPaid ? " · Đã hoàn tất ✓ — xem chi tiết" : " · Cần xử lý"}</summary>
          <p>Điện, nước, dịch vụ và chi phí phát sinh được thanh toán trong mục Hóa đơn. Không gia hạn thuê thì bill cuối không thu tiền phòng kỳ tiếp theo; điện/nước không trừ vào cọc.</p>
          {data.billing.bills.map(bill => <div key={bill.id} className="flex flex-wrap justify-between gap-2 border-t pt-2">
            <span>{invoicePeriodLabel(bill)}</span>
            <strong>{money(bill.totalAmount)} · {bill.status === "PAID" ? "Đã xác nhận thanh toán" : bill.status === "ROLLED_OVER" ? "Đã chuyển nợ" : bill.paymentStatus === "TRANSFER_REPORTED" ? "Đã thanh toán · Chờ chủ nhà xác nhận" : bill.paymentStatus === "DISPUTED" ? "Đang đối soát" : bill.status === "DRAFT" ? "Chờ chốt chỉ số/phát hành" : "Cần thanh toán"}</strong>
          </div>)}
          <p className={data.billing.allPaid ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
            {data.billing.allPaid ? data.closure.status === "CLOSED" ? "Tất cả hóa đơn đã hoàn tất." : "Tất cả hóa đơn đã hoàn tất. Có thể tiếp tục quyết toán cọc." : "Chưa hoàn tất hóa đơn. Bước quyết toán/hoàn cọc đang khóa."}</p>
          <Link href={invoiceDetailPath(contractId)} className="inline-block rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">{isLandlord ? "Mở hóa đơn · Chốt chỉ số / xác nhận nhận tiền →" : "Mở hóa đơn · Thanh toán kỳ cuối →"}</Link>
          {data.billing.canIssueSupplement && <details className="space-y-2 border-t pt-3">
            <summary className="cursor-pointer font-semibold">Ngoại lệ · Bổ sung chi phí chưa thu (không bắt buộc)</summary>
            <p className="rounded-lg bg-amber-50 p-2 text-amber-800">Nếu đã thanh toán đủ chi phí kỳ cuối, bỏ qua mục này và lập đề xuất hoàn cọc. Hư hại tài sản đưa vào khấu trừ cọc bên dưới, không thu hai lần. Phát hành bổ sung sẽ yêu cầu thanh toán hóa đơn mới và lập lại đề xuất cọc nếu đã gửi.</p>
            <p>Chỉ nhập phần chưa thu. Chỉ số mới là số công tơ thực tế; hệ thống chỉ thu phần tăng so với số đã tính trên hóa đơn gần nhất. Không sửa bill cũ hoặc thu lại tiền phòng.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <MeterReadingInput name="điện" unit="kWh" variant="supplement" start={lastBilled?.electricityEnd} end={electricity} onChange={setElectricity} />
              <MeterReadingInput name="nước" unit="m³" variant="supplement" start={lastBilled?.waterEnd} end={water} onChange={setWater} />
              <label>Chi phí phát sinh chưa thu<input aria-label="Mô tả chi phí bổ sung" maxLength={150} value={extraDescription} onChange={e => setExtraDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
              <label>Số tiền phát sinh (đ)<input aria-label="Số tiền chi phí bổ sung" type="number" min={0} value={extraAmount} onChange={e => setExtraAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
            </div>
            <button type="button" disabled={busy} onClick={issueSupplement} className="rounded-lg border border-primary px-3 py-2 font-semibold text-primary disabled:opacity-50">Phát hành hóa đơn bổ sung kỳ cuối</button>
          </details>}
        </details>
        <h3 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" />Bàn giao & tiền cọc · {closureLabels[data.closure.status]}</h3>
        {data.closure.status !== "CLOSED" ? <p className="text-sm">Cọc đang giữ: <strong>{money(data.heldDeposit)}</strong>. Hoàn tất hóa đơn rồi thống nhất khấu trừ và số tiền hoàn.</p>
          : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><p className="font-semibold">Đã kết thúc hợp đồng · Hoàn tất xử lý tiền cọc</p><p className="mt-1 text-sm">{data.refundPayment ? `Đã hoàn ${money(data.refundPayment.totalAmount)} cho người thuê và xác nhận nhận tiền.` : data.balancePayment ? "Đã xác nhận thanh toán khoản còn thiếu." : "Hai bên đã thống nhất khấu trừ và hoàn tất nghĩa vụ."}</p></div>}
        {data.closure.respondBy && <p className={data.closure.responseOverdueAt ? "rounded-lg bg-amber-50 p-3 text-xs text-amber-800" : "text-xs text-muted-foreground"}>
          {data.closure.status === "DISPUTED" ? "Chủ nhà cần phản hồi đối soát" : "Người thuê cần phản hồi đề xuất"} trước {dt(data.closure.respondBy)}.
          {data.closure.responseOverdueAt && " Đã quá hạn phản hồi. Hai bên cần liên hệ xử lý; không tự đồng ý, không tự tạo QR hoặc đóng hồ sơ."}
        </p>}
        {data.closure.refundDueAt && data.closure.status !== "CLOSED" && new Date(data.serverNow) > new Date(data.closure.refundDueAt) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Đã quá hạn chuyển tiền quyết toán. Cần liên hệ bên thanh toán để đối soát; hồ sơ vẫn mở cho đến khi xác nhận đã nhận đủ tiền.</p>}
        {data.closure.status === "DISPUTED" && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
          <p className="font-semibold">Người thuê chưa đồng ý · chưa tạo QR hoàn cọc</p>
          <p className="whitespace-pre-wrap">{data.closure.history?.filter(event => event.type === "DISPUTED").at(-1)?.note}</p>
          <EvidenceLinks ids={data.closure.history?.filter(event => event.type === "DISPUTED").at(-1)?.evidenceIds} />
          <p>Chủ nhà đối chiếu minh chứng và gửi đề xuất phiên bản mới. Người thuê cần đọc và đồng ý lại.</p>
        </div>}
        {data.canProposeClosure && <div className="space-y-3 rounded-xl bg-muted/30 p-3 text-xs">
          <p className="font-semibold">Bước 2 · Lập đề xuất quyết toán cọc sau khi thanh toán đủ hóa đơn</p>
          {data.closure.proposalVersion > 0 && <button type="button" disabled={busy} onClick={() => {
            setDeductions((data.closure!.deductions ?? []).map(row => ({ ...row, key: crypto.randomUUID(), files: [] })));
            setClosureNote(data.closure!.note ?? ""); setHandover(false);
          }} className="text-primary underline">Lấy nội dung đề xuất hiện tại để chỉnh sửa</button>}
          <p>Điện/nước và chi phí kỳ cuối đã thanh toán riêng qua hóa đơn, không trừ cọc lần nữa. Chỉ nhập khấu trừ cọc khác theo thỏa thuận (ví dụ hư hại tài sản), có nội dung rõ ràng và người thuê đồng ý.</p>
          {deductions.length === 0 && <p className="text-emerald-700">Không có khoản khấu trừ: đề xuất hoàn nguyên cọc.</p>}
          {deductions.map((row, index) => <fieldset key={row.key} disabled={busy} className="space-y-2 rounded-xl border bg-card p-3">
            <legend className="px-1 font-semibold">Khoản khấu trừ {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <label>Nội dung / căn cứ<input aria-label={`Nội dung khấu trừ ${index + 1}`} maxLength={300} value={row.description} onChange={e => setDeductions(rows => rows.map(item => item.key === row.key ? { ...item, description: e.target.value } : item))} placeholder="Ví dụ: thay kính cửa bị vỡ" className="mt-1 w-full rounded-lg border p-2" /></label>
              <label>Số tiền (đ)<input aria-label={`Số tiền khấu trừ ${index + 1}`} type="number" min={1} max={1_000_000_000} step={1} value={row.amount || ""} onChange={e => setDeductions(rows => rows.map(item => item.key === row.key ? { ...item, amount: Number(e.target.value) } : item))} className="mt-1 w-full rounded-lg border p-2" /></label>
            </div>
            <EvidenceLinks ids={row.evidenceIds} />
            <label className="block">Minh chứng (không bắt buộc, tối đa 5 ảnh/PDF, 15 MB/tệp)<input aria-label={`Minh chứng khấu trừ ${index + 1}`} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-2 block w-full" onChange={e => { const files = selectFiles(e.target.files, row.evidenceIds.length); if (files) setDeductions(rows => rows.map(item => item.key === row.key ? { ...item, files } : item)); else e.target.value = ""; }} /></label>
            {row.files.length > 0 && <p>{row.files.map(file => file.name).join(", ")}</p>}
            <button type="button" onClick={() => setDeductions(rows => rows.filter(item => item.key !== row.key))} className="text-rose-700 underline">Xóa khoản này</button>
          </fieldset>)}
          <button type="button" disabled={busy || deductions.length >= 20} onClick={() => setDeductions(rows => [...rows, { key: crypto.randomUUID(), description: "", amount: 0, evidenceIds: [], files: [] }])} className="rounded-lg border px-3 py-2 disabled:opacity-50">+ Thêm khoản khấu trừ</button>
          <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-3">
            <p>Cọc đang giữ<br /><strong>{money(data.heldDeposit)}</strong></p><p>Tổng khấu trừ<br /><strong>{money(deduction)}</strong></p>
            <p>{deduction > data.heldDeposit ? "Người thuê trả thêm dự kiến" : "Hoàn cho người thuê dự kiến"}<br /><strong>{money(Math.abs(data.heldDeposit - deduction))}</strong></p>
          </div>
          <textarea aria-label="Nội dung quyết toán" maxLength={2000} value={closureNote} onChange={e => setClosureNote(e.target.value)} placeholder="Mô tả bàn giao và căn cứ khấu trừ; nếu không khấu trừ, ghi rõ hoàn nguyên cọc (ít nhất 10 ký tự)…" className="w-full rounded-lg border p-3" />
          <label className="flex gap-2"><input type="checkbox" checked={handover} onChange={e => setHandover(e.target.checked)} />Tôi đã nhận lại phòng trống, chìa khóa, tài sản thuê; đã đối chiếu đủ hóa đơn và không thu trùng các khoản đã thanh toán.</label>
          <button type="button" disabled={busy || !handover} onClick={propose} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">Gửi đề xuất quyết toán</button>
        </div>}
        {data.closure.proposalVersion > 0 && data.closure.status !== "WAITING_HANDOVER" && <details open={["PROPOSED", "DISPUTED"].includes(data.closure.status)} className="space-y-2 rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Đề xuất hoàn cọc · Phiên bản {data.closure.proposalVersion}</summary>
          {data.closure.deductions?.map((row, i) => <div key={i} className="space-y-1 border-t pt-2"><p>{row.description} · <strong>{money(row.amount)}</strong></p><EvidenceLinks ids={row.evidenceIds} /></div>)}
          <p>Điện cuối: {data.closure.electricityFinal ?? "Không thu theo công tơ"} · Nước cuối: {data.closure.waterFinal ?? "Không thu theo công tơ"}</p>
          {(data.closure.utilityAdjustment ?? 0) > 0
            ? <p className="text-amber-700">Đề xuất theo luồng cũ có {money(data.closure.utilityAdjustment)} điện/nước trừ vào cọc. Cần đối soát và lập lại đề xuất theo luồng thanh toán hóa đơn trước; không tự sửa khoản đã chốt.</p>
            : <p>Điện/nước đã chốt trên hóa đơn, không trừ vào cọc · Khấu trừ khác: {money(data.closure.otherDeduction)}</p>}
          <p className="font-semibold">Hoàn cho người thuê: {money(data.closure.refundAmount)} · Người thuê trả thêm: {money(data.closure.balanceAmount)}</p>
          <p className="whitespace-pre-wrap">{data.closure.note}</p>
          {data.closure.refundDueAt && data.closure.status !== "CLOSED" && <p>Hạn quyết toán/hoàn cọc: {dt(data.closure.refundDueAt)}</p>}
          {!isLandlord && data.closure.status === "PROPOSED" && <>
            <label className="flex gap-2"><input type="checkbox" checked={consent === proposalKey} onChange={e => setConsent(e.target.checked ? proposalKey : null)} />Tôi xác nhận đã bàn giao, đã đọc và đồng ý các khoản khấu trừ cùng số tiền hoàn/trả thêm. Đây chưa phải xác nhận đã nhận tiền hoàn.</label>
            <div className="flex gap-2"><button type="button" disabled={busy || consent !== proposalKey || !data.billing.allPaid || (data.closure.utilityAdjustment ?? 0) > 0} onClick={() => void perform(() => api.accept(contractId, data.closure!.proposalVersion))} className="rounded-lg bg-emerald-600 px-3 py-2 text-white disabled:opacity-50">Đồng ý quyết toán</button>
            </div>
            <details className="space-y-3 border-t pt-3">
              <summary className="cursor-pointer font-semibold text-rose-700">Chưa đồng ý · Gửi yêu cầu đối soát</summary>
              <textarea aria-label="Lý do khiếu nại quyết toán" maxLength={2000} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Nêu khoản chưa đồng ý và lý do (ít nhất 10 ký tự)" className="w-full rounded-lg border p-3" />
              <label className="block">Minh chứng (không bắt buộc, tối đa 5 ảnh/PDF, 15 MB/tệp)<input aria-label="Minh chứng khiếu nại" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-2 block w-full" onChange={e => { const files = selectFiles(e.target.files); if (files) setDisputeFiles(files); else e.target.value = ""; }} /></label>
              <button type="button" disabled={busy || disputeReason.trim().length < 10} onClick={dispute} className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700 disabled:opacity-50">Gửi yêu cầu đối soát</button>
              <p>Chưa tạo QR hoàn cọc. Chủ nhà cần phản hồi bằng đề xuất mới; không coi im lặng là đồng ý.</p>
            </details>
          </>}
        </details>}
        {!!data.closure.history?.length && <details className="space-y-3 rounded-xl border p-3 text-xs">
          <summary className="cursor-pointer font-semibold">Lịch sử quyết toán & khiếu nại ({data.closure.history.length})</summary>
          {[...data.closure.history].reverse().map((event, index) => <article key={index} className="space-y-2 border-t pt-3">
            <p className="font-semibold">{eventLabels[event.type] ?? event.type} · Phiên bản {event.proposalVersion}</p><p className="text-muted-foreground">{dt(event.at)}</p>
            <p className="whitespace-pre-wrap">{event.note}</p>
            {event.deductions?.map((row, i) => <div key={i}><p>{row.description} · {money(row.amount)}</p><EvidenceLinks ids={row.evidenceIds} /></div>)}
            <p>Hoàn: {money(event.refundAmount)} · Trả thêm: {money(event.balanceAmount)}</p><EvidenceLinks ids={event.evidenceIds} />
          </article>)}
        </details>}
        {data.refundPayment && <SettlementPaymentPanel payment={data.refundPayment} isLandlord={isLandlord} refresh={refresh} />}
        {data.balancePayment && <SettlementPaymentPanel payment={data.balancePayment} isLandlord={isLandlord} refresh={refresh} />}
      </div>}
    </>}
  </section>;
}
