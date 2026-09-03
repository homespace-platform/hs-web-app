import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapApiConversation,
  mapApiMessage,
} from "./chat-api-mapper.ts";

describe("chat API mapper", () => {
  it("maps a conversation preview to the existing UI model", () => {
    const result = mapApiConversation(
      {
        id: "conversation-1",
        participantId: "user-b",
        participantName: "Người cho thuê B",
        lastMessage: "Còn phòng nhé",
        lastMessageAt: "2026-09-03T10:05:00.000Z",
        lastMessageSenderId: "user-b",
        unreadCount: 2,
      },
      "user-a",
    );

    assert.equal(result.id, "conversation-1");
    assert.equal(result.userId, "user-b");
    assert.equal(result.userName, "Người cho thuê B");
    assert.equal(result.lastMessage, "Còn phòng nhé");
    assert.equal(result.lastMessageSender, "them");
    assert.equal(result.unreadCount, 2);
    assert.deepEqual(result.messages, []);
  });

  it("maps sender identity and listing snapshot into a UI message", () => {
    const result = mapApiMessage(
      {
        id: "message-1",
        conversationId: "conversation-1",
        senderId: "user-a",
        content: "Căn này còn trống không ạ?",
        listing: {
          id: "listing-1",
          title: "Căn hộ mẫu",
          price: "10.000.000 ₫/tháng",
          location: "Quận 1",
          image: "https://example.com/listing.jpg",
        },
        createdAt: "2026-09-03T10:05:00.000Z",
      },
      "user-a",
    );

    assert.equal(result.sender, "me");
    assert.equal(result.senderId, "user-a");
    assert.equal(result.listingCard?.id, "listing-1");
    assert.equal(result.status, "read");
  });
});
