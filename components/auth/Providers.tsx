"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AuthGuard from "@/components/auth/AuthGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
