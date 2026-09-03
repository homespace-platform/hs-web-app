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
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import chatService from "@/services/chat.service";
import type { ChatParticipantProfile } from "@/services/chat.service";
import type { ChatConversation, RelatedListing } from "@/types/chat.type";
import { mapApiConversation, mapApiMessage } from "@/lib/chat-api-mapper";

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

type ChatDemoContextValue = {
  currentUserId?: string;
  conversations: ChatConversation[];
  openConversation: (input?: OpenConversationInput) => Promise<string | null>;
  sendMessage: (
    conversationId: string,
    content: string,
    listingCard?: RelatedListing
  ) => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  toggleHideConversation: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
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
    async (conversationId: string, content: string, listingCard?: RelatedListing) => {
      const trimmed = content.trim();
      if (!trimmed || !currentUserId) return;

      try {
        const message = await chatService.sendMessage(
          conversationId,
          trimmed,
          listingCard,
          currentParticipantProfile,
        );
        const mappedMessage = mapApiMessage(message, currentUserId);
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessage: mappedMessage.content,
                  lastMessageTime: mappedMessage.timestamp,
                  lastMessageSender: "me",
                  messages: [...conversation.messages, mappedMessage],
                }
              : conversation,
          ),
        );
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

  const value = useMemo(
    () => ({
      currentUserId,
      conversations,
      openConversation,
      sendMessage,
      loadConversationMessages,
      toggleHideConversation,
      togglePinConversation,
    }),
    [
      currentUserId,
      conversations,
      openConversation,
      sendMessage,
      loadConversationMessages,
      toggleHideConversation,
      togglePinConversation,
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
