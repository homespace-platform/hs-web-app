"use client";

import React from "react";
import { Building2 } from "lucide-react";

export default function LandlordDashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Dashboard chủ nhà
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Thống kê tin đăng, lịch tiếp khách và yêu cầu thuê — sẽ bổ sung sau.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">
          Trang thống kê dành cho người cho thuê đang được xây dựng…
        </p>
      </div>
    </div>
  );
}
