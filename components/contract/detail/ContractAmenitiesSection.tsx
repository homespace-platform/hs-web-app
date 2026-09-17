"use client";

import React from "react";
import { Sparkles, HeartHandshake } from "lucide-react";
import { str } from "./utils";
import type { AmenitySnapshot } from "@/types/contract.type";

interface ContractAmenitiesSectionProps {
  amenities?: (AmenitySnapshot | Record<string, unknown>)[] | null;
}

export default function ContractAmenitiesSection({
  amenities,
}: ContractAmenitiesSectionProps) {
  const items = amenities || [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Tiện ích và quyền sử dụng dịch vụ (Amenities Table)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Quyền sử dụng không gian, tiện nghi dùng chung và chính sách áp dụng
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted self-start sm:self-auto">
          {items.length} mục áp dụng
        </span>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/80">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  Tiện ích / Quyền sử dụng
                </th>
                <th className="py-2.5 px-3 text-left font-semibold">Phạm vi</th>
                <th className="py-2.5 px-3 text-left font-semibold">Chi phí</th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  Điều kiện / Ghi chú
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, idx) => {
                const name = str(item.name);
                const scope = str(item.scope);
                const costText = str(item.costText);
                const conditionText = str(item.conditionText);
                const code = String(item.code || "");
                const isPets = code.includes("PETS");

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-muted/30 transition-colors ${
                      isPets ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-semibold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        {name}
                        {isPets && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            Chính sách vật nuôi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{scope}</td>
                    <td className="py-2.5 px-3 text-foreground font-medium">
                      {costText}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {conditionText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">
          Không có tiện ích bổ sung nào được ghi nhận cho bất động sản này.
        </p>
      )}

      {/* SHARED AMENITIES & POLICY DISCLAIMER */}
      <div className="rounded-xl border border-border/70 bg-muted/25 p-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-start gap-2 font-medium text-foreground">
          <HeartHandshake className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>Nguyên tắc áp dụng tiện ích dùng chung:</span>
        </div>
        <p className="pl-6 text-[11px] leading-relaxed">
          Đối với tiện ích dùng chung (nếu có), Bên B được quyền sử dụng các tiện ích chung theo nội quy, khung giờ và tình trạng vận hành của đơn vị quản lý, không cấu thành cam kết vận hành liên tục tuyệt đối.
        </p>
      </div>
    </section>
  );
}
