"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  Eye,
  EyeOff,
  Pin,
  ShieldCheck,
  Plus,
  Trash2,
  MoreHorizontal,
  Building,
  User,
  PanelLeftClose,
} from "lucide-react";
import {
  ChatConversation,
  ChatFilterTab,
  ChatChannelType,
  AiChatSession,
} from "@/types/chat.type";
import { AI_QUICK_TOPICS } from "@/data/mock-chat-data";
import ChatDemoIdentitySwitcher from "@/components/chat/ChatDemoIdentitySwitcher";

interface ChatSidebarProps {
  channel: ChatChannelType;
  onChannelChange: (channel: ChatChannelType) => void;
  // AI Sessions
  aiSessions: AiChatSession[];
  activeAiSessionId: string | null;
  onSelectAiSession: (id: string) => void;
  onNewAiSession: () => void;
  onDeleteAiSession?: (id: string) => void;
  onTogglePinAiSession?: (id: string) => void;
  onSelectAiTopic?: (prompt: string) => void;
  onToggleCollapse?: () => void;
  // Direct P2P Conversations
  directConversations: ChatConversation[];
  activeDirectConversationId: string | null;
  onSelectDirectConversation: (id: string) => void;
  // Filter & Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: ChatFilterTab;
  onTabChange: (tab: ChatFilterTab) => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  activeDemoUserId: string;
  onDemoUserChange: (userId: string) => void;
}

