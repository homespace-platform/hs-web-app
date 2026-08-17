"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function NotificationsSection() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
      {/* 1. Cài đặt thông báo (Visual Notification Preview) */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Cài đặt thông báo</h3>
        <p className="text-xs text-muted-foreground">
          Nhận được thông báo mỗi khi có tin nhắn mới hoặc cập nhật từ chủ nhà
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Bật thông báo Card */}
          <div
            onClick={() => setNotificationsEnabled(true)}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${
              notificationsEnabled
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
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  notificationsEnabled ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
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
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 bg-card ${
              !notificationsEnabled
                ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]"
                : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
            }`}
          >
            <div className="w-24 h-16 rounded-xl border-2 border-muted bg-muted/20 p-2 flex flex-col justify-center items-center" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  !notificationsEnabled ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                }`}
              >
                {!notificationsEnabled && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span>Tắt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Âm thanh thông báo */}
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
  );
}
