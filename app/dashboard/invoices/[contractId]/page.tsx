"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { paymentModulePath, paymentSection, safeInvoiceSelectionId, safeResourceId } from "@/lib/payment-module";

// Legacy URL (old notifications/bookmarks): payments now live in the contract page's "Thanh toán & cọc" tab.
function Redirect() {
  const router = useRouter();
  const { contractId: rawContractId } = useParams<{ contractId: string }>();
  const params = useSearchParams();
  const contractId = safeResourceId(typeof rawContractId === "string" ? rawContractId : null);
  // A malformed ?invoice= is forwarded as-is so the invoice list still shows its neutral not-found, never "no request".
  const rawInvoice = params.get("invoice")?.trim() || null;
  const invoice = safeInvoiceSelectionId(rawInvoice) ?? rawInvoice ?? undefined;
  const target = contractId ? paymentModulePath(contractId, paymentSection(params.get("section")), invoice) : null;
  useEffect(() => { if (target) router.replace(target); }, [target, router]);
  if (!target) return <div role="status" className="rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">Không tìm thấy hợp đồng này hoặc bạn không có quyền xem. <Link href="/dashboard/contracts" className="font-semibold text-primary underline">Về danh sách hợp đồng</Link></div>;
  return <p role="status" className="p-5 text-sm text-muted-foreground">Đang mở thanh toán & hóa đơn…</p>;
}
export default function Page() { return <Suspense fallback={null}><Redirect /></Suspense>; }
