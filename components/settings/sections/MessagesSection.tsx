"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function MessagesSection() {
  const [autoReply, setAutoReply] = useState(false);
  const [spellCheck, setSpellCheck] = useState(true);
  const [compressImages, setCompressImages] = useState(true);

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in-50 duration-200">
      {/* 1. Tin nhắn tự động & Soạn thảo */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">Tin nhắn & Soạn thảo</h3>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Tự động kiểm tra chính tả khi soạn thảo
              </p>
              <p className="text-[11px] text-muted-foreground">
                Gợi ý và sửa lỗi chính tả tiếng Việt
              </p>
            </div>
            <Switch
              checked={spellCheck}
              onCheckedChange={setSpellCheck}
            />
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Tối ưu dung lượng hình ảnh khi gửi
              </p>
              <p className="text-[11px] text-muted-foreground">
                Giúp gửi tin nhắn ảnh nhanh hơn và tiết kiệm dữ liệu
              </p>
            </div>
            <Switch
              checked={compressImages}
              onCheckedChange={setCompressImages}
            />
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Tự động trả lời khi vắng mặt
              </p>
              <p className="text-[11px] text-muted-foreground">
                Gửi tin nhắn mẫu cho khách thuê khi bạn không online
              </p>
            </div>
            <Switch
              checked={autoReply}
              onCheckedChange={setAutoReply}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
