import type { DashboardRole } from "@/lib/dashboard-role";

export function contractListPath(role: DashboardRole): string {
  return `/dashboard/${role}/contracts`;
}

export function contractDetailPath(role: DashboardRole, contractId: string): string {
  return `${contractListPath(role)}/${encodeURIComponent(contractId)}`;
}

export function invoiceDetailPath(contractId: string): string {
  return `/dashboard/invoices/${encodeURIComponent(contractId)}`;
}
