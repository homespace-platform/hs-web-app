export type AiAnswerStatus =
  | "ANSWERED"
  | "NO_RESULTS"
  | "TOOL_UNAVAILABLE"
  | "GENERAL_ANSWER"
  | "NO_EVIDENCE"
  | "OUT_OF_SCOPE"
  | "GENERATION_UNAVAILABLE"
  | "LOGIN_REQUIRED"
  | "NEEDS_CLARIFICATION"
  | "NOT_FOUND";

/** Built by the AI service from a verified Core projection. It carries no URL. */
export interface AiContractCard {
  contractId: string;
  contractNumber: string;
  property?: string | null;
  askerRole: "LANDLORD" | "TENANT";
  roleLabel: string;
  status: string;
  statusLabel: string;
  leasePhase: string;
  phaseLabel: string;
  leaseStart?: string | null;
  leaseEndExclusive?: string | null;
  lastRentalDay?: string | null;
  readAt?: string | null;
  source?: string;
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
  listingIds?: string[];
  listingPositions?: Record<string, number>;
  contractCards?: AiContractCard[];
  dataSources?: string[];
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
  listingIds?: string[];
  listingPositions?: Record<string, number>;
  contractCards?: AiContractCard[];
  dataSources?: string[];
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiConversationMessage[];
}
