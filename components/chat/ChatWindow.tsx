"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import UserAvatar from "@/components/common/UserAvatar";
import { MediaLightboxModal, type MediaGalleryItem } from "@/components/common/MediaGallery";
import ChatDocumentModal from "@/components/chat/ChatDocumentModal";
import Link from "next/link";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Video,
  Search,
  MoreVertical,
  ArrowLeft,
  Smile,
  ImageIcon,
  Paperclip,
  File as FileIcon,
  FileType,
  FileText,
  FileSpreadsheet,
  Presentation,
  LoaderCircle,
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
import { ChatConversation, ChatMessage, RelatedListing } from "@/types/chat.type";
import type {
  ChatApiAttachment,
  ChatCallMode,
  ChatMessageAction,
} from "@/types/chat-api.type";
import storageService from "@/services/storage.service";
import chatService from "@/services/chat.service";
import { toast } from "sonner";
import { listingDetailPath } from "@/lib/listing-detail-access";
import { chatDocumentFormat, type ChatDocumentFormat } from "@/lib/chat-document-preview";

type Attachment = NonNullable<ChatMessage["attachments"]>[number];
type DocumentPreview = { fileName: string; format: ChatDocumentFormat; getUrl: () => Promise<string> };
const MAX_ATTACHMENTS = 5;
const IMAGE_EXTENSIONS = ".jpg,.jpeg,.jfif,.png,.webp";

function callOutcome(call: NonNullable<ChatMessage["call"]>, outgoing: boolean) {
  return {
    missed: outgoing ? "Không có người trả lời" : "Cuộc gọi nhỡ",
    declined: outgoing ? "Người nhận đã từ chối" : "Bạn đã từ chối",
    cancelled: outgoing ? "Bạn đã hủy" : "Người gọi đã hủy",
    ended: "Đã kết thúc",
    failed: "Cuộc gọi thất bại",
  }[call.status];
}

function AttachmentIcon({ name = "", className }: { name?: string; className: string }) {
  if (/\.pdf$/i.test(name)) return <FileText className={className} />;
  if (/\.docx?$/i.test(name)) return <FileType className={className} />;
  if (/\.xlsx?$/i.test(name)) return <FileSpreadsheet className={className} />;
  if (/\.pptx?$/i.test(name)) return <Presentation className={className} />;
  return <FileIcon className={className} />;
}

function getAttachmentUrl(conversationId: string, attachment: Attachment) {
  const { storageId, url } = attachment;
  if (storageId?.startsWith("chat_")) return chatService.getAttachmentViewUrl(conversationId, storageId);
  if (storageId && !url) return storageService.getViewUrl(storageId);
  return Promise.resolve(url);
}

