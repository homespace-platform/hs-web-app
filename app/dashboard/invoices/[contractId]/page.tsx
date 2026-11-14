"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import MonthlyInvoicesSection from "@/components/contract/detail/MonthlyInvoicesSection";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import ContractLifecyclePanel from "@/components/contract/detail/ContractLifecyclePanel";
import { DepositAdjustmentPayments } from "@/components/contract/detail/SettlementPaymentPanel";
import { useAuth } from "@/features/auth/useAuth";
import { useAgreementChangeSync } from "@/hooks/useAgreementChangeSync";
import { contractService } from "@/services/contract.service";
import { contractDetailPath } from "@/lib/contract-routes";
import { contractStateLabels, paymentSections, paymentSection, paymentModulePath, safeInvoiceSelectionId, safeResourceId, type PaymentSection } from "@/lib/payment-module";
import type { ContractResponse, ContractRevisionResponse } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";
const icons = [ReceiptText, RotateCcw];
function Loading() { return <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải hồ sơ thanh toán…</p>; }
function NotFound() { return <div role="status" className="rounded-xl border p-5 text-sm">Không tìm thấy hồ sơ thanh toán hoặc bạn không có quyền xem hồ sơ này. <Link href="/dashboard/invoices" className="text-primary underline">Về danh sách</Link></div>; }

