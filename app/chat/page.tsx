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
  >("conv-ai-assistant");
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

    // Mô phỏng phản hồi tự động
    const delay = conversationId === "conv-ai-assistant" ? 600 : 1200;

    setTimeout(() => {
      let replyContent = "";

      if (conversationId === "conv-ai-assistant") {
        const lower = text.toLowerCase();
        if (
          lower.includes("15") ||
          lower.includes("2pn") ||
          lower.includes("tìm căn") ||
          lower.includes("tìm phòng") ||
          lower.includes("phòng trọ")
        ) {
          replyContent = `Dựa trên dữ liệu thị trường mới nhất tại TP.HCM:\n\n✨ Tôi tìm thấy 3 lựa chọn nổi bật phù hợp yêu cầu của bạn:\n1. 🏢 Căn hộ 2PN Vinhomes Grand Park (12.5 tr/tháng - Full nội thất)\n2. 🏢 Căn hộ 2PN Masteri An Phú Q2 (14.5 tr/tháng - View sông thoáng mát)\n3. 🏠 Nhà nguyên căn hẻm xe hơi Bình Thạnh (14.0 tr/tháng - 2PN 2WC)\n\nBạn có muốn tôi hỗ trợ kết nối trực tiếp với chủ nhà của căn nào không?`;
        } else if (
          lower.includes("cọc") ||
          lower.includes("on-chain") ||
          lower.includes("an toàn") ||
          lower.includes("tiền cọc")
        ) {
          replyContent = `🛡️ **Quy trình đặt cọc On-chain an toàn trên HomeSpace:**\n\n1. Tiền cọc được khóa trong Smart Contract độc lập (Escrow) minh bạch.\n2. Tiền chỉ được giải ngân cho chủ nhà khi bạn đã nhận nhà và xác nhận hiện trạng thực tế.\n3. Nếu có tranh chấp hoặc chủ nhà hủy phòng vô cớ, tiền cọc sẽ được hoàn trả 100% tự động.\n\nGiúp bạn hoàn toàn an tâm khi tìm thuê mà không lo bị lừa đảo tiền cọc!`;
        } else if (
          lower.includes("quận 7") ||
          lower.includes("bình thạnh") ||
          lower.includes("so sánh") ||
          lower.includes("quận 1")
        ) {
          replyContent = `📊 **So sánh giá thuê trung bình tháng này:**\n\n• **Quận 7 (Phú Mỹ Hưng / Sunrise City):**\n  - Studio / 1PN: 7.5 - 11 triệu/tháng\n  - Căn hộ 2PN: 13.0 - 18 triệu/tháng\n\n• **Bình Thạnh (Vinhomes Central Park / Hàng Xanh):**\n  - Studio / 1PN: 8.0 - 12 triệu/tháng\n  - Căn hộ 2PN: 14.5 - 22 triệu/tháng\n\n👉 Khu vực Bình Thạnh kết nối trung tâm Q1 nhanh hơn, còn Quận 7 có nhiều mảng xanh và không gian yên tĩnh hơn.`;
        } else if (
          lower.includes("hợp đồng") ||
          lower.includes("pháp lý") ||
          lower.includes("lưu ý") ||
          lower.includes("điều khoản")
        ) {
          replyContent = `⚖️ **3 lưu ý pháp lý quan trọng khi ký hợp đồng thuê trực tiếp:**\n\n1. **Xác minh danh tính chủ nhà:** Đảm bảo người ký là chính chủ sở hữu (mọi tin đăng trên HomeSpace đều có huy hiệu đã xác thực).\n2. **Quy định tiền cọc & bồi thường:** Nêu rõ điều kiện hoàn trả cọc và thời hạn thông báo trước khi chấm dứt hợp đồng (thường là 30 ngày).\n3. **Biên bản bàn giao hiện trạng:** Ghi nhận rõ chỉ số điện nước và tình trạng trang thiết bị trước khi dọn vào.`;
        } else {
          replyContent = `Tôi đã ghi nhận: "${text}".\n\nTôi là Trợ lý AI của HomeSpace. Tôi có thể hỗ trợ bạn tìm kiếm căn hộ, so sánh giá cả khu vực, giải đáp điều khoản hợp đồng thuê hoặc hướng dẫn quy trình đặt cọc On-chain an toàn!`;
        }
      } else {
        const autoReplies: Record<string, string> = {
          "conv-1": "2222222222",
          "conv-2":
            "Cảm ơn bạn đã quan tâm. Mình là chủ nhà Landmark 81, mình đã ghi nhận và sẽ đón bạn xem phòng đúng giờ nhé!",
          "conv-3":
            "Ok bạn nhé, mình là chủ căn Studio Bến Nghé Q1. Có gì cần trao đổi thêm về điều khoản thuê trực tiếp thì nhắn mình.",
          "conv-4":
            "Chị đã nhận được tin nhắn. Căn Masteri Thảo Điền này chị chính chủ, em yên tâm qua xem nhà nhé.",
        };

        replyContent =
          autoReplies[conversationId] ||
          "Đã nhận được tin nhắn của bạn. Mình sẽ phản hồi chi tiết trong giây lát nhé!";
      }

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
    }, delay);
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
