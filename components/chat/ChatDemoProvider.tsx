"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/features/auth/useAuth";
import keycloak from "@/lib/keycloak";
import chatService from "@/services/chat.service";
import type { ChatParticipantProfile } from "@/services/chat.service";
import type { ChatConversation, RelatedListing } from "@/types/chat.type";
import { mapApiConversation, mapApiMessage } from "@/lib/chat-api-mapper";
import type {
  ChatApiAttachment,
  ChatApiMessage,
  ChatCallEndSignal,
  ChatCallMode,
  ChatCallSignal,
} from "@/types/chat-api.type";

type ChatContact = {
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
};

type OpenConversationInput = {
  conversationId?: string;
  listing?: RelatedListing;
  contact?: ChatContact;
};

function openCallTab(call: ChatCallSignal, participantName: string) {
  const params = new URLSearchParams({
    conversationId: call.conversationId,
    callId: call.callId,
    mode: call.mode,
    participantName,
  });
  const width = Math.min(1100, window.screen.availWidth - 48);
  const height = Math.min(720, window.screen.availHeight - 48);
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const callTab = window.open(
    `/chat/call?${params}`,
    `hs-call-${call.callId}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes`,
  );
  if (callTab) callTab.opener = null;
  callTab?.focus();
  return callTab;
}

