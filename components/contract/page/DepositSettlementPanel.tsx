"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import ContractLifecyclePanel from "@/components/contract/detail/ContractLifecyclePanel";
import { DepositAdjustmentPayments } from "@/components/contract/detail/SettlementPaymentPanel";
import { contractDetailPath } from "@/lib/contract-routes";
import { paymentQuery } from "@/lib/payment-module";
import { contractService } from "@/services/contract.service";
import type { ContractResponse } from "@/types/contract.type";

/**
 * Deposit adjustments and the deposit settlement/refund of a deposit agreement (HĐ cọc). Both belong to the lease of the
 * same rental request, so the lease is looked up once with the existing by-rental-request read; no lease means nothing to settle yet.
 */
export default function DepositSettlementPanel({ rentalRequestId, isLandlord, onUpdated }: {
  rentalRequestId: string;
  isLandlord: boolean;
  onUpdated: () => Promise<void>;
}) {
  const [lease, setLease] = useState<ContractResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    contractService.getByRentalRequest(rentalRequestId)
      .then((found) => { if (live) { setLease(found?.agreementKind || found?.parentContractId ? null : found); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [rentalRequestId, attempt]);
  const refreshed = useCallback(async () => { await onUpdated(); setAttempt((n) => n + 1); }, [onUpdated]);

  if (failed && !lease) return <div role="alert" className="rounded-2xl border border-border bg-card p-4 text-sm">
    Chưa tải được hợp đồng thuê để xử lý hoàn cọc. <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary underline">Thử lại</button>
  </div>;
  if (!lease) return null;
  const side = isLandlord ? "landlord" : "tenant";
  return <>
    <DepositAdjustmentPayments contractId={lease.id} isLandlord={isLandlord} />
    {lease.status === "TERMINATED"
      ? <section className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm sm:p-5">
          <h2 className="text-base font-bold">Hợp đồng thuê đã chấm dứt</h2>
          <PolicyNotice tone="neutral" title="Cọc khi hợp đồng đã chấm dứt" summary="Cọc được xử lý theo phương án chấm dứt; xem sổ cọc ở trên."><p>Hợp đồng thuê đã chấm dứt theo phương án xử lý riêng, không qua bước quyết toán hoàn cọc thông thường. Tình trạng và căn cứ xử lý tiền cọc nằm ở sổ cọc phía trên. Các hóa đơn còn nợ vẫn phải thanh toán ở mục Hóa đơn thuê của hợp đồng thuê.</p></PolicyNotice>
          <div className="flex flex-wrap gap-2">
            <Link href={`${contractDetailPath(side, lease.id)}?${paymentQuery("monthly")}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">Xem hóa đơn còn nợ →</Link>
            <Link href={`${contractDetailPath(side, lease.id)}?tab=end`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold hover:bg-muted">Xem kết quả chấm dứt</Link>
          </div>
        </section>
      : ["ACTIVE", "EXPIRED", "CLOSED"].includes(lease.status)
        ? <ContractLifecyclePanel contractId={lease.id} isLandlord={isLandlord} mode="settlement" showLedger={false} onUpdated={refreshed} /> : null}
  </>;
}
