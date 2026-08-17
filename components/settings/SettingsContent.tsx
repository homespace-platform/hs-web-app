"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  Shield,
  Lock,
  RefreshCw,
  Database,
  Paintbrush,
  Bell,
  MessageSquare,
  PhoneCall,
  Sliders,
  ChevronRight,
  Check,
  X,
  Volume2,
  Moon,
  Sun,
  Laptop,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export type SettingsTabId =
  | "general"
  | "account-security"
  | "privacy"
  | "sync"
  | "data"
  | "appearance"
  | "notifications"
  | "messages"
  | "calls"
  | "utilities";

interface SettingsContentProps {
  onClose?: () => void;
  initialTab?: SettingsTabId;
}

export default function SettingsContent({
  onClose,
  initialTab = "appearance",
}: SettingsContentProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const { theme, setTheme } = useTheme();

  // 1. Giao diện & Ngôn ngữ State
  const [language, setLanguage] = useState("Tiếng Việt");

  // 2. Tài khoản & Bảo mật State
  const [screenLockEnabled, setScreenLockEnabled] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle");
  const [passwordMessage, setPasswordMessage] = useState("");

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus("error");
      setPasswordMessage("Vui lòng điền đầy đủ tất cả các trường thông tin.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("error");
      setPasswordMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("error");
      setPasswordMessage("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setPasswordStatus("success");
    setPasswordMessage("Đã đổi mật khẩu thành công!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setPasswordStatus("idle");
      setPasswordMessage("");
    }, 4000);
  };

  // 3. Quyền riêng tư State
  const [birthdayVisibility, setBirthdayVisibility] = useState("Không hiện");
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [showSeenStatus, setShowSeenStatus] = useState(false);
  const [allowMessaging, setAllowMessaging] = useState("Tất cả mọi người");
  const [allowCalling, setAllowCalling] = useState("Tất cả mọi người");
  const [allowPhoneSearch, setAllowPhoneSearch] = useState(true);

  // 4. Thông báo State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const menuItems: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none text-left ${isSelected
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"
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



        {/* ========================================================= */}
        {/* TAB 2: TÀI KHOẢN VÀ BẢO MẬT */}
        {/* ========================================================= */}
        {activeTab === "account-security" && (
          <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
            {/* 2.1 Thay đổi mật khẩu */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" />
                <span>Thay đổi mật khẩu</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Để bảo vệ tài khoản, hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường và số.
              </p>

              <form onSubmit={handleChangePassword} className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-2xs">
                {passwordStatus === "success" && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{passwordMessage}</span>
                  </div>
                )}
                {passwordStatus === "error" && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    <span>{passwordMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-foreground">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-foreground">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-foreground">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu mật khẩu mới</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2.2 Bảo mật 2 lớp */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Bảo mật 2 lớp (2FA)</h3>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between gap-4 shadow-2xs">
                <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                  Sau khi bật, bạn sẽ được yêu cầu nhập mã OTP hoặc xác thực từ thiết bị di động sau khi đăng nhập trên thiết bị lạ.
                </p>
                <Switch
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: QUYỀN RIÊNG TƯ */}
        {/* ========================================================= */}
        {activeTab === "privacy" && (
          <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
            {/* 3.1 Cá nhân */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Cá nhân</h3>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Hiện ngày sinh
                  </span>
                  <select
                    value={birthdayVisibility}
                    onChange={(e) => setBirthdayVisibility(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="Không hiện">Không hiện</option>
                    <option value="Hiện đầy đủ">Hiện đầy đủ</option>
                    <option value="Chỉ hiện ngày tháng">Chỉ hiện ngày tháng</option>
                  </select>
                </div>

                <div className="border-t border-border/50" />

                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Hiển thị trạng thái truy cập
                  </span>
                  <Switch
                    checked={showOnlineStatus}
                    onCheckedChange={setShowOnlineStatus}
                  />
                </div>
              </div>
            </div>

            {/* 3.2 Tin nhắn và cuộc gọi */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Tin nhắn và cuộc gọi</h3>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Hiện trạng thái "Đã xem"
                  </span>
                  <Switch
                    checked={showSeenStatus}
                    onCheckedChange={setShowSeenStatus}
                  />
                </div>

                <div className="border-t border-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Cho phép nhắn tin
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ai được nhắn tin trao đổi với bạn
                    </p>
                  </div>
                  <select
                    value={allowMessaging}
                    onChange={(e) => setAllowMessaging(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="Tất cả mọi người">Tất cả mọi người</option>
                    <option value="Chỉ người đã xác thực">Chỉ người đã xác thực</option>
                  </select>
                </div>

                <div className="border-t border-border/50" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      Cho phép gọi điện
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ai được gọi điện thoại trực tiếp
                    </p>
                  </div>
                  <select
                    value={allowCalling}
                    onChange={(e) => setAllowCalling(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="Tất cả mọi người">Tất cả mọi người</option>
                    <option value="Chỉ người đã xác thực">Chỉ người đã xác thực</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3.3 Chặn tin nhắn */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Chặn tin nhắn</h3>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-muted/40 transition-colors">
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Danh sách chặn
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* 3.4 Nguồn tìm kiếm */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Nguồn tìm kiếm</h3>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between gap-4 shadow-2xs">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    Cho phép người lạ tìm thấy và liên hệ qua số điện thoại
                  </p>
                  <p className="text-[11px] text-primary font-bold mt-0.5">
                    +(84) 353999798
                  </p>
                </div>
                <Switch
                  checked={allowPhoneSearch}
                  onCheckedChange={setAllowPhoneSearch}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: GIAO DIỆN */}
        {/* ========================================================= */}
        {activeTab === "appearance" && (
          <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
            {/* 4.1 Cài đặt giao diện (Visual Theme Selector) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Cài đặt giao diện</h3>
              <div className="grid grid-cols-3 gap-3">
                {/* Theme Sáng */}
                <div
                  onClick={() => setTheme("light")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 bg-card ${theme === "light"
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                >
                  <div className="w-full aspect-16/10 rounded-xl bg-slate-100 border border-slate-200 p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
                    <div className="w-4 h-2 rounded bg-blue-400" />
                    <div className="w-12 h-3 rounded bg-white border border-slate-200" />
                    <div className="w-8 h-3 rounded bg-blue-500 self-end" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mt-1">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === "light" ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                    >
                      {theme === "light" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Sáng</span>
                  </div>
                </div>

                {/* Theme Tối */}
                <div
                  onClick={() => setTheme("dark")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 bg-card ${theme === "dark"
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                >
                  <div className="w-full aspect-16/10 rounded-xl bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
                    <div className="w-4 h-2 rounded bg-blue-500" />
                    <div className="w-12 h-3 rounded bg-slate-800 border border-slate-700" />
                    <div className="w-8 h-3 rounded bg-blue-600 self-end" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mt-1">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === "dark" ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                    >
                      {theme === "dark" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Tối</span>
                  </div>
                </div>

                {/* Theme Hệ Thống */}
                <div
                  onClick={() => setTheme("system")}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 bg-card ${theme === "system"
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                >
                  <div className="w-full aspect-16/10 rounded-xl bg-linear-to-r from-slate-100 to-slate-900 border border-slate-300 p-2 flex flex-col justify-between shadow-2xs overflow-hidden">
                    <div className="w-4 h-2 rounded bg-blue-400" />
                    <div className="w-12 h-3 rounded bg-white/70" />
                    <div className="w-8 h-3 rounded bg-blue-500 self-end" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mt-1">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === "system" ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                    >
                      {theme === "system" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Hệ Thống</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ngôn ngữ hiển thị */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Ngôn ngữ hiển thị</h3>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    Thay đổi ngôn ngữ
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Áp dụng cho toàn bộ giao diện và thông báo
                  </p>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: THÔNG BÁO */}
        {/* ========================================================= */}
        {activeTab === "notifications" && (
          <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
            {/* 5.1 Cài đặt thông báo */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Cài đặt thông báo</h3>
              <p className="text-xs text-muted-foreground">
                Nhận được thông báo mỗi khi có tin nhắn mới hoặc cập nhật từ chủ nhà
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Bật thông báo Card */}
                <div
                  onClick={() => setNotificationsEnabled(true)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${notificationsEnabled
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                >
                  <div className="w-24 h-16 rounded-xl border-2 border-primary bg-primary/5 p-2 flex flex-col justify-center items-end relative overflow-hidden">
                    <div className="w-14 h-6 rounded-md bg-primary text-white text-[8px] font-bold p-1 shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Tin nhắn</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${notificationsEnabled ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                    >
                      {notificationsEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Bật</span>
                  </div>
                </div>

                {/* Tắt thông báo Card */}
                <div
                  onClick={() => setNotificationsEnabled(false)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${!notificationsEnabled
                    ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                    }`}
                >
                  <div className="w-24 h-16 rounded-xl border-2 border-muted bg-muted/20 p-2 flex flex-col justify-center items-center" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!notificationsEnabled ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                    >
                      {!notificationsEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>Tắt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5.2 Âm thanh thông báo */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">Âm thanh thông báo</h3>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-2xs">
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Phát âm thanh khi có tin nhắn & thông báo mới
                </span>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* OTHER TABS PLACEHOLDER (Đồng bộ, Dữ liệu, Tin nhắn, Cuộc gọi, Tiện ích) */}
        {/* ========================================================= */}
        {["sync", "data", "messages", "calls", "utilities"].includes(activeTab) && (
          <div className="space-y-4 max-w-xl animate-in fade-in-50 duration-200">
            <h3 className="text-sm font-bold text-foreground capitalize">
              {menuItems.find((m) => m.id === activeTab)?.label}
            </h3>
            <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-2 shadow-2xs">
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Tất cả dữ liệu và cấu hình của tính năng đã được tự động lưu trữ và đồng bộ hóa an toàn.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Hệ thống HomeSpace luôn bảo mật thông tin với chuẩn mã hóa cấp cao.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
