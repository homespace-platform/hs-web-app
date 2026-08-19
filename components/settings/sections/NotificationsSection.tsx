"use client";

import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Newspaper, Bell, Check, Sparkles } from "lucide-react";
import { NotificationPreferences } from "@/types/notification.type";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  systemNotifications: true,
  soundEnabled: true,
  newsNotifications: true,
  newsMarketReports: true,
  newsLegalGuides: true,
  newsPlatformUpdates: true,
};

export default function NotificationsSection() {
  const [prefs, setPrefs] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSaved, setIsSaved] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("homespace_notification_prefs");
      if (saved) {
        setPrefs(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
  }, []);

  // Update and save preferences
  const updatePref = (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(
          "homespace_notification_prefs",
          JSON.stringify(next)
        );
      } catch {
        // fallback
      }
      return next;
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-7 max-w-2xl animate-in fade-in-50 duration-200 select-none">
      {/* Save Toast Feedback */}
      {isSaved && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-foreground text-background text-xs font-semibold flex items-center gap-2 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Đã lưu cài đặt thông báo</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. THÔNG BÁO TIN TỨC TỪ ADMIN (Mục người dùng yêu cầu) */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Thông báo Tin tức & Bài viết từ Admin
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cập nhật thông báo khi ban quản trị đăng tải tin tức thị trường, cẩm nang và cập nhật tính năng
            </p>
          </div>
        </div>

        {/* Main News Switch Card */}
        <div className="bg-card rounded-2xl border border-border p-4.5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Nhận thông báo khi có tin tức mới
                </h4>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Bật để tự động nhận thông báo bài viết mới nhất từ ban quản trị HomeSpace vào chuông thông báo
                </p>
              </div>
            </div>

            <Switch
              checked={prefs.newsNotifications}
              onCheckedChange={(val) => updatePref("newsNotifications", val)}
            />
          </div>

          {/* Sub-options when news notifications are enabled */}
          {prefs.newsNotifications && (
            <div className="pt-3 border-t border-border/70 space-y-3 animate-in fade-in-50 duration-200">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Tùy chọn chủ đề tin tức:
              </p>

              <div className="space-y-2.5 pl-1">
                {/* Sub-option 1: Market Reports */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Bản tin thị trường & Báo cáo giá thuê
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Phân tích xu hướng giá thuê căn hộ theo từng quận định kỳ hàng tháng
                    </p>
                  </div>
                  <Switch
                    checked={prefs.newsMarketReports}
                    onCheckedChange={(val) =>
                      updatePref("newsMarketReports", val)
                    }
                  />
                </div>

                {/* Sub-option 2: Legal Guides */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Cẩm nang pháp lý & Hướng dẫn thuê nhà
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Lưu ý điều khoản hợp đồng thuê, thủ tục tạm trú và kinh nghiệm an toàn
                    </p>
                  </div>
                  <Switch
                    checked={prefs.newsLegalGuides}
                    onCheckedChange={(val) =>
                      updatePref("newsLegalGuides", val)
                    }
                  />
                </div>

                {/* Sub-option 3: Platform Updates */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Cập nhật tính năng & Sự kiện nền tảng
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Thông báo nâng cấp hệ thống ký quỹ On-chain và các tính năng mới
                    </p>
                  </div>
                  <Switch
                    checked={prefs.newsPlatformUpdates}
                    onCheckedChange={(val) =>
                      updatePref("newsPlatformUpdates", val)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THÔNG BÁO TIN NHẮN & HỆ THỐNG */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Thông báo Tin nhắn & Giao dịch
        </h3>
        <p className="text-xs text-muted-foreground">
          Nhận thông báo khi có tin nhắn trao đổi mới từ chủ nhà, khách thuê hoặc cập nhật hợp đồng
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Bật thông báo Card */}
          <div
            onClick={() => updatePref("systemNotifications", true)}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${
              prefs.systemNotifications
                ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.01]"
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
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  prefs.systemNotifications
                    ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/50"
                }`}
              >
                {prefs.systemNotifications && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span>Bật</span>
            </div>
          </div>

          {/* Tắt thông báo Card */}
          <div
            onClick={() => updatePref("systemNotifications", false)}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${
              !prefs.systemNotifications
                ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.01]"
                : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
            }`}
          >
            <div className="w-24 h-16 rounded-xl border-2 border-muted bg-muted/20 p-2 flex flex-col justify-center items-center" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  !prefs.systemNotifications
                    ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/50"
                }`}
              >
                {!prefs.systemNotifications && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span>Tắt</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ÂM THANH THÔNG BÁO */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Âm thanh thông báo</h3>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              Phát âm thanh chuông khi có thông báo & tin nhắn mới
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Âm báo nhẹ nhàng khi bạn đang mở ứng dụng HomeSpace
            </p>
          </div>
          <Switch
            checked={prefs.soundEnabled}
            onCheckedChange={(val) => updatePref("soundEnabled", val)}
          />
        </div>
      </div>
    </div>
  );
}
