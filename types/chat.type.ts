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
  dateGroup?: string;
  status: "sent" | "delivered" | "read";
  listingCard?: RelatedListing;
  attachments?: {
    type: "image" | "file";
    url: string;
    name?: string;
    size?: string;
  }[];
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
  messages: ChatMessage[];
}

export interface AiChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
  messages: ChatMessage[];
}

export type ChatChannelType = "ai" | "direct";

export type ChatFilterTab = "all" | "unread" | "hidden" | "landlord" | "tenant";
