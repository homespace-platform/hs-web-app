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
  ContractStatus,
} from "@/types/contract.type";
import ContractPdfViewerModal from "./ContractPdfViewerModal";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import { appliedAmendment } from "@/lib/contract-document-history";
import { contractService } from "@/services/contract.service";
import { toast } from "sonner";
import { documentTime } from "@/lib/contract-document-history";
import { FieldRow } from "./utils";

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  DRAFT: {
    label: "Bản nháp",
    color: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  PENDING_REVIEW: {
    label: "Chờ xác nhận / ký",
    color: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/40",
  },
  LANDLORD_SIGNATURE_PENDING: {
    label: "Chờ chủ nhà ký SmartCA",
    color: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/40",
  },
  TENANT_SIGNATURE_PENDING: {
    label: "Chờ người thuê ký SmartCA",
    color: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/40",
  },
  ACTIVE: {
    label: "Đang có hiệu lực",
    color: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  EXPIRED: { label: "Hết thời hạn thuê — chờ quyết toán", color: "text-amber-800", border: "border-amber-200", bg: "bg-amber-50" },
  CLOSED: { label: "Đã kết thúc hợp đồng", color: "text-slate-700", border: "border-slate-200", bg: "bg-slate-50" },
  TERMINATED: {
    label: "Đã chấm dứt",
    color: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-muted-foreground",
    border: "border-border",
    bg: "bg-muted/30",
  },
};

interface ContractHeaderProps {
  backPath: string;
  contract: ContractResponse;
  revision: ContractRevisionResponse;
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
}: ContractHeaderProps) {
  const router = useRouter();
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [viewDoc,setViewDoc] = useState<ContractDocumentResponse|null>(null);
  const [opening,setOpening] = useState(false);
  const workspace = useAmendmentWorkspace();
  const applied = workspace?.data?.proposals.filter(p => appliedAmendment(p,workspace.data!.serverNow)).length ?? 0;

  const isPaid =
    Boolean(contract.rentalPaymentId) ||
    contract.paymentStatus === "PAID" ||
    contract.paymentStatus === "PAID_MOCK";

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT;
  const signedAppendix = Boolean(contract.parentContractId && contract.agreementKind === "AMENDMENT" && contract.status === "ACTIVE");
  const showEffectiveDocument = contract.status === "ACTIVE" && (!contract.parentContractId || signedAppendix);
  const openDocument = async (download = false, ownAppendix = false) => {
    const effective = showEffectiveDocument && !ownAppendix;
    if ((!effective && !latestDoc) || opening) return;
    const tab = download ? window.open("about:blank","_blank") : null;
    if (download && !tab) { toast.error("Hãy cho phép trình duyệt mở cửa sổ tải về rồi thử lại."); return; }
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
        || !(download ? fresh.downloadUrl : fresh.viewUrl || fresh.downloadUrl))
        throw new Error(effective ? "Chưa tải được PDF đã ký của hợp đồng đang áp dụng. Vui lòng thử lại; hệ thống không mở thay bằng bản cũ." : "Chưa mở được tài liệu hiện tại. Hãy tải lại hồ sơ rồi thử lại.");
      if (tab) tab.location.href = fresh.downloadUrl!;
      else { setViewDoc(fresh); setShowPreviewModal(true); }
    } catch (e) { tab?.close(); toast.error(e instanceof Error ? e.message : "Không mở được tài liệu."); }
    finally { setOpening(false); }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2 min-w-0">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {contract.agreementKind === "AMENDMENT" ? "Về hợp đồng gốc" : "Danh sách hợp đồng"}
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  {contract.contractNumber}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                >
                  {contract.agreementKind === "AMENDMENT" && contract.status === "ACTIVE" ? "Đã ký đủ phụ lục" : statusCfg.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span>
                  Vai trò:{" "}
                  <strong className="text-foreground">
                    {isLandlord
                      ? "Bên A (Chủ nhà)"
                      : isTenant
                        ? "Bên B (Người thuê)"
                        : "Quan sát viên"}
                  </strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {contract.agreementKind === "AMENDMENT" ? <span className="text-muted-foreground">Thanh toán theo hợp đồng gốc</span> : isPaid ? (
                    <span className="text-emerald-600 font-semibold dark:text-emerald-400">
                      Đã hoàn tất thanh toán ban đầu
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold dark:text-amber-400">
                      Chưa thanh toán
                    </span>
                  )}
                </span>
                {contract.landlordConfirmedAt && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Chủ nhà đã xác nhận
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <a href="#contract-document-history" className="inline-block text-xs font-medium text-primary underline underline-offset-2">
            {applied ? `Đã áp dụng ${applied} lần điều chỉnh · Xem hợp đồng và lịch sử` : "Xem văn bản và lịch sử tệp"}
          </a>
          <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Thông tin văn bản</summary>
            <div className="mt-2 space-y-1 rounded-xl border bg-card p-3">
              <FieldRow label="Số hợp đồng" value={contract.contractNumber}/>
              <FieldRow label="Địa điểm lập văn bản" value={contract.signingCity}/>
              <FieldRow label="Thời điểm hai bên ký đủ" value={contract.signedAt ? documentTime(contract.signedAt) : "Chưa ký đủ hai bên"}/>
              <p className="pt-1 text-muted-foreground">Ngày lập in trên Word/PDF được hệ thống ghi lúc kết xuất; không đồng nhất với ngày bắt đầu thuê hoặc thời điểm ký đủ. Xem bản đã ký để đối chiếu ngày in chính xác.</p>
              <details><summary className="cursor-pointer text-muted-foreground">Thông tin kỹ thuật · Chỉ đọc</summary>
                <FieldRow label="Phiên bản cấu trúc dữ liệu" value={revision.schemaVersion}/>
                <FieldRow label="Số bản soạn thảo" value={revision.revisionNumber}/>
              </details>
            </div>
          </details>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {(showEffectiveDocument || latestDoc?.downloadUrl) && (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openDocument(true)}
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {showEffectiveDocument ? "Tải PDF đang áp dụng" : latestDoc?.purpose === "SIGNED_FINAL" ? "Tải PDF đã ký" : `Tải bản ${latestDoc?.documentType}`}
            </button>
          )}

          {(showEffectiveDocument || latestDoc?.viewUrl) && (
            <button
              type="button"
              disabled={opening}
              onClick={() => void openDocument()}
              className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              {showEffectiveDocument ? "Xem hợp đồng đang áp dụng" : latestDoc?.purpose === "SIGNED_FINAL" ? "Xem bản đã ký" : latestDoc?.purpose === "SIGNED_LANDLORD" ? "Xem bản đang ký" : "Xem bản soạn thảo"}
            </button>
          )}
          {signedAppendix && latestDoc && (latestDoc.storageObjectId || latestDoc.viewUrl || latestDoc.downloadUrl) && <button type="button" disabled={opening} onClick={() => void openDocument(false,true)}
            className="h-9 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold disabled:opacity-50">
            Xem riêng phụ lục này
          </button>}
          {signedAppendix && <p className="basis-full max-w-md text-xs text-muted-foreground">
            Phụ lục đã ký có thể còn chờ hiệu lực. Nút “đang áp dụng” luôn lấy bản có hiệu lực theo ngày hệ thống; xem riêng phụ lục để đối chiếu bản này.
          </p>}
        </div>
      </div>

      {isLandlord && contract.status === "DRAFT" && !workspace?.editing && (
        <div role="region" aria-label="Thao tác kết xuất hợp đồng" className="fixed left-4 right-24 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 m-0! rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:right-28 sm:max-w-[calc(100vw-8rem)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-xs text-muted-foreground">Kết xuất PDF để kiểm tra và tiếp tục ký ở đầu trang.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={rendering || reconcilingPreview || sending}
                onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); void onRender(); }}
                className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {rendering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {reconcilingPreview ? "Đang kiểm tra kết quả..." : rendering ? "Đang kết xuất..." : "Kết xuất file"}
              </button>
              {!smartCaMode && (
                <button
                  type="button"
                  disabled={rendering || reconcilingPreview || sending || !completeness?.complete || !hasReadyDoc}
                  onClick={onSend}
                  title={
                    !completeness?.complete
                      ? "Bổ sung đủ trường trước khi gửi"
                      : !hasReadyDoc
                        ? "Kết xuất file hợp đồng trước khi gửi"
                        : undefined
                  }
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
