"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function FloatingChatButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // Nếu đang ở màn hình /chat thì ẩn nút bấm
  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return null;
  }

  const unreadCount = 3;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none pointer-events-none">
      {/* Tooltip Gợi ý mở rộng khi hover */}
      {isHovered && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-md text-foreground text-xs font-bold pointer-events-none animate-in fade-in-50 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>Trò chuyện & Trợ lý AI</span>
        </div>
      )}

      {/* Nút Chat tròn nổi bật ở góc dưới bên phải */}
      <button
        type="button"
        onClick={() => router.push("/chat")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="pointer-events-auto relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer border-2 border-white/80 dark:border-white/20 group p-1"
        title="Mở tin nhắn & Trò chuyện"
      >
        {/* Khung nền trắng tương phản cao giúp Avatar AI nổi bật 100% */}
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-1 shadow-xs overflow-hidden">
          <Image
            src="/logo/ai/homespace-ai-logo-removebg.png"
            alt="HomeSpace Assistant AI"
            width={40}
            height={40}
            className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-110 transition-transform duration-200"
            unoptimized
          />
        </div>

        {/* Unread Badge đỏ nổi bật */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-background shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>
      </div>
    </>
  );
}
