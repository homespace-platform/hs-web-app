"use client";

import React from "react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Thanh toán
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý cổng thanh toán, hóa đơn tiền thuê và phương thức nhận tiền.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có thông tin thanh toán nào.</p>
      </div>
    </div>
  );
}
