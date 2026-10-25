"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { ContractDocumentResponse, ContractResponse } from "@/types/contract.type";
import { contractDetailPath } from "@/lib/contract-routes";
import { loadAgreementPreview } from "@/lib/agreement-preview";
import { getApiErrorMessage } from "@/utils/apiError";
import ContractPdfViewerModal from "./detail/ContractPdfViewerModal";

const button = "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 hover:bg-muted";

/** Shared by request cards, the contract list and the lease detail page. */
export default function AgreementDocumentActions({ contract, perspective, showPrimary = true, showDetails = true }: {
  contract: ContractResponse;
  perspective: "landlord" | "tenant";
  showPrimary?: boolean;
  showDetails?: boolean;
}) {
  const [preview, setPreview] = useState<ContractDocumentResponse | null>(null);
  const [opening, setOpening] = useState(false);
  const request = useRef(0);
  const lock = useRef(false);
  useEffect(() => () => { ++request.current; }, [contract.id]);
  const deposit = contract.agreementKind === "DEPOSIT";
  async function open(id: string) {
    if (lock.current) return;
    lock.current = true;
    setOpening(true);
    const sequence = ++request.current;
    try {
      const result = await loadAgreementPreview(id, contractService);
      if (sequence !== request.current) return;
      if (!result.document.viewUrl && !result.document.downloadUrl) throw new Error("Tài liệu chưa có đường dẫn xem.");
      setPreview(result.document);
      if (result.depositFallback) toast.info("PDF hợp đồng thuê chưa sẵn sàng. Đang hiển thị hợp đồng cọc.");
    } catch (error) {
      if (sequence === request.current) toast.error(getApiErrorMessage(error, "Không thể mở hợp đồng. Vui lòng thử lại."));
    } finally {
      lock.current = false;
      if (sequence === request.current) setOpening(false);
    }
  }
  return <div className="flex flex-wrap items-center gap-2" aria-label="Tài liệu hợp đồng">
    {showPrimary && <button type="button" disabled={opening} onClick={() => void open(contract.id)} className={`${button} border-primary/30 bg-primary/5 text-primary hover:bg-primary/10`}>
      {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Eye className="h-3.5 w-3.5"/>}
      {opening ? "Đang mở…" : deposit ? "Xem HĐ cọc" : "Xem HĐ thuê"}
    </button>}
    {!deposit && contract.depositAgreementContractId && <button type="button" disabled={opening} onClick={() => void open(contract.depositAgreementContractId!)} className={button}>
      {opening && !showPrimary ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <FileText className="h-3.5 w-3.5"/>}Xem HĐ cọc
    </button>}
    {showDetails && <Link href={contractDetailPath(perspective, contract.id)} className={button}>
      {deposit ? contract.status === "ACTIVE" || contract.status === "CANCELLED" ? "Hồ sơ cọc" : "Ký / theo dõi HĐ cọc"
        : ["DRAFT", "PENDING_REVIEW", "LANDLORD_SIGNATURE_PENDING", "TENANT_SIGNATURE_PENDING"].includes(contract.status) ? "Chi tiết & ký HĐ thuê" : "Chi tiết HĐ thuê"}
    </Link>}
    <ContractPdfViewerModal isOpen={!!preview} document={preview} onClose={() => setPreview(null)}/>
  </div>;
}
