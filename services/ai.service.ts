import axiosClient from "@/lib/axios-client";
import type { AiAskResponse, AiConversationDetail, AiConversationSummary } from "@/types/ai.type";
import type { ApiResponse } from "@/types/api.type";

function createAiService(prefix: string, guest = false) {
  const config = { withCredentials: guest };
  return {
    async listConversations(): Promise<AiConversationSummary[]> {
      const response = await axiosClient.get<ApiResponse<AiConversationSummary[]>>(
        `${prefix}/conversations`, config,
      );
      return response.data.result ?? [];
    },

    async createConversation(): Promise<AiConversationDetail> {
      const response = await axiosClient.post<ApiResponse<AiConversationDetail>>(
        `${prefix}/conversations`, undefined, config,
      );
      return response.data.result;
    },

    async getConversation(id: string): Promise<AiConversationDetail> {
      const response = await axiosClient.get<ApiResponse<AiConversationDetail>>(
        `${prefix}/conversations/${encodeURIComponent(id)}`, config,
      );
      return response.data.result;
    },

    async setPinned(id: string, isPinned: boolean): Promise<AiConversationSummary> {
      const response = await axiosClient.patch<ApiResponse<AiConversationSummary>>(
        `${prefix}/conversations/${encodeURIComponent(id)}/pin`,
        { isPinned }, config,
      );
      return response.data.result;
    },

    async deleteConversation(id: string): Promise<void> {
      await axiosClient.delete(`${prefix}/conversations/${encodeURIComponent(id)}`, config);
    },

    async ask(
      question: string,
      conversationId: string,
    ): Promise<AiAskResponse> {
      const response = await axiosClient.post<ApiResponse<AiAskResponse>>(
        `${prefix}/ask`,
        { question, conversationId }, config,
      );
      return response.data.result;
    },
  };
}

export const aiService = createAiService("/api/v1/ai/agent");
export { guestAiService } from "@/lib/guest-ai-session";
