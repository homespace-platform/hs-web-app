import type { ReactNode } from "react";

export interface Fact { label: string; value: ReactNode; icon?: ReactNode }

/** Key facts under the contract title: who, where, how much, until when. Facts without a value are skipped. */
export default function ContractSummary({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((f) => f.value !== undefined && f.value !== null && f.value !== "" && f.value !== "—");
  if (!shown.length) return null;
  return (
    <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((fact) => (
        <div key={fact.label} className="min-w-0 rounded-xl bg-muted/40 px-3.5 py-3">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {fact.icon}
            {fact.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
