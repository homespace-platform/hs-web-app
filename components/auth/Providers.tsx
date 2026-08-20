"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import StoreProvider from "@/store/StoreProvider";
import AuthInitializer from "@/features/auth/AuthInitializer";
import OnboardingInitializer from "@/features/onboarding/OnboardingInitializer";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
    >
      <StoreProvider>
        <AuthInitializer>
          <AuthGuard>{children}</AuthGuard>
          <OnboardingInitializer />
        </AuthInitializer>
      </StoreProvider>
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
