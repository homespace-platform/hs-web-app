"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  PanelLeftOpen,
  Send,
  Sparkles,
} from "lucide-react";
import type { AiChatSession } from "@/types/chat.type";
import AiListingCards from "@/components/chat/AiListingCards";
import AiContractCards from "@/components/chat/AiContractCards";
import AiAppointmentCards from "@/components/chat/AiAppointmentCards";
import { aiSourceNote, aiStatusNote, safeContractCards } from "@/lib/ai-contract-cards";
import { safeAppointmentCards } from "@/lib/ai-appointment-cards";
import { AI_QUICK_TOPICS } from "@/data/mock-chat-data";
import { toast } from "sonner";
import AiMarkdownMessage from "@/components/chat/AiMarkdownMessage";
import GuestAiLoginDialog from "@/components/chat/GuestAiLoginDialog";

interface AiChatWindowProps {
  session: AiChatSession | null;
  customerName?: string | null;
  isGuest?: boolean;
  isAdmin?: boolean;
  onBack?: () => void;
  onSendMessage: (sessionId: string, text: string) => void;
  onSelectTopic: (prompt: string) => void;
  isSending?: boolean;
  isLoadingHistory?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  /** Only dimensions change; both sizes render the same chat UI. */
  size?: "full" | "compact";
  headerActions?: React.ReactNode;
  onToggleCollapse?: () => void;
  regionId?: string;
  bodyOverride?: React.ReactNode;
  notice?: React.ReactNode;
  initialDraft?: string;
  isVisible?: boolean;
  /** Full chat page renders suggestions in its sidebar instead of above the input. */
  showSuggestionBar?: boolean;
}

