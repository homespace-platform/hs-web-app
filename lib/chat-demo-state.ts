export const chatConversationUrl = (conversationId: string) =>
  `/chat?conversationId=${encodeURIComponent(conversationId)}`;
