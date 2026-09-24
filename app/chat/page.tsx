"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import AiChatWindow from "@/components/chat/AiChatWindow";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import { aiService } from "@/services/ai.service";
import { getApiErrorMessage } from "@/utils/apiError";
import {
  ChatFilterTab,
  ChatMessage,
  ChatChannelType,
  AiChatSession,
} from "@/types/chat.type";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import { useRouter, useSearchParams } from "next/navigation";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationIdFromUrl = searchParams.get("conversationId");
  const channelFromUrl = searchParams.get("channel");
  const [channel, setChannel] = useState<ChatChannelType>(
    conversationIdFromUrl || channelFromUrl === "direct" ? "direct" : "ai"
  );
  const activeChannel: ChatChannelType =
    conversationIdFromUrl
      ? "direct"
      : channelFromUrl === "direct" || channelFromUrl === "ai"
      ? channelFromUrl
      : channel;
  const setChatChannel = useCallback(
    (nextChannel: ChatChannelType) => {
      setChannel(nextChannel);
      router.replace(`/chat?channel=${nextChannel}`, { scroll: false });
    },
    [router]
  );

  // Sidebar Resizing & Collapse State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Multi-session AI State (Mới vào mở trang landing rỗng chuẩn Ảnh 2)
  const [aiSessions, setAiSessions] = useState<AiChatSession[]>([]);
  const [pendingAiSessionId, setPendingAiSessionId] = useState<string | null>(null);
  const [activeAiSessionId, setActiveAiSessionId] = useState<string | null>(
    null
  );

  const {
    currentUserId,
    conversations: directConversations,
    sendMessage: sendDirectMessage,
    toggleHideConversation,
    togglePinConversation,
    updateParticipantRole,
    loadConversationMessages,
    setActiveConversationId,
    startCall,
    manageMessage,
  } = useChatDemo();
  const [activeDirectConversationId, setActiveDirectConversationId] = useState<string | null>(
    conversationIdFromUrl
  );
  const selectedDirectConversationId =
    conversationIdFromUrl ?? activeDirectConversationId;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ChatFilterTab>("all");
  const [showHidden, setShowHidden] = useState(false);

  // Active AI Session
  const activeAiSession = activeAiSessionId
    ? aiSessions.find((s) => s.id === activeAiSessionId) || null
    : null;

  // Active Direct Conversation
  const activeDirectConversation = selectedDirectConversationId
    ? directConversations.find((c) => c.id === selectedDirectConversationId) ||
      null
    : null;

  useEffect(() => {
    if (selectedDirectConversationId) {
      void loadConversationMessages(selectedDirectConversationId);
    }
  }, [selectedDirectConversationId, loadConversationMessages]);

  useEffect(() => {
    setActiveConversationId(
      activeChannel === "direct" ? selectedDirectConversationId : null,
    );
    return () => setActiveConversationId(null);
  }, [activeChannel, selectedDirectConversationId, setActiveConversationId]);

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
    setChatChannel("ai");
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

  const handleSendAiMessage = async (sessionId: string, text: string) => {
    if (pendingAiSessionId) return;
    setPendingAiSessionId(sessionId);
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

    try {
      const reply = await aiService.ask(text, sessionId);
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
        content: reply.answer,
        timestamp: replyTimeString,
        dateGroup: "Hôm nay",
        status: "read",
        aiStatus: reply.status,
        aiCitations: reply.citations,
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
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        "Không thể kết nối trợ lý AI. Vui lòng thử lại sau.",
      );
      setAiSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: `msg-ai-error-${Date.now()}`,
                    sender: "them" as const,
                    content: errorMessage,
                    timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                    status: "read" as const,
                  },
                ],
              }
            : session,
        ),
      );
    } finally {
      setPendingAiSessionId(null);
    }
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
    setChatChannel("ai");
    const targetSessionId = activeAiSessionId || `session-${Date.now()}`;
    handleSendAiMessage(targetSessionId, prompt);
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
                channel={activeChannel}
                onChannelChange={setChatChannel}
                // AI Sessions
                aiSessions={aiSessions}
                activeAiSessionId={activeAiSessionId}
                onSelectAiSession={(id) => {
                  setChatChannel("ai");
                  setActiveAiSessionId(id);
                }}
                onNewAiSession={handleNewAiSession}
                onDeleteAiSession={handleDeleteAiSession}
                onTogglePinAiSession={handleTogglePinAiSession}
                // Direct P2P
                directConversations={directConversations}
                activeDirectConversationId={selectedDirectConversationId}
                onSelectDirectConversation={(id) => {
                  setChatChannel("direct");
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
                currentUserId={currentUserId}
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
            {activeChannel === "ai" ? (
              <AiChatWindow
                session={activeAiSession}
                onBack={() => setActiveAiSessionId(null)}
                onSendMessage={handleSendAiMessage}
                onNewSession={handleNewAiSession}
                onSelectTopic={handleSelectAiTopic}
                isSending={pendingAiSessionId === activeAiSessionId}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            ) : activeDirectConversation ? (
              <ChatWindow
                conversation={activeDirectConversation}
                onBack={() => setActiveDirectConversationId(null)}
                onSendMessage={(conversationId, text, attachments) =>
                  sendDirectMessage(conversationId, text, undefined, attachments)
                }
                onToggleHideConversation={toggleHideConversation}
                onTogglePinConversation={togglePinConversation}
                onUpdateParticipantRole={updateParticipantRole}
                onStartCall={startCall}
                onMessageAction={manageMessage}
                currentUserId={currentUserId}
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
