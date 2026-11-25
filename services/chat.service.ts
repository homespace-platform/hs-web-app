import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  ChatApiAttachment,
  ChatApiConversation,
  ChatApiMessage,
  ChatApiMessagePage,
  ChatCallToken,
} from "@/types/chat-api.type";
import type { RelatedListing } from "@/types/chat.type";
import userService from "@/services/user.service";
import type { PublicUserProfile } from "@/types/user.type";

const profiles = new Map<string, { expiresAt: number; request: Promise<PublicUserProfile> }>();

async function getParticipantProfile(id: string, force = false): Promise<PublicUserProfile> {
  let entry = profiles.get(id);
  if (force || !entry || entry.expiresAt <= Date.now()) {
    entry = { expiresAt: Date.now() + 30_000, request: userService.getPublicProfile(id) };
    profiles.set(id, entry);
  }
  try { return await entry.request; }
  catch (error) { if (profiles.get(id) === entry) profiles.delete(id); throw error; }
}

async function hydrateProfile(conversation: ChatApiConversation): Promise<ChatApiConversation> {
  try {
    const profile = await getParticipantProfile(conversation.participantId);
    return {
      ...conversation,
      participantName: [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.username,
      participantAvatar: profile.avatarUrl ?? undefined,
    };
  } catch {
    return conversation;
  }
}

export type ChatParticipantProfile = {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

const chatService = {
  clearProfileCache() { profiles.clear(); },
  getParticipantProfile,

  async uploadAttachment(file: File, conversationId: string): Promise<ChatApiAttachment> {
    const typeByExtension: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    let contentType = file.type && file.type !== 'application/octet-stream' ? file.type : typeByExtension[extension];
    if (['image/pjpeg', 'image/jfif', 'image/x-jfif'].includes(contentType)) contentType = 'image/jpeg';
    if (!Object.values(typeByExtension).includes(contentType) || file.size < 1 || file.size > 25 * 1024 * 1024) {
      throw new Error('Chỉ hỗ trợ JPG, PNG, WebP, PDF, Word, Excel và PowerPoint. Tối đa 25 MB/tệp.');
    }
    const base = `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/media`;
    const response = await axiosClient.post<ApiResponse<{ storageId: string; uploadUrl: string }>>(`${base}/uploads`, {
      fileName: file.name, contentType, size: file.size,
    });
    const { storageId, uploadUrl } = response.data.result;
    const uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
    if (!uploaded.ok) throw new Error('Không thể tải tệp lên kho chat.');
    const completed = await axiosClient.post<ApiResponse<ChatApiAttachment>>(`${base}/${encodeURIComponent(storageId)}/complete`);
    return completed.data.result;
  },

  async getAttachmentViewUrl(conversationId: string, storageId: string): Promise<string> {
    const response = await axiosClient.get<ApiResponse<{ url: string }>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/media/${encodeURIComponent(storageId)}/view-url`,
    );
    return response.data.result.url;
  },

  async listConversations(limit = 30): Promise<ChatApiConversation[]> {
    const response = await axiosClient.get<ApiResponse<ChatApiConversation[]>>(
      "/api/v1/chat/conversations",
      { params: { limit } },
    );
    return Promise.all((response.data.result ?? []).map(hydrateProfile));
  },

  async createConversation(
    participantId: string,
    participantProfile?: ChatParticipantProfile,
  ): Promise<ChatApiConversation> {
    const response = await axiosClient.post<ApiResponse<ChatApiConversation>>(
      "/api/v1/chat/conversations",
      {
        participantId,
        ...(participantProfile ? { participantProfile } : {}),
      },
    );
    return hydrateProfile(response.data.result);
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
    attachments?: ChatApiAttachment[],
  ): Promise<ChatApiMessage> {
    const response = await axiosClient.post<ApiResponse<ChatApiMessage>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        content,
        ...(listing ? { listing } : {}),
        ...(senderProfile ? { senderProfile } : {}),
        ...(attachments?.length ? { attachments } : {}),
      },
    );
    return response.data.result;
  },

  async updateParticipantRole(
    conversationId: string,
    role: "TENANT" | "LANDLORD",
  ) {
    const response = await axiosClient.patch<ApiResponse<ChatApiConversation>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/participant-role`,
      { role },
    );
    return response.data.result;
  },

  async markRead(conversationId: string): Promise<void> {
    await axiosClient.patch<ApiResponse<unknown>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    );
  },

  async createCallToken(
    conversationId: string,
    callId: string,
  ): Promise<ChatCallToken> {
    const response = await axiosClient.post<ApiResponse<ChatCallToken>>(
      `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/call-token`,
      { callId },
    );
    return response.data.result;
  },
};

export default chatService;
