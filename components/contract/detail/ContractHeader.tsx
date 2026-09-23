"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  CreditCard,
  Layers,
  Sparkles,
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
  contract: ContractResponse;
  revision: ContractRevisionResponse;
  completeness: ContractCompletenessResponse | null;
  latestDoc: ContractDocumentResponse | null;
  hasReadyDoc: boolean;
  isLandlord: boolean;
  isTenant: boolean;
  rendering: boolean;
  sending: boolean;
  onRender: () => Promise<void>;
  onSend: () => Promise<void>;
  smartCaMode?: boolean;
}

export default function ContractHeader({
  contract,
  revision,
  completeness,
  latestDoc,
  hasReadyDoc,
  isLandlord,
  isTenant,
  rendering,
  sending,
  onRender,
  onSend,
  smartCaMode = false,
}: ContractHeaderProps) {
  const router = useRouter();
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const isPaid =
    Boolean(contract.rentalPaymentId) ||
    contract.paymentStatus === "PAID" ||
    contract.paymentStatus === "PAID_MOCK";

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-2 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/dashboard/contracts")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Danh sách hợp đồng
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
                  {statusCfg.label}
                </span>
                {revision.schemaVersion && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Schema V{revision.schemaVersion}
                  </span>
                )}
                {revision.revisionNumber != null && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border inline-flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Bản sửa đổi #{revision.revisionNumber}
                  </span>
                )}
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
                  {isPaid ? (
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
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {isLandlord && contract.status === "DRAFT" && (
            <>
              <button
                type="button"
                disabled={rendering}
                onClick={onRender}
                className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {rendering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Kết xuất lại file
              </button>
              {!smartCaMode && (
                <button
                  type="button"
                  disabled={sending || !completeness?.complete || !hasReadyDoc}
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
            </>
          )}

          {latestDoc?.downloadUrl && (
            <a
              href={latestDoc.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file {latestDoc.documentType}
            </a>
          )}

          {latestDoc?.viewUrl && (
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/40 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              Xem trước
            </button>
          )}
        </div>
      </div>

      <ContractPdfViewerModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        document={latestDoc}
      />
    </>
  );
}
