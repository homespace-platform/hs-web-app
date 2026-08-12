"use client";

import { Shield, LogIn } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { initialized, authenticated, login } = useAuth();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Dang khoi tao phien dang nhap...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-5">
            <Shield className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">HomeSpace Web</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Dang nhap qua Keycloak SSO</p>
          <Button onClick={login} className="w-full">
            <LogIn className="h-4 w-4" data-icon="inline-start" />
            Dang nhap
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
