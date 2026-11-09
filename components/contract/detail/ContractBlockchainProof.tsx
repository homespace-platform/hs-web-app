"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { contractBlockchainService } from "@/services/contract-blockchain.service";
import { blockchainProofPending, blockchainTransactionUrl, hashPdfForProof } from "@/lib/contract-blockchain-proof";
import { documentTime } from "@/lib/contract-document-history";
import type { ContractBlockchainProofResponse, DocumentIntegrityResponse } from "@/types/blockchain.type";
import type { ContractDocumentResponse } from "@/types/contract.type";

const buttonClass = "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
type Verification = { status: "idle" | "busy" | "match" | "mismatch" | "missing" | "error"; fileName?: string; message?: string };
const labels = {
  NOT_AVAILABLE: "Chưa có bằng chứng blockchain",
  PENDING: "Đang chờ ghi nhận blockchain",
  SUBMITTED: "Đang chờ xác nhận blockchain",
  CONFIRMED: "Đã ghi nhận trên blockchain",
  FAILED: "Ghi nhận blockchain chưa thành công",
};
const integrityLabels: Record<DocumentIntegrityResponse["status"], string> = {
  MATCH: "PDF đang lưu khớp bản đã ghi nhận trên blockchain.",
  MISMATCH: "PDF đang lưu không khớp bản đã ký. Tệp này bị chặn xem/tải để đối soát.",
  PENDING: "PDF đang lưu khớp bản lúc ký; chưa xác nhận đầy đủ trên blockchain.",
  NOT_AVAILABLE: "Chưa có dữ liệu đối chiếu cho PDF cũ. Tài liệu chưa được xác thực blockchain.",
  UNAVAILABLE: "Tạm thời chưa xác thực được PDF. Lỗi kết nối không có nghĩa file bị sửa.",
  MISSING: "Không tìm thấy PDF đang lưu. Hệ thống cần kiểm tra hoặc khôi phục tài liệu.",
};

