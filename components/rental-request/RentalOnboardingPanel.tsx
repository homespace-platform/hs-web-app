"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import { useActionDialog } from "@/components/common/ActionDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { rentalOnboardingService as service, type RentalOnboarding } from "@/services/rental-onboarding.service";
import { readOnboarding } from "@/lib/rental-onboarding-read";
import { isClosedOnboardingStage, preTenancySteps } from "@/lib/rental-request-presentation";
import { toneClasses } from "@/lib/rental-labels";
import paymentService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import { getApiErrorMessage } from "@/utils/apiError";
import RentalPaymentModal from "./RentalPaymentModal";
import DepositAgreementPanel from "./DepositAgreementPanel";
import DepositLedgerSummary from "@/components/payment/DepositLedgerSummary";
import RentalWorkflowPanel from "./RentalWorkflowPanel";
import OnboardingStepper from "./OnboardingStepper";
import OnboardingPaymentCard, { type PaymentCardAction } from "./OnboardingPaymentCard";
import { EarlierStartForm, StartChangeReview, confirmStartChange, type StartChangeAction } from "./EarlierStart";
import { useRentalRequestSync } from "./useRentalRequestSync";
import type { PaymentRequest } from "@/types/payment-request.type";

const date = (s: string) => s.split("T")[0].split("-").reverse().join("/");
const instant = (s?: string) => s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const card = "space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
const buttonPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const buttonDanger = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-card px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
const HISTORY_ACTIONS: Record<string, string> = {
  CANCELLATION_REQUESTED: "Đề nghị hủy và hoàn tiền", CANCELLATION_APPROVED: "Đồng ý hủy và hoàn tiền", CANCELLATION_REJECTED: "Không đồng ý hủy",
  PAYMENT_RECEIPT_VERIFIED: "Đã đối soát nhận đủ tiền", PAYMENT_REOPENED: "Mở lại thanh toán", SIGNING_REOPENED: "Mở lại thời hạn ký",
  DEPOSIT_AGREEMENT_CREATED: "Đã lập hợp đồng cọc", DEPOSIT_LANDLORD_SIGNED: "Chủ nhà đã ký cọc", DEPOSIT_BOTH_SIGNED: "Đã ký đủ hợp đồng cọc",
  DEPOSIT_SIGNING_REOPENED: "Mở lại hạn ký cọc",
  DEFAULT_NOTICE: "Chủ nhà gửi thông báo quá hạn", DEFAULT_DISPUTED: "Người thuê phản hồi thông báo quá hạn", DEFAULT_COMPLETED: "Chủ nhà giữ cọc và hủy hồ sơ",
  OWNER_CANCELLED_UNPAID: "Chủ nhà hủy hồ sơ chưa thanh toán", TENANT_CANCELLED_UNPAID: "Người thuê hủy hồ sơ chưa thanh toán",
  NO_DEPOSIT_HOLD_CANCELLED: "Hệ thống hủy giữ phòng do quá hạn", NO_DEPOSIT_FIRST_RENT_NOTICE: "Thông báo quá hạn tiền thuê tháng đầu",
};

/** Parts of the panel, so a page can place each in its own tab. Omit `sections` to render everything (legacy layout). */
export type PanelSection = "summary" | "sign" | "payments" | "end" | "history";

/** The three cancel rules in plain words; the one that applies to this request right now is highlighted. */
function CancelRules({ forfeit }: { forfeit: boolean }) {
  const rows = [
    { key: "lease", title: "Hợp đồng thuê đã ký đủ hai bên", body: "Không hủy được ở đây. Dùng chấm dứt hợp đồng.", active: false },
    { key: "deposit", title: "Hợp đồng cọc đã ký đủ, hợp đồng thuê chưa ký đủ", body: "Hủy được. Tiền cọc không được hoàn; tiền thuê tháng đầu (nếu đã nhận) được hoàn.", active: forfeit },
    { key: "other", title: "Các trường hợp còn lại", body: "Hủy được và hoàn toàn bộ khoản đã nhận.", active: !forfeit },
  ];
  return <section aria-label="Quy tắc hủy" className={card}>
    <h4 className="font-bold">Khi nào hủy được, và tiền xử lý thế nào</h4>
    <ul className="space-y-2">{rows.map(r => <li key={r.key} className={`rounded-xl border p-3 text-sm ${r.active ? toneClasses.info : "border-border bg-muted/30 text-muted-foreground"}`}>
      <p className="font-semibold text-foreground">{r.title}{r.active ? " · đang áp dụng cho hồ sơ này" : ""}</p><p>{r.body}</p>
    </li>)}</ul>
  </section>;
}

