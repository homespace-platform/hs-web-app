import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { AiAskResponse, AiConversationDetail, AiConversationSummary } from "@/types/ai.type";

const prefix = "/api/v1/ai/guest/agent";
const handoffKey = "homespace_guest_ai_login_handoff";
type GuestDetail = AiConversationDetail & { guestState: string; remainingQuestions: number };
type GuestAnswer = AiAskResponse & { guestState: string; remainingQuestions: number };
let current: GuestDetail | null = null;
let creating: Promise<GuestDetail> | null = null;
let asking = false;
let generation = 0;
const lifetimes = new Set<symbol>();
let snapshot = { remaining: 3, loginRequired: false, pendingQuestion: "" };
const listeners = new Set<() => void>();
function update(changes: Partial<typeof snapshot>) {
  snapshot = { ...snapshot, ...changes };
  listeners.forEach((listener) => listener());
}

export class GuestLoginRequiredError extends Error {
  readonly code = "GUEST_LOGIN_REQUIRED";
  constructor() { super("Đăng nhập để tiếp tục trò chuyện với HomeSpace AI."); }
}
export function isGuestLoginRequired(error: unknown) { return error instanceof GuestLoginRequiredError; }

export const guestChatState = {
  retain() {
    try {
      const raw = sessionStorage.getItem(handoffKey);
      if (raw && JSON.parse(raw).expires <= Date.now()) sessionStorage.removeItem(handoffKey);
    } catch { /* Storage can be unavailable; ordinary guest chat still works. */ }
    const lease = Symbol("guest-chat-view");
    lifetimes.add(lease);
    return () => {
      lifetimes.delete(lease);
      const detachedGeneration = generation;
      queueMicrotask(() => {
        if (!lifetimes.size && generation === detachedGeneration) guestChatState.clear();
      });
    };
  },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => snapshot,
  canAsk(question: string) {
    if (snapshot.remaining > 0) return true;
    update({ loginRequired: true, pendingQuestion: question });
    return false;
  },
  closeLogin() { update({ loginRequired: false }); },
  clear() {
    generation++;
    current = null; creating = null; asking = false;
    update({ remaining: 3, loginRequired: false, pendingQuestion: "" });
  },
  prepareLogin(): string {
    // The ONLY guest storage write: explicit consent to survive the OAuth redirect.
    // No normal guest history/localStorage. Delete after successful claim or expiry.
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(handoffKey, JSON.stringify({
      nonce, guestState: current?.messages.length ? current.guestState : null,
      pendingQuestion: snapshot.pendingQuestion, expires: Date.now() + 20 * 60 * 1000,
    }));
    return `${window.location.origin}/chat?channel=ai&resumeGuest=${encodeURIComponent(nonce)}`;
  },
};

export const guestAiService = {
  canAsk: guestChatState.canAsk,
  async listConversations(): Promise<AiConversationSummary[]> { return []; },
  async createConversation(): Promise<GuestDetail> {
    if (current) return current;
    if (creating) return creating;
    const version = generation;
    const request = axiosClient.post<ApiResponse<GuestDetail>>(`${prefix}/conversations`, undefined, { withCredentials: true })
      .then((response) => {
        if (version !== generation) throw new Error("Phiên khách đã đóng.");
        current = response.data.result;
        update({ remaining: current.remainingQuestions });
        return current;
      });
    creating = request;
    try { return await request; } finally { if (creating === request) creating = null; }
  },
  async getConversation(id: string): Promise<AiConversationDetail> {
    if (!current || current.id !== id) throw new Error("Phiên khách không còn trong bộ nhớ.");
    return current;
  },
  async setPinned(): Promise<AiConversationSummary> { throw new Error("Đăng nhập để lưu và ghim lịch sử."); },
  async deleteConversation(): Promise<void> { guestChatState.clear(); },
  async ask(question: string, conversationId: string): Promise<AiAskResponse> {
    if (!guestChatState.canAsk(question)) throw new GuestLoginRequiredError();
    if (!current || current.id !== conversationId || asking) throw new Error("Phiên khách chưa sẵn sàng.");
    const version = generation;
    const before = current;
    asking = true;
    try {
      const response = await axiosClient.post<ApiResponse<GuestAnswer>>(`${prefix}/ask`,
        { question, conversationId, guestState: before.guestState }, { withCredentials: true });
      if (version !== generation) throw new Error("Phiên khách đã đóng.");
      const reply = response.data.result;
      const createdAt = new Date().toISOString();
      current = { ...before, guestState: reply.guestState, remainingQuestions: reply.remainingQuestions,
        title: before.messages.length ? before.title : question.slice(0, 60), updatedAt: createdAt,
        messages: [...before.messages,
          { id: crypto.randomUUID(), role: "user", content: question, createdAt },
          { id: crypto.randomUUID(), role: "assistant", content: reply.answer, createdAt,
            status: reply.status, listingIds: reply.listingIds, listingPositions: reply.listingPositions,
            contractCards: reply.contractCards, dataSources: reply.dataSources }],
      };
      update({ remaining: reply.remainingQuestions });
      return reply;
    } catch (error) {
      if (version !== generation) throw error;
      const response = (error as { response?: { status?: number; data?: { detail?: { code?: string } } } })?.response;
      const code = response?.data?.detail?.code;
      if (code === "GUEST_LOGIN_REQUIRED" || code === "GUEST_CONTEXT_STALE") {
        update({ remaining: 0, loginRequired: true, pendingQuestion: question });
        throw new GuestLoginRequiredError();
      }
      // A transport timeout may have consumed a turn: don't retry a paid call with
      // an old token. Preserve the last verified transcript for login/recovery.
      throw error;
    } finally { if (version === generation) asking = false; }
  },
};

const claims = new Map<string, Promise<{ conversation: AiConversationDetail | null; pendingQuestion: string } | null>>();
export function resumeGuestConversation(nonce: string) {
  if (claims.has(nonce)) return claims.get(nonce)!;
  const request = (async () => {
    const raw = sessionStorage.getItem(handoffKey);
    if (!raw) return null;
    let handoff;
    try { handoff = JSON.parse(raw); } catch { sessionStorage.removeItem(handoffKey); return null; }
    if (handoff.nonce !== nonce || handoff.expires <= Date.now()) {
      sessionStorage.removeItem(handoffKey); return null;
    }
    let conversation: AiConversationDetail | null = null;
    if (handoff.guestState) {
      const response = await axiosClient.post<ApiResponse<AiConversationDetail>>(
        "/api/v1/ai/agent/conversations/claim-guest", { guestState: handoff.guestState }, { withCredentials: true });
      conversation = response.data.result;
    }
    sessionStorage.removeItem(handoffKey);
    return { conversation, pendingQuestion: String(handoff.pendingQuestion || "").slice(0, 500) };
  })();
  claims.set(nonce, request);
  request.catch(() => { claims.delete(nonce); }); // Retain handoff for explicit retry, not automatic paid generation.
  return request;
}
