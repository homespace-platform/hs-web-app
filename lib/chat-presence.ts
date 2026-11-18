import type { ChatConversation } from "@/types/chat.type";

export type ChatPresence = { online: boolean; lastSeenAt: string | null };
export type ChatPresenceMap = Record<string, ChatPresence>;
export type ChatPresenceUpdate = ChatPresence & { userId: string };

export const OFFLINE_LABEL = "Ngoại tuyến";
export const ONLINE_LABEL = "Đang hoạt động";

export function formatLastActive(lastSeenAt: string | null | undefined, now = Date.now()) {
  const seen = lastSeenAt ? new Date(lastSeenAt).getTime() : NaN;
  if (Number.isNaN(seen)) return OFFLINE_LABEL;
  const minutes = Math.max(1, Math.floor((now - seen) / 60_000));
  if (minutes < 60) return `Hoạt động ${minutes} phút trước`;
  if (minutes < 24 * 60) return `Hoạt động ${Math.floor(minutes / 60)} giờ trước`;
  return `Hoạt động ${new Date(seen).toLocaleDateString("vi-VN")}`;
}

// Returns the same object when nothing changed so React skips the re-render.
export function mergePresence(state: ChatPresenceMap, updates: ChatPresenceUpdate[]) {
  let next = state;
  for (const { userId, online, lastSeenAt } of updates) {
    if (typeof userId !== "string" || typeof online !== "boolean") continue;
    const seen = lastSeenAt ?? null;
    const prev = next[userId];
    if (prev && prev.online === online && prev.lastSeenAt === seen) continue;
    if (next === state) next = { ...state };
    next[userId] = { online, lastSeenAt: seen };
  }
  return next;
}

export function applyPresence(conversation: ChatConversation, presence?: ChatPresence): ChatConversation {
  if (!presence) return conversation;
  return {
    ...conversation,
    isOnline: presence.online,
    lastActive: presence.online ? "" : formatLastActive(presence.lastSeenAt),
  };
}
