"use client";

import React from "react";
import SettingsShell from "./SettingsShell";
import type { SettingsSectionId } from "./settings-nav";
import ProfileSection from "./sections/ProfileSection";
import AppearanceSection from "./sections/AppearanceSection";
import AccountSecuritySection from "./sections/AccountSecuritySection";
import PrivacySection from "./sections/PrivacySection";
import NotificationsSection from "./sections/NotificationsSection";
import MessagesSection from "./sections/MessagesSection";

/** @deprecated Prefer /settings/[section] routes. Kept for modal embeds. */
export type SettingsTabId = SettingsSectionId;

interface SettingsContentProps {
  onClose?: () => void;
  initialTab?: SettingsSectionId;
}

function SectionBody({ section }: { section: SettingsSectionId }) {
  switch (section) {
    case "appearance":
      return <AppearanceSection />;
    case "account-security":
      return <AccountSecuritySection />;
    case "privacy":
      return <PrivacySection />;
    case "notifications":
      return <NotificationsSection />;
    case "messages":
      return <MessagesSection />;
    case "profile":
    default:
      return <ProfileSection />;
  }
}

export default function SettingsContent({
  onClose,
  initialTab = "profile",
}: SettingsContentProps) {
  return (
    <SettingsShell onClose={onClose}>
      <SectionBody section={initialTab} />
    </SettingsShell>
  );
}
