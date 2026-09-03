import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendDemoMessage,
  getPopupView,
  normalizeDirectConversations,
} from "./chat-demo-state.ts";
import type { ChatConversation } from "@/types/chat.type";

const conversation: ChatConversation = {
  id: "conversation-1",
  userId: "landlord-demo",
  userName: "Người cho thuê B",
  userRole: "Chủ nhà",
  isOnline: true,
  lastMessage: "Xin chào",
  lastMessageTime: "10:00",
  lastMessageSender: "them",
  unreadCount: 0,
  isHidden: false,
  messages: [
    {
      id: "message-1",
      sender: "them",
      content: "Xin chào",
      timestamp: "10:00",
      status: "read",
    },
  ],
};

describe("chat demo state", () => {
  it("opens the list by default and a conversation when an id is supplied", () => {
    assert.equal(getPopupView(), "list");
    assert.equal(getPopupView("conversation-1"), "conversation");
  });

  it("normalizes old mock sender values into demo account ids", () => {
    const [normalized] = normalizeDirectConversations([conversation]);

    assert.equal(normalized.messages[0].senderId, "landlord-demo");
  });

  it("appends a message and preserves a listing attachment", () => {
    const updated = appendDemoMessage(conversation, {
      senderId: "tenant-demo",
      content: "Căn này còn trống không ạ?",
      timestamp: "10:01",
      listingCard: {
        id: "listing-1",
        title: "Căn hộ mẫu",
        price: "10.000.000 ₫/tháng",
        location: "Quận 1",
        image: "/listing.jpg",
      },
    });

    assert.equal(updated.messages.length, 2);
    assert.equal(updated.messages[1].senderId, "tenant-demo");
    assert.equal(updated.messages[1].listingCard?.id, "listing-1");
    assert.equal(updated.lastMessage, "Căn này còn trống không ạ?");
    assert.equal(updated.lastMessageSender, "me");
  });
});
