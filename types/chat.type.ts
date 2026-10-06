export interface RelatedListing {
  id: string;
  title: string;
  price: string;
  location: string;
  image: string;
  bedrooms?: number;
  area?: number;
  verified?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  senderId?: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  dateGroup?: string;
  status: "sent" | "delivered" | "read";
  isPinned?: boolean;
  isRecalled?: boolean;
  listingCard?: RelatedListing;
  attachments?: {
    type: "image" | "file";
    url: string;
    storageId?: string;
    name?: string;
    size?: string;
  }[];
  aiStatus?: import("@/types/ai.type").AiAnswerStatus;
}

export interface ChatConversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  isOnline: boolean;
  lastActive?: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender: "me" | "them";
  unreadCount: number;
  isHidden: boolean;
  isPinned?: boolean;
  relatedListing?: RelatedListing;
  participantRole?: "TENANT" | "LANDLORD";
  messages: ChatMessage[];
}

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
  searchContext?: import("@/types/ai.type").AiPropertySearchContext | null;
  messages: ChatMessage[];
  messagesLoaded?: boolean;
}

export type ChatChannelType = "ai" | "direct";

export type ChatFilterTab = "all" | "unread" | "hidden" | "landlord" | "tenant";
