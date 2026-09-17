import React from "react";

export function str(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

export function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === "";
}

export function formatMoney(value: unknown): string {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("vi-VN").format(amount)} VNĐ`
    : String(value);
}

export function FieldRow({
  label,
  value,
  badge,
  highlight,
}: {
  label: string;
  value: unknown;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs border-b border-border/50 last:border-0">
      <span className="text-muted-foreground shrink-0 flex items-center gap-1.5">
        {label}
        {badge && (
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted text-muted-foreground font-medium">
            {badge}
          </span>
        )}
      </span>
      <span
        className={`font-semibold text-right break-words ${
          highlight ? "text-primary font-bold" : "text-foreground"
        }`}
      >
        {str(value)}
      </span>
    </div>
  );
}
