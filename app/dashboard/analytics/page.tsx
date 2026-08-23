"use client";

import React from "react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Phân tích & Báo cáo
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Thống kê hiệu quả tin đăng, lượt tương tác và số liệu kinh doanh.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có đủ dữ liệu phân tích & báo cáo.</p>
      </div>
    </div>
  );
}
