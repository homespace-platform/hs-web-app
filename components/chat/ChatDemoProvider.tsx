"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import chatService from "@/services/chat.service";
import type { ChatConversation, RelatedListing } from "@/types/chat.type";
import {
  DEMO_LANDLORD_ID,
  DEMO_TENANT_ID,
  getPopupView,
} from "@/lib/chat-demo-state";
import type { ChatPopupView } from "@/lib/chat-demo-state";
import { mapApiConversation, mapApiMessage } from "@/lib/chat-api-mapper";

type ChatContact = {
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
};

type OpenQuickChatInput = {
  conversationId?: string;
  listing?: RelatedListing;
  contact?: ChatContact;
};

type ChatDemoContextValue = {
  activeDemoUserId: string;
  conversations: ChatConversation[];
  isPopupOpen: boolean;
  popupConversationId: string | null;
  popupView: ChatPopupView;
  pendingListing: RelatedListing | null;
  openQuickChat: (input?: OpenQuickChatInput) => Promise<string | null>;
  closeQuickChat: () => void;
  openChatList: () => void;
  sendMessage: (
    conversationId: string,
    content: string,
    listingCard?: RelatedListing
  ) => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  selectDemoUser: (userId: string) => void;
  toggleHideConversation: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
};

const ChatDemoContext = createContext<ChatDemoContextValue | null>(null);

export function ChatDemoProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, profile } = useAuth();
  const [activeDemoUserId, setActiveDemoUserId] = useState(DEMO_TENANT_ID);
  const authenticatedUserId = profile?.id;
  const currentUserId = authenticatedUserId ?? activeDemoUserId;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupConversationId, setPopupConversationId] = useState<string | null>(null);
  const [popupView, setPopupView] = useState<ChatPopupView>("list");
  const [pendingListing, setPendingListing] = useState<RelatedListing | null>(null);

  useEffect(() => {
    if (!authenticated || !authenticatedUserId) return;

    let cancelled = false;
    void chatService
      .listConversations()
      .then((items) => {
        if (!cancelled) {
          setConversations((current) =>
            items.map((item) => {
              const mapped = mapApiConversation(item, authenticatedUserId);
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
  }, [authenticated, authenticatedUserId]);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      if (!authenticatedUserId) return;
      try {
        const page = await chatService.listMessages(conversationId);
        const messages = page.items.map((item) => mapApiMessage(item, authenticatedUserId));
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
      }
    },
    [authenticatedUserId],
  );

  const openQuickChat = useCallback(
    async (input: OpenQuickChatInput = {}) => {
      if (input.conversationId) {
        setIsPopupOpen(true);
        setPopupView(getPopupView(input.conversationId));
        setPopupConversationId(input.conversationId);
        setPendingListing(input.listing ?? null);
        void loadConversationMessages(input.conversationId);
        return input.conversationId;
      }

      const partnerId =
        input.contact?.id ||
        (currentUserId === DEMO_LANDLORD_ID ? DEMO_TENANT_ID : DEMO_LANDLORD_ID);
      const conversation = conversations.find(
        (item) =>
          item.userId === partnerId &&
          (!input.listing || item.relatedListing?.id === input.listing.id)
      );

      if (conversation) {
        setIsPopupOpen(true);
        setPopupView(getPopupView(conversation.id));
        setPopupConversationId(conversation.id);
        setPendingListing(input.listing ?? null);
        void loadConversationMessages(conversation.id);
        return conversation.id;
      }

      try {
        const apiConversation = await chatService.createConversation(
          partnerId,
          input.listing,
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
        setIsPopupOpen(true);
        setPopupView(getPopupView(newConversation.id));
        setPopupConversationId(newConversation.id);
        setPendingListing(input.listing ?? null);
        return newConversation.id;
      } catch {
        toast.error("Không thể mở cuộc trò chuyện");
        return null;
      }
    },
    [conversations, currentUserId, loadConversationMessages]
  );

  const closeQuickChat = useCallback(() => {
    setIsPopupOpen(false);
    setPopupConversationId(null);
    setPopupView("list");
    setPendingListing(null);
  }, []);

  const openChatList = useCallback(() => {
    setIsPopupOpen(true);
    setPopupView("list");
    setPopupConversationId(null);
    setPendingListing(null);
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string, listingCard?: RelatedListing) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const pendingCard =
        popupConversationId === conversationId ? pendingListing ?? undefined : undefined;
      const cardToAttach = listingCard ?? pendingCard;
      try {
        const message = await chatService.sendMessage(
          conversationId,
          trimmed,
          cardToAttach,
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
        if (cardToAttach) setPendingListing(null);
      } catch {
        toast.error("Không thể gửi tin nhắn");
      }
    },
    [currentUserId, pendingListing, popupConversationId]
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
      activeDemoUserId: currentUserId,
      conversations,
      isPopupOpen,
      popupConversationId,
      popupView,
      pendingListing,
      openQuickChat,
      closeQuickChat,
      openChatList,
      sendMessage,
      loadConversationMessages,
      selectDemoUser: setActiveDemoUserId,
      toggleHideConversation,
      togglePinConversation,
    }),
    [
      currentUserId,
      conversations,
      isPopupOpen,
      popupConversationId,
      popupView,
      pendingListing,
      openQuickChat,
      closeQuickChat,
      openChatList,
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
