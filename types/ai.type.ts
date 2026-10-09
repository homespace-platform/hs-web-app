export type AiAnswerStatus =
  | "ANSWERED"
  | "NO_RESULTS"
  | "TOOL_UNAVAILABLE"
  | "GENERAL_ANSWER"
  | "NO_EVIDENCE"
  | "OUT_OF_SCOPE"
  | "GENERATION_UNAVAILABLE";

export interface AiCitation {
  documentId: string;
  version: string;
  title: string;
  heading: string;
  chunkId: string;
  snippet?: string;
}


export interface AiAskResponse {
  answer: string;
  status: AiAnswerStatus;
  citations: AiCitation[];
  requestId: string;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: AiAnswerStatus | null;
  createdAt: string;
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiConversationMessage[];
}
