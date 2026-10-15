import type { AiAskResponse, AiConversationDetail } from "@/types/ai.type";
import type { AiChatSession } from "@/types/chat.type";
import { toAiSession, toChatMessage } from "@/lib/ai-conversation";

interface ChatApi {
  canAsk?(question: string): boolean;
  createConversation(): Promise<AiConversationDetail>;
  getConversation(id: string): Promise<AiConversationDetail>;
  ask(question: string, conversationId: string): Promise<AiAskResponse>;
}

export interface HomeChatSnapshot {
  session: AiChatSession | null;
  isSending: boolean;
  error: string | null;
}

// One controller per account or guest identity. Old in-flight results stay in the old
// controller after logout/account switch, never in the next user's view.
export function createHomeAiChat(ownerId: string | null, api: ChatApi) {
  let snapshot: HomeChatSnapshot = { session: null, isSending: false, error: null };
  let active = true;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<HomeChatSnapshot>) => {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((listener) => listener());
  };
  return {
    setActive(value: boolean) { active = value; },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async send(text: string) {
      const question = text.trim();
      if (!active || !ownerId || !question || question.length > 500 || snapshot.isSending) return false;
      if (api.canAsk && !api.canAsk(question)) return false;
      update({ isSending: true, error: null });
      const createdAt = new Date().toISOString();
      const user = toChatMessage({ id: `local-user-${crypto.randomUUID()}`, role: "user", content: question, createdAt });
      const previousSession = snapshot.session;
      // Show the first question immediately, including while creating the session.
      update({ session: {
        ...(previousSession ?? { id: "", createdAt, title: question, messages: [], messagesLoaded: true }),
        title: previousSession?.messages.length ? previousSession.title : question,
        messages: [...(previousSession?.messages ?? []), user],
      } });
      let conversationId = previousSession?.id;
      try {
        if (!conversationId) {
          const fresh = await api.createConversation();
          if (!active) return false;
          conversationId = fresh.id;
          update({ session: { ...snapshot.session!, id: fresh.id } });
        }
        const response = await api.ask(question, conversationId);
        if (!active) return false;
        const assistant = toChatMessage({
          id: `local-assistant-${crypto.randomUUID()}`, role: "assistant", content: response.answer,
          createdAt: new Date().toISOString(), status: response.status,
          listingIds: response.listingIds, listingPositions: response.listingPositions,
          contractCards: response.contractCards, dataSources: response.dataSources,
        });
        update({ session: { ...snapshot.session!, messages: [...snapshot.session!.messages, assistant] } });
        return true;
      } catch (error) {
        if (!active) return false;
        const rateLimited = typeof error === "object" && error !== null && "response" in error
          && (error as { response?: { status?: number } }).response?.status === 429;
        const loginRequired = typeof error === "object" && error !== null && "code" in error
          && error.code === "GUEST_LOGIN_REQUIRED";
        // A timeout does not prove the server rejected the question. Re-read history
        // once, and never automatically retry a paid generation request.
        let reconciled = false;
        if (conversationId) {
          try {
            const authoritative = await api.getConversation(conversationId);
            if (!active) return false;
            update({ session: toAiSession(authoritative) });
            reconciled = true;
          } catch { /* Preserve the visible question if the history is unavailable. */ }
        } else {
          update({ session: previousSession });
        }
        if (!active) return false;
        update({ error: loginRequired ? null : rateLimited
          ? "Bạn đã hỏi khá nhiều trong phiên này. Vui lòng chờ một chút rồi thử lại nhé."
          : ownerId === "guest"
          ? "Chưa nhận được phản hồi. Hội thoại khách chỉ giữ trong phiên này; mình không tự gửi lại để tránh phát sinh lượt hỏi trùng."
          : !conversationId
          ? "Chưa tạo được hội thoại, nên câu hỏi chưa được gửi. Bạn thử gửi lại sau một chút nhé."
          : reconciled
          ? "Kết nối bị gián đoạn. Mình đã tải lại lịch sử hiện có; bạn kiểm tra câu trả lời bên dưới trước khi gửi lại nhé."
          : "Chưa nhận được phản hồi. Câu hỏi có thể đã được lưu; mình không tự gửi lại để tránh trùng lặp. Bạn có thể mở trang chat để kiểm tra lịch sử." });
        return false;
      } finally {
        update({ isSending: false });
      }
    },
  };
}
