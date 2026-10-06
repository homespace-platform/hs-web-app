import axiosClient from "@/lib/axios-client";
import type { AiAskResponse, AiConversationDetail, AiConversationSummary } from "@/types/ai.type";
import type { ApiResponse } from "@/types/api.type";

export const aiService = {
  async listConversations(): Promise<AiConversationSummary[]> {
    const response = await axiosClient.get<ApiResponse<AiConversationSummary[]>>(
      "/api/v1/ai/agent/conversations",
    );
    return response.data.result ?? [];
  },

  async createConversation(): Promise<AiConversationDetail> {
    const response = await axiosClient.post<ApiResponse<AiConversationDetail>>(
      "/api/v1/ai/agent/conversations",
    );
    return response.data.result;
  },

  async getConversation(id: string): Promise<AiConversationDetail> {
    const response = await axiosClient.get<ApiResponse<AiConversationDetail>>(
      `/api/v1/ai/agent/conversations/${encodeURIComponent(id)}`,
    );
    return response.data.result;
  },

  async setPinned(id: string, isPinned: boolean): Promise<AiConversationSummary> {
    const response = await axiosClient.patch<ApiResponse<AiConversationSummary>>(
      `/api/v1/ai/agent/conversations/${encodeURIComponent(id)}/pin`,
      { isPinned },
    );
    return response.data.result;
  },

  async deleteConversation(id: string): Promise<void> {
    await axiosClient.delete(`/api/v1/ai/agent/conversations/${encodeURIComponent(id)}`);
  },

  async ask(
    question: string,
    conversationId: string,
    searchContext?: { provinceCode: string; district?: string; category?: string },
  ): Promise<AiAskResponse> {
    const response = await axiosClient.post<ApiResponse<AiAskResponse>>(
      "/api/v1/ai/agent/ask",
      { question, conversationId, ...(searchContext ? { searchContext } : {}) },
    );
    return response.data.result;
  },
};
