import type { ReactNode } from "react";
import { toneClasses, type Tone } from "@/lib/rental-labels";

/** Shared look of the contract page: one card style, one section title, one pill. */
const cardClass = "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6";

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`${cardClass} ${className}`}>{children}</section>;
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]}`}>{children}</span>;
}

/** Tab body: vertical rhythm + the ARIA wiring DetailTabs expects. */
export function TabBody({ id, labelledBy, children }: { id: string; labelledBy: string; children: ReactNode }) {
  return <div role="tabpanel" id={id} aria-labelledby={labelledBy} tabIndex={-1} className="space-y-6 focus:outline-none">{children}</div>;
}

export function ContractPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Đang tải thông tin hợp đồng">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/70" />)}
        </div>
      </div>
      <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="h-11 animate-pulse rounded-xl bg-muted/70" />
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
      <span className="sr-only">Đang tải thông tin hợp đồng...</span>
    </div>
  );
}
