"use client";

import { Sparkles, ShieldCheck, Zap } from "lucide-react";
import AiSearchBar from "./AiSearchBar";

export default function HeroSection() {
  return (
    <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#F8FAFC] border-b border-slate-200/70 dark:from-[#090D16] dark:via-[#0F172A] dark:to-[#090D16] dark:border-slate-800">
      {/* Dynamic Background Glow Elements */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/15 to-cyan-400/20 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col items-center">
        {/* Tech Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" />
          <span>Kỷ Nguyên Mới Của Bất Động Sản</span>
        </div>

        {/* Main Headline */}
        <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 dark:text-white tracking-tight mb-6 leading-[1.15] max-w-4xl">
          Tìm Nơi Ở Lý Tưởng Với Sức Mạnh{" "}
          <span className="ai-gradient-text drop-shadow-sm">
            AI & Blockchain
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Trải nghiệm nền tảng PropTech tiên phong. Minh bạch, an toàn tuyệt
          đối với hợp đồng thông minh và tìm kiếm cá nhân hóa theo ngôn ngữ tự nhiên.
        </p>

        {/* AI Search Bar */}
        <AiSearchBar />

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 md:grid-cols-3 gap-6 text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Hợp đồng số hóa 100% On-chain</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>Định giá & Phân tích AI chuẩn xác</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-2 col-span-2 md:col-span-1">
            <Zap className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Đặt cọc an toàn qua Ví Escrow</span>
          </div>
        </div>
      </div>
    </section>
  );
}
