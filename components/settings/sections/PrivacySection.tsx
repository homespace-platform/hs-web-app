"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function PrivacySection() {
  const [birthdayVisibility, setBirthdayVisibility] = useState("Không hiện");
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [showSeenStatus, setShowSeenStatus] = useState(false);
  const [allowMessaging, setAllowMessaging] = useState("Tất cả mọi người");
  const [allowCalling, setAllowCalling] = useState("Tất cả mọi người");
  const [allowPhoneSearch, setAllowPhoneSearch] = useState(true);

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
      {/* 1. Cá nhân */}
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

      {/* 2. Tin nhắn và cuộc gọi */}
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

      {/* 3. Chặn tin nhắn */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Chặn tin nhắn</h3>
        <div
          onClick={() => toast.info("Danh sách chặn hiện đang trống.")}
          className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-muted/40 transition-colors"
        >
          <span className="text-xs sm:text-sm font-medium text-foreground">
            Danh sách chặn
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* 4. Nguồn tìm kiếm */}
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
  );
}
