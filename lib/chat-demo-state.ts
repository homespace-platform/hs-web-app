import type { ChatConversation, ChatMessage, RelatedListing } from "@/types/chat.type";

export const chatConversationUrl = (conversationId: string) =>
  `/chat?conversationId=${encodeURIComponent(conversationId)}`;

/**
 * One row per participant. The list is ordered most-recent-first, so the first row wins and
 * absorbs the unread count of its legacy duplicates.
 * shortcut: stopgap for pre-migration duplicate rows; drop once the backend data migration ran.
 */
export function dedupeByParticipant(items: ChatConversation[]): ChatConversation[] {
  const kept = new Map<string, ChatConversation>();
  for (const item of items) {
    const first = kept.get(item.userId);
    if (!first) kept.set(item.userId, item);
    else if (item.unreadCount) kept.set(item.userId, { ...first, unreadCount: first.unreadCount + item.unreadCount });
  }
  return [...kept.values()];
}

const RECENT_MESSAGES = 10;

/** Pending listing context is attached once, unless I already sent a card for it just now. */
export function listingToAttach(
  pending: RelatedListing | undefined,
  messages: ChatMessage[],
  currentUserId: string,
): RelatedListing | undefined {
  if (!pending) return undefined;
  const alreadySent = messages.slice(-RECENT_MESSAGES)
    .some((item) => item.senderId === currentUserId && item.listingCard?.id === pending.id);
  return alreadySent ? undefined : pending;
}
