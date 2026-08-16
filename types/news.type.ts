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
}