function ProofForDocument({ document: doc }: { document: ContractDocumentResponse }) {
  const [proof, setProof] = useState<ContractBlockchainProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [verification, setVerification] = useState<Verification>({ status: "idle" });
  const [integrity, setIntegrity] = useState<DocumentIntegrityResponse | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(true);
  const [integrityError, setIntegrityError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const verifyRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false, inFlight = false;
    let lastStatus: ContractBlockchainProofResponse["status"] | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    const schedule = () => {
      if (!disposed && document.visibilityState === "visible" && blockchainProofPending(lastStatus)) timer = setTimeout(() => void load(), 8000);
    };
    async function load() {
      if (disposed || inFlight || document.visibilityState !== "visible") return;
      clearTimeout(timer);
      inFlight = true;
      request = new AbortController();
      setLoading(true);
      try {
        const next = await contractBlockchainService.getProof(doc.id, request.signal);
        if (disposed) return;
        if (next.documentId !== doc.id || next.contractId !== doc.contractId || next.revisionId !== doc.revisionId) throw new Error("PROOF_DOCUMENT_MISMATCH");
        lastStatus = next.status;
        setProof(next);
        setLoadError("");
      } catch {
        if (!disposed) setLoadError("Chưa tải được bằng chứng blockchain. Lỗi kết nối không có nghĩa PDF đã ký bị sai.");
      } finally {
        inFlight = false;
        if (!disposed) { setLoading(false); schedule(); }
      }
    }
    const visibilityChanged = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible" && (lastStatus === null || blockchainProofPending(lastStatus))) void load();
    };
    void load();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      disposed = true;
      clearTimeout(timer);
      request?.abort();
      verifyRequest.current?.abort();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [doc.id, doc.contractId, doc.revisionId, refresh]);

  const readyToCheck = !!proof || !!loadError;
  const confirmed = proof?.status === "CONFIRMED";
  useEffect(() => {
    if (!readyToCheck) return;
    const request = new AbortController();
    async function check() {
      setIntegrityLoading(true);
      setIntegrity(null);
      try {
        const result = await contractBlockchainService.checkIntegrity(doc.id, request.signal);
        if (request.signal.aborted) return;
        if (result.documentId !== doc.id) throw new Error("INTEGRITY_DOCUMENT_MISMATCH");
        setIntegrity(result);
        setIntegrityError("");
      } catch {
        if (!request.signal.aborted) setIntegrityError("Chưa kiểm tra được PDF đang lưu. Hãy thử lại; lỗi kết nối không có nghĩa file không khớp.");
      } finally { if (!request.signal.aborted) setIntegrityLoading(false); }
    }
    void check();
    return () => request.abort();
  }, [doc.id, doc.revisionId, readyToCheck, confirmed, refresh]);

  async function verifyFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !proof || proof.status !== "CONFIRMED" || loading || loadError) return;
    verifyRequest.current?.abort();
    const request = new AbortController();
    verifyRequest.current = request;
    setVerification({ status: "busy", fileName: file.name });
    try {
      const hash = await hashPdfForProof(file);
      if (request.signal.aborted) return;
      const result = await contractBlockchainService.verify(doc.id, hash, request.signal);
      if (request.signal.aborted) return;
      if (result.documentId !== doc.id || result.onChainDocumentId !== proof.onChainDocumentId
          || result.chainId !== proof.chainId || result.registryAddress.toLowerCase() !== proof.registryAddress?.toLowerCase()) throw new Error("Kết quả không thuộc bằng chứng đang xem. Hãy tải lại và đối chiếu lại.");
      setVerification({ status: !result.registered ? "missing" : result.matches ? "match" : "mismatch", fileName: file.name });
    } catch (failure) {
      if (!request.signal.aborted) setVerification({ status: "error", fileName: file.name, message: failure instanceof Error && !('isAxiosError' in failure) ? failure.message : "Chưa đối chiếu được với blockchain. Hãy thử lại; lỗi kết nối không phải kết quả hash không khớp." });
    }
  }

  const explorer = blockchainTransactionUrl(proof?.chainId, proof?.transactionHash);
  const verifying = verification.status === "busy";
  return <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Bằng chứng blockchain của PDF đã ký">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-1">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheck className="h-4 w-4"/>Bằng chứng blockchain</h4>
        <p className="text-xs" role="status">{proof ? labels[proof.status] : loading ? "Đang tải bằng chứng…" : "Chưa kiểm tra được bằng chứng"}</p>
      </div>
      <button type="button" onClick={() => { setVerification({ status: "idle" }); setRefresh(n => n + 1); }} disabled={loading || verifying || integrityLoading} className={buttonClass}><RefreshCw className="h-3.5 w-3.5"/>Kiểm tra lại</button>
    </div>
    <p className="text-xs text-muted-foreground">Ghi nhận hash của đúng PDF đã ký đủ hai bên để đối chiếu về sau. Tệp PDF được giữ riêng tư.</p>
    {loadError && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">{loadError}</p>}
    <div className="space-y-1 border-t pt-3 text-xs" aria-label="Tính toàn vẹn của PDF đang lưu">
      <p className="font-semibold">PDF đang lưu</p>
      {integrityLoading ? <p role="status">Đang kiểm tra tài liệu…</p> : integrityError ? <p role="alert" className="text-amber-800 dark:text-amber-300">{integrityError}</p> : integrity && <>
        <p role={integrity.status === "MISMATCH" || integrity.status === "MISSING" ? "alert" : "status"} className={integrity.status === "MATCH" ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}>{integrityLabels[integrity.status]}</p>
        <p className="text-muted-foreground">Kiểm tra lúc: {documentTime(integrity.checkedAt)}</p>
      </>}
    </div>
    {proof?.status === "NOT_AVAILABLE" && <p className="text-xs text-muted-foreground">Tài liệu này chưa có proof. PDF đã ký vẫn xem và tải bình thường.</p>}
    {proof?.status === "FAILED" && <p className="text-xs text-amber-800 dark:text-amber-300">PDF đã ký vẫn được lưu. Hệ thống cần kiểm tra việc ghi nhận blockchain; bạn không cần ký hay thanh toán lại.</p>}
    {proof && proof.status !== "NOT_AVAILABLE" && <div className="space-y-2 text-xs">
      <p>Mạng: {proof.chainId === 11155111 ? "Ethereum Sepolia (testnet)" : "Chưa xác định"}</p>
      {proof.status === "CONFIRMED" && <p>Ghi nhận lúc: {documentTime(proof.registeredAt)}</p>}
      {explorer && <a className="inline-flex items-center gap-1 font-semibold text-primary underline" href={explorer} target="_blank" rel="noopener noreferrer">Xem giao dịch trên Etherscan<ExternalLink className="h-3.5 w-3.5"/></a>}
      {proof.documentHash && <details><summary className="cursor-pointer font-semibold">Thông tin đối chiếu</summary><dl className="mt-2 space-y-2">
        <div><dt className="text-muted-foreground">SHA-256 của PDF đã ký</dt><dd className="break-all font-mono">{proof.documentHash}</dd></div>
        {proof.onChainDocumentId && <div><dt className="text-muted-foreground">ID tài liệu trên blockchain</dt><dd className="break-all font-mono">{proof.onChainDocumentId}</dd></div>}
        {proof.transactionHash && <div><dt className="text-muted-foreground">Mã giao dịch</dt><dd className="break-all font-mono">{proof.transactionHash}</dd></div>}
        {proof.blockNumber != null && <div><dt className="text-muted-foreground">Block ghi nhận</dt><dd>{proof.blockNumber}</dd></div>}
      </dl></details>}
    </div>}
    {proof?.status === "CONFIRMED" && <details className="space-y-2 border-t pt-3"><summary className="cursor-pointer text-xs font-semibold">Đối chiếu PDF từ bên ngoài</summary>
      <p className="text-xs text-muted-foreground">Dùng cho bản hợp đồng nhận qua email, Zalo hoặc lưu trên máy. PDF đang lưu trên hệ thống được kiểm tra tự động ở trên.</p>
      <input ref={input} type="file" accept="application/pdf,.pdf" aria-label="Chọn PDF để đối chiếu blockchain" className="hidden" onChange={event => void verifyFile(event)} disabled={verifying || loading || !!loadError}/>
      <button type="button" className={buttonClass} disabled={verifying || loading || !!loadError} onClick={() => input.current?.click()}>{verifying && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}{verifying ? "Đang đối chiếu…" : "Chọn PDF để đối chiếu"}</button>
      <p className="text-xs text-muted-foreground">Tính hash ngay trên máy bạn và chỉ gửi hash để đối chiếu, không upload PDF. Tối đa 20 MB.</p>
      {verification.fileName && <p className="break-all text-xs">Tệp: {verification.fileName}</p>}
      {verification.status === "match" && <p role="status" className="text-xs text-emerald-800 dark:text-emerald-300">Tệp khớp với hash đã ghi nhận trên blockchain.</p>}
      {verification.status === "mismatch" && <p role="status" className="text-xs text-amber-800 dark:text-amber-300">Tệp không khớp với hash đã ghi nhận. Hãy kiểm tra bạn đã chọn đúng PDF cuối đã ký.</p>}
      {verification.status === "missing" && <p role="status" className="text-xs text-amber-800 dark:text-amber-300">Chưa tìm thấy proof trên blockchain. Hãy làm mới bằng chứng trước khi đối chiếu lại.</p>}
      {verification.status === "error" && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">{verification.message}</p>}
    </details>}
  </section>;
}

export default function ContractBlockchainProof({ document: doc }: { document: ContractDocumentResponse }) {
  if (doc.documentType !== "PDF" || doc.purpose !== "SIGNED_FINAL" || doc.status !== "READY") return null;
  return <ProofForDocument key={`${doc.id}:${doc.revisionId}`} document={doc}/>;
}
