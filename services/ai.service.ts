import axiosClient from "@/lib/axios-client";
import type { AiAskResponse } from "@/types/ai.type";
import type { ApiResponse } from "@/types/api.type";

export const aiService = {
  async ask(question: string, conversationId: string): Promise<AiAskResponse> {
    const response = await axiosClient.post<ApiResponse<AiAskResponse>>(
      "/api/v1/ai/agent/ask",
      { question, conversationId },
    );
    return response.data.result;
  },
};
