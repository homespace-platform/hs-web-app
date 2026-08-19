"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import AiChatWindow from "@/components/chat/AiChatWindow";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import {
  MOCK_AI_SESSIONS,
  MOCK_DIRECT_CONVERSATIONS,
} from "@/data/mock-chat-data";
import {
  ChatConversation,
  ChatFilterTab,
  ChatMessage,
  ChatChannelType,
  AiChatSession,
} from "@/types/chat.type";

export default function ChatPage() {
  const [channel, setChannel] = useState<ChatChannelType>("ai");

  // Sidebar Resizing & Collapse State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Multi-session AI State (Mới vào mở trang landing rỗng chuẩn Ảnh 2)
  const [aiSessions, setAiSessions] =
    useState<AiChatSession[]>(MOCK_AI_SESSIONS);
  const [activeAiSessionId, setActiveAiSessionId] = useState<string | null>(
    null
  );

  // Direct Conversations State (Mới vào không tự động trỏ hội thoại, hiển thị trang trống bảo mật)
  const [directConversations, setDirectConversations] = useState<
    ChatConversation[]
  >(MOCK_DIRECT_CONVERSATIONS);
  const [activeDirectConversationId, setActiveDirectConversationId] = useState<
    string | null
  >(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ChatFilterTab>("all");
  const [showHidden, setShowHidden] = useState(false);

  // Active AI Session
  const activeAiSession = activeAiSessionId
    ? aiSessions.find((s) => s.id === activeAiSessionId) || null
    : null;

  // Active Direct Conversation
  const activeDirectConversation = activeDirectConversationId
    ? directConversations.find((c) => c.id === activeDirectConversationId) ||
      null
    : null;

  // Sidebar Drag-to-Resize Logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // Clamp sidebar width between 240px and 520px
      const newWidth = Math.min(Math.max(e.clientX, 240), 520);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // 1. AI Actions
  const handleNewAiSession = () => {
    setChannel("ai");
    const newSessionId = `session-${Date.now()}`;
    const newSession: AiChatSession = {
      id: newSessionId,
      title: "Đoạn chat mới",
      createdAt: "Vừa xong",
      isPinned: false,
      messages: [],
    };
    setAiSessions((prev) => [newSession, ...prev]);
    setActiveAiSessionId(newSessionId);
  };

  const handleSendAiMessage = (sessionId: string, text: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "me",
      content: text,
      timestamp: timeString,
      dateGroup: "Hôm nay",
      status: "read",
    };

    // Check if session already exists
    const sessionExists = aiSessions.some((s) => s.id === sessionId);

    if (!sessionExists) {
      const generatedTitle =
        text.length > 30 ? text.slice(0, 30) + "..." : text;
      const newSession: AiChatSession = {
        id: sessionId,
        title: generatedTitle,
        createdAt: "Hôm nay",
        isPinned: false,
        messages: [userMsg],
      };
      setAiSessions((prev) => [newSession, ...prev]);
      setActiveAiSessionId(sessionId);
    } else {
      setAiSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            const shouldUpdateTitle =
              s.title === "Đoạn chat mới" || s.messages.length === 0;
            const updatedTitle = shouldUpdateTitle
              ? text.length > 30
                ? text.slice(0, 30) + "..."
                : text
              : s.title;

            return {
              ...s,
              title: updatedTitle,
              messages: [...s.messages, userMsg],
            };
          }
          return s;
        })
      );
    }

    // AI Response Simulation
    setTimeout(() => {
      let replyContent = "";
      const lower = text.toLowerCase();

      if (
        lower.includes("15") ||
        lower.includes("2pn") ||
        lower.includes("tìm căn") ||
        lower.includes("tìm phòng") ||
        lower.includes("phòng trọ") ||
        lower.includes("thuê")
      ) {
        replyContent = `Dựa trên dữ liệu xác thực thị trường TP.HCM:\n\n1. **Căn hộ 2PN Vinhomes Central Park (Bình Thạnh)**\n- Giá: 16.5 triệu/tháng | Diện tích: 75 m²\n- View sông thoáng, full nội thất cao cấp.\n\n2. **Căn hộ 2PN Masteri Thảo Điền (TP. Thủ Đức)**\n- Giá: 18.0 triệu/tháng | Diện tích: 72 m²\n- Nhà chính chủ, hỗ trợ đăng ký tạm trú đầy đủ.\n\n3. **Căn hộ Studio Bến Nghé (Quận 1)**\n- Giá: 9.5 triệu/tháng | Diện tích: 40 m²\n- Ban công thoáng mát, ngay trung tâm.\n\nBạn có muốn tôi kết nối với chủ nhà để hẹn lịch xem thực tế không?`;
      } else if (
        lower.includes("cọc") ||
        lower.includes("on-chain") ||
        lower.includes("an toàn") ||
        lower.includes("tiền cọc")
      ) {
        replyContent = `Cơ chế bảo vệ tiền cọc On-chain của HomeSpace:\n\n1. **Ký quỹ độc lập:** Tiền cọc được bảo lưu trong Smart Contract cho đến khi hai bên hoàn tất nhận bàn giao nhà.\n2. **Kiểm tra hiện trạng:** Khách thuê xác nhận nhận phòng thực tế đúng mô tả trước khi hợp đồng giải ngân.\n3. **Bảo vệ rủi ro:** Hoàn cọc 100% tự động nếu chủ nhà vi phạm điều khoản hoặc hủy lịch bất ngờ.`;
      } else if (
        lower.includes("quận 7") ||
        lower.includes("bình thạnh") ||
        lower.includes("so sánh") ||
        lower.includes("quận 1")
      ) {
        replyContent = `So sánh giá thuê căn hộ trung bình tháng này:\n\n- **Quận 7 (Phú Mỹ Hưng / Tân Hưng):**\n  • 1PN / Studio: 7.5 - 11 triệu/tháng\n  • 2PN: 13.0 - 18 triệu/tháng\n\n- **Bình Thạnh (Vinhomes / Hàng Xanh):**\n  • 1PN / Studio: 8.0 - 12 triệu/tháng\n  • 2PN: 14.5 - 22 triệu/tháng\n\nKhu vực Quận 7 phù hợp không gian yên tĩnh nhiều cây xanh, Bình Thạnh thuận tiện di chuyển nhanh vào Quận 1.`;
      } else if (
        lower.includes("hợp đồng") ||
        lower.includes("pháp lý") ||
        lower.includes("lưu ý") ||
        lower.includes("điều khoản")
      ) {
        replyContent = `3 lưu ý pháp lý quan trọng khi ký hợp đồng thuê:\n\n1. **Xác minh quyền sở hữu:** Đối chiếu CCCD và sổ hồng của chủ nhà với thông tin hiển thị trên tin đăng đã xác thực.\n2. **Điều khoản hoàn cọc:** Quy định rõ thời gian hoàn cọc sau khi kết thúc hợp đồng (thường từ 1-3 ngày).\n3. **Biên bản bàn giao thiết bị:** Chụp ảnh ghi nhận hiện trạng ban đầu của căn nhà và chỉ số điện nước.`;
      } else {
        replyContent = `Tôi đã ghi nhận câu hỏi: "${text}".\n\nHomeSpace AI hỗ trợ tra cứu thông tin bất động sản cho thuê, khảo sát mức giá thị trường và tư vấn điều khoản đặt cọc an toàn.`;
      }

      const replyTime = new Date();
      const replyTimeString = `${replyTime
        .getHours()
        .toString()
        .padStart(2, "0")}:${replyTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      const aiReplyMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: "them",
        content: replyContent,
        timestamp: replyTimeString,
        dateGroup: "Hôm nay",
        status: "read",
      };

      setAiSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: [...s.messages, aiReplyMsg],
            };
          }
          return s;
        })
      );
    }, 600);
  };

  const handleDeleteAiSession = (sessionId: string) => {
    setAiSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (activeAiSessionId === sessionId) {
        setActiveAiSessionId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleTogglePinAiSession = (sessionId: string) => {
    setAiSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return { ...s, isPinned: !s.isPinned };
        }
        return s;
      })
    );
  };

  const handleSelectAiTopic = (prompt: string) => {
    setChannel("ai");
    const targetSessionId = activeAiSessionId || `session-${Date.now()}`;
    handleSendAiMessage(targetSessionId, prompt);
  };

  // 2. Direct P2P Messaging Actions
  const handleSendDirectMessage = (conversationId: string, text: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `msg-direct-${Date.now()}`,
      sender: "me",
      content: text,
      timestamp: timeString,
      dateGroup: "Hôm nay",
      status: "read",
    };

    setDirectConversations((prev) =>
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

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `msg-rep-${Date.now()}`,
        sender: "them",
        content:
          "Mình đã nhận được tin nhắn của bạn. Mình sẽ phản hồi chi tiết trong giây lát nhé!",
        timestamp: timeString,
        dateGroup: "Hôm nay",
        status: "read",
      };

      setDirectConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessage: replyMsg.content,
              lastMessageTime: timeString,
              lastMessageSender: "them",
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
    }, 1000);
  };

  const handleToggleHideDirectConversation = (conversationId: string) => {
    setDirectConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, isHidden: !c.isHidden };
        }
        return c;
      })
    );
  };

  const handleTogglePinDirectConversation = (conversationId: string) => {
    setDirectConversations((prev) =>
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
      <Header />

      <main className="flex-1 pt-20 flex h-screen overflow-hidden">
        <div className="w-full h-[calc(100vh-80px)] flex bg-card border-t border-border overflow-hidden relative">
          {/* Cột Trái: Sidebar (Co giãn độ rộng theo thao tác kéo thả và thu gọn) */}
          <div
            ref={sidebarRef}
            style={{
              width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
              minWidth: isSidebarCollapsed ? 0 : undefined,
            }}
            className={`h-full flex shrink-0 overflow-hidden transition-[width] ${
              isResizing ? "duration-0" : "duration-200 ease-in-out"
            } ${isSidebarCollapsed ? "invisible border-none" : "visible"}`}
          >
            <div style={{ width: `${sidebarWidth}px` }} className="h-full flex flex-col shrink-0">
              <ChatSidebar
                channel={channel}
                onChannelChange={setChannel}
                // AI Sessions
                aiSessions={aiSessions}
                activeAiSessionId={activeAiSessionId}
                onSelectAiSession={(id) => {
                  setChannel("ai");
                  setActiveAiSessionId(id);
                }}
                onNewAiSession={handleNewAiSession}
                onDeleteAiSession={handleDeleteAiSession}
                onTogglePinAiSession={handleTogglePinAiSession}
                // Direct P2P
                directConversations={directConversations}
                activeDirectConversationId={activeDirectConversationId}
                onSelectDirectConversation={(id) => {
                  setChannel("direct");
                  setActiveDirectConversationId(id);
                }}
                // Search & Filter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showHidden={showHidden}
                onToggleShowHidden={() => setShowHidden((prev) => !prev)}
                onSelectAiTopic={handleSelectAiTopic}
                onToggleCollapse={toggleSidebar}
              />
            </div>
          </div>

          {/* Thanh nắm kéo Co Giãn Độ Rộng Sidebar (Resize Handle) */}
          {!isSidebarCollapsed && (
            <div
              onMouseDown={handleMouseDown}
              className={`w-1.5 hover:w-2 -ml-1 h-full z-20 cursor-col-resize hover:bg-primary/40 active:bg-primary transition-all flex items-center justify-center group ${
                isResizing ? "bg-primary w-2" : "bg-transparent"
              }`}
              title="Kéo sang trái/phải để co giãn độ rộng thanh bên"
            >
              <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors" />
            </div>
          )}

          {/* Cột Phải: Khung Chat Chi Tiết */}
          <div className="flex-1 h-full flex flex-col overflow-hidden min-w-0">
            {channel === "ai" ? (
              <AiChatWindow
                session={activeAiSession}
                onBack={() => setActiveAiSessionId(null)}
                onSendMessage={handleSendAiMessage}
                onNewSession={handleNewAiSession}
                onSelectTopic={handleSelectAiTopic}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            ) : activeDirectConversation ? (
              <ChatWindow
                conversation={activeDirectConversation}
                onBack={() => setActiveDirectConversationId(null)}
                onSendMessage={handleSendDirectMessage}
                onToggleHideConversation={handleToggleHideDirectConversation}
                onTogglePinConversation={handleTogglePinDirectConversation}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            ) : (
              <ChatEmptyState
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
