"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { str } from "./utils";
import type { AmenitySnapshot } from "@/types/contract.type";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import InlineAmendmentFields from "./InlineAmendmentFields";

interface ContractAmenitiesSectionProps {
  amenities?: (AmenitySnapshot | Record<string, unknown>)[] | null;
}

export default function ContractAmenitiesSection({ amenities }: ContractAmenitiesSectionProps) {
  const w = useAmendmentWorkspace();
  const items = w?.data?.currentTerms.amenities ?? amenities ?? [];
  return (
    <section id="amendment-amenities" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Tiện ích</h3>
            <p className="text-[11px] text-muted-foreground">Danh sách tiện ích đã chốt trong hợp đồng</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
          {items.length} tiện ích
        </span>
      </div>
      {w?.editing ? <InlineAmendmentFields group="amenities" /> : items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/80">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-2.5 px-3 text-left font-semibold">Tên tiện ích</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{idx + 1}</td>
                  <td data-contract-field-state="editable" className="py-2.5 px-3 font-semibold text-blue-700! dark:text-blue-400!">{str(item.name)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">Không có tiện ích được ghi nhận.</p>
      )}
    </section>
  );
}
