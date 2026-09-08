"use client";

import React from "react";
import { KeyRound } from "lucide-react";

export default function TenantDashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Dashboard người thuê
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Theo dõi lịch đi xem, yêu cầu đã gửi và tiến độ thuê — sẽ bổ sung sau.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">
          Trang thống kê dành cho người đi thuê đang được xây dựng…
        </p>
      </div>
    </div>
  );
}