// Auth + untrusted path/query are resolved here; the body is keyed by verified account AND contract so
// data never carries over, while an ?invoice= / ?section= change only re-renders (drafts stay mounted).
function ContractInvoicesPage() {
  const { contractId: rawContractId } = useParams<{ contractId: string }>();
  const params = useSearchParams();
  const { initialized, authenticated, userId, login } = useAuth();
  if (!initialized) return <Loading />;
  if (!authenticated || !userId) return <div className="mx-auto max-w-xl py-12"><div className="space-y-4 rounded-3xl border bg-card p-8 text-center shadow-sm">
    <h1 className="text-lg font-extrabold">Đăng nhập để xem hóa đơn & thanh toán</h1>
    <p className="text-sm text-muted-foreground">Hồ sơ thanh toán chỉ hiển thị cho các bên của hợp đồng.</p>
    <button type="button" onClick={() => login(`${window.location.pathname}${window.location.search}${window.location.hash}`)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Đăng nhập</button>
  </div></div>;
  const contractId = safeResourceId(typeof rawContractId === "string" ? rawContractId : null);
  if (!contractId) return <NotFound />;
  // An explicit but malformed ?invoice= stays a distinct request (neutral not-found), never "no request".
  const rawInvoice = params.get("invoice")?.trim() || null;
  const requestedInvoiceId = safeInvoiceSelectionId(rawInvoice);
  return <InvoicesBody key={`${userId}:${contractId}`} actorId={userId} contractId={contractId}
    section={paymentSection(params.get("section"))} requestedInvoiceId={requestedInvoiceId} invalidInvoiceRequest={requestedInvoiceId ? null : rawInvoice} />;
}

function InvoicesBody({ actorId, contractId, section, requestedInvoiceId, invalidInvoiceRequest = null }: {
  actorId: string; contractId: string; section: PaymentSection; requestedInvoiceId: string | null; invalidInvoiceRequest?: string | null;
}) {
  const [data, setData] = useState<{ contract: ContractResponse; revision: ContractRevisionResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const aliveRef = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);
  const hasDataRef = useRef(false);
  // One contract+revision read at a time; callers arriving meanwhile share it and get one fresh follow-up,
  // so several panels finishing an action cannot storm the API or let an older read overwrite a newer one.
  const refresh = useCallback((): Promise<void> => {
    if (!aliveRef.current) return Promise.resolve(); // stale callback after unmount
    if (inflightRef.current) { dirtyRef.current = true; return inflightRef.current; }
    let done = false; // a body that finishes synchronously must not leave a settled promise in inflightRef
    const run = (async () => {
      try {
        do {
          dirtyRef.current = false;
          try {
            const [contract, revision] = await Promise.all([contractService.getContract(contractId), contractService.getRevision(contractId)]);
            if (!aliveRef.current) return;
            if (!contract) throw new Error("Không tìm thấy hợp đồng.");
            hasDataRef.current = true;
            setData({ contract, revision }); setError(null); setStale(false);
          } catch (cause) {
            if (!aliveRef.current) return;
            // Keep what is shown; only an empty page gets the blocking error.
            if (hasDataRef.current) setStale(true);
            else setError(getApiErrorMessage(cause, "Không thể mở hồ sơ thanh toán."));
          }
        } while (dirtyRef.current);
      } finally { done = true; inflightRef.current = null; }
    })();
    if (!done) inflightRef.current = run;
    return run;
  }, [contractId]);
  useEffect(() => { aliveRef.current = true; void refresh(); return () => { aliveRef.current = false; }; }, [refresh]);
  useAgreementChangeSync(id => !id || id === contractId, refresh);

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error === "Network Error" ? "Chưa kết nối được máy chủ. Kiểm tra kết nối và phiên đăng nhập rồi thử lại." : error} <button type="button" onClick={() => { setError(null); void refresh(); }} className="underline">Thử lại</button></div>;
  if (!data) return <Loading />;
  const { contract, revision } = data;
  // Sides come from the verified account vs the persisted parties, not the stored dashboard role; the backend still authorizes every call.
  const isLandlord = actorId === contract.landlordId;
  const isTenant = actorId === contract.tenantId;
  if (contract.id !== contractId || (!isLandlord && !isTenant)) return <NotFound />;
  if (contract.parentContractId) return <div className="rounded-xl border p-5">Các khoản thanh toán được quản lý trên hợp đồng gốc. <Link href={paymentModulePath(contract.parentContractId, section, requestedInvoiceId ?? invalidInvoiceRequest ?? undefined)} className="font-semibold text-primary underline">Mở hồ sơ thanh toán hợp đồng gốc</Link></div>;
  const side = isLandlord ? "landlord" : "tenant";
  const charges = revision.charges || [];
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />Tất cả hồ sơ thanh toán</Link>
    {stale && <div role="status" className="flex items-center justify-between gap-2 rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground"><span>Chưa cập nhật được dữ liệu hợp đồng mới nhất.</span><button type="button" onClick={() => void refresh()} className="font-semibold text-primary hover:underline">Tải lại</button></div>}
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><ReceiptText className="size-5 text-primary" />Hóa đơn & thanh toán</h1><p className="mt-2 text-sm font-semibold">{contract.contractNumber}</p><p className="mt-1 text-sm text-muted-foreground">{contractStateLabels[contract.status]}</p></div>
      <Link href={contractDetailPath(side, contract.id)} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Xem hợp đồng</Link>
    </header>
    <Link href={`/dashboard/invoices/receipts?contract=${encodeURIComponent(contract.id)}`} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">Xem / tải chứng từ đã thanh toán →</Link>
    <nav aria-label="Các mục thanh toán của hợp đồng" className="grid grid-cols-2 gap-2">{paymentSections.map((item, index) => {
      const Icon = icons[index], selected = section === item.id;
      return <Link key={item.id} href={paymentModulePath(contractId, item.id)} aria-current={selected ? "page" : undefined} className={selected ? "min-w-0 rounded-xl border border-primary bg-primary/5 p-3 ring-1 ring-primary sm:p-4" : "min-w-0 rounded-xl border bg-card p-3 hover:bg-muted/40 sm:p-4"}>
        <span className="flex flex-col items-center gap-2 text-center text-sm font-bold sm:flex-row sm:text-left"><Icon className="size-4 shrink-0 text-primary" />{item.title}</span><span className="mt-2 hidden text-sm text-muted-foreground sm:block">{item.description}</span>
      </Link>;
    })}</nav>
    {section === "monthly" && <MonthlyInvoicesSection key={contract.id}
      contractId={contract.id} rentalRequestId={contract.rentalRequestId} contractActive={contract.status === "ACTIVE"}
      isLandlord={isLandlord} isTenant={isTenant} showInitialPayment={false} requestedInvoiceId={requestedInvoiceId} invalidInvoiceRequest={invalidInvoiceRequest} onUpdated={refresh}
      electricityRequired={charges.some(charge => charge.chargeType === "ELECTRICITY" && charge.billingMethod === "PER_KWH")}
      waterRequired={charges.some(charge => charge.billingMethod === "PER_M3")}
      unsupportedWaterRate={charges.some(charge => charge.billingMethod === "STATE_WATER_RATE" && charge.includedInRent !== true)}
      initialElectricity={revision.meters?.electricityInitial == null ? undefined : String(revision.meters.electricityInitial)}
      initialWater={revision.meters?.waterInitial == null ? undefined : String(revision.meters.waterInitial)} />}
    {section === "deposit" && <DepositAdjustmentPayments key={contract.id} contractId={contract.id} isLandlord={isLandlord}/>}
    {section === "deposit" && <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showComplaints={!(["ACTIVE","EXPIRED","CLOSED"].includes(contract.status))} onUpdated={async()=>{await refresh();}} />}
    {section === "deposit" && (contract.status === "TERMINATED"
      ? <div className="rounded-xl border bg-card p-5 text-sm">Hợp đồng đã chấm dứt theo phương án xử lý riêng. Kiểm tra điều khoản và kết quả xử lý tiền cọc trong <Link href={contractDetailPath(side, contract.id)} className="text-primary underline">hồ sơ hợp đồng</Link>.</div>
      : ["ACTIVE","EXPIRED","CLOSED"].includes(contract.status) ? <ContractLifecyclePanel key={contract.id} contractId={contract.id} isLandlord={isLandlord} mode="settlement" onUpdated={refresh} /> : null)}
  </div>;
}
export default function Page() { return <Suspense fallback={<Loading />}><ContractInvoicesPage /></Suspense>; }
