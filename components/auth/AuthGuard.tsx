"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Building2, Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#090D16] p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 animate-pulse">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium">Đang khởi tạo phiên đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
