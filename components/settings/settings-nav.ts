import {
  User,
  Shield,
  Lock,
  Paintbrush,
  Bell,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "account-security", label: "Tài khoản và bảo mật", icon: Shield },
  { id: "appearance", label: "Giao diện", icon: Paintbrush },
  { id: "privacy", label: "Quyền riêng tư", icon: Lock },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "messages", label: "Tin nhắn", icon: MessageSquare },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function isSettingsSectionId(value: string): value is SettingsSectionId {
  return SETTINGS_SECTIONS.some((section) => section.id === value);
}

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
};
