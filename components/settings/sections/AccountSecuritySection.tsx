"use client";

import React, { useState } from "react";
import { Lock, ShieldCheck, X, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function AccountSecuritySection() {
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

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
      {/* 1. Thay đổi mật khẩu */}
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

      {/* 2. Bảo mật 2 lớp */}
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
  );
}
