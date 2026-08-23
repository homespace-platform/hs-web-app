"use client";

import React from "react";

export default function ContractsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Hợp đồng
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý các hợp đồng thuê nhà điện tử và hợp đồng thông minh blockchain.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có hợp đồng nào.</p>
      </div>
    </div>
  );
}
