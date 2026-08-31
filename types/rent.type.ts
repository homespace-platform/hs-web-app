export interface RentPropertyItem {
  id: string;
  title: string;
  description?: string;
  floor?: string;
  location: string;
  district: string;
  ward?: string;
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  city: string;
  priceMillion: number;
  beds: number;
  baths: number;
  areaM2: number;
  images: string[];
  isVerified: boolean;
  isPriority?: boolean;
  hasVideo?: boolean;
  category: "apartment" | "house" | "office" | "commercial" | "studio" | "room" | "villa";
  categoryLabel: string;
  timeAgo: string;
  photosCount: number;
  viewsCount?: number;
  details?: Record<string, unknown>;
  landlord: {
    name: string;
    avatar?: string;
    role: string;
    listingsCount: number;
    phone?: string;
  };
}
