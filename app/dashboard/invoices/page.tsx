"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import PaymentReceiptsPanel from "@/components/dashboard/invoices/PaymentReceiptsPanel";
import MembershipReceiptsPanel from "@/components/dashboard/invoices/MembershipReceiptsPanel";
import { safeResourceId } from "@/lib/payment-module";

function History() {
  const params = useSearchParams();
  const contractId = safeResourceId(params.get("contract")) ?? undefined;
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const [tab, setTab] = useState<"rent" | "membership">(
    params.get("tab") === "membership" ? "membership" : "rent",
  );
  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <div role="tablist" aria-label="Loại lịch sử thanh toán" className="flex gap-2">
        {([["rent", "Thuê nhà"], ["membership", "Gói hội viên"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${tab === key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "membership" ? (
        <MembershipReceiptsPanel />
      ) : !role ? (
        <button type="button" onClick={openRolePicker} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
          Chọn vai trò để xem lịch sử thanh toán
        </button>
      ) : (
        <>
          {contractId && (
            <p className="text-sm text-muted-foreground">
              Đang lọc theo một hợp đồng.{" "}
              <Link href="/dashboard/invoices" className="font-semibold text-primary">Xem tất cả</Link>
            </p>
          )}
          <PaymentReceiptsPanel key={role + ":" + (contractId ?? "")} role={role} contractId={contractId} />
        </>
      )}
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
