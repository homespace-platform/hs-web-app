export interface PropertyItem {
  id: string;
  title: string;
  location: string;
  district: string;
  city: string;
  priceMillion: number;
  beds: number;
  baths: number;
  areaM2: number;
  imageUrl: string;
  isVerified: boolean;
  statusText?: string;
  category: "apartment" | "house" | "office" | "commercial" | "studio" | "room" | "villa";
  propertyTypeLabel?: string;
  timeAgo?: string;
  photosCount?: number;
  featured?: boolean;
}

export interface CityItem {
  id: string;
  name: string;
  slug: string;
  listingCount: string;
  imageUrl: string;
  districts?: string[];
}

export const QUICK_SEARCH_SUGGESTIONS = [
  "Căn hộ studio Quận 1",
  "Gần ĐH Bách Khoa",
  "Smart-home Quận 7",
  "Chung cư dưới 10 triệu",
  "Vinhomes Central Park",
  "Masteri Thảo Điền",
];

export const PROPERTY_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "office", label: "Văn phòng" },
  { id: "commercial", label: "Mặt bằng kinh doanh" },
  { id: "studio", label: "Studio" },
  { id: "room", label: "Phòng trọ" },
];

export const FEATURED_PROPERTIES: PropertyItem[] = [];

export const RECENT_PROPERTIES: PropertyItem[] = [];

export const POPULAR_LOCATIONS: CityItem[] = [
  {
    id: "hcm",
    name: "TP. Hồ Chí Minh",
    slug: "ho-chi-minh",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80",
    districts: ["Quận 1", "Quận 7", "Thủ Đức", "Bình Thạnh", "Quận 2"],
  },
  {
    id: "hn",
    name: "Hà Nội",
    slug: "ha-noi",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1599827556794-279883bc2dbb?auto=format&fit=crop&w=800&q=80",
    districts: ["Cầu Giấy", "Nam Từ Liêm", "Tây Hồ", "Đống Đa", "Ba Đình"],
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    slug: "da-nang",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80",
    districts: ["Hải Châu", "Sơn Trà", "Ngũ Hành Sơn", "Thanh Khê"],
  },
  {
    id: "ct",
    name: "Cần Thơ",
    slug: "can-tho",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80",
    districts: ["Ninh Kiều", "Cái Răng", "Bình Thủy"],
  },
  {
    id: "bd",
    name: "Bình Dương",
    slug: "binh-duong",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    districts: ["Thủ Dầu Một", "Thuận An", "Dĩ An", "Bến Cát"],
  },
  {
    id: "hp",
    name: "Hải Phòng",
    slug: "hai-phong",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
    districts: ["Hồng Bàng", "Ngô Quyền", "Lê Chân"],
  },
  {
    id: "nt",
    name: "Nha Trang",
    slug: "nha-trang",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    districts: ["Vĩnh Nguyên", "Lộc Thọ", "Phước Hải"],
  },
  {
    id: "vt",
    name: "Vũng Tàu",
    slug: "vung-tau",
    listingCount: "0 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    districts: ["Phường 1", "Phường 2", "Thắng Tam", "Nguyễn An Ninh"],
  },
];
