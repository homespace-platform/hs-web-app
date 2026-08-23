"use client";

import React from "react";

export default function RentalRequestsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Yêu cầu thuê
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Theo dõi và xử lý các yêu cầu thuê nhà từ khách hàng.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có yêu cầu thuê nào.</p>
      </div>
    </div>
  );
}
