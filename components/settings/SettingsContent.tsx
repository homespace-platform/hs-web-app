"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  Lock,
  Paintbrush,
  Bell,
  MessageSquare,
  X,
} from "lucide-react";
import ProfileSection from "./sections/ProfileSection";
import AppearanceSection from "./sections/AppearanceSection";
import AccountSecuritySection from "./sections/AccountSecuritySection";
import PrivacySection from "./sections/PrivacySection";
import NotificationsSection from "./sections/NotificationsSection";
import MessagesSection from "./sections/MessagesSection";

export type SettingsTabId =
  | "profile"
  | "appearance"
  | "account-security"
  | "privacy"
  | "notifications"
  | "messages";

interface SettingsContentProps {
  onClose?: () => void;
  initialTab?: SettingsTabId;
}

export default function SettingsContent({
  onClose,
  initialTab = "profile",
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  const menuItems: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Thông tin cá nhân", icon: User },
    { id: "appearance", label: "Giao diện", icon: Paintbrush },
    { id: "account-security", label: "Tài khoản và bảo mật", icon: Shield },
    { id: "privacy", label: "Quyền riêng tư", icon: Lock },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "messages", label: "Tin nhắn", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-card rounded-3xl overflow-hidden border border-border shadow-2xl">
      {/* CỘT TRÁI: Sidebar Menu Cài đặt (Zalo Style) */}
      <aside className="w-full md:w-64 lg:w-72 bg-muted/30 border-r border-border p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <h2 className="font-heading font-extrabold text-lg text-foreground tracking-tight">
            Cài đặt
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1 overflow-y-auto no-scrollbar flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none text-left ${
                  isSelected
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CỘT PHẢI: Panel Nội dung chi tiết từng tab */}
      <main className="flex-1 bg-muted/15 p-5 sm:p-7 md:p-8 overflow-y-auto max-h-[80vh] md:max-h-[640px] relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex absolute top-5 right-5 w-8 h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground items-center justify-center transition-all cursor-pointer shadow-2xs z-20"
            title="Đóng cài đặt"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 1. Thông tin cá nhân */}
        {activeTab === "profile" && <ProfileSection />}

        {/* 2. Giao diện & Ngôn ngữ */}
        {activeTab === "appearance" && <AppearanceSection />}

        {/* 3. Tài khoản và bảo mật */}
        {activeTab === "account-security" && <AccountSecuritySection />}

        {/* 4. Quyền riêng tư */}
        {activeTab === "privacy" && <PrivacySection />}

        {/* 5. Thông báo */}
        {activeTab === "notifications" && <NotificationsSection />}

        {/* 6. Tin nhắn */}
        {activeTab === "messages" && <MessagesSection />}
      </main>
    </div>
  );
}
