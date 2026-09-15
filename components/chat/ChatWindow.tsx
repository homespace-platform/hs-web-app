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
  PanelLeftOpen,
  Pin,
  Trash2,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import { ChatConversation, ChatMessage } from "@/types/chat.type";
import type {
  ChatApiAttachment,
  ChatCallMode,
  ChatMessageAction,
} from "@/types/chat-api.type";
import storageService from "@/services/storage.service";
import { toast } from "sonner";

function AttachmentPreview({
  attachment,
}: {
  attachment: NonNullable<ChatMessage["attachments"]>[number];
}) {
  const [url, setUrl] = useState(attachment.url);

  useEffect(() => {
    if (!url && attachment.storageId) {
      void storageService
        .getViewUrl(attachment.storageId)
        .then(setUrl)
        .catch(() => undefined);
    }
  }, [attachment.storageId, url]);

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-xs hover:border-primary/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {attachment.type === "image" ? (
          <ImageIcon className="h-5 w-5" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{attachment.name || "Tệp đính kèm"}</span>
        <span className="text-muted-foreground">{attachment.size || "Mở tệp"}</span>
      </span>
    </a>
  );
}

interface ChatWindowProps {
  conversation: ChatConversation;
  onBack: () => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    attachments?: ChatApiAttachment[],
  ) => void;
  onToggleHideConversation: (conversationId: string) => void;
  onTogglePinConversation: (conversationId: string) => void;
  onUpdateParticipantRole: (
    conversationId: string,
    role: "TENANT" | "LANDLORD",
  ) => void;
  onStartCall: (
    conversationId: string,
    mode: ChatCallMode,
    participantName: string,
  ) => void;
  onMessageAction: (
    conversationId: string,
    messageId: string,
    action: ChatMessageAction,
  ) => Promise<void>;
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
  onUpdateParticipantRole,
  onStartCall,
  onMessageAction,
  currentUserId,
  isSidebarCollapsed,
  onToggleSidebar,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(frameId);
  }, [conversation.id, conversation.messages.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  const handleAttachment = async (file: File | undefined) => {
    if (!file || isUploading || isAi) return;
    setIsUploading(true);
    try {
      const attachment = await storageService.uploadChatAttachment(file, conversation.id);
      onSendMessage(
        conversation.id,
        inputText.trim() || `Đã gửi ${file.name}`,
        [attachment],
      );
      setInputText("");
    } catch {
      toast.error("Không thể tải tệp lên");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initial = conversation.userName.charAt(0).toUpperCase();
  const isAi = conversation.id === "conv-ai-assistant";
  const attachments = conversation.messages.flatMap(
    (message) => message.attachments ?? [],
  );
  const pinnedMessages = conversation.messages.filter((message) => message.isPinned);

  const handleMessageAction = (message: ChatMessage, action: ChatMessageAction) => {
    setOpenMessageMenuId(null);
    if (
      (action === "delete" || action === "recall") &&
      !window.confirm(
        action === "delete"
          ? "Xoá tin nhắn này ở phía bạn?"
          : "Thu hồi tin nhắn này với tất cả mọi người?",
      )
    ) {
      return;
    }
    void onMessageAction(conversation.id, message.id, action);
  };

  const headerIdentity = (
    <>
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

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-bold text-foreground truncate">
            {conversation.userName}
          </span>
          {conversation.participantRole && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {conversation.participantRole === "TENANT" ? "Khách thuê" : "Chủ thuê"}
            </span>
          )}
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
    </>
  );

  return (
    <div className="relative flex h-full flex-1 overflow-hidden bg-background select-none">
      <div className="flex min-w-0 flex-1 flex-col">
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

          {isAi ? (
            <div className="flex min-w-0 items-center gap-3">{headerIdentity}</div>
          ) : (
            <Link
              href={`/users/${encodeURIComponent(conversation.userId)}`}
              className="flex min-w-0 items-center gap-3 rounded-xl pr-2 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              title={`Xem trang cá nhân của ${conversation.userName}`}
            >
              {headerIdentity}
            </Link>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
          {!isAi && (
            <>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Gọi thoại trực tiếp"
                onClick={() =>
                  onStartCall(conversation.id, "voice", conversation.userName)
                }
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Gọi video xem phòng trực tiếp"
                onClick={() =>
                  onStartCall(conversation.id, "video", conversation.userName)
                }
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          {!isAi && (
            <button
              type="button"
              onClick={() => setIsDetailsOpen((open) => !open)}
              aria-controls="chat-details-panel"
              aria-expanded={isDetailsOpen}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDetailsOpen
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted hover:text-foreground"
              }`}
              title={isDetailsOpen ? "Ẩn thông tin đoạn chat" : "Thông tin đoạn chat"}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {conversation.messages.map((msg, index) => {
          const isMe = currentUserId
            ? msg.senderId === currentUserId
            : msg.sender === "me";
          const canRecall =
            isMe &&
            !msg.isRecalled &&
            msg.createdAt !== undefined &&
            currentTime - new Date(msg.createdAt).getTime() <= 60 * 60 * 1000;
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
                id={`message-${msg.id}`}
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
                    {msg.attachments?.map((attachment) => (
                      <AttachmentPreview key={attachment.storageId || attachment.name} attachment={attachment} />
                    ))}
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
                      <p
                        className={`whitespace-pre-wrap break-words ${
                          msg.isRecalled ? "italic text-muted-foreground" : ""
                        }`}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>

                  <div className="relative self-center md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMessageMenuId((current) =>
                          current === msg.id ? null : msg.id,
                        )
                      }
                      aria-label="Tuỳ chọn tin nhắn"
                      aria-expanded={openMessageMenuId === msg.id}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMessageMenuId === msg.id && (
                      <div
                        className={`absolute bottom-full z-30 mb-1 w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        {!msg.isRecalled && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMessageAction(msg, msg.isPinned ? "unpin" : "pin")
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                          >
                            <Pin className="h-4 w-4" />
                            {msg.isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                          </button>
                        )}
                        {canRecall && (
                          <button
                            type="button"
                            onClick={() => handleMessageAction(msg, "recall")}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                          >
                            <Undo2 className="h-4 w-4" />
                            Thu hồi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMessageAction(msg, "delete")}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                          Xoá ở phía bạn
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Timestamp & Status */}
                <div
                  className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.isPinned && <Pin className="h-3 w-3 fill-current" aria-label="Đã ghim" />}
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
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleAttachment(event.target.files?.[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => void handleAttachment(event.target.files?.[0])}
              />
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
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Gửi hình ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Đính kèm tệp"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isUploading}
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

      {isDetailsOpen && !isAi && (
        <>
          <button
            type="button"
            aria-label="Đóng thông tin đoạn chat"
            onClick={() => setIsDetailsOpen(false)}
            className="absolute inset-0 z-20 bg-black/25 md:hidden"
          />
          <aside
            id="chat-details-panel"
            aria-label="Thông tin đoạn chat"
            className="absolute inset-y-0 right-0 z-30 flex w-[min(22rem,calc(100%-2rem))] shrink-0 flex-col overflow-y-auto border-l border-border bg-card shadow-2xl md:relative md:z-auto md:w-80 md:shadow-none"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <h2 className="text-sm font-bold text-foreground">Thông tin đoạn chat</h2>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center border-b border-border px-5 py-6 text-center">
              {conversation.userAvatar ? (
                <Image
                  src={conversation.userAvatar}
                  alt={conversation.userName}
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-full border border-border object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {initial}
                </div>
              )}
              <h3 className="mt-3 font-bold text-foreground">{conversation.userName}</h3>
              <p className="text-xs text-muted-foreground">
                {conversation.isOnline ? "Đang hoạt động" : conversation.lastActive || "Ngoại tuyến"}
              </p>

              <div className="mt-5 grid w-full grid-cols-3 gap-2">
                <Link
                  href={`/users/${encodeURIComponent(conversation.userId)}`}
                  className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Xem trang cá nhân"
                >
                  <UserRound className="h-5 w-5" />
                  Profile
                </Link>
                <button
                  type="button"
                  disabled
                  className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] text-muted-foreground opacity-60"
                  title="Tìm kiếm tin nhắn sẽ được bổ sung sau"
                >
                  <Search className="h-5 w-5" />
                  Tìm kiếm
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePinConversation(conversation.id)}
                  className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={conversation.isPinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
                >
                  <Pin className={`h-5 w-5 ${conversation.isPinned ? "fill-primary text-primary" : ""}`} />
                  {conversation.isPinned ? "Đã ghim" : "Ghim"}
                </button>
              </div>
            </div>

            <div className="space-y-2 p-4 text-sm">
              <details open className="rounded-xl border border-border px-3 py-2">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Tùy chỉnh đoạn chat
                </summary>
                <div className="space-y-1 pt-3">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Đặt biệt danh
                  </p>
                  {(["TENANT", "LANDLORD"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => onUpdateParticipantRole(conversation.id, role)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                    >
                      <span>{role === "TENANT" ? "Khách thuê" : "Chủ thuê"}</span>
                      {conversation.participantRole === role && (
                        <span aria-label="Đang chọn">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </details>

              <details open className="rounded-xl border border-border px-3 py-2">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Tin nhắn đã ghim
                </summary>
                <div className="space-y-1 pt-3">
                  {pinnedMessages.length ? (
                    pinnedMessages.map((message) => (
                      <a
                        key={message.id}
                        href={`#message-${message.id}`}
                        className="block truncate rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground hover:bg-muted"
                      >
                        {message.content}
                      </a>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Chưa có tin nhắn đã ghim.</p>
                  )}
                </div>
              </details>

              <details className="rounded-xl border border-border px-3 py-2">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Quyền riêng tư &amp; hỗ trợ
                </summary>
                <div className="space-y-1 pt-3">
                  <button
                    type="button"
                    onClick={() => onToggleHideConversation(conversation.id)}
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                  >
                    {conversation.isHidden ? "Bỏ ẩn hội thoại" : "Ẩn hội thoại này"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Tính năng xóa lịch sử trò chuyện đang được phát triển.")
                    }
                    className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Xóa lịch sử tin nhắn
                  </button>
                </div>
              </details>

              <details open className="rounded-xl border border-border px-3 py-2">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Media &amp; file ({attachments.length})
                </summary>
                <div className="pt-3">
                  {attachments.length ? (
                    attachments.map((attachment, index) => (
                      <AttachmentPreview
                        key={`${attachment.storageId || attachment.url || attachment.name}-${index}`}
                        attachment={attachment}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Chưa có ảnh hoặc tệp.</p>
                  )}
                </div>
              </details>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
