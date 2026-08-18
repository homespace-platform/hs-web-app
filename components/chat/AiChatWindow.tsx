"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  Plus,
  Copy,
  Check,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { AiChatSession, ChatMessage } from "@/types/chat.type";
import { AI_QUICK_TOPICS } from "@/data/mock-chat-data";

interface AiChatWindowProps {
  session: AiChatSession | null;
  onBack: () => void;
  onSendMessage: (sessionId: string, text: string) => void;
  onNewSession: () => void;
  onSelectTopic: (prompt: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function AiChatWindow({
  session,
  onBack,
  onSendMessage,
  onNewSession,
  onSelectTopic,
  isSidebarCollapsed,
  onToggleSidebar,
}: AiChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = session?.messages || [];
  const isNewSession = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const targetSessionId = session?.id || `session-${Date.now()}`;
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

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* 1. Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Sidebar Collapse / Expand Toggle Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer hidden md:flex items-center justify-center"
              title={isSidebarCollapsed ? "Mở thanh bên" : "Thu gọn thanh bên"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
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
              Trực tuyến 24/7
            </span>
          </div>
        </div>

        {/* Action Header Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đoạn chat mới</span>
          </button>
        </div>
      </div>

      {/* 2. Chat Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {isNewSession ? (
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
              Tôi có thể giúp gì cho bạn hôm nay?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-6">
              Hỗ trợ tìm kiếm bất động sản cho thuê chính chủ, khảo sát mức giá thị trường và bảo vệ tiền cọc On-chain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {AI_QUICK_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onSelectTopic(topic.prompt)}
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
                    <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                      {msg.content}
                    </div>

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
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin cho HomeSpace AI..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2 rounded-xl font-semibold transition-all flex items-center justify-center cursor-pointer ${
                inputText.trim()
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
              Enter để gửi • Shift + Enter xuống dòng
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
