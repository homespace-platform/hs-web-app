import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chatConversationUrl } from "./chat-demo-state.ts";

describe("chat state", () => {
  it("builds a full-chat URL for a conversation", () => {
    assert.equal(
      chatConversationUrl("conversation/1"),
      "/chat?conversationId=conversation%2F1",
    );
  });
});
