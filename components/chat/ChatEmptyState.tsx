"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface ChatEmptyStateProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatEmptyState({
  isSidebarCollapsed,
  onToggleSidebar,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* 1. Minimalist Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onToggleSidebar && isSidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden md:flex items-center justify-center"
              title="Mở thanh bên"
            >
              <PanelLeftOpen className="w-4 h-4 text-primary" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold font-heading text-foreground">
              Hộp thư Trực tiếp
            </span>
          </div>
        </div>

        <Link
          href="/rent"
          className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all shadow-2xs"
        >
          Khám phá nhà thuê
        </Link>
      </div>

      {/* 2. Professional Minimalist Hero Area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10 text-center">
        <div className="max-w-xl w-full flex flex-col items-center animate-in fade-in-50 zoom-in-95 duration-300">
          {/* Transparent Brand Logo Centerpiece */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-card border border-border shadow-md flex items-center justify-center p-4 mb-6 hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo/homespace-vertical-logo-removebg-crop-removebg.png"
              alt="HomeSpace"
              width={96}
              height={96}
              className="w-full h-full object-contain"
              unoptimized
            />
          </div>

          {/* Typography */}
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight mb-2">
            Hộp thư Trò chuyện Trực tiếp
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
            Không gian kết nối và trao đổi thông tin bảo mật giữa Khách tìm thuê và Chủ nhà chính chủ.
          </p>

          {/* Clean 3-Column Minimalist Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left mb-8">
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:border-primary/40 transition-all flex flex-col">
              <span className="text-[11px] font-bold text-primary mb-1.5 tracking-wider uppercase">
                01. Chính chủ
              </span>
              <h3 className="text-xs font-bold text-foreground mb-1">
                Xác thực minh bạch
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mọi tài khoản đều được định danh và kiểm duyệt quyền sở hữu nhà cho thuê.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:border-primary/40 transition-all flex flex-col">
              <span className="text-[11px] font-bold text-primary mb-1.5 tracking-wider uppercase">
                02. Trực tiếp
              </span>
              <h3 className="text-xs font-bold text-foreground mb-1">
                Lên lịch & Đàm phán
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Trao đổi giờ giấc xem phòng thực tế và thương lượng điều khoản trực tiếp.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:border-primary/40 transition-all flex flex-col">
              <span className="text-[11px] font-bold text-primary mb-1.5 tracking-wider uppercase">
                03. An toàn
              </span>
              <h3 className="text-xs font-bold text-foreground mb-1">
                Bảo vệ cọc On-chain
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tiền cọc được khóa ký quỹ và giải ngân khi hoàn tất nhận bàn giao nhà.
              </p>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              href="/rent"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm shadow-primary/25 cursor-pointer"
            >
              Tìm căn hộ cho thuê
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
