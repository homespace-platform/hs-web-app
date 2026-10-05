"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import { contractService } from "@/services/contract.service";
import { useAuth } from "@/features/auth/useAuth";

export default function LegacyContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { role, hydrated } = useDashboardRole();
  const { profile } = useAuth();
  useEffect(() => {
    if (!hydrated || !params.id || !profile?.id) return;
    let live = true;
    void contractService.getContract(String(params.id)).then((contract) => {
      if (!live) return;
      const actualRole = profile.id === contract.landlordId ? "landlord" : "tenant";
      router.replace(window.location.hash === "#monthly-invoices"
        ? invoiceDetailPath(String(params.id))
        : contractDetailPath(actualRole, String(params.id)));
    }).catch(() => {
      if (live) router.replace(`/dashboard/${role ?? "tenant"}/contracts`);
    });
    return () => { live = false; };
  }, [hydrated, role, params.id, profile?.id, router]);
  return <p className="text-sm text-muted-foreground">Đang mở hợp đồng…</p>;
}
