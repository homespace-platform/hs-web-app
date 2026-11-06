"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import PaymentReceiptsPanel from "@/components/dashboard/invoices/PaymentReceiptsPanel";

function Receipts() {
  const params = useSearchParams();
  const { role, hydrated, openRolePicker } = useDashboardRole();
  if (!hydrated) return <p>Đang tải vai trò…</p>;
  if (!role)
    return (
      <button type="button" onClick={openRolePicker}>
        Chọn vai trò để xem chứng từ thanh toán
      </button>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <Link
        href="/dashboard/invoices"
        className="text-sm font-semibold text-primary"
      >
        ← Hóa đơn & thanh toán
      </Link>
      <PaymentReceiptsPanel
        key={role + ":" + (params.get("contract") ?? "")}
        role={role}
        contractId={params.get("contract") || undefined}
      />
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Đang tải chứng từ…</p>}>
      <Receipts />
    </Suspense>
  );
}
