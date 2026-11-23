import React from "react";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SettingsShell from "@/components/settings/SettingsShell";
import SettingsBreadcrumb from "@/components/settings/SettingsBreadcrumb";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <SettingsBreadcrumb className="mb-6" />

          <div className="w-full shadow-lg rounded-3xl overflow-hidden">
            <SettingsShell>{children}</SettingsShell>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
