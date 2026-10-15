"use client";
import Link from "next/link";
import { ArrowUpRight, ReceiptText, RotateCcw, Wallet } from "lucide-react";
import type { ContractResponse } from "@/types/contract.type";
import type { ContractLifecycle } from "@/types/contract-lifecycle.type";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentRequest } from "@/types/payment-request.type";
import { contractDetailPath } from "@/lib/contract-routes";
import { contractStateLabels, paymentSections, paymentModulePath, initialSummary, monthlySummary, depositSummary } from "@/lib/payment-module";
import { formatInvoiceMoney } from "@/lib/invoice-status";
import type { DashboardRole } from "@/lib/dashboard-role";
export type ContractPaymentBundle = { contract: ContractResponse; initial?: PaymentRequest; invoices?: MonthlyInvoice[]; payments?: PaymentRequest[]; lifecycle?: ContractLifecycle };
const tones = { success: "text-emerald-700 dark:text-emerald-400", warning: "text-amber-700 dark:text-amber-400", info: "text-blue-700 dark:text-blue-400", muted: "text-muted-foreground" };
const icons = [Wallet, ReceiptText, RotateCcw];
export default function ContractPaymentCard({ bundle, role }: { bundle: ContractPaymentBundle; role: DashboardRole }) {
  const { contract, lifecycle } = bundle;
  const summaries = [initialSummary(bundle.initial), monthlySummary(bundle.invoices, bundle.payments), depositSummary(lifecycle)];
  const pendingDeposits=bundle.payments?.filter(p=>p.type === "DEPOSIT_ADJUSTMENT" && p.status !== "CONFIRMED") ?? [];
  if(pendingDeposits.length) summaries[2]={label:`${pendingDeposits.length} khoản chênh lệch cọc cần xử lý`,detail:"Mở hồ sơ để chuyển tiền hoặc xác nhận nhận tiền",tone:"warning",amount:pendingDeposits.reduce((sum,p)=>sum+p.totalAmount,0)};
  const status = lifecycle?.closure?.status === "CLOSED" ? "CLOSED" : contract.status;
  return <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="space-y-1"><h2 className="text-base font-bold">{contract.contractNumber}</h2><p className="text-sm text-muted-foreground">{contractStateLabels[status]} · Hồ sơ thanh toán của hợp đồng</p></div>
      <Link href={contractDetailPath(role, contract.id)} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">Xem hợp đồng <ArrowUpRight className="size-4" /></Link>
    </header>
    <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">{paymentSections.map((section, index) => {
      const summary = summaries[index], Icon = icons[index];
      return <Link key={section.id} href={paymentModulePath(contract.id, section.id)} className="group block space-y-3 p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{section.title}</h3><ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" /></div>
        <div><p className={`text-sm font-semibold ${tones[summary.tone]}`}>{summary.label}</p>{summary.amount != null && <p className="mt-1 text-lg font-bold tabular-nums">{formatInvoiceMoney(summary.amount)}</p>}</div>
        <p className="text-sm text-muted-foreground">{summary.detail}</p>
        <span className="inline-block text-sm font-semibold text-primary">{section.id === "deposit" ? "Mở hồ sơ hoàn cọc" : section.id === "monthly" ? "Quản lý hóa đơn" : "Xem thanh toán ban đầu"} →</span>
      </Link>;
    })}</div>
  </article>;
}
