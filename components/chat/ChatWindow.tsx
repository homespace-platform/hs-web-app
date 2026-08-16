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
} from "lucide-react";
import { ChatConversation, ChatMessage } from "@/types/chat.type";

interface ChatWindowProps {
  conversation: ChatConversation;
  onBack: () => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onToggleHideConversation: (conversationId: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
}

export default function ChatWindow({
  conversation,
  onBack,
  onSendMessage,
  onToggleHideConversation,
  onTogglePinConversation,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [showPropertyDetails] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden">
      {/* 1. Chat Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* User Avatar & Status */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              {initial}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${
                conversation.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </div>

          {/* User Name and Sub-status */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold text-foreground truncate">
                {conversation.userName}
              </span>
              {conversation.userRole?.includes("xác thực") && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {conversation.lastActive ||
                (conversation.isOnline ? "Đang hoạt động" : "Ngoại tuyến")}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
            title="Gọi thoại trực tiếp"
            onClick={() => alert("Tính năng gọi thoại đang kết nối...")}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
            title="Gọi video xem phòng trực tiếp"
            onClick={() => alert("Tính năng gọi video trực tiếp đang kết nối...")}
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
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
                    alert("Đã xóa lịch sử trò chuyện cục bộ.");
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

      {/* 2. Attached Rental Property Preview Banner (Căn hộ đang trao đổi trực tiếp) */}
      {conversation.relatedListing && showPropertyDetails && (
        <div className="px-4 py-2.5 bg-primary/5 dark:bg-primary/10 border-b border-primary/10 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
              <Image
                src={conversation.relatedListing.image}
                alt={conversation.relatedListing.title}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                {conversation.relatedListing.title}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="font-bold text-primary">
                  {conversation.relatedListing.price}
                </span>
                <span>•</span>
                <span className="truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  {conversation.relatedListing.location}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/#featured-listings"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-semibold text-foreground transition-all shadow-2xs"
            >
              <span>Xem tin đăng</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {conversation.messages.map((msg, index) => {
          const isMe = msg.sender === "me";
          const showDateDivider =
            index === 0 ||
            msg.dateGroup !== conversation.messages[index - 1].dateGroup;

          return (
            <React.Fragment key={msg.id}>
              {/* Date Group Divider (e.g. "10:17", "Hôm nay") */}
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
                  className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                    isMe
                      ? "bg-blue-50 dark:bg-blue-950/60 text-foreground border border-blue-200/60 dark:border-blue-800/60 rounded-br-xs"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

      {/* 4. Quick Suggestion Chips (Gợi ý câu hỏi trực tiếp giữa Chủ nhà và Khách thuê) */}
      <div className="px-4 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-border/40 bg-background/50">
        <span className="text-[10px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
          <Info className="w-3 h-3" /> Gợi ý:
        </span>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Căn hộ này của anh/chị hiện còn cho thuê không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all"
        >
          Căn này còn không?
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Em muốn hẹn lịch qua xem nhà trực tiếp vào ngày mai được không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all"
        >
          📅 Hẹn lịch xem nhà
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Giá thuê này có thương lượng hoặc bớt lộc cho khách thuê dài hạn không ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all"
        >
          💰 Đàm phán giá thuê
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickReply("Cho em hỏi quy định về tiền đặt cọc và thời hạn ký hợp đồng thuê như thế nào ạ?")
          }
          className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all"
        >
          📝 Tiền cọc & Thời hạn thuê
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
              placeholder="Nhập tin nhắn trao đổi với chủ nhà / khách thuê..."
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
                onClick={() => alert("Tính năng gửi hình ảnh đang mở...")}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Gửi hình ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => alert("Tính năng đính kèm tệp tin đang mở...")}
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
