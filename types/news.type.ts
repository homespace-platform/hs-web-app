export type NewsCategory =
  | "all"
  | "market"
  | "legal"
  | "guide"
  | "investment"
  | "trend";

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content?: string;
  coverImage: string;
  category: "market" | "legal" | "guide" | "investment" | "trend";
  categoryLabel: string;
  tags: string[];
  isFeatured: boolean;
  publishedAt: string;
  views: number;
  readTimeMinutes: number;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  contentBlocks?: NewsContentBlock[];
  media?: Array<{ storageObjectId: string; role: "THUMBNAIL" | "CONTENT"; altText: string | null; url: string | null }>;
}

export type NewsContentBlock = {
  type: "PARAGRAPH" | "HEADING" | "QUOTE" | "IMAGE";
  text: string | null;
  storageObjectId: string | null;
  altText: string | null;
};

export type PublicNewsSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: Uppercase<NewsArticle["category"]>;
  status: "PUBLISHED";
  featured: boolean;
  tags: string[];
  thumbnailUrl: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string | null;
};

export type PublicNewsResponse = PublicNewsSummary & {
  contentBlocks: NewsContentBlock[];
  media: Array<{
    storageObjectId: string;
    role: "THUMBNAIL" | "CONTENT";
    altText: string | null;
    url: string | null;
  }>;
  authorId: string;
  updatedAt: string | null;
};
