"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  CreditCard,
  Send,
  RefreshCw,
  Loader2,
  Download,
  Eye,
} from "lucide-react";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractResponse,
  ContractRevisionResponse,
} from "@/types/contract.type";
import ContractPdfViewerModal from "./ContractPdfViewerModal";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import { appliedAmendment } from "@/lib/contract-document-history";
import { contractService } from "@/services/contract.service";
import { toast } from "sonner";
import { documentTime, requiresVerifiedContent } from "@/lib/contract-document-history";
import { FieldRow } from "./utils";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";

interface ContractHeaderProps {
  backPath: string;
  contract: ContractResponse;
  revision?: ContractRevisionResponse | null;
  completeness: ContractCompletenessResponse | null;
  latestDoc: ContractDocumentResponse | null;
  hasReadyDoc: boolean;
  isLandlord: boolean;
  isTenant: boolean;
  rendering: boolean;
  reconcilingPreview?: boolean;
  sending: boolean;
  onRender: () => Promise<void>;
  onSend: () => Promise<void>;
  smartCaMode?: boolean;
  cancellationRefundPending?: boolean;
  draftReview?: { formId: string; saving: boolean; retry: boolean; locked: boolean };
  listingSyncAction?: React.ReactNode;
  /** Status pill text and tone classes (from lib/rental-labels), so the page and lists read the same. */
  statusLabel?: string;
  statusClassName?: string;
  kindLabel?: string;
  /** Parties, property and key figures, shown inside the header card. */
  summary?: React.ReactNode;
  /** Page with tabs: jump to the tab that holds the documents instead of an in-page anchor. */
  onOpenDocuments?: () => void;
}

