"use client";

import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] p-4 select-none">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-xs text-center">
          {/* Vertical Logo */}
          <div className="relative w-40 h-32 flex items-center justify-center">
            <Image
              src="/logo/homespace-vertical-logo-removebg-crop-removebg.png"
              alt="HomeSpace Logo"
              width={160}
              height={130}
              priority
              style={{ width: "auto", height: "auto" }}
              className="object-contain drop-shadow-md animate-pulse"
            />
          </div>

          {/* Friendly Loading Indicator */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">
              Vui lòng chờ giây lát...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
