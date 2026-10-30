import type { AiConversationDetail, AiConversationMessage, AiConversationSummary } from "@/types/ai.type";
import type { AiChatSession, ChatMessage } from "@/types/chat.type";

export function toChatMessage(message: AiConversationMessage): ChatMessage {
  return {
    id: message.id,
    sender: message.role === "user" ? "me" : "them",
    content: message.content,
    timestamp: new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    createdAt: message.createdAt,
    status: "read",
    aiStatus: message.status ?? undefined,
    listingIds: message.role === "assistant" ? message.listingIds : undefined,
    listingPositions: message.role === "assistant" ? message.listingPositions : undefined,
    contractCards: message.role === "assistant" ? message.contractCards : undefined,
    appointmentCards: message.role === "assistant" ? message.appointmentCards : undefined,
    dataSources: message.role === "assistant" ? message.dataSources : undefined,
    suggestedQuestions: message.role === "assistant" ? message.suggestedQuestions : undefined,
  };
}

export function toAiSession(conversation: AiConversationSummary | AiConversationDetail): AiChatSession {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: new Date(conversation.createdAt).toLocaleDateString("vi-VN"),
    updatedAt: conversation.updatedAt,
    isPinned: conversation.isPinned,
    messages: "messages" in conversation ? conversation.messages.map(toChatMessage) : [],
    messagesLoaded: "messages" in conversation,
  };
}

export function aiConversationHref(id?: string): string {
  return id ? `/chat?channel=ai&aiConversationId=${encodeURIComponent(id)}` : "/chat?channel=ai";
}
