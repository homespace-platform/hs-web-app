"use client";

import React, { useState } from "react";
import Header from "@/components/layout/Header";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import { MOCK_CONVERSATIONS } from "@/data/mock-chat-data";
import { ChatConversation, ChatFilterTab, ChatMessage } from "@/types/chat.type";

export default function ChatPage() {
  const [conversations, setConversations] =
    useState<ChatConversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >("conv-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ChatFilterTab>("all");
  const [showHidden, setShowHidden] = useState(false);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Gửi tin nhắn mới
  const handleSendMessage = (conversationId: string, text: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      content: text,
      timestamp: timeString,
      dateGroup: "Hôm nay",
      status: "read",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: timeString,
            lastMessageSender: "me",
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    // Mô phỏng phản hồi tự động sau 1.2 giây
    setTimeout(() => {
      const autoReplies: Record<string, string> = {
        "conv-1": "2222222222",
        "conv-2":
          "Cảm ơn bạn đã quan tâm. Mình đã ghi nhận và sẽ giữ lịch hẹn xem căn Landmark 81 với bạn nhé!",
        "conv-3":
          "Tôi đã lưu thông tin tìm kiếm của bạn vào hệ thống HomeSpace AI. Khi có căn hộ giá tốt mới nhất tại khu vực này, tôi sẽ thông báo cho bạn ngay lập tức.",
        "conv-4":
          "Ok bạn nhé, có gì cần điều chỉnh trong điều khoản hợp đồng cọc thì nhắn anh.",
      };

      const replyContent =
        autoReplies[conversationId] ||
        "Đã nhận được tin nhắn của bạn. Mình sẽ phản hồi chi tiết trong giây lát nhé!";

      const replyTime = new Date();
      const replyTimeString = `${replyTime
        .getHours()
        .toString()
        .padStart(2, "0")}:${replyTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: "them",
        content: replyContent,
        timestamp: replyTimeString,
        dateGroup: "Hôm nay",
        status: "read",
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: replyContent,
              lastMessageTime: replyTimeString,
              lastMessageSender: "them",
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
    }, 1200);
  };

  // Ẩn / Bỏ ẩn hội thoại
  const handleToggleHideConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          const nextHidden = !c.isHidden;
          return { ...c, isHidden: nextHidden };
        }
        return c;
      })
    );
  };

  // Ghim / Bỏ ghim hội thoại
  const handleTogglePinConversation = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, isPinned: !c.isPinned };
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* 1. Header HomeSpace */}
      <Header />

      {/* 2. Chat Layout Wrapper */}
      <main className="flex-1 pt-20 flex h-screen overflow-hidden">
        <div className="w-full h-[calc(100vh-80px)] flex bg-card border-t border-border overflow-hidden">
          {/* Cột Trái: Danh sách Hội thoại (Ẩn trên mobile khi đang mở chat) */}
          <div
            className={`w-full md:w-auto h-full ${
              activeConversation ? "hidden md:flex" : "flex"
            }`}
          >
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => setActiveConversationId(id)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showHidden={showHidden}
              onToggleShowHidden={() => setShowHidden((prev) => !prev)}
            />
          </div>

          {/* Cột Phải: Khung Chat Chi Tiết hoặc Trạng Thái Rỗng */}
          <div
            className={`flex-1 h-full ${
              activeConversation ? "flex" : "hidden md:flex"
            }`}
          >
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                onBack={() => setActiveConversationId(null)}
                onSendMessage={handleSendMessage}
                onToggleHideConversation={handleToggleHideConversation}
                onTogglePinConversation={handleTogglePinConversation}
              />
            ) : (
              <ChatEmptyState />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
