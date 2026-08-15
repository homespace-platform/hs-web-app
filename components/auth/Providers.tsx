"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import AuthGuard from "@/components/auth/AuthGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
