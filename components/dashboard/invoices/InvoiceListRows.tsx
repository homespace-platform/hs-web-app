"use client";

import Link from "next/link";
import type { DashboardRole } from "@/lib/dashboard-role";
import {
  invoiceListAction,
  presentationForRow,
  type InvoiceListRow,
} from "@/lib/invoice-list";
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  invoicePeriodDateSummary,
  invoicePeriodLabel,
  invoicePeriodSecondaryLabel,
} from "@/lib/invoice-status";
import { contractDetailPath } from "@/lib/contract-routes";

type Props = {
  role: DashboardRole;
  rows: InvoiceListRow[];
};

function StatusBadge({ row }: { row: InvoiceListRow }) {
  const presentation = presentationForRow(row);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

function PeriodCell({ row }: { row: InvoiceListRow }) {
  const secondary = invoicePeriodSecondaryLabel(row.invoice);
  const summary = invoicePeriodDateSummary(row.invoice);
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-sm font-semibold text-foreground">{invoicePeriodLabel(row.invoice)}</p>
      {secondary && <p className="truncate text-xs text-muted-foreground">{secondary}</p>}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer list-none underline-offset-2 marker:content-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          Xem khoảng thời gian
        </summary>
        <p className="mt-1 max-w-sm leading-relaxed">{summary}</p>
      </details>
    </div>
  );
}

function PropertyCell({ role, row }: { role: DashboardRole; row: InvoiceListRow }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-sm font-semibold text-foreground">{row.contract.contractNumber}</p>
      <Link
        href={contractDetailPath(role, row.contract.id)}
        className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        Xem hợp đồng
      </Link>
    </div>
  );
}

function ActionButton({ role, row }: { role: DashboardRole; row: InvoiceListRow }) {
  const action = invoiceListAction(role, row.invoice, row.paymentStatus);
  return (
    <Link
      href={action.href}
      className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {action.label}
    </Link>
  );
}

export default function InvoiceListRows({ role, rows }: Props) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-2xs md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-[22%]">Nhà / phòng</th>
              <th className="px-4 py-3 w-[26%]">Kỳ thanh toán</th>
              <th className="px-4 py-3 w-[12%]">Hạn thanh toán</th>
              <th className="px-4 py-3 w-[14%] text-right">Số tiền</th>
              <th className="px-4 py-3 w-[14%]">Trạng thái</th>
              <th className="px-4 py-3 w-[12%] text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key} className="align-top transition-colors hover:bg-muted/30">
                <td className="px-4 py-3"><PropertyCell role={role} row={row} /></td>
                <td className="px-4 py-3"><PeriodCell row={row} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatInvoiceDate(row.invoice.dueAt)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-foreground">
                  {formatInvoiceMoney(row.invoice.totalAmount)}
                </td>
                <td className="px-4 py-3"><StatusBadge row={row} /></td>
                <td className="px-4 py-3 text-right"><ActionButton role={role} row={row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.key}
            className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-3">
              <PropertyCell role={role} row={row} />
              <StatusBadge row={row} />
            </div>
            <PeriodCell row={row} />
            <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">Hạn thanh toán</p>
                <p className="text-xs text-foreground">{formatInvoiceDate(row.invoice.dueAt)}</p>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {formatInvoiceMoney(row.invoice.totalAmount)}
                </p>
              </div>
              <ActionButton role={role} row={row} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
