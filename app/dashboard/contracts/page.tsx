"use client";

import React from "react";
import { FileCheck } from "lucide-react";

export default function ContractsPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <FileCheck className="w-6 h-6 text-primary" />
          Hợp đồng đã ký
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Danh sách các hợp đồng thuê đã được tạo và ký trên hệ thống.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center shadow-2xs space-y-2">
        <p className="text-sm font-semibold text-foreground">Tính năng đang được phát triển</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Mục này sẽ hiển thị các file hợp đồng đã ký giữa chủ nhà và người thuê.
          Hiện tại bạn có thể quản lý mẫu hợp đồng tại mục &quot;Mẫu hợp đồng&quot;.
        </p>
      </div>
    </div>
  );
}
