import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatConversationUrl, dedupeByParticipant, listingToAttach } from "./chat-demo-state.ts";
import type { ChatConversation, ChatMessage, RelatedListing } from "../types/chat.type.ts";

const listing = { id: "l1", title: "Căn hộ", price: "1", location: "Q1", image: "" } as RelatedListing;
const row = (id: string, userId: string, unreadCount = 0) => ({ id, userId, unreadCount }) as ChatConversation;
const msg = (senderId: string, card?: RelatedListing) => ({ id: Math.random().toString(), senderId, listingCard: card }) as ChatMessage;

describe("chat state", () => {
  it("builds a full-chat URL for a conversation", () => {
    assert.equal(
      chatConversationUrl("conversation/1"),
      "/chat?conversationId=conversation%2F1",
    );
  });

  it("shows one row per participant, newest first, merging unread of legacy duplicates", () => {
    const result = dedupeByParticipant([row("new", "p1", 1), row("other", "p2"), row("old", "p1", 2)]);
    assert.deepEqual(result.map((item) => [item.id, item.unreadCount]), [["new", 3], ["other", 0]]);
  });

  it("attaches a pending listing once unless I already sent that card recently", () => {
    assert.equal(listingToAttach(undefined, [], "me"), undefined);
    assert.equal(listingToAttach(listing, [msg("them", listing)], "me"), listing);
    assert.equal(listingToAttach(listing, [msg("me", { ...listing, id: "l2" })], "me"), listing);
    assert.equal(listingToAttach(listing, [msg("me", listing), msg("them")], "me"), undefined);
  });
});
