"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, Sparkles, X } from "lucide-react";

export default function FloatingChatButton() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Nếu đang ở màn hình /chat thì ẩn nút bấm
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return null;
  }

  const unreadCount = 3;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 select-none">
      {/* Tooltip Gợi ý mở rộng khi hover */}
      <div
        className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-xl text-foreground text-xs font-bold transition-all duration-300 pointer-events-none ${
          isHovered
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span>Trò chuyện & Trợ lý AI</span>
      </div>

      {/* Nút Chat tròn to nổi bật ở góc dưới bên phải */}
      <Link
        href="/chat"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xl shadow-primary/50 hover:shadow-primary/70 hover:scale-108 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer border-2 border-white/60 dark:border-white/20 group p-1.5"
        title="Mở tin nhắn & Trò chuyện"
      >
        {/* Radar wave effect */}
        <span className="absolute -inset-1 rounded-full bg-primary/25 animate-ping pointer-events-none opacity-60" />

        {/* Khung nền trắng tương phản cao giúp Avatar AI nổi bật 100% */}
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-1.5 shadow-inner overflow-hidden">
          <Image
            src="/logo/ai/homespace-ai-logo-removebg.png"
            alt="HomeSpace Assistant AI"
            width={48}
            height={48}
            className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-115 group-hover:rotate-6 transition-all duration-300"
            unoptimized
          />
        </div>

        {/* Unread Badge đỏ nổi bật */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-background shadow-md">
            {unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
