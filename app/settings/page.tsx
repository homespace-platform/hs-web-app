"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SettingsContent from "@/components/settings/SettingsContent";
import { Home } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link
              href="/"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Cài đặt</span>
          </nav>

          {/* Settings Box Container */}
          <div className="w-full shadow-lg rounded-3xl overflow-hidden">
            <SettingsContent />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
