export type AiAnswerStatus =
  | "ANSWERED"
  | "GENERAL_ANSWER"
  | "NO_EVIDENCE"
  | "OUT_OF_SCOPE"
  | "GENERATION_UNAVAILABLE"
  | "PROPERTY_SEARCH";

export interface AiPropertySearchContext {
  provinceCode: string;
  district?: string;
  category?: string;
}

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
  searchContext?: AiPropertySearchContext | null;
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
