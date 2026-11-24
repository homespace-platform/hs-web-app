"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle, Bike, Calendar, Car, Clock, ExternalLink, FileText, Home, Mail, MapPin, MessageSquare, Phone, RefreshCw, ShieldCheck, User, Users, XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import NextActionCard, { type CardAction } from "@/components/rental/NextActionCard";
import DetailTabs, { panelId, tabId } from "@/components/rental/DetailTabs";
import rentalRequestService from "@/services/rental-request.service";
import paymentRequestService from "@/services/payment-request.service";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import { useAuth } from "@/features/auth/useAuth";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { DETAIL_TABS, describeNextAction, toneClasses, type DetailTab } from "@/lib/rental-labels";
import { useNowMs } from "@/hooks/useNowMs";
import { presentRentalRequest, transferWindowClosed } from "@/lib/rental-request-presentation";
import { canCancelRentalRequest } from "@/lib/rental-request-actions";
import { listingDetailPath } from "@/lib/listing-detail-access";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { PaymentRequest } from "@/types/payment-request.type";
import type { ContractResponse } from "@/types/contract.type";
import { formatVND } from "./rental-request.helper";
import { parseCostBreakdownSnapshot, parseExcludedChargesSnapshot, formatOccupantCount, formatMotorbikeCount, formatCarCount, calculateEstimatedEndDate } from "./rental-request-snapshot.helper";
import { EndOfPeriodCharges } from "./EndOfPeriodCharges";
import { useRentalRequestSync } from "./useRentalRequestSync";
import RentalOnboardingPanel, { type PanelSection } from "./RentalOnboardingPanel";
import RentalContractFallbackButton from "./RentalContractFallbackButton";
import ModalShell from "./ModalShell";

interface RentalRequestDetailModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "RECEIVED" | "SENT";
  /** Detail already loaded and ownership-verified (notification link); skips the duplicate GET. */
  initialDetail?: RentalRequestResponse | null;
  linkedContract?: ContractResponse | null;
  /** Hold duration from the rental policy; the text omits the number while it is unknown. */
  holdMinutes?: number | null;
  onAccept?: (req: RentalRequestResponse) => void;
  onReject?: (req: RentalRequestResponse) => void;
  onCancel?: (req: RentalRequestResponse) => void;
  onPay?: (req: RentalRequestResponse) => void;
  onOpenContract?: (contractId: string) => void;
  onCreateDraft?: (request: RentalRequestResponse) => void;
  creatingContract?: boolean;
  onPaymentStatusChange?: () => void;
  isProcessingAction?: boolean;
}

/** Statuses that have an onboarding (pay / sign / cancel) to show; before ACCEPTED and after REJECTED/EXPIRED there is none. */
const ONBOARDING_STATUSES = ["ACCEPTED", "COMPLETED", "CANCELLED_BY_SYSTEM", "CANCELLED_BY_RENTER", "CANCELLED_BY_OWNER"];
const PANEL_SECTIONS: Record<DetailTab, PanelSection[]> = { overview: [], content: [], sign: ["sign"], payment: ["payments"], end: ["end"], history: ["history"] };
const TAB_IDS: DetailTab[] = ["overview", "sign", "payment", "end", "history"];
const TABS = DETAIL_TABS.filter((t) => TAB_IDS.includes(t.id));

const card = "space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm";
const footerBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const footerPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50";
const validImage = (url?: string | null) => !!url && /^(https?:\/\/|\/)/.test(url.trim());

