"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ArrowLeft,
  Smile,
  ImageIcon,
  Paperclip,
  Send,
  CheckCheck,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Info,
  Sparkles,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ChatConversation, ChatMessage } from "@/types/chat.type";
import { toast } from "sonner";

interface ChatWindowProps {
  conversation: ChatConversation;
  onBack: () => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onToggleHideConversation: (conversationId: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
  currentUserId?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatWindow({
  conversation,
  onBack,
  onSendMessage,
  onToggleHideConversation,
  onTogglePinConversation,
  currentUserId,
  isSidebarCollapsed,
  onToggleSidebar,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(frameId);
  }, [conversation.id, conversation.messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSendMessage(conversation.id, trimmed);
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

  const handleQuickReply = (text: string) => {
    onSendMessage(conversation.id, text);
  };

  const initial = conversation.userName.charAt(0).toUpperCase();
  const isAi = conversation.id === "conv-ai-assistant";

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* 1. Chat Header */}
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

          {/* User / AI Avatar & Status */}
          <div className="relative shrink-0">
            {conversation.userAvatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-blue-50 dark:bg-slate-800 p-0.5 border border-primary/30 shadow-xs">
                <Image
                  src={conversation.userAvatar}
                  alt={conversation.userName}
                  width={38}
                  height={38}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs bg-primary text-primary-foreground">
                {initial}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                conversation.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>

          {/* User / AI Name and Sub-status */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-foreground truncate">
                {conversation.userName}
              </span>
              {isAi ? (
                <span className="px-2 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span>Trợ lý AI</span>
                </span>
              ) : conversation.userRole?.includes("xác thực") ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : null}
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {isAi ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Trực tuyến 24/7
                </span>
              ) : (
                conversation.lastActive ||
                (conversation.isOnline ? "Đang hoạt động" : "Ngoại tuyến")
              )}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
          {!isAi && (
            <>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Gọi thoại trực tiếp"
                onClick={() => toast.info("Tính năng gọi thoại đang được phát triển.")}
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Gọi video xem phòng trực tiếp"
                onClick={() => toast.info("Tính năng gọi video đang được phát triển.")}
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Tìm trong hội thoại"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
              title="Tùy chọn khác"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-popover text-popover-foreground rounded-2xl shadow-xl border border-border p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    onTogglePinConversation(conversation.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-muted flex items-center justify-between"
                >
                  <span>{conversation.isPinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleHideConversation(conversation.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-muted flex items-center justify-between"
                >
                  <span>{conversation.isHidden ? "Bỏ ẩn hội thoại" : "Ẩn hội thoại này"}</span>
                </button>
                <div className="my-1 border-t border-border/60" />
                <button
                  type="button"
                  onClick={() => {
                    toast.info("Tính năng xóa lịch sử trò chuyện đang được phát triển.");
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"
                >
                  Xóa lịch sử tin nhắn
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {conversation.messages.map((msg, index) => {
          const isMe = currentUserId
            ? msg.senderId === currentUserId
            : msg.sender === "me";
          const showDateDivider =
            index === 0 ||
            msg.dateGroup !== conversation.messages[index - 1].dateGroup;

          return (
            <React.Fragment key={msg.id}>
              {/* Date Group Divider */}
              {showDateDivider && (
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground shadow-2xs">
                    {msg.dateGroup || msg.timestamp}
                  </span>
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                } group`}
              >
                <div
                  className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {!isMe && conversation.userAvatar && (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-blue-50 dark:bg-slate-800 p-0.5 border border-primary/20 shrink-0 mb-1 shadow-2xs">
                      <Image
                        src={conversation.userAvatar}
                        alt={conversation.userName}
                        width={24}
                        height={24}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex flex-col">
                    {/* Inline Listing Card Attachment inside message */}
                    {msg.listingCard && (
                      <div className="mb-2 w-full max-w-sm rounded-2xl overflow-hidden border border-border bg-card shadow-xs hover:border-primary/40 transition-all p-2.5 flex items-center gap-3 group/card">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border">
                          <Image
                            src={msg.listingCard.image}
                            alt={msg.listingCard.title}
                            fill
                            unoptimized
                            className="object-cover group-hover/card:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate group-hover/card:text-primary transition-colors">
                            {msg.listingCard.title}
                          </p>
                          <p className="text-xs font-bold text-primary mt-0.5">
                            {msg.listingCard.price}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            {msg.listingCard.location}
                          </p>
                        </div>
                        <Link
                          href={`/rent/${encodeURIComponent(msg.listingCard.id)}`}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1"
                        >
                          <span>Xem</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}

                    <div
                      className={`relative px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                        isMe
                          ? "bg-blue-50 dark:bg-blue-950/60 text-foreground border border-blue-200/60 dark:border-blue-800/60 rounded-br-xs"
                          : isAi
                          ? "bg-primary/5 dark:bg-slate-800/90 text-foreground border border-primary/20 rounded-bl-xs"
                          : "bg-muted/70 text-foreground border border-border/60 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>

                {/* Message Timestamp & Status */}
                <div
                  className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isMe && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        msg.status === "read"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Suggestion Chips (Đồng bộ với AiChatWindow) */}
      <div className="px-3 sm:px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-muted-foreground font-medium shrink-0 flex items-center gap-1 pl-1">
          <span>Gợi ý:</span>
        </span>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Căn hộ này của anh/chị hiện còn cho thuê không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground border border-border/60 font-medium transition-all cursor-pointer shadow-2xs"
        >
          Căn này còn không?
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Em muốn hẹn lịch qua xem nhà trực tiếp vào ngày mai được không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground border border-border/60 font-medium transition-all cursor-pointer shadow-2xs"
        >
          Hẹn lịch xem nhà
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Giá thuê này có thương lượng hoặc bớt lộc cho khách thuê dài hạn không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground border border-border/60 font-medium transition-all cursor-pointer shadow-2xs"
        >
          Đàm phán giá thuê
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Cho em hỏi quy định về tiền đặt cọc và thời hạn ký hợp đồng thuê như thế nào ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-foreground border border-border/60 font-medium transition-all cursor-pointer shadow-2xs"
        >
          Tiền cọc & Thời hạn thuê
        </button>
      </div>

      {/* 5. Message Input Bar */}
      <div className="p-3 sm:p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-muted/50 focus-within:bg-background border border-border focus-within:border-primary/50 rounded-2xl px-3 py-1.5 shadow-2xs transition-all">
            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAi
                  ? "Hỏi Trợ lý AI về tìm nhà, giá cả khu vực, pháp lý, cọc On-chain..."
                  : "Nhập tin nhắn trao đổi với chủ nhà / khách thuê..."
              }
              className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <button
                type="button"
                onClick={() => setInputText((prev) => prev + " 😊")}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Thêm emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Tính năng gửi hình ảnh đang được phát triển.")}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Gửi hình ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Tính năng đính kèm tệp đang được phát triển.")}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Đính kèm tệp"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl font-semibold transition-all flex items-center justify-center ${
                  inputText.trim()
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:scale-105 active:scale-95"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="flex items-center justify-end px-1">
            <span className="text-[10px] text-muted-foreground/60">
              Enter để gửi • Shift + Enter xuống dòng
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