interface PanelProps {
  rentalRequestId: string; isLandlord?: boolean; onUpdated?: (view: RentalOnboarding) => void | Promise<void>;
  onSnapshot?: (view: RentalOnboarding) => void;
  showDepositAgreement?: boolean;
  sections?: PanelSection[];
}

/** Keyed by request so a new request never shows (or keeps loading) the previous one's snapshot, form or in-flight call. */
export default function RentalOnboardingPanel(props: PanelProps) {
  return <RentalOnboardingPanelBody key={props.rentalRequestId} {...props} />;
}

function RentalOnboardingPanelBody({ rentalRequestId, isLandlord, onUpdated, onSnapshot, showDepositAgreement=true, sections }: PanelProps) {
  const [view, setView] = useState<RentalOnboarding | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { confirm, askReason, dialog } = useActionDialog();
  const isOwner = view ? view.askerRole === "LANDLORD" : isLandlord;
  const has = (part: PanelSection) => !sections || sections.includes(part);
  const noticeOpen = !!view && !isClosedOnboardingStage(view.stage);
  // Fully signed deposit agreement: cancelling forfeits the deposit (server enforces; this is display only).
  const depositForfeit = !!view && ["ACTIVE", "EXPIRED", "CLOSED", "TERMINATED"].includes(view.depositAgreementStatus ?? "");
  useEffect(() => { if (view) onSnapshot?.(view); }, [view, onSnapshot]);
  // One in-flight call is shared between the poll, notifications, manual refresh and post-action reloads.
  // The first load and "Làm mới" use `refresh` (syncs stages and expiries on the server); polling and reloads only read.
  const activeId = useRef<string | null>(null);
  const inflight = useRef<Promise<RentalOnboarding | undefined> | null>(null);
  useEffect(() => {
    activeId.current = rentalRequestId;
    return () => { activeId.current = null; };
  }, [rentalRequestId]);
  const load = useCallback((sync = false) => {
    if (inflight.current) return inflight.current;
    const id = rentalRequestId;
    const call = (sync ? service.refresh(id) : readOnboarding(id)).then((data) => {
      if (activeId.current === id) { setView(data); setError(""); }
      return data;
    }).catch((e) => {
      if (activeId.current === id) setError(getApiErrorMessage(e, "Chưa tải được tiến trình nhận nhà."));
      return undefined;
    }).finally(() => { inflight.current = null; });
    inflight.current = call;
    return call;
  }, [rentalRequestId]);
  useEffect(() => { void load(true); }, [load]);
  // Silent: only `view` changes, so an open earlier-start form and its typed values are untouched.
  const poll = useCallback(() => load(), [load]);
  useRentalRequestSync(poll, { requestId: rentalRequestId, pollMs: 15000 });

  async function action(task: () => Promise<unknown>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    let done = false; // after the action itself succeeded, a failing reload must not read as a failed action
    try { await task(); done = true; await inflight.current; const data = await load(); if (!data) throw new Error("reload failed"); await onUpdated?.(data); setShowForm(false); toast.success("Đã cập nhật hồ sơ."); }
    catch (e) {
      if (done) { setShowForm(false); toast.info("Đã cập nhật, chưa tải lại được dữ liệu."); }
      else toast.error(getApiErrorMessage(e, "Không thể thực hiện thao tác."));
    }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function proof(storageObjectId: string) {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    try { const url = await storageService.getPaymentProofViewUrl(storageObjectId); if (tab) tab.location.href = url; }
    catch { tab?.close(); toast.error("Không mở được chứng từ."); }
  }

  async function onPaymentAction(kind: PaymentCardAction, p: PaymentRequest, evidenceStorageId?: string) {
    if (kind === "pay") return setPaymentId(p.id);
    if (kind === "proof") return void (evidenceStorageId && proof(evidenceStorageId));
    if (kind === "confirm") {
      if (await confirm({ title: "Xác nhận đã nhận đủ tiền?", description: `Bạn xác nhận đã nhận đủ ${money(p.totalAmount)} vào tài khoản. Báo chuyển chưa có nghĩa đã nhận tiền.`, confirmLabel: "Đã nhận đủ tiền" }))
        void action(() => paymentService.confirmReceipt(p.id));
    } else if (kind === "reject") {
      const note = await askReason({ title: "Chưa nhận đủ tiền / từ chối chứng từ", label: "Lý do", minLength: 1, tone: "warning", confirmLabel: "Gửi lý do", description: "Bên chuyển tiền sẽ nhận được lý do này." });
      if (note) void action(() => paymentService.rejectReceipt(p.id, { reason: note }));
    } else if (kind === "reviewOk") {
      const note = await askReason({ title: "Xác nhận đã nhận đủ tiền", label: "Ghi chú đối soát", minLength: 10, confirmLabel: "Xác nhận đã nhận đủ", description: "Ghi rõ bạn đã đối chiếu tài khoản và thực nhận đủ tiền." });
      if (note) void action(() => service.review(rentalRequestId, p.id, true, note));
    } else if (kind === "reviewReopen") {
      const note = await askReason({ title: "Chưa nhận tiền, mở lại thanh toán", label: "Ghi chú", minLength: 10, tone: "warning", confirmLabel: "Mở lại thanh toán", description: "Ghi rõ chưa nhận được tiền; người thuê được mở lại hạn thanh toán." });
      if (note) void action(() => service.review(rentalRequestId, p.id, false, note));
    }
  }
  async function onStartChange(id: string, kind: StartChangeAction) {
    const change = view?.startChanges.find(c => c.id === id);
    if (!change) return;
    if (kind === "withdraw") { if (await confirmStartChange(confirm, change, kind)) void action(() => service.withdraw(rentalRequestId, id)); return; }
    if (await confirmStartChange(confirm, change, kind)) void action(() => service.decide(rentalRequestId, id, kind === "approve"));
  }
  async function requestCancel() {
    const note = await askReason({
      title: depositForfeit ? "Hủy và mất tiền cọc?" : "Đề nghị hủy và hoàn tiền",
      tone: depositForfeit ? "danger" : "warning",
      minLength: 10, label: "Lý do hủy", confirmLabel: depositForfeit ? "Đề nghị hủy (mất cọc)" : "Gửi đề nghị hủy",
      description: depositForfeit
        ? "Hợp đồng cọc đã đủ chữ ký: tiền cọc không được hoàn, chỉ hoàn tiền thuê tháng đầu nếu chủ nhà đã nhận. Nếu có lỗi hoặc tranh chấp, bạn vẫn có thể gửi khiếu nại."
        : "Chủ nhà sẽ quyết định. Nếu đồng ý, toàn bộ khoản đã xác nhận được hoàn lại cho bạn.",
    });
    if (note) void action(() => service.cancel(rentalRequestId, note));
  }
  async function approveCancel() {
    const ok = await confirm({
      title: depositForfeit ? "Đồng ý hủy và giữ tiền cọc?" : "Đồng ý hủy và hoàn tiền?", tone: depositForfeit ? "danger" : "warning", confirmLabel: depositForfeit ? "Đồng ý hủy (giữ cọc)" : "Đồng ý hủy, hoàn tiền",
      description: depositForfeit
        ? "Hợp đồng cọc đã đủ chữ ký: tiền cọc không được hoàn, bạn giữ khoản cọc. Chỉ hoàn tiền thuê tháng đầu nếu đã nhận (bạn chuyển khoản hoàn, người thuê xác nhận)."
        : "Bạn có nghĩa vụ hoàn toàn bộ khoản đã xác nhận: chuyển khoản hoàn và chờ người thuê xác nhận đã nhận.",
    });
    if (ok) void action(() => service.decideCancel(rentalRequestId, true));
  }
  async function disputeDefault() {
    const note = await askReason({ title: "Phản hồi / yêu cầu đối soát", minLength: 10, label: "Nội dung phản hồi", confirmLabel: "Gửi phản hồi" });
    if (note) void action(() => service.disputeDefault(rentalRequestId, note));
  }
  async function completeDefault() {
    const note = await askReason({ title: "Chốt giữ cọc và hủy hồ sơ", minLength: 10, maxLength: 500, tone: "danger", label: "Lý do chốt giữ cọc (10–500 ký tự)", confirmLabel: "Tiếp tục" });
    if (!note) return;
    const ok = await confirm({
      title: "Hủy hồ sơ và giữ 100% cọc?", tone: "danger", confirmLabel: "Tôi xác nhận, hủy hồ sơ",
      description: "Tôi xác nhận đã thông báo cho người thuê, đã đủ hạn phản hồi, chưa bàn giao nhà/chìa khóa và không có tranh chấp hay khoản chuyển đang chờ xác minh. Hủy hồ sơ, giữ 100% cọc thực nhận; hoàn riêng tiền thuê đã nhận.",
    });
    if (ok) void action(() => service.completeDefault(rentalRequestId, note));
  }
  async function notifyDefault() {
    const note = await askReason({ title: "Thông báo quá hạn trước khi xử lý cọc", minLength: 10, label: "Nội dung thông báo cuối cùng", placeholder: "Nêu nghĩa vụ quá hạn và cách liên hệ (ít nhất 10 ký tự)", confirmLabel: "Tiếp tục" });
    if (!note) return;
    const ok = await confirm({ title: "Gửi thông báo cuối cùng?", tone: "warning", confirmLabel: "Gửi thông báo", description: "Mở thêm ít nhất 24 giờ để người thuê thanh toán, ký hoặc phản hồi. Chưa tự giữ cọc ở bước này." });
    if (ok) void action(() => service.notifyDefault(rentalRequestId, note));
  }
  async function reopenSigning() {
    const note = await askReason({ title: "Mở lại thời hạn ký", minLength: 10, label: "Lý do mở lại (đã kiểm tra đủ tiền)", confirmLabel: "Mở lại thời hạn ký" });
    if (note) void action(() => service.reopenSigning(rentalRequestId, note));
  }

  // sections={[]}: a page that only wants the data (onSnapshot / onUpdated) and renders nothing itself.
  if (sections && sections.length === 0) return null;

  const steps = view && has("payments") ? preTenancySteps({ ...view, hasRentPayment: view.payments.some(p => p.type === "INITIAL") }) : null;
  // Backend refuses to approve a cancellation while a deposit / first-rent transfer is still unreconciled.
  const unreconciled = !!view?.payments.some(p => (p.type === "RESERVATION_DEPOSIT" || p.type === "INITIAL") && p.status === "TRANSFER_REPORTED");
  const visiblePayments = view?.payments.filter(p => !(p.type === "RESERVATION_DEPOSIT" && p.totalAmount === 0 && p.status === "CONFIRMED")) ?? [];

  return <section className={sections ? "space-y-4" : `space-y-4 ${card}`}>
    {!sections && <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Đặt cọc & nhận nhà</h3><button type="button" className={button} disabled={busy} onClick={() => void load(true)}><RefreshCw className="h-4 w-4" aria-hidden="true" />Làm mới</button></div>}
    {error && <p role="alert" className={`rounded-2xl border p-3 text-sm ${toneClasses.warning}`}>{error} Dữ liệu đang hiển thị có thể chưa cập nhật.</p>}
    {!view ? (error ? null : <div role="status" aria-label="Đang tải tiến trình" className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-muted/60" /><div className="h-32 animate-pulse rounded-2xl bg-muted/60" /></div>) : <>
      {has("summary") && <div className={card}>
        <p className="text-sm">Bắt đầu thuê: <strong>{date(view.startsOn)}</strong> · Kết thúc: <strong>{date(view.endExclusive)}</strong> <span className="text-muted-foreground">(không bao gồm ngày này)</span></p>
        {!(view.defaultCase?.completedAt && view.defaultCase.notifiedAt) && <p className="text-sm">{view.message}</p>}
        <p className="text-xs text-muted-foreground">Cập nhật {instant(view.serverNow)} · Giờ Việt Nam</p>
      </div>}

      {has("sign") && (view.depositAgreementRequired === false
        ? <PolicyNotice tone="neutral" title="Không yêu cầu đặt cọc" summary="Không yêu cầu đặt cọc · Bỏ qua hợp đồng cọc."><p>Không yêu cầu đặt cọc · Bỏ qua hợp đồng cọc. Thanh toán tiền thuê và ký hợp đồng thuê theo tiến trình ở mục Thanh toán.</p></PolicyNotice>
        : showDepositAgreement && view.deposit && <>
          <DepositAgreementPanel rentalRequestId={rentalRequestId} isLandlord={!!isOwner} onUpdated={async () => { await load(); }} />
          {view.leaseTermSource && view.originalEndExclusive && view.originalEndExclusive !== view.endExclusive && <div className={`space-y-1 rounded-2xl border p-4 text-sm ${toneClasses.info}`}>
            <p className="font-semibold">Thời hạn cũ trên HĐ cọc đã được thay thế</p>
            <PolicyNotice tone="info" title="Thời hạn mới thay thời hạn cũ" summary={<>Mốc kết thúc đổi từ <strong>{date(view.originalEndExclusive)}</strong> sang <strong>{date(view.endExclusive)}</strong>.</>}>
              <p>{view.leaseTermSource === "EARLY_EXIT" ? "Phụ lục chấm dứt sớm" : "Phụ lục / văn bản gia hạn"} đã ký đủ hai bên đổi mốc kết thúc từ <strong>{date(view.originalEndExclusive)}</strong> sang <strong>{date(view.endExclusive)}</strong> lúc 00:00 (không bao gồm ngày này). Thời hạn cũ không còn áp dụng.</p>
              <p>Không cần ký lại HĐ cọc. Bản cọc đã ký được lưu để đối chiếu; tiền cọc tiếp tục được quản lý và quyết toán theo thỏa thuận đã ký.</p>
            </PolicyNotice>
          </div>}
        </>)}
      {has("sign") && view.signingDueAt && view.stage !== "COMPLETED" && <PolicyNotice tone="neutral" title="Hạn hoàn tất ký" summary={`Hạn hoàn tất ký: ${instant(view.signingDueAt)}.`}><p>Hạn hoàn tất ký: {instant(view.signingDueAt)}. Quá hạn cần đối soát hồ sơ, phòng không tự được giải phóng.</p></PolicyNotice>}
      {has("sign") && isOwner && view.stage === "REQUIRES_REVIEW" && view.signingDueAt && <button type="button" className={button} disabled={busy} onClick={() => void reopenSigning()}>Đã đối soát · Mở lại thời hạn ký</button>}

      {has("payments") && <>
        {steps && <OnboardingStepper steps={steps} caption={view.stage === "AWAITING_DEPOSIT" && view.holdMinutes ? `Giữ phòng ${view.holdMinutes} phút kể từ khi chủ nhà chấp thuận; cần báo chuyển khoản trước hạn ghi trên khoản thanh toán.` : undefined} />}
        {view.stage === "WAITING_START" && <p className={`rounded-2xl border p-3 text-sm ${toneClasses.info}`}>Mở tiền tháng đầu và ký từ <strong>{instant(view.paymentOpensAt)}</strong>. {view.depositAgreementRequired === false ? "Không phát sinh khoản chuyển cọc hoặc bước ký hợp đồng cọc." : "Cọc đã nhận được giữ riêng, không thu lại."}</p>}
        {visiblePayments.length > 0 ? <div className="space-y-3">{visiblePayments.map(p => <OnboardingPaymentCard key={p.id} payment={p} view={view} isOwner={!!isOwner} busy={busy} onAction={(kind, pay, evidence) => void onPaymentAction(kind, pay, evidence)} />)}</div>
          : <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Chưa có khoản nào cần thanh toán lúc này.</p>}
        {view.deposit && <DepositLedgerSummary ledger={view.deposit} />}
        {!isOwner && view.canRequestEarlierStart && !showForm && <button type="button" className={button} onClick={() => setShowForm(true)}><CalendarClock className="h-4 w-4" aria-hidden="true" />Đề nghị nhận nhà và bắt đầu hợp đồng sớm</button>}
        {showForm && <EarlierStartForm view={view} busy={busy} onCancel={() => setShowForm(false)} onSubmit={(startsOn, reason) => void action(() => service.request(rentalRequestId, startsOn, reason))} />}
        {!!view.startChanges.length && <details className={card} open={view.startChanges.some(c => c.status === "REQUESTED")}>
          <summary className="cursor-pointer text-sm font-semibold">Đề nghị bắt đầu sớm ({view.startChanges.length})</summary>
          <div className="mt-3"><StartChangeReview view={view} mode={isOwner ? "RECEIVED" : "SENT"} busy={busy} onAction={(id, kind) => void onStartChange(id, kind)} /></div>
        </details>}
      </>}

      {has("end") && <>
        {noticeOpen ? <CancelRules forfeit={depositForfeit} /> : null}
        {depositForfeit && noticeOpen && view.canRequestCancellation && <PolicyNotice tone="warning" title="HĐ cọc đã đủ chữ ký" summary="Nếu hủy, tiền cọc không được hoàn."><p>HĐ cọc đã đủ chữ ký: tiền cọc không được hoàn, chỉ hoàn tiền thuê tháng đầu nếu đã nhận. Nếu có lỗi hoặc tranh chấp, bạn vẫn có thể gửi khiếu nại.</p></PolicyNotice>}
        {!isOwner && view.canRequestCancellation && !view.cancellationRequestedAt && view.stage !== "COMPLETED" && <button type="button" className={buttonDanger} disabled={busy} onClick={() => void requestCancel()}>{depositForfeit ? "Đề nghị hủy (mất cọc)" : "Đề nghị hủy và hoàn tiền"}</button>}
        {view.cancellationRequestedAt && view.stage === "CANCELLATION_REQUESTED" && <div className={card}>
          <p className="text-sm font-semibold">{isOwner ? "Người thuê đề nghị hủy hồ sơ" : "Bạn đã gửi đề nghị hủy · chờ chủ nhà quyết định"}</p>
          <p className="whitespace-pre-wrap break-words text-sm">{view.cancellationReason}</p>
          {isOwner && unreconciled && <p role="status" className={`rounded-xl border p-3 text-sm ${toneClasses.warning}`}>Người thuê đã báo chuyển khoản nhưng bạn chưa xác nhận hoặc từ chối chứng từ. Hãy xử lý chứng từ ở tab Thanh toán trước khi đồng ý hủy.</p>}
          {isOwner && <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className={buttonPrimary} disabled={busy || unreconciled} onClick={() => void approveCancel()}>{depositForfeit ? "Đồng ý hủy (giữ cọc)" : "Đồng ý hủy, hoàn tiền"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => void action(() => service.decideCancel(rentalRequestId, false))}>Không đồng ý hủy</button>
          </div>}
        </div>}
        {view.defaultCase?.notifiedAt && <div className={`space-y-2 rounded-2xl border p-4 text-sm ${toneClasses.warning}`}>
          <p className="font-semibold">{view.defaultCase.completedAt ? "Đã hủy giữ phòng · Chủ nhà giữ tiền cọc" : view.stage === "CANCELLATION_REFUND_PENDING" ? "Đang chờ hoàn tiền · Thông báo giữ cọc cũ hết hiệu lực" : !noticeOpen ? "Hồ sơ đã kết thúc / hoàn tất ký · Thông báo cũ không còn áp dụng" : view.defaultCase.disputedAt ? "Đang có phản hồi · Chặn giữ cọc, cần đối soát" : "Hạn cuối để hoàn tất thủ tục thuê"}</p>
          <p className="text-foreground">{view.defaultCase.completedAt ? view.message : view.defaultCase.reason}</p>
          <p>{view.defaultCase.completedAt ? "Hạn cuối đã kết thúc:" : "Hạn cuối:"} {instant(view.defaultCase.respondBy)} (giờ Việt Nam).</p>
          {view.defaultCase.completedAt && <p>Đã hủy lúc: {instant(view.defaultCase.completedAt)} (giờ Việt Nam).</p>}
          {!isOwner && noticeOpen && !view.defaultCase.completedAt && !view.defaultCase.disputedAt && <button type="button" disabled={busy} className={button} onClick={() => void disputeDefault()}>Phản hồi / Yêu cầu đối soát</button>}
          {view.defaultCase.automatic && !view.defaultCase.completedAt && !view.defaultCase.disputedAt && noticeOpen && <p className="text-xs font-semibold">Hệ thống tự xử lý khi hết hạn cuối nếu nghĩa vụ vẫn chưa hoàn tất và không cần đối soát.</p>}
          {isOwner && !view.defaultCase.automatic && view.defaultCase.canComplete && <button type="button" disabled={busy} className={buttonDanger} onClick={() => void completeDefault()}>Chốt giữ cọc & hủy hồ sơ chưa ký</button>}
        </div>}
        {isOwner && !view.defaultCase?.automatic && view.defaultCase?.eligibleKind && !view.defaultCase.completedAt && !view.defaultCase.canComplete && <button type="button" disabled={busy} className={button} onClick={() => void notifyDefault()}>Thông báo quá hạn trước khi xử lý cọc</button>}
        {isOwner && !view.defaultCase?.policyVersion && view.stage !== "COMPLETED" && <PolicyNotice tone="neutral" title="Giữ cọc khi quá hạn" summary="Hồ sơ chưa ghi nhận đồng ý điều kiện giữ cọc."><p>Hồ sơ chưa ghi nhận đồng ý điều kiện giữ cọc trước thanh toán; không cho phép chốt mất cọc tự động hay hồi tố.</p></PolicyNotice>}
      </>}

      {has("history") && (view.history?.length
        ? <ol className={`${card} space-y-0 divide-y divide-border`} aria-label="Lịch sử xử lý hồ sơ">{view.history.map(e => <li key={e.id} className="py-2 text-sm first:pt-0 last:pb-0">
            <p className="font-semibold">{HISTORY_ACTIONS[e.action] ?? "Cập nhật hồ sơ"}</p>
            <p className="text-xs text-muted-foreground">{instant(e.occurredAt)}</p>
            {e.note && <p className="mt-1 break-words">{e.note}</p>}
          </li>)}</ol>
        : <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Chưa có hoạt động nào được ghi nhận.</p>)}
    </>}
    {has("end") && <RentalWorkflowPanel rentalRequestId={rentalRequestId} kind="cancellation" onUpdated={() => load()} />}
    {paymentId && <RentalPaymentModal request={{ id: rentalRequestId }} paymentId={paymentId} isOpen onClose={() => { setPaymentId(null); void load(); }} onPaymentSuccess={() => { setPaymentId(null); void load(); }} />}
    {dialog}
  </section>;
}
