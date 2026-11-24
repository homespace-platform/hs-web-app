"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MonthlyInvoicesSection from "@/components/contract/detail/MonthlyInvoicesSection";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";
import { paymentModulePath, safeInvoiceSelectionId } from "@/lib/payment-module";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import type { ContractResponse, ContractRevisionResponse } from "@/types/contract.type";
import DepositSettlementPanel from "./DepositSettlementPanel";
import { Card } from "./ui";

/**
 * "Thanh toán & cọc". Lease (HĐ thuê): rent invoices of the period. Deposit agreement (HĐ cọc): the deposit payment,
 * adjustments and refund. The URL (?invoice=<id>) selects a rent invoice.
 */
export default function PaymentTab({ contract, revision, isLandlord, preActive, initialPayment, onUpdated, onSnapshot }: {
  contract: ContractResponse;
  /** Current revision the page already loaded (charges, initial meters); absent for deposit agreements. */
  revision?: ContractRevisionResponse | null;
  isLandlord: boolean;
  /** Pre-tenancy: deposit and first-rent payments are handled here (onboarding). */
  preActive: boolean;
  /** Read-only ledger of the first payment (lease only). */
  initialPayment?: ReactNode;
  onUpdated: () => Promise<void>;
  onSnapshot: (view: RentalOnboarding) => void;
}) {
  const params = useSearchParams();
  // An explicit but malformed ?invoice= stays a distinct request (neutral not-found), never "no request".
  const rawInvoice = params.get("invoice")?.trim() || null;
  const requestedInvoiceId = safeInvoiceSelectionId(rawInvoice);
  const charges = revision?.charges ?? [];
  return (
    <>
      {preActive ? (
        <RentalOnboardingPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} showDepositAgreement={false} sections={["payments"]} onSnapshot={onSnapshot} onUpdated={onUpdated} />
      ) : contract.parentContractId ? (
        <Card><p className="text-sm">Các khoản thanh toán được quản lý trên hợp đồng gốc. <Link href={paymentModulePath(contract.parentContractId, "monthly")} className="font-semibold text-primary underline">Mở thanh toán & hóa đơn của hợp đồng gốc</Link></p></Card>
      ) : (
        <MonthlyInvoicesSection key={contract.id}
          contractId={contract.id} rentalRequestId={contract.rentalRequestId} contractActive={contract.status === "ACTIVE"}
          isLandlord={isLandlord} isTenant={!isLandlord} requestedInvoiceId={requestedInvoiceId} invalidInvoiceRequest={requestedInvoiceId ? null : rawInvoice} onUpdated={onUpdated}
          electricityRequired={charges.some(charge => charge.chargeType === "ELECTRICITY" && charge.billingMethod === "PER_KWH")}
          waterRequired={charges.some(charge => charge.billingMethod === "PER_M3")}
          unsupportedWaterRate={charges.some(charge => charge.billingMethod === "STATE_WATER_RATE" && charge.includedInRent !== true)}
          initialElectricity={revision?.meters?.electricityInitial == null ? undefined : String(revision.meters.electricityInitial)}
          initialWater={revision?.meters?.waterInitial == null ? undefined : String(revision.meters.waterInitial)} />
      )}
      {preActive && contract.agreementKind === "DEPOSIT" ? <DepositSettlementPanel rentalRequestId={contract.rentalRequestId} isLandlord={isLandlord} onUpdated={onUpdated} /> : null}
      {initialPayment}
    </>
  );
}
