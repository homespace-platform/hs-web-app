"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  Eye,
  EyeOff,
  Pin,
  ShieldCheck,
  Sparkles,
  Settings as SettingsIcon,
} from "lucide-react";
import { ChatConversation, ChatFilterTab } from "@/types/chat.type";
import SettingsModal from "@/components/settings/SettingsModal";

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: ChatFilterTab;
  onTabChange: (tab: ChatFilterTab) => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  showHidden,
  onToggleShowHidden,
}: ChatSidebarProps) {
  // Counts
  const unreadTotal = conversations.filter(
    (c) => !c.isHidden && c.unreadCount > 0
  ).length;
  const hiddenTotal = conversations.filter((c) => c.isHidden).length;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Search query filter
    const matchesSearch =
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.relatedListing &&
        c.relatedListing.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === "hidden") {
      return c.isHidden;
    }
    if (c.isHidden && !showHidden) {
      return false;
    }
    if (activeTab === "unread") {
      return c.unreadCount > 0;
    }

    return true;
  });

  // Sort pinned first, then by recent
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-card border-r border-border h-full select-none shrink-0 transition-colors">
        {/* 1. Header Tin nhắn */}
        <div className="p-4 pb-3 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-heading text-foreground tracking-tight">
              Tin nhắn
            </h1>
            {unreadTotal > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                {unreadTotal}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Nút mở cài đặt (Zalo Style) */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Toggle xem hội thoại ẩn */}
            <button
              type="button"
              onClick={onToggleShowHidden}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                showHidden || activeTab === "hidden"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={showHidden ? "Đang hiện hội thoại ẩn" : "Xem hội thoại ẩn"}
            >
              {showHidden || activeTab === "hidden" ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-primary" />
                  <span>Hội thoại ẩn ({hiddenTotal})</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Hội thoại ẩn</span>
                </>
              )}
            </button>
          </div>
        </div>

      {/* 2. Ô Tìm kiếm hội thoại */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full pl-9 pr-3 py-2 bg-muted/60 hover:bg-muted focus:bg-background text-xs sm:text-sm rounded-xl border border-transparent focus:border-primary/50 text-foreground placeholder:text-muted-foreground transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter Tabs (Tất cả / Chưa đọc / Hội thoại bị ẩn) */}
      <div className="px-3 pb-2 flex items-center gap-1.5 border-b border-border/60">
        <button
          type="button"
          onClick={() => onTabChange("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Tất cả
        </button>

        <button
          type="button"
          onClick={() => onTabChange("unread")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "unread"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <span>Chưa đọc</span>
          {unreadTotal > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "unread"
                  ? "bg-white text-primary"
                  : "bg-primary text-white"
              }`}
            >
              {unreadTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("hidden")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activeTab === "hidden"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <span>Hội thoại bị ẩn</span>
          {hiddenTotal > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/20">
              {hiddenTotal}
            </span>
          )}
        </button>
      </div>

      {/* 4. Danh sách các cuộc trò chuyện giữa Chủ nhà và Khách thuê */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1.5 space-y-1">
        {sortedConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium">Không tìm thấy cuộc trò chuyện nào</p>
            <p className="text-xs text-muted-foreground/70">
              Hãy thử tìm kiếm với từ khóa khác
            </p>
          </div>
        ) : (
          sortedConversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            const initial = conv.userName.charAt(0).toUpperCase();

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? "bg-primary/10 border-primary/20 shadow-xs"
                    : "hover:bg-muted/80"
                }`}
              >
                {/* Avatar Initial or Image */}
                <div className="relative shrink-0">
                  {conv.userAvatar ? (
                    <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-blue-50 dark:bg-slate-800 p-0.5 border border-primary/30 shadow-xs">
                      <Image
                        src={conv.userAvatar}
                        alt={conv.userName}
                        width={44}
                        height={44}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Online/Offline status badge */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
                      conv.isOnline ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    title={conv.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                  />
                </div>

                {/* Info & Message Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {conv.userName}
                      </span>
                      {conv.id === "conv-ai-assistant" ? (
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                      ) : conv.userRole?.includes("xác thực") ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                      {conv.lastMessageTime}
                    </span>
                  </div>

                  {/* Role Tag (Trợ lý AI / Chủ nhà / Khách tìm thuê) */}
                  {conv.userRole && (
                    <div className="mb-1">
                      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        conv.id === "conv-ai-assistant"
                          ? "bg-primary/10 text-primary font-bold border border-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {conv.userRole}
                      </span>
                    </div>
                  )}

                  {/* Last Message snippet */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                      {conv.lastMessageSender === "me" && (
                        <span className="font-semibold text-foreground/80 mr-1">
                          Bạn:
                        </span>
                      )}
                      {conv.lastMessage}
                    </p>

                    {/* Badges / Pin */}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {conv.isPinned && (
                        <Pin className="w-3 h-3 text-muted-foreground rotate-45" />
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground min-w-[18px] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>

    {/* Settings Modal (Zalo Style) */}
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
    />
  </>
);
}
