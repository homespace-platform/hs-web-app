import type { AiAnswerStatus, AiContractCard } from "@/types/ai.type";

export const MAX_CONTRACT_CARDS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = new Set(["LANDLORD", "TENANT"]);

/** Role-correct route built by the application. The model and the API never supply a URL. */
export function contractHref(card: Pick<AiContractCard, "contractId" | "askerRole">): string | null {
  if (!UUID.test(card.contractId) || !ROLES.has(card.askerRole)) return null;
  return `/dashboard/${card.askerRole === "TENANT" ? "tenant" : "landlord"}/contracts/${card.contractId.toLowerCase()}`;
}

/** Keep only well-formed, de-duplicated cards. Anything else is dropped, never rendered. */
export function safeContractCards(cards: unknown): AiContractCard[] {
  if (!Array.isArray(cards)) return [];
  const seen = new Set<string>();
  const result: AiContractCard[] = [];
  for (const raw of cards) {
    if (!raw || typeof raw !== "object") continue;
    const card = raw as AiContractCard;
    if (typeof card.contractId !== "string" || !UUID.test(card.contractId) || seen.has(card.contractId.toLowerCase())) continue;
    if (typeof card.contractNumber !== "string" || !card.contractNumber || !ROLES.has(card.askerRole)) continue;
    seen.add(card.contractId.toLowerCase());
    result.push(card);
    if (result.length === MAX_CONTRACT_CARDS) break;
  }
  return result;
}

export function formatCardDate(value?: string | null): string | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

export function formatReadAt(value?: string | null): string | null {
  if (!value) return null;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return null;
  return time.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

/** Status line under an assistant answer. Contract states must never read as listing states. */
export function aiStatusNote(status?: AiAnswerStatus | null, dataSources?: string[]): string | null {
  const contract = Boolean(dataSources?.includes("CORE_CONTRACT")) || status === "LOGIN_REQUIRED"
    || status === "NEEDS_CLARIFICATION" || status === "NOT_FOUND";
  switch (status) {
    case "NO_RESULTS": return contract ? "Hệ thống không có hợp đồng nào khớp yêu cầu này." : "Chưa có tin đăng đang hiển thị khớp các điều kiện.";
    case "TOOL_UNAVAILABLE": return contract
      ? "Chưa đọc được dữ liệu hợp đồng lúc này; mình không suy đoán kết quả."
      : "Chưa kiểm tra được dữ liệu tin đăng trực tiếp; không suy đoán kết quả.";
    case "LOGIN_REQUIRED": return "Cần đăng nhập để xem hợp đồng của bạn.";
    case "NEEDS_CLARIFICATION": return "Chọn hợp đồng bạn muốn hỏi để mình đọc đúng dữ liệu.";
    case "NOT_FOUND": return "Không tìm thấy hợp đồng này trong tài khoản đang đăng nhập.";
    case "NO_EVIDENCE": return "Chưa tìm thấy tài liệu phù hợp.";
    case "GENERAL_ANSWER": return "Kiến thức chung · không lấy từ tài liệu HomeSpace.";
    case "OUT_OF_SCOPE": return "Hiện chưa hỗ trợ tra cứu dữ liệu này.";
    case "GENERATION_UNAVAILABLE": return "Trợ lý đang tạm gián đoạn.";
    default: return null;
  }
}

/** Source line that keeps personal Core data apart from general RAG guidance. */
export function aiSourceNote(dataSources?: string[]): string | null {
  const core = dataSources?.includes("CORE_CONTRACT");
  const rag = dataSources?.includes("RAG");
  if (core && rag) return "Nguồn: dữ liệu hợp đồng của bạn (đọc từ hệ thống) và hướng dẫn chung từ tài liệu HomeSpace.";
  if (core) return "Nguồn: dữ liệu hợp đồng của bạn, đọc từ hệ thống.";
  return null;
}
