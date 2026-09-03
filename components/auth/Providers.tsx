"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import StoreProvider from "@/store/StoreProvider";
import AuthInitializer from "@/features/auth/AuthInitializer";
import OnboardingInitializer from "@/features/onboarding/OnboardingInitializer";
import { Toaster } from "@/components/ui/sonner";
import { ChatDemoProvider } from "@/components/chat/ChatDemoProvider";

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
          <ChatDemoProvider>
            <AuthGuard>{children}</AuthGuard>
            <OnboardingInitializer />
          </ChatDemoProvider>
        </AuthInitializer>
      </StoreProvider>
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
