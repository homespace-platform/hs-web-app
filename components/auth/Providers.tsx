"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AuthGuard from "@/components/auth/AuthGuard";
import StoreProvider from "@/store/StoreProvider";
import AuthInitializer from "@/features/auth/AuthInitializer";
import OnboardingInitializer from "@/features/onboarding/OnboardingInitializer";
import { Toaster } from "@/components/ui/sonner";
import { ChatDemoProvider } from "@/components/chat/ChatDemoProvider";
import { DashboardRoleProvider } from "@/components/dashboard/DashboardRoleContext";
import NotificationTransport from "@/components/notification/NotificationTransport";
import DashboardRolePickerModal from "@/components/dashboard/DashboardRolePickerModal";
import BackendHealthGate from "@/components/system/BackendHealthGate";
import NetworkGate from "@/components/system/NetworkGate";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
    >
      <StoreProvider>
        <NetworkGate>
          <BackendHealthGate>
            <AuthInitializer>
              <ChatDemoProvider>
                <NotificationTransport />
                <DashboardRoleProvider>
                  <AuthGuard>{children}</AuthGuard>
                  <DashboardRolePickerModal />
                  <OnboardingInitializer />
                </DashboardRoleProvider>
              </ChatDemoProvider>
            </AuthInitializer>
          </BackendHealthGate>
        </NetworkGate>
      </StoreProvider>
      <Toaster position="top-right" closeButton />
    </ThemeProvider>
  );
}
