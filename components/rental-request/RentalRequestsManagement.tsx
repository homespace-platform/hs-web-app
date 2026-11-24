"use client";

import React, { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Home, Inbox, RefreshCw, Search, Send } from "lucide-react";
import { toast } from "sonner";
import rentalRequestService from "@/services/rental-request.service";
import { contractService } from "@/services/contract.service";
import { rentalOnboardingService } from "@/services/rental-onboarding.service";
import { useAuth } from "@/features/auth/useAuth";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { contractDetailPath } from "@/lib/contract-routes";
import { createRentalContractFallback } from "@/lib/rental-contract-fallback";
import { getApiErrorMessage } from "@/utils/apiError";
import type { RentalRequestConflict, RentalRequestResponse } from "@/types/rental-request.type";
import { useRentalRequestDeepLink } from "./useRentalRequestDeepLink";
import { useRentalRequestSync } from "./useRentalRequestSync";
import { useRentalRequestList } from "./useRentalRequestList";
import { useRequestContracts } from "./useRequestContracts";
import { useRentalHoldMinutes } from "./useRentalHoldMinutes";
import { useRequestDecisions } from "./RentalRequestDialogs";
import RentalRequestCard, { type RequestCardActions } from "./RentalRequestCard";
import RentalRequestFilters from "./RentalRequestFilters";
import RentalRequestDetailModal from "./RentalRequestDetailModal";
import RentalRequestAiReviewModal from "./RentalRequestAiReviewModal";
import RentalPaymentModal from "./RentalPaymentModal";
import RentalDepositQuickViewModal from "./RentalDepositQuickViewModal";
import RentalStartChangeQuickModal from "./RentalStartChangeQuickModal";

interface RentalRequestsManagementProps {
  mode: "RECEIVED" | "SENT";
}

// Keyed by account and side so a login switch drops every list, contract and modal state at once.
export default function RentalRequestsManagement({ mode }: RentalRequestsManagementProps) {
  const { userId } = useAuth();
  return (
    <Suspense fallback={null}>
      <RentalRequestsManagementView key={`${mode}:${userId ?? "anonymous"}`} mode={mode} />
    </Suspense>
  );
}

