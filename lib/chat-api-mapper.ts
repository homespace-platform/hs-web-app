import type { ChatConversation, ChatMessage } from "@/types/chat.type";
import type { ChatApiConversation, ChatApiMessage } from "@/types/chat-api.type";

export function legacyAttachmentContent(attachments: NonNullable<ChatApiMessage["attachments"]>) {
  return attachments.length === 1
    ? `Đã gửi ${attachments[0].fileName}`
    : `Đã gửi ${attachments.length} tệp đính kèm`;
}

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
    userRole:
      conversation.participantRole === "TENANT"
        ? "Người hỏi thuê"
        : conversation.participantRole === "LANDLORD"
        ? "Chủ thuê"
        : "Người dùng HomeSpace",
    participantRole: conversation.participantRole,
    isOnline: false,
    lastActive: "",
    lastMessage: conversation.lastMessage ?? "",
    lastMessageTime: formatTime(conversation.lastMessageAt),
    lastMessageAt: conversation.lastMessageAt,
    lastMessageId: conversation.lastMessageId,
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
  const attachments = message.attachments ?? [];
  const isLegacyAttachmentText = attachments.length > 0 && (
    message.content === legacyAttachmentContent(attachments) ||
    (attachments.length === 1 && message.content === "Đã gửi tệp đính kèm")
  );
  return {
    id: message.id,
    sender: message.senderId === currentUserId ? "me" : "them",
    senderId: message.senderId,
    content: isLegacyAttachmentText ? "" : message.content,
    timestamp: formatTime(message.createdAt),
    createdAt: message.createdAt,
    dateGroup: "Hôm nay",
    status: "read",
    isPinned: message.isPinned,
    isRecalled: message.isRecalled,
    listingCard: message.listing,
    call: message.call,
    attachments: attachments.map((attachment) => ({
      type: attachment.contentType.startsWith("image/") ? "image" : "file",
      url: attachment.url ?? "",
      storageId: attachment.storageId,
      name: attachment.fileName,
      contentType: attachment.contentType,
      size: `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB`,
    })),
  };
}
