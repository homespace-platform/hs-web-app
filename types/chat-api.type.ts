import type { RelatedListing } from "@/types/chat.type";

export type ChatApiConversation = {
  id: string;
  participantId: string;
  participantName?: string;
  participantEmail?: string;
  listing?: RelatedListing;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
};

export type ChatApiMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  listing?: RelatedListing;
  createdAt: string;
};

export type ChatApiMessagePage = {
  items: ChatApiMessage[];
  nextBefore?: string;
};
