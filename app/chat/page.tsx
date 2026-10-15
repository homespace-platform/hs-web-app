"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import AiChatWindow from "@/components/chat/AiChatWindow";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import { aiService, guestAiService } from "@/services/ai.service";
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
import { toAiSession } from "@/lib/ai-conversation";
import { toast } from "sonner";
import { guestChatState, isGuestLoginRequired, resumeGuestConversation } from "@/lib/guest-ai-session";

export default function ChatPage() {
  const { initialized, authenticated, profile } = useAuth();
  const scope = !initialized ? "initializing" : authenticated ? `account:${profile?.id ?? "loading"}` : "guest";
  // Remount on identity changes: neither old history nor drafts can flash in the
  // next account/guest window, including while its history request is pending.
  return <ChatWorkspace key={scope} />;
}

function ChatWorkspace() {
  const { profile, authenticated, initialized, login } = useAuth();
  const ownerKey = !initialized ? null : authenticated ? profile?.id ?? null : "guest";
  useEffect(() => { if (ownerKey === "guest") return guestChatState.retain(); }, [ownerKey]);
  const ownerRef = useRef(ownerKey);
  useLayoutEffect(() => {
    ownerRef.current = ownerKey;
    return () => { ownerRef.current = null; };
  }, [ownerKey]);
  const chatApi = authenticated ? aiService : guestAiService;
  const customerName = authenticated ? [profile?.lastName, profile?.firstName]
    .filter(Boolean)
    .join(" ")
    .trim() || profile?.username || null : null;
  const isAdmin = authenticated && ["ADMIN", "ROLE_ADMIN"].includes(profile?.role?.toUpperCase() || "");
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationIdFromUrl = searchParams.get("conversationId");
  // Separate from direct messaging's conversationId query parameter.
  const aiConversationIdFromUrl = searchParams.get("aiConversationId");
  const resumeGuestNonce = searchParams.get("resumeGuest");
  const [resumedDraft, setResumedDraft] = useState("");
  const [migrationError, setMigrationError] = useState(false);
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

  // Account history is persisted; guest conversation lives in browser memory only.
  const [aiSessions, setAiSessions] = useState<AiChatSession[]>([]);
  const [pendingAiSessionId, setPendingAiSessionId] = useState<string | null>(null);
  const [loadingAiSessionId, setLoadingAiSessionId] = useState<string | null>(null);
  const [isInitializingAi, setIsInitializingAi] = useState(true);
  const initializedForUserRef = useRef<string | null>(null);
  const initializedAiUrlRef = useRef<string | null>(null);
  const sendInFlightRef = useRef(false);
  const [activeAiSessionId, setActiveAiSessionId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!ownerKey) {
      initializedForUserRef.current = null;
      initializedAiUrlRef.current = null;
      setAiSessions([]);
      setActiveAiSessionId(null);
      setIsInitializingAi(true);
      return;
    }
    if (initializedForUserRef.current === ownerKey && (!aiConversationIdFromUrl || initializedAiUrlRef.current === aiConversationIdFromUrl)) return;
    const ownerId = ownerKey;
    if (initializedForUserRef.current !== ownerId) {
      setAiSessions([]);
      setActiveAiSessionId(null);
      setPendingAiSessionId(null);
      setLoadingAiSessionId(null);
    }
    let cancelled = false;
    let completed = false;
    initializedForUserRef.current = ownerId;
    initializedAiUrlRef.current = aiConversationIdFromUrl;
    setIsInitializingAi(true);
    void (async () => {
      try {
        if (authenticated && resumeGuestNonce) {
          const resumed = await resumeGuestConversation(resumeGuestNonce);
          if (cancelled || initializedForUserRef.current !== ownerId) return;
          if (resumed) {
            const conversation = resumed.conversation ?? await aiService.createConversation();
            if (cancelled || initializedForUserRef.current !== ownerId) return;
            const others = await aiService.listConversations();
            if (cancelled || initializedForUserRef.current !== ownerId) return;
            setAiSessions([toAiSession(conversation), ...others.filter((item) => item.id !== conversation.id).map(toAiSession)]);
            setActiveAiSessionId(conversation.id);
            setResumedDraft(resumed.pendingQuestion);
            setMigrationError(false);
            initializedAiUrlRef.current = conversation.id;
            router.replace(`/chat?channel=ai&aiConversationId=${encodeURIComponent(conversation.id)}`, { scroll: false });
            toast.success("Đã lưu cuộc trò chuyện vào tài khoản. Bạn có thể gửi câu hỏi đang chờ.");
            return;
          }
        }
        const previous = await chatApi.listConversations();
        if (cancelled || initializedForUserRef.current !== ownerId) return;

        if (aiConversationIdFromUrl) {
          // Ownership is checked by the same Gateway/API as normal chat history.
          // Do not silently open an unrelated "most recent" or pinned conversation.
          const detail = await chatApi.getConversation(aiConversationIdFromUrl);
          if (cancelled || initializedForUserRef.current !== ownerId) return;
          setAiSessions([toAiSession(detail), ...previous.filter((conv) => conv.id !== detail.id).map(toAiSession)]);
          setActiveAiSessionId(detail.id);
          return;
        }

        if (previous.length > 0) {
          const mostRecent = previous[0];
          try {
            const detail = await chatApi.getConversation(mostRecent.id);
            if (cancelled || initializedForUserRef.current !== ownerId) return;
            const sessions = previous.map((conv) =>
              conv.id === mostRecent.id ? toAiSession(detail) : toAiSession(conv)
            );
            setAiSessions(sessions);
            setActiveAiSessionId(mostRecent.id);
          } catch {
            if (cancelled || initializedForUserRef.current !== ownerId) return;
            setAiSessions(previous.map(toAiSession));
            setActiveAiSessionId(mostRecent.id);
          }
        } else {
          const fresh = await chatApi.createConversation();
          if (cancelled || initializedForUserRef.current !== ownerId) return;
          setAiSessions([toAiSession(fresh)]);
          setActiveAiSessionId(fresh.id);
        }
      } catch (error) {
        if (cancelled || initializedForUserRef.current !== ownerId) return;
        initializedForUserRef.current = null;
        if (authenticated && resumeGuestNonce) setMigrationError(true);
        toast.error(getApiErrorMessage(error, "Không tải được lịch sử trò chuyện. Vui lòng thử lại."));
      } finally {
        if (!cancelled) { completed = true; setIsInitializingAi(false); }
      }
    })();
    return () => {
      cancelled = true;
      if (!completed && initializedForUserRef.current === ownerId) initializedForUserRef.current = null;
    };
  }, [ownerKey, chatApi, aiConversationIdFromUrl, authenticated, resumeGuestNonce, router]);

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
    if (authenticated && selectedDirectConversationId) {
      void loadConversationMessages(selectedDirectConversationId);
    }
  }, [authenticated, selectedDirectConversationId, loadConversationMessages]);

  useEffect(() => {
    setActiveConversationId(
      authenticated && activeChannel === "direct" ? selectedDirectConversationId : null,
    );
    return () => setActiveConversationId(null);
  }, [authenticated, activeChannel, selectedDirectConversationId, setActiveConversationId]);

  useEffect(() => {
    if (authenticated && activeChannel === "direct" && !selectedDirectConversationId && directConversations.length > 0) {
      setActiveDirectConversationId(directConversations[0].id);
    }
  }, [authenticated, activeChannel, selectedDirectConversationId, directConversations]);

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
    if (isInitializingAi || !ownerKey) return null;
    if (!authenticated) return activeAiSessionId;
    setResumedDraft("");
    const requestOwner = ownerKey;
    setChatChannel("ai");
    if (activeAiSession && activeAiSession.messages.length === 0 && activeAiSession.title === "Đoạn chat mới") {
      return activeAiSession.id;
    }
    try {
      const fresh = await chatApi.createConversation();
      if (ownerRef.current !== requestOwner) return null;
      setAiSessions((prev) => [toAiSession(fresh), ...prev]);
      setActiveAiSessionId(fresh.id);
      return fresh.id;
    } catch (error) {
      if (ownerRef.current === requestOwner) toast.error(getApiErrorMessage(error, "Không tạo được cuộc trò chuyện mới."));
      return null;
    }
  };

  const handleSendAiMessage = async (sessionId: string, text: string) => {
    if (sendInFlightRef.current || isInitializingAi || !ownerKey) return;
    if (!authenticated && !guestChatState.canAsk(text)) return;
    if (migrationError) return; // Don't replace the consented conversation with a fresh one.
    setResumedDraft("");
    const requestOwner = ownerKey;
    sendInFlightRef.current = true;
    let targetSessionId = sessionId;
    if (!aiSessions.some((session) => session.id === targetSessionId)) {
      const createdId = await handleNewAiSession();
      if (!createdId || ownerRef.current !== requestOwner) {
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
      const reply = await chatApi.ask(text, targetSessionId);
      if (ownerRef.current !== requestOwner) return;
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
        listingIds: reply.listingIds,
        listingPositions: reply.listingPositions,
        contractCards: reply.contractCards,
        dataSources: reply.dataSources,
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
      if (ownerRef.current !== requestOwner) return;
      if (isGuestLoginRequired(error)) {
        setAiSessions((prev) => prev.map((item) => item.id === targetSessionId
          ? { ...item, messages: item.messages.filter((message) => message.id !== userMsg.id) } : item));
        return;
      }
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
      if (ownerRef.current === requestOwner) setPendingAiSessionId(null);
      sendInFlightRef.current = false;
    }
  };

  const handleSelectAiSession = async (sessionId: string) => {
    const requestOwner = ownerKey;
    setChatChannel("ai");
    setActiveAiSessionId(sessionId);
    if (aiSessions.find((session) => session.id === sessionId)?.messagesLoaded) return;
    setLoadingAiSessionId(sessionId);
    try {
      const conversation = await chatApi.getConversation(sessionId);
      if (ownerRef.current !== requestOwner) return;
      setAiSessions((prev) => prev.map((session) =>
        session.id === sessionId ? toAiSession(conversation) : session,
      ));
    } catch (error) {
      if (ownerRef.current === requestOwner) toast.error(getApiErrorMessage(error, "Không tải được cuộc trò chuyện."));
    } finally {
      if (ownerRef.current === requestOwner) setLoadingAiSessionId(null);
    }
  };

  const handleDeleteAiSession = async (sessionId: string) => {
    const requestOwner = ownerKey;
    if (!window.confirm("Xóa vĩnh viễn cuộc trò chuyện này?")) return;
    try {
      await chatApi.deleteConversation(sessionId);
      if (ownerRef.current !== requestOwner) return;
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
    const requestOwner = ownerKey;
    const session = aiSessions.find((item) => item.id === sessionId);
    if (!session) return;
    try {
      const updated = await chatApi.setPinned(sessionId, !session.isPinned);
      if (ownerRef.current !== requestOwner) return;
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
                aiSessions={authenticated ? aiSessions : []}
                activeAiSessionId={activeAiSessionId}
                onSelectAiSession={(id) => {
                  void handleSelectAiSession(id);
                }}
                onNewAiSession={handleNewAiSession}
                onDeleteAiSession={handleDeleteAiSession}
                onTogglePinAiSession={handleTogglePinAiSession}
                isAiInitializing={isInitializingAi || !authenticated}
                // Direct P2P
                directConversations={authenticated ? directConversations : []}
                activeDirectConversationId={authenticated ? selectedDirectConversationId : null}
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
                key={`${ownerKey ?? "initializing"}:${resumedDraft ? activeAiSessionId : ""}`}
                size="full"
                session={activeAiSession}
                customerName={customerName}
                isGuest={!authenticated}
                initialDraft={resumedDraft}
                notice={migrationError && <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Chưa chuyển được cuộc trò chuyện khách. Nội dung vẫn được giữ tạm để thử lại; mình chưa gửi câu hỏi đang chờ.
                  <button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline">Thử lưu lại</button>
                </div>}
                isAdmin={isAdmin}
                onBack={() => setActiveAiSessionId(null)}
                onSendMessage={handleSendAiMessage}
                onSelectTopic={handleSelectAiTopic}
                isSending={isInitializingAi || (pendingAiSessionId !== null && pendingAiSessionId === activeAiSessionId)}
                isLoadingHistory={isInitializingAi || (loadingAiSessionId !== null && loadingAiSessionId === activeAiSessionId)}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
              />
            ) : !authenticated ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <h2 className="text-lg font-semibold">Đăng nhập để trò chuyện với chủ nhà</h2>
                <p className="max-w-sm text-sm text-muted-foreground">Bạn vẫn có thể hỏi trợ lý AI và tìm nơi ở mà không cần tài khoản.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={login} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer">Đăng nhập</button>
                  <button type="button" onClick={() => setChatChannel("ai")} className="rounded-xl border border-border px-4 py-2 text-sm font-medium cursor-pointer">Hỏi trợ lý AI</button>
                </div>
              </div>
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
