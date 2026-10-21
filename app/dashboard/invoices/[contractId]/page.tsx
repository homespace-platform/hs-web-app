"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import MonthlyInvoicesSection from "@/components/contract/detail/MonthlyInvoicesSection";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import ContractLifecyclePanel from "@/components/contract/detail/ContractLifecyclePanel";
import { DepositAdjustmentPayments } from "@/components/contract/detail/SettlementPaymentPanel";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { useAuth } from "@/features/auth/useAuth";
import { contractService } from "@/services/contract.service";
import { contractDetailPath } from "@/lib/contract-routes";
import { contractStateLabels, paymentSections, paymentSection, paymentModulePath } from "@/lib/payment-module";
import type { ContractResponse, ContractRevisionResponse } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";
const icons = [ReceiptText, RotateCcw];
function Loading() { return <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Đang tải hồ sơ thanh toán…</p>; }

function ContractInvoicesPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const params = useSearchParams();
  const section = paymentSection(params.get("section"));
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const { profile } = useAuth();
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const currentGeneration = ++generation.current;
    try {
      const [current, latest] = await Promise.all([contractService.getContract(contractId), contractService.getRevision(contractId)]);
      if (!current) throw new Error("Không tìm thấy hợp đồng.");
      if (currentGeneration === generation.current) { setContract(current); setRevision(latest); setError(null); }
    } catch (cause) {
      if (currentGeneration === generation.current) setError(getApiErrorMessage(cause, "Không thể mở hồ sơ thanh toán."));
    }
  }, [contractId]);
  useEffect(() => {
    const pending = generation;
    setContract(null); setRevision(null); setError(null);
    void refresh();
    return () => { pending.current++; };
  }, [refresh, role]);

  if (!hydrated) return <Loading />;
  if (!role) return <div className="rounded-xl border bg-card p-5 text-sm">Chọn vai trò để xem hóa đơn. <button type="button" onClick={openRolePicker} className="font-semibold text-primary underline">Chọn vai trò</button></div>;
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error === "Network Error" ? "Chưa kết nối được máy chủ. Kiểm tra kết nối và phiên đăng nhập rồi thử lại." : error} <button type="button" onClick={() => void refresh()} className="underline">Thử lại</button></div>;
  if (!contract || !revision || !profile?.id) return <Loading />;
  const isLandlord = role === "landlord" && profile.id === contract.landlordId;
  const isTenant = role === "tenant" && profile.id === contract.tenantId;
  if (!isLandlord && !isTenant) return <div className="rounded-xl border p-5">Hồ sơ này không thuộc vai trò hiện tại. <Link href="/dashboard/invoices" className="text-primary underline">Về danh sách</Link></div>;
  if (contract.parentContractId) return <div className="rounded-xl border p-5">Các khoản thanh toán được quản lý trên hợp đồng gốc. <Link href={paymentModulePath(contract.parentContractId, section)} className="font-semibold text-primary underline">Mở hồ sơ thanh toán hợp đồng gốc</Link></div>;
  const charges = revision.charges || [];
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />Tất cả hồ sơ thanh toán</Link>
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><ReceiptText className="size-5 text-primary" />Hóa đơn & thanh toán</h1><p className="mt-2 text-sm font-semibold">{contract.contractNumber}</p><p className="mt-1 text-sm text-muted-foreground">{contractStateLabels[contract.status]}</p></div>
      <Link href={contractDetailPath(role, contract.id)} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">Xem hợp đồng</Link>
    </header>
    <nav aria-label="Các mục thanh toán của hợp đồng" className="grid grid-cols-2 gap-2">{paymentSections.map((item, index) => {
      const Icon = icons[index], selected = section === item.id;
      return <Link key={item.id} href={paymentModulePath(contractId, item.id)} aria-current={selected ? "page" : undefined} className={selected ? "min-w-0 rounded-xl border border-primary bg-primary/5 p-3 ring-1 ring-primary sm:p-4" : "min-w-0 rounded-xl border bg-card p-3 hover:bg-muted/40 sm:p-4"}>
        <span className="flex flex-col items-center gap-2 text-center text-sm font-bold sm:flex-row sm:text-left"><Icon className="size-4 shrink-0 text-primary" />{item.title}</span><span className="mt-2 hidden text-sm text-muted-foreground sm:block">{item.description}</span>
      </Link>;
    })}</nav>
    {section === "monthly" && <MonthlyInvoicesSection key={role + ":" + contract.id}
      contractId={contract.id} rentalRequestId={contract.rentalRequestId} contractActive={contract.status === "ACTIVE"}
      isLandlord={isLandlord} isTenant={isTenant} showInitialPayment={false} requestedInvoiceId={params.get("invoice")} onUpdated={refresh}
      electricityRequired={charges.some(charge => charge.chargeType === "ELECTRICITY" && charge.billingMethod === "PER_KWH")}
      waterRequired={charges.some(charge => charge.billingMethod === "PER_M3")}
      unsupportedWaterRate={charges.some(charge => charge.billingMethod === "STATE_WATER_RATE" && charge.includedInRent !== true)}
      initialElectricity={revision.meters?.electricityInitial == null ? undefined : String(revision.meters.electricityInitial)}
      initialWater={revision.meters?.waterInitial == null ? undefined : String(revision.meters.waterInitial)} />}
    {section === "deposit" && <DepositAdjustmentPayments contractId={contract.id} isLandlord={isLandlord}/>}
    {section === "deposit" && <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} onUpdated={async()=>{await refresh();}} />}
    {section === "deposit" && (contract.status === "TERMINATED"
      ? <div className="rounded-xl border bg-card p-5 text-sm">Hợp đồng đã chấm dứt theo phương án xử lý riêng. Kiểm tra điều khoản và kết quả xử lý tiền cọc trong <Link href={contractDetailPath(role, contract.id)} className="text-primary underline">hồ sơ hợp đồng</Link>.</div>
      : ["ACTIVE","EXPIRED","CLOSED"].includes(contract.status) ? <ContractLifecyclePanel key={role + ":" + contract.id} contractId={contract.id} isLandlord={isLandlord} mode="settlement" onUpdated={refresh} /> : null)}
  </div>;
}
export default function Page() { return <Suspense fallback={<Loading />}><ContractInvoicesPage /></Suspense>; }
