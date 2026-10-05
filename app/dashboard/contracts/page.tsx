"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { contractListPath } from "@/lib/contract-routes";

export default function LegacyContractsPage() {
  const router = useRouter();
  const { role, hydrated } = useDashboardRole();
  useEffect(() => {
    if (hydrated) router.replace(contractListPath(role ?? "tenant"));
  }, [hydrated, role, router]);
  return <p className="text-sm text-muted-foreground">Đang mở danh sách hợp đồng…</p>;
}
