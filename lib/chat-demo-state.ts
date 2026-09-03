import type { ChatConversation, ChatMessage, RelatedListing } from "@/types/chat.type";

export const DEMO_TENANT_ID = "tenant-demo";
export const DEMO_LANDLORD_ID = "landlord-demo";
export type ChatPopupView = "list" | "conversation";

export const getPopupView = (conversationId?: string): ChatPopupView =>
  conversationId ? "conversation" : "list";

export const DEMO_USERS = [
  { id: DEMO_TENANT_ID, name: "Người thuê A", role: "Tài khoản mô phỏng" },
  { id: DEMO_LANDLORD_ID, name: "Người cho thuê B", role: "Tài khoản mô phỏng" },
] as const;

const senderIdForLegacyMessage = (message: ChatMessage) =>
  message.sender === "me" ? DEMO_TENANT_ID : DEMO_LANDLORD_ID;

export function normalizeDirectConversations(
  conversations: ChatConversation[]
): ChatConversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      senderId: message.senderId ?? senderIdForLegacyMessage(message),
    })),
  }));
}

export function appendDemoMessage(
  conversation: ChatConversation,
  input: {
    id?: string;
    senderId: string;
    content: string;
    timestamp: string;
    listingCard?: RelatedListing;
  }
): ChatConversation {
  const sender = input.senderId === DEMO_TENANT_ID ? "me" : "them";
  const message: ChatMessage = {
    id: input.id ?? `msg-direct-${Date.now()}`,
    sender,
    senderId: input.senderId,
    content: input.content,
    timestamp: input.timestamp,
    dateGroup: "Hôm nay",
    status: "read",
    ...(input.listingCard ? { listingCard: input.listingCard } : {}),
  };

  return {
    ...conversation,
    lastMessage: input.content,
    lastMessageTime: input.timestamp,
    lastMessageSender: sender,
    messages: [...conversation.messages, message],
  };
}
