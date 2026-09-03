import type { ChatConversation, ChatMessage } from "@/types/chat.type";
import type { ChatApiConversation, ChatApiMessage } from "@/types/chat-api.type";

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function mapApiConversation(
  conversation: ChatApiConversation,
  currentUserId: string,
): ChatConversation {
  return {
    id: conversation.id,
    userId: conversation.participantId,
    userName:
      conversation.participantName ||
      conversation.participantEmail ||
      conversation.participantId,
    userAvatar: conversation.participantAvatar,
    userRole: "Người dùng HomeSpace",
    isOnline: false,
    lastActive: "",
    lastMessage: conversation.lastMessage ?? "",
    lastMessageTime: formatTime(conversation.lastMessageAt),
    lastMessageSender:
      conversation.lastMessageSenderId === currentUserId ? "me" : "them",
    unreadCount: conversation.unreadCount,
    isHidden: false,
    relatedListing: conversation.listing,
    messages: [],
  };
}

export function mapApiMessage(
  message: ChatApiMessage,
  currentUserId: string,
): ChatMessage {
  return {
    id: message.id,
    sender: message.senderId === currentUserId ? "me" : "them",
    senderId: message.senderId,
    content: message.content,
    timestamp: formatTime(message.createdAt),
    dateGroup: "Hôm nay",
    status: "read",
    listingCard: message.listing,
  };
}
