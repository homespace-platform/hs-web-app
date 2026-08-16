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
  content: string;
  timestamp: string;
  dateGroup?: string;
  status: "sent" | "delivered" | "read";
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

export type ChatFilterTab = "all" | "unread" | "hidden";
