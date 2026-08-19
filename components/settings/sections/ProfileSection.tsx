"use client";

import React, { useState } from "react";
import { useAuth } from "@/features/auth/hooks";
import { Camera, BadgeCheck, ShieldCheck, Check } from "lucide-react";

export default function ProfileSection() {
  const { username, profileName, email, authenticated } = useAuth();
  const isVerified = Boolean(authenticated);

  const [fullName, setFullName] = useState(profileName || username || "Nguyễn Văn An");
  const [phoneNumber, setPhoneNumber] = useState("+84 353 999 798");
  const [userEmail, setUserEmail] = useState(email || "an.nguyen@homespace.vn");
  const [cccdNumber, setCccdNumber] = useState("079201008899");
  const [address, setAddress] = useState("Bến Nghé, Quận 1, TP. Hồ Chí Minh");
  const [dob, setDob] = useState("15/08/1995");
  const [gender, setGender] = useState("Nam");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
      {/* Header Avatar Card */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
        <div className="relative">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-primary text-primary-foreground font-extrabold text-2xl flex items-center justify-center shadow-md">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={() => alert("Tính năng tải ảnh đại diện mới đang cập nhật...")}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-card border border-border text-foreground hover:text-primary shadow-xs transition-colors cursor-pointer"
            title="Thay đổi ảnh đại diện"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <h3 className="font-bold text-base text-foreground">{fullName}</h3>

            {/* Biểu tượng tích xanh xác thực eKYC chuẩn sắc nét */}
            {isVerified && (
              <span
                className="inline-flex items-center justify-center shrink-0 cursor-help"
                title="Tài khoản đã xác thực danh tính điện tử (eKYC)"
              >
                <svg
                  className="w-4.5 h-4.5 text-blue-600 dark:text-blue-500 fill-current drop-shadow-xs"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z" />
                  <path
                    d="M10 15.5l-3.5-3.5 1.41-1.41L10 12.67l5.59-5.59L17 8.5l-7 7z"
                    fill="white"
                  />
                </svg>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{userEmail}</p>

          <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
            {isVerified ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Đã xác thực danh tính (eKYC)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => alert("Chuyển đến luồng xác thực eKYC bằng CCCD...")}
                className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20 flex items-center gap-1.5 shadow-2xs hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <span>⚠️ Chưa xác thực danh tính • Xác thực ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-2xs">
        {profileSaveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Cập nhật thông tin cá nhân thành công!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Họ và tên
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Số điện thoại
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Email liên hệ
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Nhập email"
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Số CCCD / Định danh
            </label>
            <input
              type="text"
              value={cccdNumber}
              onChange={(e) => setCccdNumber(e.target.value)}
              placeholder="Nhập số CCCD"
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Ngày sinh
            </label>
            <input
              type="text"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-foreground">
              Giới tính
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all cursor-pointer"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-foreground">
            Địa chỉ thường trú / liên hệ
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ"
            className="w-full h-10 px-3.5 bg-muted/50 focus:bg-background rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Cập nhật thông tin</span>
          </button>
        </div>
      </form>
    </div>
  );
}
