"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import AiChatWindow from "@/components/chat/AiChatWindow";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import { aiService } from "@/services/ai.service";
import { getApiErrorMessage } from "@/utils/apiError";
import axios from "axios";
import {
  ChatFilterTab,
  ChatMessage,
  ChatChannelType,
  AiChatSession,
} from "@/types/chat.type";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import type { AiConversationDetail, AiConversationMessage, AiConversationSummary } from "@/types/ai.type";
import { toast } from "sonner";

function toChatMessage(message: AiConversationMessage): ChatMessage {
  return {
    id: message.id,
    sender: message.role === "user" ? "me" : "them",
    content: message.content,
    timestamp: new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    createdAt: message.createdAt,
    status: "read",
    aiStatus: message.status ?? undefined,
  };
}

function toAiSession(conversation: AiConversationSummary | AiConversationDetail): AiChatSession {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: new Date(conversation.createdAt).toLocaleDateString("vi-VN"),
    updatedAt: conversation.updatedAt,
    isPinned: conversation.isPinned,
    messages: "messages" in conversation ? conversation.messages.map(toChatMessage) : [],
    messagesLoaded: "messages" in conversation,
  };
}

export default function ChatPage() {
  const { profile, authenticated, initialized } = useAuth();
  const customerName = [profile?.lastName, profile?.firstName]
    .filter(Boolean)
    .join(" ")
    .trim() || profile?.username || null;
  const isAdmin = ["ADMIN", "ROLE_ADMIN"].includes(profile?.role?.toUpperCase() || "");
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

  // Mongo-backed AI conversations, scoped by the authenticated Gateway identity.
  const [aiSessions, setAiSessions] = useState<AiChatSession[]>([]);
  const [pendingAiSessionId, setPendingAiSessionId] = useState<string | null>(null);
  const [loadingAiSessionId, setLoadingAiSessionId] = useState<string | null>(null);
  const [isInitializingAi, setIsInitializingAi] = useState(true);
  const initializedForUserRef = useRef<string | null>(null);
  const sendInFlightRef = useRef(false);
  const [activeAiSessionId, setActiveAiSessionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!authenticated || !profile?.id) {
      initializedForUserRef.current = null;
      setAiSessions([]);
      setActiveAiSessionId(null);
      if (initialized && !authenticated) setIsInitializingAi(false);
      return;
    }
    if (initializedForUserRef.current === profile.id) return;
    const ownerId = profile.id;
    initializedForUserRef.current = ownerId;
    setIsInitializingAi(true);
    void (async () => {
      try {
        const previous = await aiService.listConversations();
        if (initializedForUserRef.current !== ownerId) return;

        if (previous.length > 0) {
          const mostRecent = previous[0];
          try {
            const detail = await aiService.getConversation(mostRecent.id);
            if (initializedForUserRef.current !== ownerId) return;
            const sessions = previous.map((conv) =>
              conv.id === mostRecent.id ? toAiSession(detail) : toAiSession(conv)
            );
            setAiSessions(sessions);
            setActiveAiSessionId(mostRecent.id);
          } catch {
            setAiSessions(previous.map(toAiSession));
            setActiveAiSessionId(mostRecent.id);
          }
        } else {
          const fresh = await aiService.createConversation();
          if (initializedForUserRef.current !== ownerId) return;
          setAiSessions([toAiSession(fresh)]);
          setActiveAiSessionId(fresh.id);
        }
      } catch (error) {
        initializedForUserRef.current = null;
        toast.error(getApiErrorMessage(error, "Không tải được lịch sử trò chuyện. Vui lòng thử lại."));
      } finally {
        setIsInitializingAi(false);
      }
    })();
  }, [authenticated, initialized, profile?.id]);

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

  useEffect(() => {
    if (activeChannel === "direct" && !selectedDirectConversationId && directConversations.length > 0) {
      setActiveDirectConversationId(directConversations[0].id);
    }
  }, [activeChannel, selectedDirectConversationId, directConversations]);

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
  const handleNewAiSession = async (): Promise<string | null> => {
    if (isInitializingAi) return null;
    if (!authenticated) {
      toast.error("Vui lòng đăng nhập để lưu cuộc trò chuyện.");
      return null;
    }
    setChatChannel("ai");
    if (activeAiSession && activeAiSession.messages.length === 0 && activeAiSession.title === "Đoạn chat mới") {
      return activeAiSession.id;
    }
    try {
      const fresh = await aiService.createConversation();
      setAiSessions((prev) => [toAiSession(fresh), ...prev]);
      setActiveAiSessionId(fresh.id);
      return fresh.id;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không tạo được cuộc trò chuyện mới."));
      return null;
    }
  };

  const handleSendAiMessage = async (sessionId: string, text: string) => {
    if (sendInFlightRef.current) return;
    if (!authenticated) {
      toast.error("Vui lòng đăng nhập để trò chuyện với HomeSpace AI.");
      return;
    }
    sendInFlightRef.current = true;
    let targetSessionId = sessionId;
    if (!aiSessions.some((session) => session.id === targetSessionId)) {
      const createdId = await handleNewAiSession();
      if (!createdId) {
        sendInFlightRef.current = false;
        return;
      }
      targetSessionId = createdId;
    }
    setPendingAiSessionId(targetSessionId);
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

    setAiSessions((prev) =>
      prev.map((session) => session.id === targetSessionId
        ? {
            ...session,
            title: session.title === "Đoạn chat mới" ? text.slice(0, 60) : session.title,
            messages: [...session.messages, userMsg],
          }
        : session),
    );

    try {
      const reply = await aiService.ask(text, targetSessionId);
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
      };

      setAiSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...s.messages, aiReplyMsg],
            };
          }
          return s;
        })
      );
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && [502, 503, 504].includes(error.response?.status ?? 0)
        ? "Trợ lý AI đang khởi động hoặc tạm gián đoạn. Vui lòng thử lại sau ít phút."
        : getApiErrorMessage(error, "Không thể kết nối trợ lý AI. Vui lòng thử lại sau.");
      setAiSessions((prev) =>
        prev.map((session) =>
          session.id === targetSessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: `msg-ai-error-${Date.now()}`,
                    sender: "them" as const,
                    content: `${errorMessage} Nếu câu hỏi chưa xuất hiện sau khi tải lại trang, hãy gửi lại nhé.`,
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
      sendInFlightRef.current = false;
    }
  };

  const handleSelectAiSession = async (sessionId: string) => {
    setChatChannel("ai");
    setActiveAiSessionId(sessionId);
    if (aiSessions.find((session) => session.id === sessionId)?.messagesLoaded) return;
    setLoadingAiSessionId(sessionId);
    try {
      const conversation = await aiService.getConversation(sessionId);
      setAiSessions((prev) => prev.map((session) =>
        session.id === sessionId ? toAiSession(conversation) : session,
      ));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không tải được cuộc trò chuyện."));
    } finally {
      setLoadingAiSessionId(null);
    }
  };

  const handleDeleteAiSession = async (sessionId: string) => {
    if (!window.confirm("Xóa vĩnh viễn cuộc trò chuyện này?")) return;
    try {
      await aiService.deleteConversation(sessionId);
      const remaining = aiSessions.filter((session) => session.id !== sessionId);
      setAiSessions(remaining);
      if (activeAiSessionId === sessionId) {
        if (remaining.length) void handleSelectAiSession(remaining[0].id);
        else void handleNewAiSession();
      }
      toast.success("Đã xóa cuộc trò chuyện.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không xóa được cuộc trò chuyện."));
    }
  };

  const handleTogglePinAiSession = async (sessionId: string) => {
    const session = aiSessions.find((item) => item.id === sessionId);
    if (!session) return;
    try {
      const updated = await aiService.setPinned(sessionId, !session.isPinned);
      setAiSessions((prev) => prev.map((item) =>
        item.id === sessionId ? { ...item, isPinned: updated.isPinned } : item,
      ));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không cập nhật được cuộc trò chuyện."));
    }
  };

  const handleSelectAiTopic = (prompt: string) => {
    if (isInitializingAi) return;
    setChatChannel("ai");
    void handleSendAiMessage(activeAiSessionId || "", prompt);
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
                  void handleSelectAiSession(id);
                }}
                onNewAiSession={handleNewAiSession}
                onDeleteAiSession={handleDeleteAiSession}
                onTogglePinAiSession={handleTogglePinAiSession}
                isAiInitializing={isInitializingAi}
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
                customerName={customerName}
                isAdmin={isAdmin}
                onBack={() => setActiveAiSessionId(null)}
                onSendMessage={handleSendAiMessage}
                onNewSession={handleNewAiSession}
                onSelectTopic={handleSelectAiTopic}
                isSending={isInitializingAi || (pendingAiSessionId !== null && pendingAiSessionId === activeAiSessionId)}
                isLoadingHistory={loadingAiSessionId !== null && loadingAiSessionId === activeAiSessionId}
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