function AttachmentPreview({
  attachment,
  conversationId,
  onOpenImage,
  onOpenDocument,
}: {
  attachment: Attachment;
  conversationId: string;
  onOpenImage: () => void;
  onOpenDocument: (document: DocumentPreview) => void;
}) {
  const isChatFile = attachment.storageId?.startsWith("chat_");
  const [url, setUrl] = useState(isChatFile ? "" : attachment.url);

  useEffect(() => {
    if (attachment.type !== "image") return;
    let cancelled = false;
    void getAttachmentUrl(conversationId, attachment).then((nextUrl) => {
      if (!cancelled) setUrl(nextUrl);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [attachment, conversationId, isChatFile]);

  if (attachment.type === "image") {
    return (
      <button
        type="button"
        onClick={onOpenImage}
        aria-label={`Mở ảnh ${attachment.name || "đính kèm"}`}
        className="mb-2 flex aspect-[4/3] w-60 max-w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground hover:border-primary/40"
      >
        {url ? (
          <Image
            unoptimized
            src={url}
            alt={attachment.name || "Ảnh đính kèm"}
            width={240}
            height={180}
            onError={() => setUrl("")}
            className="h-full w-full object-contain"
          />
        ) : <ImageIcon className="h-6 w-6" />}
      </button>
    );
  }

  const format = chatDocumentFormat(attachment.name, attachment.contentType);
  const fileCardClass = "mb-2 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left text-xs hover:border-primary/40";
  const fileCard = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <AttachmentIcon name={attachment.name} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{attachment.name || "Tệp đính kèm"}</span>
        <span className="text-muted-foreground">{attachment.size || "Mở tệp"}</span>
      </span>
    </>
  );
  if (format) {
    const fileName = attachment.name || `Tài liệu.${format}`;
    return <button type="button" aria-label={`Xem ${fileName}`} className={fileCardClass} onClick={() => onOpenDocument({
      fileName, format, getUrl: () => getAttachmentUrl(conversationId, attachment),
    })}>{fileCard}</button>;
  }
  if (!isChatFile && attachment.url) {
    return <a href={attachment.url} target="_blank" rel="noreferrer" className={fileCardClass}>{fileCard}</a>;
  }

  const openFile = () => {
    const fileTab = window.open("about:blank", "_blank");
    if (!fileTab) {
      toast.error("Trình duyệt đã chặn tab tệp đính kèm");
      return;
    }
    fileTab.opener = null;
    void getAttachmentUrl(conversationId, attachment).then((freshUrl) => {
      if (!freshUrl) throw new Error("Attachment URL missing");
      fileTab.location.href = freshUrl;
    }).catch(() => {
      fileTab.close();
      toast.error("Không thể mở tệp đính kèm");
    });
  };

  return (
    <button type="button" onClick={openFile} className={fileCardClass}>{fileCard}</button>
  );
}

interface ChatWindowProps {
  conversation: ChatConversation;
  onBack: () => void;
  onSendMessage: (
    conversationId: string,
    text: string,
    attachments?: ChatApiAttachment[],
  ) => Promise<boolean>;
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
  /** Listing the next message will carry; dismissible. */
  pendingListing?: RelatedListing;
  onDismissPendingListing?: () => void;
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
  pendingListing,
  onDismissPendingListing,
  isSidebarCollapsed,
  onToggleSidebar,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now);
  const [draftFiles, setDraftFiles] = useState<{ file: File; previewUrl?: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [gallery, setGallery] = useState<{ items: MediaGalleryItem[]; index: number } | null>(null);
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const sending = useRef(false);
  const uploaded = useRef(new Map<File, ChatApiAttachment>());
  const previewUrls = useRef(new Set<string>());
  const galleryRequest = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAi = conversation.id === "conv-ai-assistant";
  const attachments = conversation.messages.flatMap((message) => message.attachments ?? []);

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

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      galleryRequest.current += 1;
    };
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if ((!trimmed && !draftFiles.length) || sending.current) return;

    sending.current = true;
    setIsSending(true);
    setSendFailed(false);
    try {
      const ready: ChatApiAttachment[] = [];
      for (const { file } of draftFiles) {
        const attachment = uploaded.current.get(file) ?? await chatService.uploadAttachment(file, conversation.id);
        uploaded.current.set(file, attachment);
        ready.push(attachment);
      }
      if (!await onSendMessage(conversation.id, trimmed, ready)) {
        setSendFailed(true);
        return;
      }
      setInputText("");
      setDraftFiles([]);
      uploaded.current.clear();
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
      inputRef.current?.focus();
    } catch {
      setSendFailed(true);
      toast.error("Không thể tải tệp lên. Chỉ hỗ trợ JPG, PNG, WebP, PDF, Word, Excel và PowerPoint. Tối đa 25 MB/tệp.");
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleQuickReply = (text: string) => {
    if (!sending.current) void onSendMessage(conversation.id, text);
  };

  const selectAttachments = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (isAi || sending.current || !files.length) return;
    const remaining = MAX_ATTACHMENTS - draftFiles.length;
    if (files.length > remaining) toast.error("Bạn có thể đính kèm tối đa 5 tệp mỗi tin nhắn.");
    const selected = files.slice(0, remaining).map((file) => {
      const previewUrl = file.type.startsWith("image/") || /\.(jpe?g|jfif|png|webp)$/i.test(file.name)
        ? URL.createObjectURL(file)
        : undefined;
      if (previewUrl) previewUrls.current.add(previewUrl);
      return { file, previewUrl };
    });
    setDraftFiles([...draftFiles, ...selected]);
  };

  const removeAttachment = (index: number) => {
    const { file, previewUrl } = draftFiles[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrls.current.delete(previewUrl);
    }
    uploaded.current.delete(file);
    setDraftFiles(draftFiles.filter((_, fileIndex) => fileIndex !== index));
  };

  const openImage = async (selected: Attachment, group: Attachment[]) => {
    const request = ++galleryRequest.current;
    const images = group.filter((attachment) => attachment.type === "image");
    const loaded = await Promise.allSettled(images.map(async (attachment) => ({
      attachment,
      url: await getAttachmentUrl(conversation.id, attachment),
    })));
    if (request !== galleryRequest.current) return;
    const available = loaded.flatMap((item) => item.status === "fulfilled" && item.value.url ? [item.value] : []);
    const index = available.findIndex((item) => item.attachment === selected);
    if (index < 0) {
      toast.error("Không thể mở ảnh đính kèm");
      return;
    }
    setGallery({ index, items: available.map(({ attachment, url }) => ({ url, alt: attachment.name })) });
  };

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
        <UserAvatar
          src={conversation.userAvatar}
          name={conversation.userName}
          sizeClassName="w-10 h-10 text-sm"
        />
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
            conversation.isOnline ? "Đang hoạt động" : conversation.lastActive || "Ngoại tuyến"
          )}
        </span>
      </div>
    </>
  );

  return (
    <div className="relative flex h-full flex-1 overflow-hidden bg-background">
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
          const call = msg.isRecalled ? undefined : msg.call;
          const outgoingCall = currentUserId ? call?.callerId === currentUserId : isMe;
          const CallIcon = outgoingCall ? PhoneOutgoing : PhoneIncoming;

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
                  {!isMe && (
                    <UserAvatar
                      src={conversation.userAvatar}
                      name={conversation.userName}
                      sizeClassName="w-7 h-7 text-xs"
                      className="mb-1"
                    />
                  )}

                  <div className="flex min-w-0 flex-col">
                    {msg.attachments?.map((attachment, attachmentIndex) => (
                      <AttachmentPreview
                        key={`${attachment.storageId || attachment.url || attachment.name}-${attachmentIndex}`}
                        attachment={attachment}
                        conversationId={conversation.id}
                        onOpenImage={() => void openImage(attachment, msg.attachments ?? [])}
                        onOpenDocument={setDocumentPreview}
                      />
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
                          href={listingDetailPath(msg.listingCard.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1"
                        >
                          <span>Xem</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}

                    {call ? (
                      <div className="min-w-40 rounded-2xl border border-border bg-card p-3 text-xs">
                        <div className="flex items-center gap-2 font-semibold">
                          <CallIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                          <span>{call.mode === "video" ? "Gọi video" : "Gọi thoại"} {outgoingCall ? "đi" : "đến"}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{callOutcome(call, outgoingCall) || msg.content}</p>
                        <button
                          type="button"
                          onClick={() => onStartCall(conversation.id, call.mode === "audio" ? "voice" : "video", conversation.userName)}
                          className="mt-2 w-full rounded-lg bg-primary/10 px-3 py-1.5 font-semibold text-primary hover:bg-primary/20"
                        >
                          Gọi lại
                        </button>
                      </div>
                    ) : msg.content && <div
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
                    </div>}
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
        <form onSubmit={handleSend} aria-busy={isSending} className="flex flex-col gap-1.5">
          {pendingListing && !isAi && (
            <div className="flex items-center gap-2 self-start rounded-full border border-primary/30 bg-primary/5 py-1 pl-3 pr-1 text-xs text-foreground">
              <span className="max-w-[16rem] truncate">Đang hỏi về: <strong>{pendingListing.title}</strong></span>
              <button
                type="button"
                onClick={onDismissPendingListing}
                aria-label="Bỏ tin đăng đang hỏi"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {draftFiles.length > 0 && (
            <ul aria-label="Tệp đính kèm" className="flex flex-wrap gap-2">
              {draftFiles.map(({ file, previewUrl }, index) => (
                  <li key={index} className="flex max-w-48 items-center gap-2 rounded-lg border border-border bg-muted/50 p-1.5 text-xs">
                    {previewUrl ? (
                      <Image unoptimized src={previewUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded object-cover" />
                    ) : <AttachmentIcon name={file.name} className="size-5 shrink-0 text-primary" />}
                    <span className="truncate" title={file.name}>{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Bỏ tệp ${file.name}`}
                      onClick={() => removeAttachment(index)}
                      disabled={isSending}
                      className="grid size-8 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 bg-muted/50 focus-within:bg-background border border-border focus-within:border-primary/50 rounded-2xl px-3 py-1.5 shadow-2xs transition-all">
            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              readOnly={isSending}
              aria-label={draftFiles.length ? "Chú thích tin nhắn" : "Nội dung tin nhắn"}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAi
                  ? "Hỏi Trợ lý AI về tìm nhà, giá cả khu vực, pháp lý, cọc On-chain..."
                  : draftFiles.length ? "Thêm chú thích (không bắt buộc)" : "Nhập tin nhắn trao đổi với chủ nhà / khách thuê..."
              }
              className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none py-1.5"
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <input
                ref={imageInputRef}
                type="file"
                accept={IMAGE_EXTENSIONS}
                multiple
                className="hidden"
                onChange={selectAttachments}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                multiple
                className="hidden"
                onChange={selectAttachments}
              />
              <button
                type="button"
                disabled={isSending}
                onClick={() => setInputText((prev) => prev + " 😊")}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Thêm emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isSending || draftFiles.length >= MAX_ATTACHMENTS}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Gửi hình ảnh"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || draftFiles.length >= MAX_ATTACHMENTS}
                className="p-1.5 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                title="Đính kèm tệp"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !draftFiles.length) || isSending}
                className={`p-2 rounded-xl font-semibold transition-all flex items-center justify-center ${
                  inputText.trim() || draftFiles.length
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:scale-105 active:scale-95"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
                aria-label={isSending ? "Đang gửi tin nhắn" : sendFailed ? "Thử gửi lại" : "Gửi tin nhắn"}
                title={sendFailed ? "Thử gửi lại" : "Gửi tin nhắn"}
              >
                {isSending ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : sendFailed ? <span className="text-xs">Thử lại</span> : <Send className="size-4" />}
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
              <UserAvatar
                src={conversation.userAvatar}
                name={conversation.userName}
                sizeClassName="h-18 w-18 text-xl"
              />
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
                        conversationId={conversation.id}
                        key={`${attachment.storageId || attachment.url || attachment.name}-${index}`}
                        attachment={attachment}
                        onOpenImage={() => void openImage(attachment, attachments)}
                        onOpenDocument={setDocumentPreview}
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
      {gallery && (
        <MediaLightboxModal
          isOpen
          onClose={() => setGallery(null)}
          mediaItems={gallery.items}
          initialIndex={gallery.index}
          title="Ảnh đính kèm"
        />
      )}
      {documentPreview && <ChatDocumentModal {...documentPreview} onClose={() => setDocumentPreview(null)} />}
    </div>
  );
}