export default function ChatSidebar({
  channel,
  onChannelChange,
  aiSessions,
  activeAiSessionId,
  onSelectAiSession,
  onNewAiSession,
  onDeleteAiSession,
  onTogglePinAiSession,
  onSelectAiTopic,
  onToggleCollapse,
  directConversations,
  activeDirectConversationId,
  onSelectDirectConversation,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  showHidden,
  onToggleShowHidden,
  activeDemoUserId,
  onDemoUserChange,
}: ChatSidebarProps) {
  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(
    null
  );

  // Counts for direct conversations
  const directUnreadTotal = directConversations.filter(
    (c) => !c.isHidden && c.unreadCount > 0
  ).length;
  const directHiddenTotal = directConversations.filter((c) => c.isHidden).length;

  // Filter direct conversations
  const filteredDirectConversations = directConversations.filter((c) => {
    const matchesSearch =
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.relatedListing &&
        c.relatedListing.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "hidden") {
      return c.isHidden;
    }
    if (c.isHidden && !showHidden) {
      return false;
    }
    if (activeTab === "unread") {
      return c.unreadCount > 0;
    }
    if (activeTab === "landlord") {
      return (
        c.userRole?.toLowerCase().includes("chủ nhà") ||
        c.userName.toLowerCase().includes("chủ nhà")
      );
    }
    if (activeTab === "tenant") {
      return (
        c.userRole?.toLowerCase().includes("khách") ||
        c.userRole?.toLowerCase().includes("thuê")
      );
    }

    return true;
  });

  const sortedDirectConversations = [...filteredDirectConversations].sort(
    (a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    }
  );

  // Filter AI sessions by search query
  const filteredAiSessions = aiSessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedAiSessions = filteredAiSessions.filter((s) => s.isPinned);
  const recentAiSessions = filteredAiSessions.filter((s) => !s.isPinned);

  return (
    <>
      <aside className="w-full h-full flex flex-col bg-card border-r border-border select-none shrink-0 transition-colors">
        {/* 1. Header & Channel Switcher */}
        <div className="p-3 border-b border-border/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold font-heading text-foreground tracking-tight">
              HomeSpace Chat
            </h1>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer hidden md:flex items-center justify-center"
                title="Thu gọn thanh bên"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Segmented Channel Switcher */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/70 gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onChannelChange("ai")}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                channel === "ai"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              Trợ lý AI
            </button>

            <button
              type="button"
              onClick={() => onChannelChange("direct")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                channel === "direct"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              <span>Trò chuyện</span>
              {directUnreadTotal > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    channel === "direct"
                      ? "bg-white text-primary"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {directUnreadTotal}
                </span>
              )}
            </button>
          </div>
          <ChatDemoIdentitySwitcher value={activeDemoUserId} onChange={onDemoUserChange} />
        </div>

        {/* 2. Channel Content View */}
        {channel === "ai" ? (
          /* ========================================================================= */
          /* KÊNH 1: AI CHAT SESSIONS SIDEBAR (CHUẨN CHATGPT VỚI MÀU CHỦ ĐẠO) */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0">
            {/* New Chat Button */}
            <div className="p-3 pb-2">
              <button
                type="button"
                onClick={onNewAiSession}
                className="w-full py-2 px-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 text-foreground text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
              >
                <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span>Đoạn chat mới</span>
              </button>
            </div>

            {/* AI Sessions List (Pinned, Recents & Gợi ý bên dưới) */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
              {/* Section 1: Đã ghim */}
              {pinnedAiSessions.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                    Đã ghim
                  </div>
                  {pinnedAiSessions.map((s) => {
                    const isSelected = activeAiSessionId === s.id;

                    return (
                      <div
                        key={s.id}
                        onClick={() => onSelectAiSession(s.id)}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate pr-2">{s.title}</span>

                        {/* Actions on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {onTogglePinAiSession && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinAiSession(s.id);
                              }}
                              className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground"
                              title="Bỏ ghim"
                            >
                              <Pin className="w-3 h-3 rotate-45" />
                            </button>
                          )}
                          {onDeleteAiSession && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAiSession(s.id);
                              }}
                              className="p-1 rounded hover:bg-card text-muted-foreground hover:text-rose-500"
                              title="Xóa đoạn chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section 2: Gần đây */}
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                  Gần đây
                </div>
                {recentAiSessions.length === 0 &&
                pinnedAiSessions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-xs">
                    Chưa có lịch sử đoạn chat nào
                  </div>
                ) : (
                  recentAiSessions.map((s) => {
                    const isSelected = activeAiSessionId === s.id;

                    return (
                      <div
                        key={s.id}
                        onClick={() => onSelectAiSession(s.id)}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate pr-2">{s.title}</span>

                        {/* Actions on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {onTogglePinAiSession && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinAiSession(s.id);
                              }}
                              className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground"
                              title="Ghim đoạn chat"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteAiSession && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAiSession(s.id);
                              }}
                              className="p-1 rounded hover:bg-card text-muted-foreground hover:text-rose-500"
                              title="Xóa đoạn chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Section 3: Gợi ý chủ đề nhanh bên dưới */}
              <div className="pt-2 border-t border-border/60 space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                  Gợi ý chủ đề nhanh
                </div>
                <div className="space-y-1">
                  {AI_QUICK_TOPICS.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => onSelectAiTopic && onSelectAiTopic(topic.prompt)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all cursor-pointer truncate"
                      title={topic.prompt}
                    >
                      <span>• {topic.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* KÊNH 2: DIRECT P2P CONVERSATIONS SIDEBAR */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Box */}
            <div className="p-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Tìm chủ nhà, khách thuê..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-muted/50 focus:bg-background text-xs rounded-lg border border-transparent focus:border-primary/50 text-foreground placeholder:text-muted-foreground transition-all outline-none"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => onTabChange("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Tất cả
              </button>

              <button
                type="button"
                onClick={() => onTabChange("unread")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>Chưa đọc</span>
                {directUnreadTotal > 0 && (
                  <span
                    className={`px-1.5 py-0.1 rounded-full text-[9px] font-bold ${
                      activeTab === "unread"
                        ? "bg-white text-primary"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {directUnreadTotal}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onTabChange("landlord")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "landlord"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Chủ nhà
              </button>

              <button
                type="button"
                onClick={() => onTabChange("tenant")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "tenant"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Khách thuê
              </button>

              <button
                type="button"
                onClick={() => onTabChange("hidden")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "hidden"
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Ẩn ({directHiddenTotal})
              </button>
            </div>

            {/* Direct Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/30 p-1 space-y-0.5">
              {sortedDirectConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  Không tìm thấy cuộc trò chuyện nào
                </div>
              ) : (
                sortedDirectConversations.map((conv) => {
                  const isSelected = activeDirectConversationId === conv.id;
                  const initial = conv.userName.charAt(0).toUpperCase();
                  const lastMessage = conv.messages[conv.messages.length - 1];
                  const lastMessageIsMine = lastMessage?.senderId
                    ? lastMessage.senderId === activeDemoUserId
                    : conv.lastMessageSender === "me";

                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectDirectConversation(conv.id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                          : "hover:bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs bg-primary text-primary-foreground shadow-2xs ${
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : ""
                          }`}
                        >
                          {conv.userAvatar ? (
                            <Image
                              src={conv.userAvatar}
                              alt={conv.userName}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            initial
                          )}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                            conv.isOnline ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3
                            className={`text-xs truncate ${
                              isSelected
                                ? "text-primary font-bold"
                                : "text-foreground font-semibold"
                            }`}
                          >
                            {conv.userName}
                          </h3>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-normal">
                            {conv.lastMessageTime}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate font-normal">
                          {lastMessageIsMine && !conv.lastMessage.startsWith("Bạn:") && "Bạn: "}
                          {conv.lastMessage}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {conv.unreadCount > 0 && (
                        <span className="min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
