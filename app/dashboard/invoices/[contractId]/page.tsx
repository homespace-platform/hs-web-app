"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import MonthlyInvoicesSection from "@/components/contract/detail/MonthlyInvoicesSection";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { useAuth } from "@/features/auth/useAuth";
import { contractService } from "@/services/contract.service";
import { contractDetailPath } from "@/lib/contract-routes";
import type { ContractResponse, ContractRevisionResponse } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";

export default function ContractInvoicesPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const { profile } = useAuth();
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [revision, setRevision] = useState<ContractRevisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) return;
    let live = true;
    setContract(null);
    setRevision(null);
    setError(null);
    void (async () => {
      try {
        const current = await contractService.getContract(contractId);
        if (!current) throw new Error("Không tìm thấy hợp đồng.");
        const latest = await contractService.getRevision(contractId);
        if (live) { setContract(current); setRevision(latest); }
      } catch (cause) {
        if (live) setError(getApiErrorMessage(cause, "Không thể mở hóa đơn."));
      }
    })();
    return () => { live = false; };
  }, [contractId]);

  if (!hydrated) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</div>;
  if (!role) return <div className="rounded-xl border border-border bg-card p-5 text-sm">Chọn vai trò để xem hóa đơn. {" "}<button type="button" onClick={openRolePicker} className="font-semibold text-primary underline">Chọn vai trò</button></div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error} <Link href="/dashboard/invoices" className="font-semibold underline">Về danh sách</Link></div>;
  if (!contract || !revision) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải hóa đơn…</div>;
  if (!profile?.id) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang xác thực tài khoản…</div>;

  const isLandlord = role === "landlord" && profile?.id === contract.landlordId;
  const isTenant = role === "tenant" && profile?.id === contract.tenantId;
  if (!isLandlord && !isTenant) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Hợp đồng này không thuộc vai trò {role === "landlord" ? "cho thuê" : "đi thuê"} của bạn. <Link href="/dashboard/invoices" className="font-semibold underline">Về danh sách hóa đơn</Link></div>;
  if (contract.status !== "ACTIVE" && contract.status !== "TERMINATED") return <div className="rounded-xl border border-border bg-card p-5 text-sm">Hóa đơn chỉ xuất hiện khi hợp đồng có hiệu lực. <Link href={contractDetailPath(role, contract.id)} className="font-semibold text-primary underline">Xem hợp đồng</Link></div>;

  const charges = revision.charges || [];
  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <div className="rounded-2xl border border-border bg-card p-4">
      <Link href="/dashboard/invoices" className="text-xs font-semibold text-primary hover:underline">← Danh sách hóa đơn</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-bold">Hóa đơn · {contract.contractNumber}</h1><p className="text-xs text-muted-foreground">{role === "landlord" ? "Quản lý hóa đơn cho thuê" : "Theo dõi hóa đơn đi thuê"}</p></div>
        <Link href={contractDetailPath(role, contract.id)} className="text-xs font-semibold text-primary hover:underline">Xem hợp đồng →</Link>
      </div>
    </div>
    <MonthlyInvoicesSection
      contractId={contract.id}
      contractActive={contract.status === "ACTIVE"}
      isLandlord={isLandlord}
      isTenant={isTenant}
      electricityRequired={charges.some((charge) => charge.chargeType === "ELECTRICITY" && charge.billingMethod === "PER_KWH")}
      waterRequired={charges.some((charge) => charge.billingMethod === "PER_M3")}
      unsupportedWaterRate={charges.some((charge) => charge.billingMethod === "STATE_WATER_RATE" && charge.includedInRent !== true)}
      initialElectricity={revision.meters?.electricityInitial == null ? undefined : String(revision.meters.electricityInitial)}
      initialWater={revision.meters?.waterInitial == null ? undefined : String(revision.meters.waterInitial)}
    />
  </div>;
}
