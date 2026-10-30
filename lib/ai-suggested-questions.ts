import type { ChatMessage } from "@/types/chat.type";

export const RENTER_STARTER_QUESTIONS = [
  "Bạn có thể giúp tôi tìm phòng phù hợp không?",
  "Tôi cần dự trù những khoản nào ngoài tiền thuê?",
  "Tôi chưa biết nên chọn khu vực nào, bạn tư vấn giúp được không?",
];

export function suggestedQuestions(messages: ChatMessage[]): string[] {
  const latest = messages.at(-1);
  if (!latest) return RENTER_STARTER_QUESTIONS;
  if (latest.sender !== "them") return [];
  return [...new Set((latest.suggestedQuestions ?? []).filter((text): text is string =>
    typeof text === "string" && text.trim().length > 0 && text.length <= 500
    && !/[\[\]{}<>]|\.{3}|…/.test(text)).map((text) => text.trim()))].slice(0, 4);
}