export default function ContractHeader({
  backPath,
  contract,
  revision,
  completeness,
  latestDoc,
  hasReadyDoc,
  isLandlord,
  isTenant,
  rendering,
  reconcilingPreview = false,
  sending,
  onRender,
  onSend,
  smartCaMode = false,
  cancellationRefundPending = false,
  draftReview,
  listingSyncAction,
  statusLabel,
  statusClassName = "border-border bg-muted text-muted-foreground",
  kindLabel,
  summary,
  onOpenDocuments,
}: ContractHeaderProps) {
  const router = useRouter();
  const manageGate = useFeatureGate(PERMISSIONS.CONTRACT_MANAGE);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [viewDoc,setViewDoc] = useState<ContractDocumentResponse|null>(null);
  const [opening,setOpening] = useState(false);
  const workspace = useAmendmentWorkspace();
  const applied = workspace?.data?.proposals.filter(p => appliedAmendment(p,workspace.data!.serverNow)).length ?? 0;

  const isPaid =
    contract.paymentStatus === "PAID" ||
    contract.paymentStatus === "PAID_MOCK";

  const pillLabel = cancellationRefundPending ? "Chờ xác nhận hoàn tiền"
    : contract.agreementKind === "AMENDMENT" && contract.status === "ACTIVE" ? "Đã ký đủ phụ lục"
    : statusLabel ?? contract.status;
  const jumpTo = (id: string) => (event: React.MouseEvent) => {
    if (!onOpenDocuments) return;
    event.preventDefault();
    onOpenDocuments();
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };
  const signedAppendix = Boolean(contract.parentContractId && contract.agreementKind === "AMENDMENT" && contract.status === "ACTIVE");
  const showEffectiveDocument = contract.status === "ACTIVE" && (!contract.parentContractId || signedAppendix);
  const openDocument = async (download = false, ownAppendix = false) => {
    const effective = showEffectiveDocument && !ownAppendix;
    if ((!effective && !latestDoc) || opening) return;
    const verified = effective || requiresVerifiedContent(latestDoc);
    const tab = download && !verified ? window.open("about:blank","_blank") : null;
    if (download && !verified && !tab) { toast.error("Hãy cho phép trình duyệt mở cửa sổ tải về rồi thử lại."); return; }
    if (tab) tab.opener = null;
    setOpening(true);
    try {
      // Resolve again on every click: simulated business time and the effective
      // amendment may have changed since this page was loaded. Never fall back to root.
      const fresh = effective
        ? await contractService.getEffectiveDocument(contract.id)
        : await contractService.getDocument(latestDoc!.id);
      if (!fresh || fresh.status !== "READY" || (effective
        ? fresh.purpose !== "SIGNED_FINAL" || fresh.documentType !== "PDF"
        : fresh.id !== latestDoc!.id || fresh.contractId !== contract.id)
        || (!requiresVerifiedContent(fresh) && !(download ? fresh.downloadUrl : fresh.viewUrl || fresh.downloadUrl)))
        throw new Error(effective ? "Chưa tải được PDF đã ký của hợp đồng đang áp dụng. Vui lòng thử lại; hệ thống không mở thay bằng bản cũ." : "Chưa mở được tài liệu hiện tại. Hãy tải lại hồ sơ rồi thử lại.");
      if (download && requiresVerifiedContent(fresh)) { tab?.close(); await contractService.downloadDocument(fresh); }
      else if (tab) tab.location.href = fresh.downloadUrl!;
      else { setViewDoc(fresh); setShowPreviewModal(true); }
    } catch (e) { tab?.close(); toast.error(e instanceof Error ? e.message : "Không mở được tài liệu."); }
    finally { setOpening(false); }
  };

  return (
    <>
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => router.push(backPath)}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {contract.agreementKind === "AMENDMENT" ? "Về hợp đồng gốc" : "Danh sách hợp đồng"}
        </button>

        <div className="mt-3 flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-all text-xl font-black tracking-tight text-foreground sm:text-2xl">{contract.contractNumber}</h1>
              {kindLabel && <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{kindLabel}</span>}
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClassName}`}>{pillLabel}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <strong className="text-foreground">
                {isLandlord ? "Bạn là chủ nhà (Bên A)" : isTenant ? "Bạn là người thuê (Bên B)" : "Quan sát viên"}
              </strong>
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                {contract.agreementKind === "AMENDMENT" ? "Thanh toán theo hợp đồng gốc" : isPaid ? (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Đã hoàn tất thanh toán ban đầu</span>
                ) : (
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Chưa thanh toán</span>
                )}
              </span>
              {contract.landlordConfirmedAt && (
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Chủ nhà đã xác nhận
                </span>
              )}
            </div>
          </div>
        </div>

        {summary}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {(showEffectiveDocument || requiresVerifiedContent(latestDoc) || latestDoc?.viewUrl) && (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openDocument()}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-60"
            >
              <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              {showEffectiveDocument ? contract.agreedEarlyEndExclusive ? "Xem phụ lục chấm dứt đang áp dụng" : "Xem hợp đồng đang áp dụng" : latestDoc?.purpose === "SIGNED_FINAL" ? "Xem bản đã ký" : latestDoc?.purpose === "SIGNED_LANDLORD" ? "Xem bản đang ký" : "Xem bản soạn thảo"}
            </button>
          )}
          {(showEffectiveDocument || requiresVerifiedContent(latestDoc) || latestDoc?.downloadUrl) && (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openDocument(true)}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {showEffectiveDocument ? contract.agreedEarlyEndExclusive ? "Tải phụ lục chấm dứt đang áp dụng" : "Tải PDF đang áp dụng" : latestDoc?.purpose === "SIGNED_FINAL" ? "Tải PDF đã ký" : `Tải bản ${latestDoc?.documentType}`}
            </button>
          )}
          {signedAppendix && latestDoc && (latestDoc.storageObjectId || latestDoc.viewUrl || latestDoc.downloadUrl) && <button type="button" disabled={opening} onClick={() => void openDocument(false,true)}
            className="min-h-10 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold disabled:opacity-50">
            Xem riêng phụ lục này
          </button>}
          {contract.signedAt && !contract.parentContractId && (
            <a href="#contract-blockchain-proof" onClick={jumpTo("contract-blockchain-proof")} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/5">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Bằng chứng blockchain
            </a>
          )}
          {revision && <a href="#contract-document-history" onClick={jumpTo("contract-document-history")} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/5">
            {applied ? `Đã áp dụng ${applied} lần điều chỉnh · Xem hợp đồng và lịch sử` : "Xem văn bản và lịch sử tệp"}
          </a>}
          {signedAppendix && <p className="basis-full max-w-xl text-sm text-muted-foreground">
            Phụ lục đã ký có thể còn chờ hiệu lực. Nút “đang áp dụng” luôn lấy bản có hiệu lực theo ngày hệ thống; xem riêng phụ lục để đối chiếu bản này.
          </p>}
        </div>

        <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Thông tin văn bản</summary>
          <div className="mt-2 space-y-1 rounded-xl border bg-background p-3">
            <FieldRow label="Số hợp đồng" value={contract.contractNumber}/>
            <FieldRow label="Địa điểm lập văn bản" value={contract.signingCity}/>
            <FieldRow label="Thời điểm hai bên ký đủ" value={contract.signedAt ? documentTime(contract.signedAt) : "Chưa ký đủ hai bên"}/>
            <p className="pt-1 text-muted-foreground">Ngày lập in trên Word/PDF được hệ thống ghi lúc kết xuất; không đồng nhất với ngày bắt đầu thuê hoặc thời điểm ký đủ. Xem bản đã ký để đối chiếu ngày in chính xác.</p>
            <details><summary className="cursor-pointer text-muted-foreground">Thông tin kỹ thuật · Chỉ đọc</summary>
              <FieldRow label="Phiên bản cấu trúc dữ liệu" value={revision?.schemaVersion}/>
              <FieldRow label="Số bản soạn thảo" value={revision?.revisionNumber}/>
            </details>
          </div>
        </details>
      </header>

      {isLandlord && contract.status === "DRAFT" && !cancellationRefundPending && !workspace?.editing && (!hasReadyDoc || !smartCaMode || listingSyncAction) && (
        <div role="region" aria-label={draftReview ? "Thao tác bản nháp" : "Thao tác kết xuất hợp đồng"} className="fixed left-4 right-24 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 m-0! rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:right-28 sm:max-w-[calc(100vw-8rem)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-sm text-muted-foreground">{hasReadyDoc ? "Bản xem trước đã sẵn sàng."
              : draftReview?.retry ? "Bản nháp đã lưu. Bạn có thể thử kết xuất lại PDF."
              : draftReview ? "Lưu nội dung đã rà soát và tự tạo PDF để kiểm tra trước khi ký."
              : "Kết xuất PDF để kiểm tra và tiếp tục ký ở đầu trang."}</p>
            <div className="flex flex-wrap items-center gap-2">
              {listingSyncAction}
              {!hasReadyDoc && <button
                type={draftReview ? "submit" : "button"}
                form={draftReview?.formId}
                disabled={rendering || reconcilingPreview || sending || draftReview?.saving || draftReview?.locked || !manageGate.allowed}
                title={manageGate.title}
                onClick={draftReview ? undefined : () => { window.scrollTo({ top: 0, behavior: "smooth" }); void onRender(); }}
                className="min-h-10 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {rendering || draftReview?.saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {draftReview?.saving ? "Đang lưu bản nháp..." : reconcilingPreview ? "Đang kiểm tra kết quả..."
                  : rendering ? "Đang kết xuất..." : draftReview?.retry ? "Thử kết xuất lại"
                  : draftReview ? "Lưu" : "Kết xuất file"}
              </button>}
              {!smartCaMode && (
                <button
                  type="button"
                  disabled={rendering || reconcilingPreview || sending || !completeness?.complete || !hasReadyDoc || !manageGate.allowed}
                  onClick={onSend}
                  title={
                    manageGate.title ?? (!completeness?.complete
                      ? "Bổ sung đủ trường trước khi gửi"
                      : !hasReadyDoc
                        ? "Kết xuất file hợp đồng trước khi gửi"
                        : undefined)
                  }
                  className="min-h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sending ? "Đang gửi..." : "Gửi cho người thuê"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ContractPdfViewerModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        document={viewDoc}
      />
    </>
  );
}
