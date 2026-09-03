import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  ChatApiConversation,
  ChatApiMessage,
  ChatApiMessagePage,
} from "@/types/chat-api.type";
import type { RelatedListing } from "@/types/chat.type";

export type ChatParticipantProfile = {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

const chatService = {
  async listConversations(limit = 30): Promise<ChatApiConversation[]> {
    const response = await axiosClient.get<ApiResponse<ChatApiConversation[]>>(
      "/api/v1/chat/conversations",
      { params: { limit } },
    );
    return response.data.result ?? [];
  },

  async createConversation(
    participantId: string,
    listing?: RelatedListing,
    participantProfile?: ChatParticipantProfile,
  ): Promise<ChatApiConversation> {
    const response = await axiosClient.post<ApiResponse<ChatApiConversation>>(
      "/api/v1/chat/conversations",
      {
        participantId,
        ...(listing ? { listing } : {}),
        ...(participantProfile ? { participantProfile } : {}),
      },
    );
    return response.data.result;
  },

  async listMessages(
    conversationId: string,
    before?: string,
    limit = 50,
  ): Promise<ChatApiMessagePage> {
    const response = await axiosClient.get<ApiResponse<ChatApiMessagePage>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      { params: { limit, ...(before ? { before } : {}) } },
    );
    return response.data.result;
  },

  async sendMessage(
    conversationId: string,
    content: string,
    listing?: RelatedListing,
    senderProfile?: ChatParticipantProfile,
  ): Promise<ChatApiMessage> {
    const response = await axiosClient.post<ApiResponse<ChatApiMessage>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        content,
        ...(listing ? { listing } : {}),
        ...(senderProfile ? { senderProfile } : {}),
      },
    );
    return response.data.result;
  },

  async markRead(conversationId: string): Promise<void> {
    await axiosClient.patch<ApiResponse<unknown>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    );
  },
};

export default chatService;