function Fact({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-border/60 bg-muted/30 p-3"><dt className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</dt><dd className="mt-0.5 break-words text-sm font-bold">{value}</dd></div>;
}

export default function RentalRequestDetailModal({
  requestId, isOpen, onClose, mode, initialDetail = null, linkedContract, holdMinutes = null,
  onAccept, onReject, onCancel, onPay, onOpenContract, onCreateDraft, creatingContract = false, onPaymentStatusChange, isProcessingAction = false,
}: RentalRequestDetailModalProps) {
  const { userId } = useAuth();
  const manageGate = useFeatureGate(PERMISSIONS.RENTAL_REQUEST_MANAGE);
  const contractGate = useFeatureGate(PERMISSIONS.CONTRACT_MANAGE);
  const role = mode === "RECEIVED" ? "LANDLORD" : "TENANT";
  const [detail, setDetail] = useState<RentalRequestResponse | null>(null);
  const activeRequestId = useRef<string | null>(null);
  // Shared by the initial GET and silent refreshes: a result applies only if its ticket is newer than the last applied one.
  const detailSeq = useRef(0);
  const detailApplied = useRef(0);
  // Never show a request on the wrong side or for another account, whatever the API returned.
  const isOwnSide = useCallback(
    (res: RentalRequestResponse) => !!userId && (mode === "RECEIVED" ? res.ownerId === userId : res.renterId === userId),
    [mode, userId],
  );
  const [onboarding, setOnboarding] = useState<RentalOnboarding | null>(null);
  const [detailedPayment, setDetailedPayment] = useState<PaymentRequest | null>(null);
  const nowMs = useNowMs();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("overview");
  const autoTabbed = useRef(false);

  const loadDetailedPayment = useCallback(async (reqId: string) => {
    try { setDetailedPayment(await paymentRequestService.getInitialPaymentByRentalRequestId(reqId)); }
    catch { setDetailedPayment(null); }
  }, []);

  // Fetch fresh request detail when the modal opens or requestId changes
  useEffect(() => {
    setOnboarding(null);
    setDetail(null);
    setDetailedPayment(null);
    setError(null);
    setTab("overview");
    autoTabbed.current = false;
    activeRequestId.current = isOpen && requestId ? requestId : null;
    // Each effect run invalidates every earlier ticket (older refreshes of a previous open of the same id).
    const ticket = ++detailSeq.current;
    detailApplied.current = ticket - 1;
    if (!isOpen || !requestId) return;

    if (initialDetail && initialDetail.id === requestId && isOwnSide(initialDetail)) {
      setDetail(initialDetail);
      setLoading(false);
      if (ONBOARDING_STATUSES.includes(initialDetail.status)) void loadDetailedPayment(initialDetail.id);
      return;
    }

    let isMounted = true;
    setLoading(true);
    rentalRequestService
      .getRequestById(requestId)
      .then((res) => {
        // A fresher silent refresh already applied: drop this older GET (its spinner is cleared in finally).
        if (!isMounted || ticket <= detailApplied.current) return;
        if (!isOwnSide(res)) {
          setError("Yêu cầu thuê không thuộc tài khoản hoặc vai trò đang xem.");
          return;
        }
        detailApplied.current = ticket;
        setDetail(res);
        if (ONBOARDING_STATUSES.includes(res.status)) void loadDetailedPayment(res.id);
      })
      .catch(() => {
        if (isMounted && ticket > detailApplied.current) setError("Không thể tải chi tiết yêu cầu thuê. Vui lòng thử lại.");
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [isOpen, requestId, initialDetail, isOwnSide, loadDetailedPayment]);

  // Silent refresh on rental-request notifications: no loading flag, so the panel and its forms stay mounted.
  const refreshDetail = useCallback(async () => {
    const id = activeRequestId.current;
    if (!id) return;
    const ticket = ++detailSeq.current;
    const fresh = await rentalRequestService.getRequestById(id);
    if (activeRequestId.current !== id || ticket <= detailApplied.current || !isOwnSide(fresh)) return;
    detailApplied.current = ticket;
    setDetail(fresh);
    if (ONBOARDING_STATUSES.includes(fresh.status)) await loadDetailedPayment(id);
  }, [isOwnSide, loadDetailedPayment]);
  useRentalRequestSync(refreshDetail, { enabled: isOpen && !!requestId && !!userId, requestId });

  // Open once on the section that holds the viewer's next step.
  const snapshot = useCallback((view: RentalOnboarding) => {
    setOnboarding(view);
    if (autoTabbed.current) return;
    autoTabbed.current = true;
    const next = describeNextAction(view.nextAction, mode === "RECEIVED" ? "LANDLORD" : "TENANT");
    if (next?.mine && next.tab !== "overview") setTab(next.tab);
  }, [mode]);

  if (!isOpen) return null;

  const currentPaymentStatus = detailedPayment?.status || detail?.initialPayment?.status;
  const p = detail ? presentRentalRequest({ role, request: detail, contract: linkedContract, livePaymentStatus: currentPaymentStatus, stage: onboarding?.stage,
    paymentLapsed: transferWindowClosed(detailedPayment ?? detail.initialPayment, nowMs) }) : null;
  const hasPanel = !!detail && ONBOARDING_STATUSES.includes(detail.status);
  const nextView = describeNextAction(onboarding?.nextAction, role);
  const holdText = holdMinutes ? `${holdMinutes} phút` : null;

  // The next step's button: send the viewer to the section where it is done. Pending requests answer inline.
  let primary: CardAction | undefined;
  let secondary: CardAction[] = [];
  if (detail?.status === "PENDING" && mode === "RECEIVED") {
    primary = { label: holdText ? `Chấp thuận · giữ chỗ ${holdText}` : "Chấp thuận & giữ chỗ", onClick: () => onAccept?.(detail), disabled: isProcessingAction || !manageGate.allowed };
    secondary = [{ label: "Từ chối", onClick: () => onReject?.(detail), disabled: isProcessingAction || !manageGate.allowed }];
  } else if (nextView?.mine && nextView.tab !== tab) {
    primary = { label: "Đi tới mục xử lý", onClick: () => setTab(nextView.tab) };
  } else if (!onboarding && detail?.status === "ACCEPTED" && mode === "SENT" && p?.phase === "unpaid") {
    primary = { label: "Thanh toán", onClick: () => onPay?.(detail) };
  }

  const estimatedEndDate = calculateEstimatedEndDate(detail?.moveInDate, detail?.leaseMonths);
  const rentPrice = detail?.effectiveMonthlyRent != null && detail.effectiveMonthlyRent > 0 ? detail.effectiveMonthlyRent : detail?.monthlyRentPrice ?? 0;
  const prepaidFees = detailedPayment?.lineItems?.filter((l) => l.type !== "RENT" && l.type !== "DEPOSIT").reduce((sum, l) => sum + l.amount, 0) ?? 0;
  const upfrontTotal = rentPrice + (detail?.depositAmount ?? 0) + prepaidFees;
  const predictableCharges = parseCostBreakdownSnapshot(detail?.costBreakdownSnapshot);
  const excludedCharges = parseExcludedChargesSnapshot(detail?.excludedChargesSnapshot);
  const canCancel = !!detail && !!onCancel && canCancelRentalRequest(detail, linkedContract, currentPaymentStatus, role);
  const retry = () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    rentalRequestService.getRequestById(requestId)
      .then((res) => (isOwnSide(res) ? setDetail(res) : setError("Yêu cầu thuê không thuộc tài khoản hoặc vai trò đang xem.")))
      .catch(() => setError("Không thể tải chi tiết yêu cầu thuê."))
      .finally(() => setLoading(false));
  };

  const timeline = detail && (
    <section className={card} aria-label="Tiến độ yêu cầu">
      <h4 className="flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4 text-primary" aria-hidden="true" />Tiến độ yêu cầu</h4>
      <dl className="divide-y divide-border text-sm">
        <div className="flex flex-wrap justify-between gap-1 py-2"><dt className="text-muted-foreground">Thời điểm gửi yêu cầu</dt><dd className="font-semibold">{detail.createdAt ? `${format(new Date(detail.createdAt), "HH:mm:ss, dd/MM/yyyy")} (${formatDistanceToNow(new Date(detail.createdAt), { addSuffix: true, locale: vi })})` : "—"}</dd></div>
        {detail.acceptedAt && <div className="flex flex-wrap justify-between gap-1 py-2"><dt className="text-muted-foreground">Thời điểm chấp thuận</dt><dd className="font-semibold">{format(new Date(detail.acceptedAt), "HH:mm:ss, dd/MM/yyyy")}</dd></div>}
        {detail.updatedAt && detail.updatedAt !== detail.createdAt && <div className="flex flex-wrap justify-between gap-1 py-2"><dt className="text-muted-foreground">Cập nhật lần cuối</dt><dd className="font-semibold">{format(new Date(detail.updatedAt), "HH:mm:ss, dd/MM/yyyy")}</dd></div>}
      </dl>
    </section>
  );

  const footer = (
    <>
      <button type="button" disabled={isProcessingAction} onClick={onClose} className={footerBtn}>Đóng</button>
      {detail && !loading && canCancel && (
        <button type="button" disabled={isProcessingAction} onClick={() => onCancel?.(detail)} className={`${footerBtn} border-destructive/40 text-destructive hover:bg-destructive/10`}>Hủy yêu cầu</button>
      )}
      {detail && !loading && mode === "RECEIVED" && !linkedContract && detail.status === "ACCEPTED" && (
        <RentalContractFallbackButton request={detail} mode={mode} contract={linkedContract} view={onboarding}
          busy={creatingContract} disabled={isProcessingAction || !contractGate.allowed} onCreate={onCreateDraft} />
      )}
      {detail && !loading && linkedContract && (
        <button type="button" disabled={isProcessingAction} onClick={() => onOpenContract?.(linkedContract.id)} className={footerPrimary}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          {linkedContract.status === "ACTIVE" ? "Xem hợp đồng hiệu lực" : linkedContract.status === "DRAFT" ? (mode === "RECEIVED" ? "Xem / tiếp tục hợp đồng" : "Xem bản nháp hợp đồng") : mode === "RECEIVED" ? "Xem / tiếp tục hợp đồng" : "Mở hợp đồng"}
        </button>
      )}
    </>
  );

  return (
    <ModalShell
      title="Chi tiết yêu cầu thuê" icon={<FileText className="h-5 w-5" />} size="xl" onClose={onClose} closeDisabled={isProcessingAction}
      headerExtra={detail ? <code className="hidden shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground sm:inline">#{detail.id.slice(0, 8)}</code> : null}
      footer={footer}
    >
      {loading ? (
        <div className="space-y-4" role="status" aria-label="Đang tải yêu cầu thuê">
          <div className="h-28 animate-pulse rounded-2xl bg-muted/60" /><div className="h-12 animate-pulse rounded-2xl bg-muted/60" /><div className="h-56 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      ) : error || !detail || !p ? (
        <div className={`space-y-3 rounded-2xl border p-6 text-center ${toneClasses.danger}`}>
          <AlertCircle className="mx-auto h-8 w-8" aria-hidden="true" />
          <h3 className="text-base font-bold">Không thể tải yêu cầu</h3>
          <p className="text-sm">{error || "Yêu cầu thuê không tồn tại hoặc bạn không có quyền truy cập."}</p>
          <button type="button" onClick={retry} className={footerPrimary}><RefreshCw className="h-4 w-4" aria-hidden="true" />Thử lại</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header: which request, and where it stands */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {validImage(detail.listingThumbnail)
                ? <Image src={detail.listingThumbnail!} alt={detail.listingTitle || "Ảnh bài đăng"} fill className="object-cover" unoptimized />
                : <span className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-7 w-7 opacity-40" aria-hidden="true" /></span>}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${toneClasses[p.tone]}`}>
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />{p.label}
              </span>
              <h3 className="text-lg font-bold leading-snug">{detail.listingTitle}</h3>
              {detail.listingAddress && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{detail.listingAddress}</span></p>}
            </div>
          </div>

          <NextActionCard role={role} nextAction={onboarding?.nextAction} fallbackMessage={onboarding?.message || p.hint} primary={primary} secondary={secondary} />

          {hasPanel && <DetailTabs tabs={TABS.map((t) => ({ id: t.id, label: t.label, hidden: t.id !== "overview" && !hasPanel, badge: nextView?.mine && nextView.tab === t.id && t.id !== tab ? "1" : undefined }))}
            active={tab} onChange={setTab} idPrefix="rr" />}

          <div role="tabpanel" id={panelId("rr", tab)} aria-labelledby={hasPanel ? tabId("rr", tab) : undefined} className="space-y-4 focus-visible:outline-none" tabIndex={-1}>
            {tab === "overview" && <>
              {detail.status === "PENDING" && detail.respondBy && <PolicyNotice tone="neutral" title="Hạn chủ nhà phản hồi" summary="Quá hạn yêu cầu tự hết hiệu lực; phòng chưa bị khóa ở bước này."><p>Hạn chủ nhà phản hồi: {new Date(detail.respondBy).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (giờ Việt Nam). Quá hạn yêu cầu tự hết hiệu lực; phòng chưa bị khóa ở bước này.</p></PolicyNotice>}
              {detail.status === "EXPIRED" && detail.holdExpiresAt && (
                <p className={`flex items-center gap-2 rounded-2xl border p-3 text-sm font-semibold ${toneClasses.warning}`}><Clock className="h-4 w-4 shrink-0" aria-hidden="true" />Thời hạn giữ chỗ{holdText ? ` ${holdText}` : ""} đã kết thúc vào lúc {format(new Date(detail.holdExpiresAt), "HH:mm:ss, dd/MM/yyyy")}</p>
              )}
              {detail.rejectReason && <div className={`space-y-1 rounded-2xl border p-3 text-sm ${toneClasses.danger}`}><p className="flex items-center gap-1.5 font-bold"><XCircle className="h-4 w-4" aria-hidden="true" />Lý do từ chối</p><p className="italic">&quot;{detail.rejectReason}&quot;</p></div>}

              <section className={card} aria-label="Bài đăng cho thuê">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bài đăng cho thuê</p>
                    <p className="mt-0.5 text-base font-bold">{detail.listingTitle}</p>
                    {detail.listingPrice != null && <p className="mt-1 text-sm text-muted-foreground">Giá niêm yết hiện tại: <strong className="text-foreground">{formatVND(detail.listingPrice)}</strong>/tháng</p>}
                  </div>
                  <Link href={listingDetailPath(detail.listingId)} className={`${footerBtn} shrink-0`}><span>Xem bài đăng</span><ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
                </div>
              </section>

              <section className={card} aria-label="Người thuê">
                <h4 className="flex items-center gap-2 text-sm font-bold"><User className="h-4 w-4 text-primary" aria-hidden="true" />{mode === "RECEIVED" ? "Thông tin khách thuê" : "Thông tin của bạn"}</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Fact label="Họ và tên" value={detail.renterName} />
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3"><dt className="text-xs text-muted-foreground">Số điện thoại</dt><dd className="mt-0.5"><a href={`tel:${detail.renterPhone}`} className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"><Phone className="h-4 w-4" aria-hidden="true" />{detail.renterPhone}</a></dd></div>
                  {detail.renterEmail && <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:col-span-2"><dt className="text-xs text-muted-foreground">Email liên hệ</dt><dd className="mt-0.5"><a href={`mailto:${detail.renterEmail}`} className="flex items-center gap-1.5 break-all text-sm font-semibold hover:text-primary"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{detail.renterEmail}</a></dd></div>}
                </dl>
                {detail.renterNote && <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />Lời nhắn gửi chủ nhà</p><p className="text-sm italic leading-relaxed">&quot;{detail.renterNote}&quot;</p></div>}
              </section>

              <section className={card} aria-label="Điều kiện thuê">
                <h4 className="flex items-center gap-2 text-sm font-bold"><Calendar className="h-4 w-4 text-primary" aria-hidden="true" />Điều kiện thuê & nhân khẩu</h4>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Fact label="Ngày dọn vào" value={detail.moveInDate ? format(new Date(detail.moveInDate), "dd/MM/yyyy") : "—"} />
                  <Fact label="Thời hạn thuê" value={`${detail.leaseMonths} tháng`} />
                  <Fact label="Dự kiến kết thúc" value={estimatedEndDate || "—"} />
                  <Fact icon={<Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />} label="Số người ở" value={formatOccupantCount(detail.occupantCount)} />
                  <Fact icon={<Bike className="h-3.5 w-3.5 text-primary" aria-hidden="true" />} label="Xe máy" value={formatMotorbikeCount(detail.motorbikeCount)} />
                  <Fact icon={<Car className="h-3.5 w-3.5 text-primary" aria-hidden="true" />} label="Ô tô" value={formatCarCount(detail.carCount)} />
                </dl>
              </section>

              <section className={card} aria-label="Khoản thanh toán ban đầu">
                <h4 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />Khoản thanh toán ban đầu</h4>
                <PolicyNotice tone="neutral" title="Nghĩa vụ thanh toán" summary="Nghĩa vụ gồm cọc và tiền tháng đầu."><p>Nghĩa vụ gồm cọc và tiền tháng đầu. Nếu nhận nhà trong tương lai, hai khoản được mở ở hai thời điểm riêng; xem từng khoản ở mục Thanh toán & cọc. HomeSpace không nhận tiền và không giữ tiền.</p></PolicyNotice>
                <dl className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tiền thuê kỳ đầu</dt><dd className="font-semibold">{formatVND(rentPrice)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tiền đặt cọc</dt><dd className="font-semibold">{formatVND(detail.depositAmount ?? 0)}</dd></div>
                  {prepaidFees > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phí đã trả trước (yêu cầu cũ)</dt><dd className="font-semibold">{formatVND(prepaidFees)}</dd></div>}
                  <div className="flex items-baseline justify-between gap-3 border-t border-primary/20 pt-2"><dt className="font-bold">Tổng cọc + tháng đầu</dt><dd className="text-lg font-extrabold text-primary">{formatVND(upfrontTotal)}</dd></div>
                </dl>
                <p className="text-xs text-muted-foreground">Đây là tổng nghĩa vụ, không phải số tiền cần chuyển ngay. Cọc là khoản bảo đảm, hoàn trả theo điều kiện hợp đồng.</p>
                <EndOfPeriodCharges predictableCharges={predictableCharges} excludedCharges={excludedCharges} prepaidFees={prepaidFees} />
              </section>
            </>}

            {(tab === "history" || (tab === "overview" && !hasPanel)) && timeline}

            {hasPanel && (
              <RentalOnboardingPanel
                key={detail.id}
                rentalRequestId={detail.id}
                isLandlord={mode === "RECEIVED"}
                sections={PANEL_SECTIONS[tab]}
                onSnapshot={snapshot}
                onUpdated={async () => {
                  const fresh = await rentalRequestService.getRequestById(detail.id);
                  setDetail(fresh);
                  await loadDetailedPayment(detail.id);
                  onPaymentStatusChange?.();
                }}
              />
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
