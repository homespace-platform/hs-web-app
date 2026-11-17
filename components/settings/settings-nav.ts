import {
  User,
  Shield,
  Landmark,
  Paintbrush,
  Bell,
  type LucideIcon,
} from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "account-security", label: "Tài khoản và bảo mật", icon: Shield },
  { id: "bank-accounts", label: "Tài khoản ngân hàng", icon: Landmark },
  { id: "appearance", label: "Giao diện", icon: Paintbrush },
  { id: "notifications", label: "Thông báo", icon: Bell },
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
