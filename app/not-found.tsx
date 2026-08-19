"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { Home, RotateCcw } from "lucide-react";

export default function NotFound() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-background flex flex-col justify-between overflow-hidden select-none">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-16 pb-4">
        <div className="max-w-xl w-full text-center flex flex-col items-center animate-in fade-in-50 zoom-in-95 duration-300">
          {/* 1. Fun Animated 404 GIF Container (Khung chữ nhật bo tròn ngang theo tỷ lệ ảnh) */}
          <div className="relative mb-6 w-full max-w-md sm:max-w-lg">
            <div className="w-full h-44 sm:h-56 md:h-60 rounded-3xl overflow-hidden border border-border bg-white shadow-2xl p-2 sm:p-2.5 hover:scale-[1.02] transition-transform duration-300">
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src="/404/404.gif"
                  alt="404 Page Not Found"
                  fill
                  className="object-cover object-center"
                  unoptimized
                  priority
                />
              </div>
            </div>
          </div>

          {/* 2. Headline & Description */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-heading text-foreground tracking-tight mb-2">
            Oops! Không tìm thấy trang này
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
            Căn nhà bạn đang tìm kiếm dường như không tồn tại, đã đổi địa chỉ hoặc người thuê trước đã chuyển đi mất rồi!
          </p>

          {/* 3. Action Navigation Buttons (Về trang chủ hoặc Thử lại F5) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm transition-all shadow-md shadow-primary/25 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Link>

            <button
              type="button"
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-card hover:bg-muted border border-border text-foreground font-bold text-xs sm:text-sm transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-primary" />
              <span>Thử lại (F5)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Sleek Minimalist 1-Line Bottom Text */}
      <div className="py-3 text-center text-[11px] text-muted-foreground/60 border-t border-border/40 shrink-0">
        © 2026 HomeSpace. Nền tảng thuê nhà trực tiếp & bảo vệ cọc On-chain.
      </div>
    </div>
  );
}
