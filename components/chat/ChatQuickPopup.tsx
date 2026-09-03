"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCheck, MapPin, X } from "lucide-react";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import ChatDemoIdentitySwitcher from "@/components/chat/ChatDemoIdentitySwitcher";

export default function ChatQuickPopup() {
  const {
    activeDemoUserId,
    conversations,
    isPopupOpen,
    popupConversationId,
    popupView,
    pendingListing,
    closeQuickChat,
    openChatList,
    openQuickChat,
    sendMessage,
    selectDemoUser,
  } = useChatDemo();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = popupConversationId
    ? conversations.find((item) => item.id === popupConversationId)
    : null;

  useEffect(() => {
    if (!isPopupOpen || popupView !== "conversation" || !conversation) return;

    const frameId = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [conversation, isPopupOpen, popupConversationId, popupView]);

  if (!isPopupOpen) return null;

  if (popupView === "list") {
    const visibleConversations = conversations.filter((item) => !item.isHidden);

    return (
      <section
        aria-label="Danh sách tin nhắn"
        className="fixed bottom-20 right-4 z-50 flex h-[min(32rem,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">Tin nhắn</p>
            <p className="text-[11px] text-muted-foreground">Các cuộc trò chuyện gần đây</p>
          </div>
          <button
            type="button"
            onClick={closeQuickChat}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Đóng danh sách tin nhắn"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-border/70 bg-muted/20 px-3 py-2">
          <ChatDemoIdentitySwitcher value={activeDemoUserId} onChange={selectDemoUser} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <Link
            href="/chat?channel=ai"
            className="mb-1 flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1">
              <Image
                src="/logo/ai/homespace-ai-logo-removebg.png"
                alt="HomeSpace Assistant AI"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                unoptimized
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-foreground">HomeSpace Assistant AI</span>
              <span className="mt-0.5 block truncate text-[11px] text-primary">Trợ lý AI 24/7</span>
            </span>
          </Link>
          {visibleConversations.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
          ) : (
            visibleConversations.map((item) => {
              const lastMessage = item.messages[item.messages.length - 1];
              const isMine = lastMessage?.senderId === activeDemoUserId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openQuickChat({ conversationId: item.id })}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.userAvatar ? (
                      <Image
                        src={item.userAvatar}
                        alt={item.userName}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      item.userName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">{item.userName}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{item.lastMessageTime}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {isMine && !item.lastMessage.startsWith("Bạn:") && "Bạn: "}
                      {item.lastMessage}
                    </span>
                  </span>
                  {item.unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                      {item.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/chat?channel=direct"
            className="flex items-center justify-center text-[11px] font-semibold text-primary hover:underline"
          >
            Xem danh sách trò chuyện đầy đủ
          </Link>
        </div>
      </section>
    );
  }

  if (!conversation) return null;

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(conversation.id, inputText);
    setInputText("");
  };

  return (
    <section
      aria-label="Chat nhanh"
      className="fixed bottom-20 right-4 z-50 flex h-[min(32rem,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={openChatList}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Quay lại danh sách cuộc trò chuyện"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{conversation.userName}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Đang hoạt động</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeQuickChat}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Đóng chat nhanh"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="border-b border-border/70 bg-muted/20 px-3 py-2">
        <ChatDemoIdentitySwitcher value={activeDemoUserId} onChange={selectDemoUser} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {conversation.messages.length === 0 && (
          <p className="rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            Bắt đầu cuộc trò chuyện với {conversation.userName}.
          </p>
        )}
        {conversation.messages.map((message) => {
          const isMe = message.senderId === activeDemoUserId;
          return (
            <div key={message.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {message.listingCard && (
                <div className="mb-1.5 flex w-[90%] gap-2 rounded-xl border border-border bg-background p-2">
                  {message.listingCard.image ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <Image src={message.listingCard.image} alt="" fill unoptimized className="object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-foreground">{message.listingCard.title}</p>
                    <p className="text-[11px] font-bold text-primary">{message.listingCard.price}</p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {message.listingCard.location}
                    </p>
                  </div>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  isMe
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                {message.timestamp}
                {isMe && <CheckCheck className="h-3 w-3" />}
              </span>
            </div>
          );
        })}
        {pendingListing && conversation.messages.length === 0 && (
          <p className="text-[10px] text-muted-foreground">Tin đăng sẽ được đính kèm khi bạn gửi tin đầu tiên.</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 focus-within:border-primary">
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Nhập tin nhắn..."
            className="min-w-0 flex-1 bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Gửi
          </button>
        </div>
        <Link
          href={`/chat?conversationId=${encodeURIComponent(conversation.id)}`}
          className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Mở cuộc trò chuyện đầy đủ
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </form>
    </section>
  );
}