function IncomingCallToast({
  call,
  participantName,
  onAccept,
  onReject,
}: {
  call: ChatCallSignal;
  participantName: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isVideo = call.mode === "video";

  return (
    <div className="w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-border/70 bg-background p-4 text-foreground shadow-2xl ring-1 ring-black/10">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
          {isVideo ? <Video className="relative h-6 w-6" /> : <Phone className="relative h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Cuộc gọi đến
          </p>
          <p className="truncate text-base font-bold">{participantName}</p>
          <p className="text-sm text-muted-foreground">
            {isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReject}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          aria-label="Từ chối cuộc gọi"
          title="Từ chối"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label="Nhận cuộc gọi"
          title="Nhận cuộc gọi"
        >
          <Phone className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

type ChatDemoContextValue = {
  currentUserId?: string;
  conversations: ChatConversation[];
  openConversation: (input?: OpenConversationInput) => Promise<string | null>;
  sendMessage: (
    conversationId: string,
    content: string,
    listingCard?: RelatedListing,
    attachments?: ChatApiAttachment[],
  ) => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  setActiveConversationId: (conversationId: string | null) => void;
  toggleHideConversation: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
  updateParticipantRole: (
    conversationId: string,
    role: "TENANT" | "LANDLORD",
  ) => Promise<void>;
  startCall: (
    conversationId: string,
    mode: ChatCallMode,
    participantName: string,
  ) => void;
  endCall: (conversationId: string, callId: string) => void;
};

const ChatDemoContext = createContext<ChatDemoContextValue | null>(null);

export function ChatDemoProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, profile } = useAuth();
  const currentUserId = profile?.id;
  const currentParticipantProfile = useMemo<ChatParticipantProfile | undefined>(
    () =>
      profile
        ? {
            displayName:
              [profile.lastName, profile.firstName].filter(Boolean).join(" ").trim() ||
              profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl ?? undefined,
          }
        : undefined,
    [profile],
  );
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const loadingConversationIds = useRef(new Set<string>());
  const activeConversationId = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const receiveMessage = useCallback(
    async (message: ChatApiMessage) => {
      if (!currentUserId) return;
      if (
        message.senderId !== currentUserId &&
        activeConversationId.current === message.conversationId
      ) {
        await chatService.markRead(message.conversationId).catch(() => undefined);
      }
      // ponytail: refresh summaries per message; include the conversation in the event if this GET becomes hot.
      const latest = await chatService.listConversations().catch(() => null);
      const mappedMessage = mapApiMessage(message, currentUserId);

      setConversations((current) => {
        const source = latest
          ? latest.map((item) => {
              const mapped = mapApiConversation(item, currentUserId);
              const existing = current.find(
                (conversation) => conversation.id === item.id,
              );
              return existing
                ? {
                    ...mapped,
                    isHidden: existing.isHidden,
                    isPinned: existing.isPinned,
                    messages: existing.messages,
                  }
                : mapped;
            })
          : current;

        return source.map((conversation) =>
          conversation.id === message.conversationId &&
          !conversation.messages.some((item) => item.id === message.id)
            ? {
                ...conversation,
                messages: [...conversation.messages, mappedMessage],
              }
            : conversation,
        );
      });
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!authenticated || !currentUserId) return;

    let cancelled = false;
    void chatService
      .listConversations()
      .then((items) => {
        if (!cancelled) {
          setConversations((current) =>
            items.map((item) => {
              const mapped = mapApiConversation(item, currentUserId);
              const existing = current.find((conversation) => conversation.id === item.id);
              return existing ? { ...mapped, messages: existing.messages } : mapped;
            }),
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Không thể tải danh sách cuộc trò chuyện");
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, currentUserId]);

  useEffect(() => {
    if (!authenticated || !currentUserId) return;

    let cancelled = false;
    let socket: Socket | undefined;
    void keycloak
      .updateToken(30)
      .then(() => {
        if (cancelled || !keycloak.token) return;
        socket = io(process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || window.location.origin, {
          path: "/api/v1/chat/socket.io",
          extraHeaders: { Authorization: `Bearer ${keycloak.token}` },
        });
        socket.on("chat:message", (message: ChatApiMessage) => void receiveMessage(message));
        socket.on("chat:call:incoming", (call: ChatCallSignal) => {
          const participantName =
            conversationsRef.current.find(
              (conversation) => conversation.id === call.conversationId,
            )?.userName || "Người dùng HomeSpace";
          const toastId = `call-${call.callId}`;
          toast.custom(
            (id) => (
              <IncomingCallToast
                call={call}
                participantName={participantName}
                onAccept={() => {
                  toast.dismiss(id);
                  openCallTab(call, participantName);
                }}
                onReject={() => {
                  toast.dismiss(id);
                  socket?.emit("chat:call:end", {
                    conversationId: call.conversationId,
                    callId: call.callId,
                  });
                }}
              />
            ),
            { id: toastId, duration: Infinity, unstyled: true },
          );
        });
        socket.on("chat:call:ended", (call: ChatCallEndSignal) => {
          toast.dismiss(`call-${call.callId}`);
          window.dispatchEvent(new CustomEvent("hs:call-ended", { detail: call }));
        });
        socket.io.on("reconnect_attempt", () => {
          if (keycloak.token) {
            socket!.io.opts.extraHeaders = { Authorization: `Bearer ${keycloak.token}` };
          }
        });
        socketRef.current = socket;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      socket?.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [authenticated, currentUserId, receiveMessage]);

  const setActiveConversationId = useCallback((conversationId: string | null) => {
    activeConversationId.current = conversationId;
  }, []);

  const startCall = useCallback(
    (conversationId: string, mode: ChatCallMode, participantName: string) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        toast.error("Kết nối chat chưa sẵn sàng");
        return;
      }

      const call: ChatCallSignal = {
        conversationId,
        callId: crypto.randomUUID(),
        mode,
      };
      const callTab = openCallTab(call, participantName);
      if (!callTab) {
        toast.error("Trình duyệt đã chặn tab cuộc gọi");
        return;
      }
      void socket
        .timeout(10_000)
        .emitWithAck("chat:call:invite", call)
        .catch(() => {
          callTab.close();
          toast.error("Không thể gửi lời mời cuộc gọi");
        });
    },
    [],
  );

  const endCall = useCallback((conversationId: string, callId: string) => {
    socketRef.current?.emit("chat:call:end", { conversationId, callId });
  }, []);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!currentUserId || loadingConversationIds.current.has(conversationId)) return;
      loadingConversationIds.current.add(conversationId);
      try {
        const page = await chatService.listMessages(conversationId);
        const messages = page.items.map((item) => mapApiMessage(item, currentUserId));
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages }
              : conversation,
          ),
        );
        await chatService.markRead(conversationId);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      } catch {
        toast.error("Không thể tải nội dung cuộc trò chuyện");
      } finally {
        loadingConversationIds.current.delete(conversationId);
      }
    },
    [currentUserId],
  );

  const openConversation = useCallback(
    async (input: OpenConversationInput = {}) => {
      if (!currentUserId) {
        toast.error("Vui lòng đăng nhập để trò chuyện");
        return null;
      }

      if (input.conversationId) {
        void loadConversationMessages(input.conversationId);
        return input.conversationId;
      }

      const partnerId = input.contact?.id;
      if (!partnerId) {
        toast.error("Không xác định được người nhận");
        return null;
      }
      const conversation = conversations.find(
        (item) =>
          item.userId === partnerId &&
          (!input.listing || item.relatedListing?.id === input.listing.id)
      );

      if (conversation) {
        if (input.contact) {
          void chatService
            .createConversation(partnerId, input.listing, {
              displayName: input.contact.name,
              avatarUrl: input.contact.avatar,
            })
            .catch(() => undefined);
          setConversations((current) =>
            current.map((item) =>
              item.id === conversation.id
                ? {
                    ...item,
                    userName: input.contact?.name || item.userName,
                    userAvatar: input.contact?.avatar || item.userAvatar,
                    userRole: input.contact?.role || item.userRole,
                  }
                : item,
            ),
          );
        }
        void loadConversationMessages(conversation.id);
        return conversation.id;
      }

      try {
        const apiConversation = await chatService.createConversation(
          partnerId,
          input.listing,
          input.contact
            ? {
                displayName: input.contact.name,
                avatarUrl: input.contact.avatar,
              }
            : undefined,
        );
        const newConversation: ChatConversation = {
          ...mapApiConversation(apiConversation, currentUserId),
          userName: input.contact?.name || apiConversation.participantName || partnerId,
          userAvatar: input.contact?.avatar,
          userRole: input.contact?.role || "Người dùng HomeSpace",
        };
        setConversations((current) => [
          newConversation,
          ...current.filter((item) => item.id !== newConversation.id),
        ]);
        return newConversation.id;
      } catch {
        toast.error("Không thể mở cuộc trò chuyện");
        return null;
      }
    },
    [conversations, currentUserId, loadConversationMessages]
  );

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      listingCard?: RelatedListing,
      attachments?: ChatApiAttachment[],
    ) => {
      const trimmed = content.trim();
      if (!trimmed || !currentUserId) return;

      try {
        const socket = socketRef.current;
        if (!socket?.connected) throw new Error("WebSocket disconnected");
        await keycloak.updateToken(30);
        socket.io.opts.extraHeaders = { Authorization: `Bearer ${keycloak.token}` };
        await socket.timeout(10_000).emitWithAck("chat:send", {
          conversationId,
          content: trimmed,
          ...(listingCard ? { listing: listingCard } : {}),
          ...(currentParticipantProfile ? { senderProfile: currentParticipantProfile } : {}),
          ...(attachments?.length ? { attachments } : {}),
        });
      } catch {
        toast.error("Không thể gửi tin nhắn");
      }
    },
    [currentParticipantProfile, currentUserId]
  );

  const toggleHideConversation = useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, isHidden: !conversation.isHidden }
          : conversation
      )
    );
  }, []);

  const togglePinConversation = useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, isPinned: !conversation.isPinned }
          : conversation
      )
    );
  }, []);

  const updateParticipantRole = useCallback(
    async (conversationId: string, role: "TENANT" | "LANDLORD") => {
      try {
        const updated = await chatService.updateParticipantRole(conversationId, role);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, participantRole: updated.participantRole }
              : conversation,
          ),
        );
      } catch {
        toast.error("Không thể cập nhật biệt danh");
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      currentUserId,
      conversations,
      openConversation,
      sendMessage,
      loadConversationMessages,
      setActiveConversationId,
      toggleHideConversation,
      togglePinConversation,
      updateParticipantRole,
      startCall,
      endCall,
    }),
    [
      currentUserId,
      conversations,
      openConversation,
      sendMessage,
      loadConversationMessages,
      setActiveConversationId,
      toggleHideConversation,
      togglePinConversation,
      updateParticipantRole,
      startCall,
      endCall,
    ]
  );

  return <ChatDemoContext.Provider value={value}>{children}</ChatDemoContext.Provider>;
}

export function useChatDemo() {
  const context = useContext(ChatDemoContext);
  if (!context) {
    throw new Error("useChatDemo must be used inside ChatDemoProvider");
  }
  return context;
}
