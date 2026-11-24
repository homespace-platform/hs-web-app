import { Suspense } from "react";
import ContractDetailView from "@/components/contract/ContractDetailView";
import { ContractPageSkeleton } from "@/components/contract/page/ui";

export default function LandlordContractDetailPage() {
  return (
    <Suspense fallback={<ContractPageSkeleton />}>
      <ContractDetailView perspective="landlord" />
    </Suspense>
  );
}
