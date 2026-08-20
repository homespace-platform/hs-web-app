"use client";

import React, { useState } from "react";
import axios from "axios";
import { Lock, Check, LoaderCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import userService from "@/services/user.service";
import { changePasswordSchema } from "@/validation/password.schema";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "sonner";

export default function AccountSecuritySection() {
  const { logout } = useAuth();
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = changePasswordSchema.safeParse({
      oldPassword: currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Thông tin mật khẩu không hợp lệ");
      return;
    }

    setSavingPassword(true);
    try {
      await userService.updatePassword({
        oldPassword: validation.data.oldPassword,
        newPassword: validation.data.newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đổi mật khẩu thành công. Đang đăng xuất...");
      window.setTimeout(logout, 800);
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof responseMessage === "string" && responseMessage.trim()
          ? responseMessage
          : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setSavingPassword(false);
    }
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
              placeholder="Tối thiểu 8 ký tự, có chữ hoa, số và ký tự đặc biệt"
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
              disabled={savingPassword}
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPassword ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{savingPassword ? "Đang lưu..." : "Lưu mật khẩu mới"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
