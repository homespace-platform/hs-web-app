"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  Bell,
  Check,
  ShieldCheck,
  Building,
  Calendar,
  MessageSquare,
  UserCheck,
  KeyRound,
  CreditCard,
  LoaderCircle,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import notificationService, {
  getCategoryMeta,
} from "@/services/notification.service";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceItem,
} from "@/types/notification.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { disablePush, enablePush, isPushConfigured, isPushOptedIn, type PushStatus } from "@/services/notification-push.service";

export default function NotificationsSection() {
  const { authenticated, initialized, userId, login } = useAuth();
  const [items, setItems] = useState<NotificationPreferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<NotificationCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>("disabled");
  const [changingPush, setChangingPush] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!initialized || !authenticated) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const prefs = await notificationService.getPreferences();
      setItems(prefs);
    } catch (err) {
      setItems([]);
      setError(getApiErrorMessage(err, "Không thể tải cài đặt thông báo."));
    } finally {
      setLoading(false);
    }
  }, [initialized, authenticated]);

  useEffect(() => {
    if (!initialized) return;
    if (!authenticated) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    void loadPreferences();
  }, [initialized, authenticated, userId, loadPreferences]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sync = () => setPushStatus(
      !isPushConfigured() || !("Notification" in window) ? "unavailable" :
      Notification.permission === "denied" ? "unavailable" :
      isPushOptedIn() ? "registering" : "disabled",
    );
    const onStatus = (event: Event) => setPushStatus((event as CustomEvent<PushStatus>).detail);
    sync();
    window.addEventListener("hs:notification-push-status", onStatus);
    return () => window.removeEventListener("hs:notification-push-status", onStatus);
  }, []);

  const toggleBrowserPush = async () => {
    setChangingPush(true);
    try {
      if (isPushOptedIn() && pushStatus !== "error") await disablePush();
      else await enablePush();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể thay đổi thông báo trình duyệt."));
    } finally {
      setChangingPush(false);
    }
  };

  const handleToggleChannel = async (
    category: NotificationCategory,
    channel: NotificationChannel,
    value: boolean,
  ) => {
    if (savingCategory !== null) return;

    const previousItems = items;
    const nextItems = items.map((item) =>
      item.category === category ? { ...item, [channel]: value } : item,
    );

    setItems(nextItems);
    setSavingCategory(category);
    setIsSaved(false);

    try {
      const persisted = await notificationService.updatePreferences(nextItems);
      setItems(persisted);
      setIsSaved(true);
      toast.success("Đã lưu cài đặt thông báo.");
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (err) {
      setItems(previousItems);
      toast.error(getApiErrorMessage(err, "Không thể lưu cài đặt thông báo."));
    } finally {
      setSavingCategory(null);
    }
  };

  const renderCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "SYSTEM":
        return <Newspaper className="w-5 h-5" />;
      case "ACCOUNT":
        return <UserCheck className="w-5 h-5" />;
      case "LISTING":
        return <Building className="w-5 h-5" />;
      case "APPOINTMENT":
        return <Calendar className="w-5 h-5" />;
      case "RENTAL_REQUEST":
        return <KeyRound className="w-5 h-5" />;
      case "CONTRACT":
        return <ShieldCheck className="w-5 h-5" />;
      case "PAYMENT":
        return <CreditCard className="w-5 h-5" />;
      case "CHAT":
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  if (!initialized || loading) {
    return (
      <div className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-primary" />
        <span>Đang tải cài đặt thông báo...</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4 max-w-xl">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Bell className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">
            Đăng nhập để quản lý cài đặt thông báo
          </h3>
          <p className="text-xs text-muted-foreground">
            Tùy chọn kênh nhận thông báo được đồng bộ theo tài khoản của bạn.
          </p>
        </div>
        <Button
          onClick={() => login("/settings/notifications")}
          className="rounded-full h-9 px-5 text-xs cursor-pointer"
        >
          <LogIn className="w-4 h-4 mr-1.5" />
          Đăng nhập
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 max-w-2xl space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => void loadPreferences()}
          className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in-50 duration-200 select-none">
      {/* Save Toast Feedback */}
      {isSaved && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-foreground text-background text-xs font-semibold flex items-center gap-2 shadow-2xl animate-in fade-in-50 slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Đã lưu cài đặt thông báo</span>
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">
          Tùy chọn kênh nhận thông báo
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Chọn nhận thông báo đẩy (Push) và Email cho từng danh mục hoạt động. Thông báo trong ứng dụng luôn được lưu tại Trung tâm thông báo để đảm bảo bạn không bỏ lỡ thông tin quan trọng.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Thông báo khi không mở trang</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pushStatus === "unavailable" ? "Thông báo trình duyệt chưa khả dụng. Kiểm tra quyền trình duyệt hoặc cấu hình ứng dụng." :
             pushStatus === "registered" ? "Đã bật thông báo đẩy cho trình duyệt này." :
             pushStatus === "registering" ? "Đang đăng ký trình duyệt..." :
             pushStatus === "error" ? "Đăng ký chưa thành công. Hãy thử lại." :
             "Bật nếu bạn muốn nhận thông báo khi rời khỏi trang."}
          </p>
        </div>
        <Button
          type="button"
          variant={isPushOptedIn() ? "outline" : "default"}
          disabled={pushStatus === "unavailable" || changingPush}
          onClick={() => void toggleBrowserPush()}
          className="shrink-0"
        >
          {changingPush ? "Đang xử lý..." : pushStatus === "error" ? "Thử đăng ký lại" : isPushOptedIn() ? "Tắt trên trình duyệt này" : "Bật thông báo trình duyệt"}
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-border/70 shadow-2xs overflow-hidden">
        {items.map((item) => {
          const meta = getCategoryMeta(item.category);
          const isSavingThis = savingCategory === item.category;

          return (
            <div
              key={item.category}
              data-category={item.category}
              className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  {renderCategoryIcon(item.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">
                      {meta.settingsTitle}
                    </h4>
                    {isSavingThis && (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {meta.settingsDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 self-end sm:self-center shrink-0 pl-13 sm:pl-0">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <span className="text-muted-foreground">Push</span>
                  <Switch
                    checked={item.push}
                    disabled={savingCategory !== null}
                    aria-label={`${meta.settingsTitle} - Push`}
                    onCheckedChange={(val) =>
                      void handleToggleChannel(item.category, "push", val)
                    }
                  />
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <span className="text-muted-foreground">Email</span>
                  <Switch
                    checked={item.email}
                    disabled={savingCategory !== null}
                    aria-label={`${meta.settingsTitle} - Email`}
                    onCheckedChange={(val) =>
                      void handleToggleChannel(item.category, "email", val)
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
