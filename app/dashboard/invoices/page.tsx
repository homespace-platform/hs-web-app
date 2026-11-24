"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import PaymentReceiptsPanel from "@/components/dashboard/invoices/PaymentReceiptsPanel";
import { safeResourceId } from "@/lib/payment-module";

function History() {
  const contractId = safeResourceId(useSearchParams().get("contract")) ?? undefined;
  const { role, hydrated, openRolePicker } = useDashboardRole();
  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  if (!role)
    return (
      <button type="button" onClick={openRolePicker} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
        Chọn vai trò để xem lịch sử thanh toán
      </button>
    );
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      {contractId && (
        <p className="text-sm text-muted-foreground">
          Đang lọc theo một hợp đồng.{" "}
          <Link href="/dashboard/invoices" className="font-semibold text-primary">Xem tất cả</Link>
        </p>
      )}
      <PaymentReceiptsPanel key={role + ":" + (contractId ?? "")} role={role} contractId={contractId} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải lịch sử thanh toán…</p>}>
      <History />
    </Suspense>
  );
}