export default function AiChatWindow({
  session,
  customerName,
  isGuest = false,
  isAdmin = false,
  onBack,
  onSendMessage,
  onSelectTopic,
  isSending = false,
  isLoadingHistory = false,
  isSidebarCollapsed,
  onToggleSidebar,
  size = "full",
  headerActions,
  onToggleCollapse,
  regionId,
  bodyOverride,
  notice,
  initialDraft = "",
  isVisible = true,
  showSuggestionBar = true,
}: AiChatWindowProps) {
  const [inputText, setInputText] = useState(initialDraft);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useMemo(() => session?.messages || [], [session?.messages]);
  const isNewSession = messages.length === 0;
  const compact = size === "compact";

  useEffect(() => {
    if (!isVisible) return;
    const stream = streamRef.current;
    // Scroll only the conversation, never the surrounding home page.
    stream?.scrollTo({ top: isNewSession ? 0 : stream.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, isNewSession, isSending, isVisible]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending || isLoadingHistory) return;

    const targetSessionId = session?.id || "";
    onSendMessage(targetSessionId, trimmed);
    setInputText("");
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      toast.success("Đã sao chép câu trả lời.");
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error("Không thể sao chép nội dung.");
    }
  };

  return (
    <div className={`flex min-w-0 flex-col bg-background overflow-hidden ${compact ? "w-full" : "flex-1 min-h-0 h-full"}`}>
      {isGuest && <GuestAiLoginDialog />}
      {/* 1. Header */}
      <div className="min-h-16 gap-2 px-3 py-2 sm:px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Sidebar Expand Button (Only visible when sidebar is collapsed) */}
          {onToggleSidebar && isSidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden md:flex items-center justify-center"
              title="Mở thanh bên"
            >
              <PanelLeftOpen className="w-4 h-4 text-primary" />
            </button>
          )}

          {/* Mobile Back Button */}
          {onBack && <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>}

          {/* AI Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white p-1 border border-primary/30 shadow-xs">
              <Image
                src="/logo/ai/homespace-ai-logo-removebg.png"
                alt="HomeSpace Assistant AI"
                width={38}
                height={38}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>

          {/* AI Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-foreground truncate">
                HomeSpace Assistant AI
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{isAdmin ? "Trợ lý quản trị Homespace AI" : "Trợ lý Homespace AI"}</span>
            </span>
          </div>
        </div>

        {/* Action Header Button */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {headerActions}
          {onToggleCollapse && <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={isVisible}
            aria-controls={regionId}
            aria-label={isVisible ? "Thu gọn hội thoại" : "Mở hội thoại"}
            title={isVisible ? "Thu gọn hội thoại" : "Mở hội thoại"}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary cursor-pointer"
          >
            {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>}
        </div>
      </div>

      {/* Keep the complete shared UI mounted when home collapses, including drafts. */}
      <div id={regionId} inert={!isVisible} aria-hidden={!isVisible} className={`grid min-h-0 ${compact ? "" : "flex-1"} ${onToggleCollapse ? "transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none" : ""} ${isVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="min-h-0 overflow-hidden">
      <div className={`flex min-h-0 flex-col ${compact ? "h-[min(560px,65svh)] min-h-80" : "h-full"}`}>
      {bodyOverride ?? <>
      {notice}

      {/* 2. Chat Stream Area */}
      <div ref={streamRef} role="log" aria-label="Hội thoại với HomeSpace AI" aria-busy={isSending} className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${compact ? "p-3 sm:p-5" : "px-3 py-4 sm:px-6 lg:px-10"}`}>
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Đang tải cuộc trò chuyện...
          </div>
        ) : (
          <div className={`space-y-4 pb-4 ${compact ? "max-w-3xl mx-auto" : "w-full max-w-6xl mx-auto"}`}>
            {/* Local greeting: not persisted or sent to the model as evidence. */}
            <div className="flex gap-3 justify-start" data-ai-greeting="">
              <div className="w-8 h-8 rounded-full bg-white border border-primary/25 p-1 shrink-0 shadow-2xs flex items-center justify-center mt-0.5">
                <Image src="/logo/ai/homespace-ai-logo-removebg.png" alt="HomeSpace AI" width={24} height={24} className="w-full h-full object-contain" unoptimized />
              </div>
              <div className="min-w-0 max-w-[85%] sm:max-w-[78%] rounded-2xl rounded-tl-sm border border-primary/15 bg-card px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs">
                <p className="font-semibold">{!isGuest && customerName?.trim() ? `Xin chào, ${customerName.trim()}!` : "Chào bạn!"} Rất vui được đồng hành cùng bạn tại HomeSpace.</p>
                <p className="mt-2">Mình có thể giúp bạn tìm nơi ở phù hợp hoặc giải đáp về HomeSpace. Bạn cứ chia sẻ khu vực, ngân sách và những tiện ích bạn mong muốn nhé!</p>
              </div>
            </div>
            {isNewSession && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-11 text-left">
              {AI_QUICK_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onSelectTopic(topic.prompt)}
                  disabled={isSending}
                  className="p-3.5 rounded-2xl border border-border bg-card hover:bg-primary/5 hover:border-primary/40 transition-all text-left group cursor-pointer shadow-2xs"
                >
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                    {topic.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {topic.desc}
                  </p>
                </button>
              ))}
            </div>}
            {messages.map((msg) => {
              const isUser = msg.sender === "me";
              const hasTable = !isUser && /^\|[^\n]+\|\s*$/m.test(msg.content);
              const contractCards = isUser ? [] : safeContractCards(msg.contractCards);
              const appointmentCards = isUser ? [] : safeAppointmentCards(msg.appointmentCards);
              const hasCards = !isUser && (Boolean(msg.listingIds?.length) || contractCards.length > 0 || appointmentCards.length > 0);
              const statusNote = isUser ? null : aiStatusNote(msg.aiStatus, msg.dataSources);
              const sourceNote = isUser ? null : aiSourceNote(msg.dataSources, msg.aiStatus);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-white border border-primary/25 p-1 shrink-0 shadow-2xs flex items-center justify-center mt-0.5">
                      <Image
                        src="/logo/ai/homespace-ai-logo-removebg.png"
                        alt="HomeSpace AI"
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>
                  )}

                  <div
                    className={`min-w-0 ${hasTable || hasCards ? "w-[calc(100%-2.75rem)]" : "max-w-[85%] sm:max-w-[78%]"} group relative ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm"
                        : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-2xs text-sm"
                    }`}
                  >
                    <div className={isUser ? "whitespace-pre-wrap leading-relaxed text-xs sm:text-sm" : "leading-relaxed text-xs sm:text-sm"}>
                      {isUser ? msg.content : <AiMarkdownMessage content={msg.content} />}
                    </div>
                    {!isUser && Boolean(msg.listingIds?.length) && <AiListingCards listingIds={msg.listingIds!} positions={msg.listingPositions} />}
                    {contractCards.length > 0 && <AiContractCards cards={contractCards} />}
                    {appointmentCards.length > 0 && <AiAppointmentCards cards={appointmentCards} />}
                    {(statusNote || sourceNote) && (
                      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        {statusNote && <p>{statusNote}</p>}
                        {sourceNote && <p>{sourceNote}</p>}
                      </div>
                    )}

                    <div
                      className={`flex items-center gap-2 mt-2 pt-1.5 text-[10px] ${
                        isUser
                          ? "text-primary-foreground/70 justify-end"
                          : "text-muted-foreground justify-between border-t border-border/50"
                      }`}
                    >
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Sao chép câu trả lời"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-white border border-primary/25 p-1 shrink-0 shadow-2xs flex items-center justify-center mt-0.5">
                  <Image
                    src="/logo/ai/homespace-ai-logo-removebg.png"
                    alt="HomeSpace AI"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <div className="bg-card border border-border text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-2xs flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 3. Quick Suggestions Chips Bar */}
      {showSuggestionBar && <div className="shrink-0 px-3 sm:px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-muted-foreground font-medium shrink-0 flex items-center gap-1 pl-1">
          <span>Gợi ý:</span>
        </span>
        {AI_QUICK_TOPICS.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.prompt)}
            disabled={isSending}
            className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground border border-border/60 font-medium transition-all cursor-pointer shadow-2xs"
            title={topic.prompt}
          >
            {topic.title}
          </button>
        ))}
      </div>}

      {/* 4. Bottom Message Input Bar */}
      <div className="shrink-0 p-3 sm:p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-muted/50 focus-within:bg-background border border-border focus-within:border-primary/50 rounded-2xl px-3 py-1.5 shadow-2xs transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              maxLength={500}
              disabled={isLoadingHistory}
              aria-label="Câu hỏi cho HomeSpace AI"
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm phòng theo tiêu chí hoặc hỏi về HomeSpace..."
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending || isLoadingHistory}
              className={`p-2 rounded-xl font-semibold transition-all flex items-center justify-center cursor-pointer ${
                inputText.trim() && !isSending
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:scale-105 active:scale-95"
                  : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end px-1">
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
              Tin đăng được tra cứu khi hỏi • Hướng dẫn dựa trên tài liệu được duyệt • {isGuest ? "Khách được hỏi 3 câu • Hội thoại chỉ tồn tại trong phiên này" : "Hội thoại được lưu riêng cho tài khoản của bạn"}
            </span>
          </div>
        </form>
      </div>
      </>}
      </div>
      </div>
      </div>
    </div>
  );
}
