import axios from "axios";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type { PublicNewsResponse, PublicNewsSummary } from "@/types/news.type";

const baseUrl = "";

const newsService = {
  async list(params: { page?: number; size?: number; category?: string; keyword?: string } = {}) {
    const response = await axios.get<PageResponse<PublicNewsSummary>>(
      `${baseUrl}/api/v1/public/news`, { params },
    );
    return response.data;
  },

  async getBySlug(slug: string) {
    const response = await axios.get<ApiResponse<PublicNewsResponse>>(
      `${baseUrl}/api/v1/public/news/${encodeURIComponent(slug)}`,
    );
    return response.data.result;
  },
};

export default newsService;
