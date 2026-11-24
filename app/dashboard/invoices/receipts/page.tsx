"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeResourceId } from "@/lib/payment-module";

// Legacy URL: the receipts list now lives at /dashboard/invoices (payment history).
function Redirect() {
  const router = useRouter();
  const contract = safeResourceId(useSearchParams().get("contract"));
  useEffect(() => {
    router.replace(contract ? `/dashboard/invoices?contract=${encodeURIComponent(contract)}` : "/dashboard/invoices");
  }, [router, contract]);
  return <p className="text-sm text-muted-foreground">Đang chuyển đến lịch sử thanh toán…</p>;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
