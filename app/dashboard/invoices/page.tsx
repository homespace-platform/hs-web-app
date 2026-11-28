"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import PaymentReceiptsPanel from "@/components/dashboard/invoices/PaymentReceiptsPanel";
import MembershipReceiptsPanel from "@/components/dashboard/invoices/MembershipReceiptsPanel";
import { safeResourceId } from "@/lib/payment-module";
import { parsePage } from "@/lib/pagination";

function History() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const contractId = safeResourceId(params.get("contract")) ?? undefined;
  const { role, hydrated, openRolePicker } = useDashboardRole();
  const [refreshKey, setRefreshKey] = useState(0);
  // Tab and page live in the URL so refresh and back keep them.
  const tab = params.get("tab") === "membership" ? "membership" : "rent",
    page = parsePage(params.get("page"));
  const go = useCallback(
    (next: { tab?: "rent" | "membership"; page: number }, replace = false) => {
      const q = new URLSearchParams(params.toString());
      if (next.tab) q.set("tab", next.tab);
      if (next.page > 1) q.set("page", String(next.page));
      else q.delete("page");
      const url = `${pathname}?${q.toString()}`;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [params, pathname, router],
  );
  // Stable reference: panels reload when it changes. A clamped page replaces the history entry (replace=true).
  const onPage = useCallback((p: number, replace?: boolean) => go({ page: p }, replace), [go]);
  if (!hydrated) return <p className="text-sm text-muted-foreground">Đang tải vai trò…</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Lịch sử thanh toán</h1>
        <button
          type="button"
          onClick={() => setRefreshKey((v) => v + 1)}
          className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-semibold"
        >
          <RefreshCw className="size-4" />
          Làm mới
        </button>
      </div>
      <div role="tablist" aria-label="Loại lịch sử thanh toán" className="flex gap-2">
        {([["rent", "Thuê nhà"], ["membership", "Gói hội viên"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => tab !== key && go({ tab: key, page: 1 })}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${tab === key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "membership" ? (
        <>
          <PolicyNotice tone="neutral" title="Biên nhận gói hội viên" summary="Mỗi giao dịch gói hội viên đã thanh toán có một biên nhận riêng.">
            <p>Mỗi giao dịch gói hội viên đã thanh toán có một biên nhận riêng. Dữ liệu trên biên nhận được giữ nguyên để đối chiếu.</p>
          </PolicyNotice>
          <MembershipReceiptsPanel page={page} onPage={onPage} refreshKey={refreshKey} />
        </>
      ) : !role ? (
        <button type="button" onClick={openRolePicker} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
          Chọn vai trò để xem lịch sử thanh toán
        </button>
      ) : (
        <>
          <PolicyNotice tone="neutral" title="Lịch sử thanh toán" summary="Mỗi khoản tiền đã được bên nhận xác nhận có một phiếu riêng.">
            <p>Mỗi khoản tiền đã được bên nhận xác nhận có một phiếu riêng. Dữ liệu trên phiếu được giữ nguyên để đối chiếu.</p>
          </PolicyNotice>
          {contractId && (
            <p className="text-sm text-muted-foreground">
              Đang lọc theo một hợp đồng.{" "}
              <Link href="/dashboard/invoices" className="font-semibold text-primary">Xem tất cả</Link>
            </p>
          )}
          <PaymentReceiptsPanel key={role + ":" + (contractId ?? "")} role={role} contractId={contractId} page={page} onPage={onPage} refreshKey={refreshKey} />
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
