"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Copy,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { AiChatSession, ChatMessage } from "@/types/chat.type";
import { AI_QUICK_TOPICS } from "@/data/mock-chat-data";
import { toast } from "sonner";
import AiMarkdownMessage from "@/components/chat/AiMarkdownMessage";

interface AiChatWindowProps {
  session: AiChatSession | null;
  customerName?: string | null;
  isAdmin?: boolean;
  onBack: () => void;
  onSendMessage: (sessionId: string, text: string) => void;
  onNewSession: () => void;
  onSelectTopic: (prompt: string) => void;
  isSending?: boolean;
  isLoadingHistory?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function AiChatWindow({
  session,
  customerName,
  isAdmin = false,
  onBack,
  onSendMessage,
  onNewSession,
  onSelectTopic,
  isSending = false,
  isLoadingHistory = false,
  isSidebarCollapsed,
  onToggleSidebar,
}: AiChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useMemo(() => session?.messages || [], [session?.messages]);
  const isNewSession = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const targetSessionId = session?.id || "";
    onSendMessage(targetSessionId, trimmed);
    setInputText("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* 1. Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-10">
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
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

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
              <span className="px-2 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                <span>Trợ lý AI</span>
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isAdmin ? "Kiến thức HomeSpace và tin đăng hiện có" : "Hỏi đáp HomeSpace và tìm tin đăng"}
            </span>
          </div>
        </div>

        {/* Action Header Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewSession}
            disabled={isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đoạn chat mới</span>
          </button>
        </div>
      </div>

      {/* 2. Chat Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Đang tải cuộc trò chuyện...
          </div>
        ) : isNewSession ? (
          /* Landing state khi chưa có tin nhắn */
          <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center pb-8">
            {/* Prominent, Large AI Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-primary/25 shadow-md flex items-center justify-center p-3 mb-5 hover:scale-105 transition-transform duration-300">
              <Image
                src="/logo/ai/homespace-ai-logo-removebg.png"
                alt="HomeSpace AI"
                width={72}
                height={72}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight mb-2">
              Xin chào{customerName ? `, ${customerName}` : " bạn"}! Mình có thể giúp gì hôm nay?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6">
              Mình có thể tìm tin đang hiển thị theo giá, địa điểm, loại hình, tiện ích, nội thất và các điều kiện thuê; hoặc giải đáp về HomeSpace từ tài liệu đã duyệt. Thông tin tin đăng được kiểm tra khi bạn hỏi, không phải dữ liệu tài khoản riêng.
            </p>
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-primary mb-4 px-3 py-1.5 rounded-full bg-primary/10">
                <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span className="font-medium">Đang chuẩn bị cuộc trò chuyện...</span>
                <div className="flex items-center gap-1">
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
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
            </div>
          </div>
        ) : (
          /* Conversation message list */
          <div className="max-w-3xl mx-auto space-y-5 pb-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "me";

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
                    className={`max-w-[85%] sm:max-w-[78%] group relative ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm"
                        : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-2xs text-sm"
                    }`}
                  >
                    <div className={isUser ? "whitespace-pre-wrap leading-relaxed text-xs sm:text-sm" : "leading-relaxed text-xs sm:text-sm"}>
                      {isUser ? msg.content : <AiMarkdownMessage content={msg.content} />}
                    </div>
                    {!isUser && msg.aiStatus && msg.aiStatus !== "ANSWERED" && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {msg.aiStatus === "NO_RESULTS" && "Chưa có tin đăng đang hiển thị khớp các điều kiện."}
                        {msg.aiStatus === "TOOL_UNAVAILABLE" && "Chưa kiểm tra được dữ liệu tin đăng trực tiếp; không suy đoán kết quả."}
                        {msg.aiStatus === "NO_EVIDENCE" && "Chưa tìm thấy tài liệu phù hợp."}
                        {msg.aiStatus === "GENERAL_ANSWER" && "Kiến thức chung · không lấy từ tài liệu HomeSpace."}
                        {msg.aiStatus === "OUT_OF_SCOPE" && "Hiện chưa hỗ trợ tra cứu dữ liệu này."}
                        {msg.aiStatus === "GENERATION_UNAVAILABLE" && "Trợ lý đang tạm gián đoạn."}
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
      <div className="px-3 sm:px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
      </div>

      {/* 4. Bottom Message Input Bar */}
      <div className="p-3 sm:p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-muted/50 focus-within:bg-background border border-border focus-within:border-primary/50 rounded-2xl px-3 py-1.5 shadow-2xs transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              maxLength={500}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm phòng theo tiêu chí hoặc hỏi về HomeSpace..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
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
              Tin đăng được tra cứu khi hỏi • Hướng dẫn dựa trên tài liệu được duyệt • Hội thoại được lưu riêng cho tài khoản của bạn
            </span>
          </div>
        </form>
      </div>
    
</div>
  );
}
