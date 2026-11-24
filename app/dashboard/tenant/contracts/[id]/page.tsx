import { Suspense } from "react";
import ContractDetailView from "@/components/contract/ContractDetailView";
import { ContractPageSkeleton } from "@/components/contract/page/ui";

export default function TenantContractDetailPage() {
  return (
    <Suspense fallback={<ContractPageSkeleton />}>
      <ContractDetailView perspective="tenant" />
    </Suspense>
  );
}
