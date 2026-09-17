"use client";

import React from "react";
import { Package, ShieldCheck } from "lucide-react";
import { str } from "./utils";

interface ContractEquipmentSectionProps {
  equipments?: Record<string, unknown>[] | null;
}

const HANDOVER_CONDITION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  BRAND_NEW: {
    label: "Mới 100%",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  GOOD: {
    label: "Còn tốt",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  NORMAL: {
    label: "Bình thường",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  USED_ACCEPTABLE: {
    label: "Cũ, còn dùng được",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  MINOR_DAMAGE: {
    label: "Hư hỏng nhẹ",
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
};

export function formatHandoverCondition(val?: unknown): {
  label: string;
  className: string;
} {
  if (!val) {
    return {
      label: "Còn tốt",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  }
  const s = String(val).trim();
  const upper = s.toUpperCase();
  if (HANDOVER_CONDITION_CONFIG[upper]) {
    return HANDOVER_CONDITION_CONFIG[upper];
  }
  for (const [key, cfg] of Object.entries(HANDOVER_CONDITION_CONFIG)) {
    if (upper.startsWith(key)) {
      const rest = s.substring(key.length).replace(/^[\s—\-:]+/, "").trim();
      return {
        label: rest ? `${cfg.label} — ${rest}` : cfg.label,
        className: cfg.className,
      };
    }
  }
  if (s.includes("tốt") || s.includes("Mới")) {
    return {
      label: s,
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  }
  if (s.includes("Hư hỏng")) {
    return {
      label: s,
      className:
        "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    };
  }
  return {
    label: s,
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  };
}

export default function ContractEquipmentSection({
  equipments,
}: ContractEquipmentSectionProps) {
  const items = equipments || [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Danh mục tài sản và nội thất bàn giao (Equipment Table)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Trang thiết bị gắn liền với tài sản bàn giao theo hiện trạng thực tế
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted self-start sm:self-auto">
          {items.length} thiết bị / nội thất
        </span>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/80">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  Tên tài sản / Thiết bị
                </th>
                <th className="py-2.5 px-3 text-center font-semibold">Số lượng</th>
                <th className="py-2.5 px-3 text-left font-semibold">Hiện trạng</th>
                <th className="py-2.5 px-3 text-left font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((eq, idx) => {
                const name = str(eq.name || eq.equipmentName);
                const quantity = eq.quantity != null ? str(eq.quantity) : "01";
                const cond = formatHandoverCondition(eq.condition || eq.status);
                const note = str(eq.note || "Bàn giao theo nhà");

                return (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-center font-semibold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-foreground">
                      {quantity}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cond.className}`}
                      >
                        {cond.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">
          Bàn giao nhà thô / cơ bản, không có danh mục nội thất rời.
        </p>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          Bên B có trách nhiệm kiểm tra chi tiết tình trạng hoạt động và ký xác nhận tại Biên bản bàn giao khi nhận bàn giao thực tế.
        </span>
      </div>
    </section>
  );
}
