"use client";

import React from "react";
import { MessageSquareText, Shield, Users } from "lucide-react";

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/50 select-none">
      <div className="flex flex-col items-center max-w-sm">
        {/* Soft Blue Icon Circle */}
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-primary mb-4 shadow-sm animate-in zoom-in-90 duration-300">
          <MessageSquareText className="w-8 h-8 stroke-[1.75]" />
        </div>

        <h2 className="text-base sm:text-lg font-bold font-heading text-foreground mb-1.5">
          Chào mừng đến với Chat
        </h2>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
          Hãy chọn một cuộc trò chuyện từ danh sách bên trái để trao đổi trực tiếp giữa Chủ nhà và Người thuê
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground/80">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] font-medium">
            <Users className="w-3 h-3 text-primary" />
            Trực tiếp Chủ nhà & Khách thuê
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] font-medium">
            <Shield className="w-3 h-3 text-emerald-500" />
            Hợp đồng On-chain minh bạch
          </span>
        </div>
      </div>
    </div>
  );
}