function RentalRequestsManagementView({ mode }: RentalRequestsManagementProps) {
  const router = useRouter();
  const { initialized, authenticated, userId, login } = useAuth();
  const manageGate = useFeatureGate(PERMISSIONS.RENTAL_REQUEST_MANAGE);
  const contractGate = useFeatureGate(PERMISSIONS.CONTRACT_MANAGE);
  const list = useRentalRequestList({ mode, initialized, authenticated, userId });
  const { requests, loading, statusFilter, changeFilter, page, setPage, totalElements, totalPages, fetchRequests, refreshRequests } = list;
  const { contractsByRequest, agreementsByRequest, rememberContract } = useRequestContracts(requests);
  const holdMinutes = useRentalHoldMinutes(authenticated);
  const holdLabel = holdMinutes ? `${holdMinutes} phút` : null;

  const contractCreationLock = useRef(false);
  const contractCreationRequest = useRef<AbortController | null>(null);
  const [creatingContractFor, setCreatingContractFor] = useState<string | null>(null);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  // Detail already verified against the signed-in user by a notification link; avoids a second GET.
  const [verifiedDetail, setVerifiedDetail] = useState<RentalRequestResponse | null>(null);
  const openLinkedRequest = useCallback((request: RentalRequestResponse | null) => {
    setVerifiedDetail(request);
    setDetailRequestId(request?.id ?? null);
  }, []);
  const clearDeepLink = useRentalRequestDeepLink({ initialized, authenticated, userId, mode, login, onOpen: openLinkedRequest });
  // Single close path: drops only ?requestId so the same or another link can open again.
  const closeDetail = useCallback(() => {
    setDetailRequestId(null);
    setVerifiedDetail(null);
    clearDeepLink();
  }, [clearDeepLink]);
  const openDetail = (id: string) => {
    clearDeepLink();
    setVerifiedDetail(null);
    setDetailRequestId(id);
  };
  const [paymentTarget, setPaymentTarget] = useState<RentalRequestResponse | null>(null);
  const [depositQuickTarget, setDepositQuickTarget] = useState<RentalRequestResponse | null>(null);
  const [startChangeTarget, setStartChangeTarget] = useState<RentalRequestResponse | null>(null);
  // Landlord: a listing with 2+ competing pending requests shows "Hỏi AI đánh giá".
  const [conflicts, setConflicts] = useState<Record<string, RentalRequestConflict>>({});
  const [reviewTarget, setReviewTarget] = useState<RentalRequestConflict | null>(null);
  useEffect(() => () => { contractCreationRequest.current?.abort(); }, []);

  const decisions = useRequestDecisions({
    mode, holdLabel, afterChange: fetchRequests,
    afterCancel: () => { setPaymentTarget(null); closeDetail(); },
  });

  const handleCreateDraft = async (request: RentalRequestResponse) => {
    if (contractCreationLock.current || mode !== "RECEIVED" || request.status !== "ACCEPTED" || contractsByRequest[request.id]) return;
    contractCreationLock.current = true;
    setCreatingContractFor(request.id);
    const controller = new AbortController();
    contractCreationRequest.current = controller;
    try {
      const result = await createRentalContractFallback({
        refresh: () => rentalOnboardingService.refresh(request.id),
        create: () => contractService.createDraft({ rentalRequestId: request.id }, controller.signal),
        find: () => contractService.getByRentalRequest(request.id),
        completeness: id => contractService.getCompleteness(id),
        preview: (id, signal) => contractService.triggerPreview(id, signal),
        previewStatus: (id, signal) => contractService.getPreviewStatus(id, signal),
      }, controller.signal, () => toast.info("Đang kiểm tra kết quả kết xuất; vui lòng không bấm tạo lại."));
      if (controller.signal.aborted) return;
      rememberContract(request.id, result.contract);
      if (result.fileState === "UNAVAILABLE" || result.fileState === "PENDING")
        toast.warning("Đã có bản nháp nhưng file chưa sẵn sàng. Mở hợp đồng để kiểm tra; không cần tạo lại hay thanh toán thêm.");
      else if (result.fileState === "INCOMPLETE") toast.info("Đã có bản nháp. Vui lòng bổ sung thông tin bắt buộc trước khi kết xuất và ký.");
      else if (result.fileState === "EXISTING") toast.info("Hợp đồng đã tồn tại. Mở để tiếp tục theo trạng thái hiện tại.");
      else toast.success("Bản nháp hợp đồng đã sẵn sàng để kiểm tra.");
      closeDetail();
      router.push(contractDetailPath("landlord", result.contract.id));
    } catch (error) {
      if (!controller.signal.aborted) toast.error(getApiErrorMessage(error, "Chưa thể tạo bản nháp hợp đồng. Vui lòng kiểm tra tiến trình nhận nhà và mẫu hợp đồng."));
    } finally {
      contractCreationLock.current = false;
      contractCreationRequest.current = null;
      setCreatingContractFor(null);
    }
  };

  useEffect(() => {
    if (mode !== "RECEIVED" || !initialized || !authenticated || !userId) return;
    let active = true;
    rentalRequestService
      .getOwnerConflicts()
      .then((rows) => {
        if (active) setConflicts(Object.fromEntries(rows.map((row) => [row.listingId, row])));
      })
      .catch(() => {
        if (!active) return;
        // API not ready: still recognise competing requests inside the page being viewed (same listing, all pending).
        const groups = new Map<string, RentalRequestResponse[]>();
        for (const item of requests) {
          if (item.status === "PENDING") groups.set(item.listingId, [...(groups.get(item.listingId) ?? []), item]);
        }
        setConflicts(Object.fromEntries(
          [...groups].filter(([, rows]) => rows.length >= 2).map(([listingId, rows]) => [listingId, {
            listingId, listingTitle: rows[0].listingTitle, listingAddress: rows[0].listingAddress,
            pendingCount: rows.length, requestIds: rows.map((row) => row.id),
          }])));
      });
    return () => {
      active = false;
    };
  }, [mode, requests, initialized, authenticated, userId]);

  const acceptFromReview = async (requestId: string) => {
    const local = requests.find((item) => item.id === requestId);
    try {
      void decisions.accept(local ?? (await rentalRequestService.getRequestById(requestId)));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không mở được yêu cầu để chấp thuận. Vui lòng thử lại."));
    }
  };

  // Deadlines come from the business clock, not the browser's. The 30 s poll and rental-request notifications share
  // one bounded silent refresh (no loading flash, no duplicates). Nothing moving on this page -> no polling.
  const needsDeadlinePolling = requests.some((r) => r.status === "ACCEPTED" || r.status === "PENDING");
  useRentalRequestSync(refreshRequests, { enabled: authenticated && !!userId, pollMs: needsDeadlinePolling ? 30000 : 0 });

  const actions: RequestCardActions = {
    accept: (r) => void decisions.accept(r),
    reject: (r) => void decisions.reject(r),
    cancel: (r) => void decisions.cancel(r),
    pay: setPaymentTarget,
    review: setDepositQuickTarget,
    createContract: (r) => void handleCreateDraft(r),
    openDetail: (r) => openDetail(r.id),
    openContract: (contractId) => router.push(contractDetailPath(mode === "RECEIVED" ? "landlord" : "tenant", contractId)),
    openStartChange: setStartChangeTarget,
    askAi: setReviewTarget,
  };

  const HeaderIcon = mode === "RECEIVED" ? Inbox : Send;
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
            <HeaderIcon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <span>{mode === "RECEIVED" ? "Yêu cầu thuê từ khách" : "Yêu cầu thuê tôi đã gửi"}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "RECEIVED"
              ? "Xét duyệt hồ sơ, theo dõi cọc, tiền tháng đầu và ký hợp đồng khi nhận nhà."
              : "Theo dõi yêu cầu thuê, thanh toán cọc và các bước nhận nhà theo ngày đã thống nhất."}
          </p>
        </div>
        <button
          type="button" onClick={() => void fetchRequests()} disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} aria-hidden="true" />
          <span>Làm mới</span>
        </button>
      </header>

      <RentalRequestFilters value={statusFilter} onChange={changeFilter} />

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Đang tải danh sách">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card/60" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Home className="h-6 w-6" aria-hidden="true" /></div>
          <h2 className="text-base font-semibold">{statusFilter === "ALL" ? "Chưa có yêu cầu nào" : "Không có yêu cầu nào ở mục này"}</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {statusFilter !== "ALL"
              ? "Thử chọn mục khác hoặc xem tất cả yêu cầu."
              : mode === "RECEIVED"
                ? "Hiện chưa có khách thuê nào gửi yêu cầu thuê nhà đến các bài đăng của bạn."
                : "Bạn chưa gửi yêu cầu thuê nhà nào. Hãy khám phá các căn hộ đang cho thuê ngay!"}
          </p>
          {statusFilter !== "ALL"
            ? <button type="button" onClick={() => changeFilter("ALL")} className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">Xem tất cả</button>
            : mode === "SENT" && (
              <Link href="/rent" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
                <Search className="h-4 w-4" aria-hidden="true" /><span>Tìm nhà cho thuê</span>
              </Link>
            )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RentalRequestCard
              key={req.id} req={req} mode={mode}
              contract={contractsByRequest[req.id]} agreement={agreementsByRequest[req.id]}
              holdLabel={holdLabel} conflict={conflicts[req.listingId]}
              busy={decisions.processing} creatingContract={creatingContractFor === req.id}
              canManage={manageGate.allowed} manageTitle={manageGate.title}
              canManageContract={contractGate.allowed && creatingContractFor === null}
              actions={actions}
            />
          ))}

          {totalPages > 1 && (
            <nav aria-label="Phân trang" className="flex items-center justify-between pt-2 text-sm">
              <span className="text-muted-foreground">Tổng cộng {totalElements} yêu cầu</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                <span className="font-semibold">Trang {page} / {totalPages}</span>
                <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </nav>
          )}
        </div>
      )}

      {depositQuickTarget && <RentalDepositQuickViewModal key={depositQuickTarget.id} request={depositQuickTarget}
        onClose={() => setDepositQuickTarget(null)} onUpdated={fetchRequests}
        onOpenDetail={() => { openDetail(depositQuickTarget.id); setDepositQuickTarget(null); }} />}
      {startChangeTarget && <RentalStartChangeQuickModal key={startChangeTarget.id} request={startChangeTarget} mode={mode}
        onClose={() => setStartChangeTarget(null)} onUpdated={fetchRequests} />}

      {reviewTarget && (
        <RentalRequestAiReviewModal
          key={reviewTarget.listingId}
          listingId={reviewTarget.listingId}
          listingTitle={reviewTarget.listingTitle}
          onClose={() => setReviewTarget(null)}
          onAccept={(requestId) => void acceptFromReview(requestId)}
        />
      )}

      {paymentTarget && (
        <RentalPaymentModal
          request={paymentTarget}
          isOpen={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          onPaymentSuccess={() => { setPaymentTarget(null); void fetchRequests(); }}
        />
      )}

      <RentalRequestDetailModal
        requestId={detailRequestId}
        isOpen={Boolean(detailRequestId)}
        onClose={closeDetail}
        mode={mode}
        initialDetail={verifiedDetail}
        linkedContract={detailRequestId ? contractsByRequest[detailRequestId] : null}
        isProcessingAction={decisions.processing || creatingContractFor !== null}
        creatingContract={creatingContractFor === detailRequestId}
        holdMinutes={holdMinutes}
        onCreateDraft={handleCreateDraft}
        onPaymentStatusChange={() => { void fetchRequests(); }}
        onAccept={(req) => { closeDetail(); void decisions.accept(req); }}
        onReject={(req) => { closeDetail(); void decisions.reject(req); }}
        onCancel={(req) => { closeDetail(); void decisions.cancel(req); }}
        onPay={(req) => { closeDetail(); setPaymentTarget(req); }}
        onOpenContract={(contractId) => { closeDetail(); router.push(contractDetailPath(mode === "RECEIVED" ? "landlord" : "tenant", contractId)); }}
      />
      {decisions.dialog}
    </div>
  );
}
