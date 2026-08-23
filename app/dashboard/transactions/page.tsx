"use client";

import React from "react";

export default function TransactionsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Giao dịch
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Lịch sử giao dịch, đặt cọc và biến động số dư tài khoản của bạn.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có giao dịch nào được ghi nhận.</p>
      </div>
    </div>
  );
}
