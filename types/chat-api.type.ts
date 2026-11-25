import type { RelatedListing } from "@/types/chat.type";

export type ChatApiAttachment = {
  storageId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string;
};

export type ChatCallHistory = {
  callId: string;
  callerId: string;
  mode: "audio" | "video";
  status: "missed" | "declined" | "cancelled" | "ended" | "failed";
};

export type ChatApiConversation = {
  id: string;
  participantId: string;
  participantName?: string;
  participantAvatar?: string;
  participantEmail?: string;
  listing?: RelatedListing;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
  participantRole?: "TENANT" | "LANDLORD";
};

export type ChatApiMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  listing?: RelatedListing;
  createdAt: string;
  attachments?: ChatApiAttachment[];
  call?: ChatCallHistory;
  isPinned?: boolean;
  isRecalled?: boolean;
};

export type ChatMessageAction = "pin" | "unpin" | "delete" | "recall";

export type ChatApiMessagePage = {
  items: ChatApiMessage[];
  nextBefore?: string;
};

export type ChatCallMode = "voice" | "video";

export type ChatCallSignal = {
  conversationId: string;
  callId: string;
  mode: ChatCallMode;
  callerId?: string;
  historyVersion?: 1;
};

export type ChatCallEndSignal = Pick<
  ChatCallSignal,
  "conversationId" | "callId"
> & { reason?: "declined" | "failed" };

export type ChatCallToken = {
  appId: string;
  channel: string;
  token: string;
  uid: string;
  expiresIn: number;
};
