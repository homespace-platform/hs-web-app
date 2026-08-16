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
  category: "apartment" | "house" | "studio" | "villa";
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
  { id: "apartment", label: "Căn hộ" },
  { id: "house", label: "Nhà phố" },
  { id: "studio", label: "Studio" },
  { id: "verified", label: "Đã xác thực Blockchain" },
];

export const FEATURED_PROPERTIES: PropertyItem[] = [
  {
    id: "prop-1",
    title: "Căn hộ Sunrise City",
    location: "Quận 7, TP. HCM",
    district: "Quận 7",
    city: "TP. Hồ Chí Minh",
    priceMillion: 15,
    beds: 2,
    baths: 2,
    areaM2: 75,
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
    featured: true,
  },
  {
    id: "prop-2",
    title: "Vinhomes Central Park",
    location: "Bình Thạnh, TP. HCM",
    district: "Bình Thạnh",
    city: "TP. Hồ Chí Minh",
    priceMillion: 18,
    beds: 2,
    baths: 1,
    areaM2: 68,
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
    featured: true,
  },
  {
    id: "prop-3",
    title: "Masteri Thảo Điền",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "TP. Hồ Chí Minh",
    priceMillion: 14,
    beds: 1,
    baths: 1,
    areaM2: 50,
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "studio",
    featured: true,
  },
  {
    id: "prop-4",
    title: "Estella Heights",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "TP. Hồ Chí Minh",
    priceMillion: 22,
    beds: 3,
    baths: 2,
    areaM2: 105,
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    isVerified: false,
    statusText: "Đang xác thực",
    category: "apartment",
    featured: true,
  },
  {
    id: "prop-5",
    title: "The River Thủ Thiêm",
    location: "Thủ Đức, TP. HCM",
    district: "Thủ Đức",
    city: "TP. Hồ Chí Minh",
    priceMillion: 28,
    beds: 3,
    baths: 2,
    areaM2: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
  },
  {
    id: "prop-6",
    title: "Nhà phố hiện đại Thảo Điền",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "TP. Hồ Chí Minh",
    priceMillion: 35,
    beds: 4,
    baths: 4,
    areaM2: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "house",
  },
  {
    id: "prop-7",
    title: "Studio Duplex Vinhomes D'Capitale",
    location: "Cầu Giấy, Hà Nội",
    district: "Cầu Giấy",
    city: "Hà Nội",
    priceMillion: 12,
    beds: 1,
    baths: 1,
    areaM2: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "studio",
  },
  {
    id: "prop-8",
    title: "Biệt thự ven sông Sala",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "TP. Hồ Chí Minh",
    priceMillion: 65,
    beds: 5,
    baths: 5,
    areaM2: 320,
    imageUrl:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "villa",
  },
];

export const POPULAR_LOCATIONS: CityItem[] = [
  {
    id: "hcm",
    name: "TP. Hồ Chí Minh",
    slug: "ho-chi-minh",
    listingCount: "3,585 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80",
    districts: ["Quận 1", "Quận 7", "Thủ Đức", "Bình Thạnh", "Quận 2"],
  },
  {
    id: "hn",
    name: "Hà Nội",
    slug: "ha-noi",
    listingCount: "1,229 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1509030450996-939a2c418053?auto=format&fit=crop&w=800&q=80",
    districts: ["Cầu Giấy", "Nam Từ Liêm", "Tây Hồ", "Đống Đa", "Ba Đình"],
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    slug: "da-nang",
    listingCount: "856 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80",
    districts: ["Hải Châu", "Sơn Trà", "Ngũ Hành Sơn", "Thanh Khê"],
  },
  {
    id: "ct",
    name: "Cần Thơ",
    slug: "can-tho",
    listingCount: "342 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80",
    districts: ["Ninh Kiều", "Cái Răng", "Bình Thủy"],
  },
  {
    id: "bd",
    name: "Bình Dương",
    slug: "binh-duong",
    listingCount: "478 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    districts: ["Thủ Dầu Một", "Thuận An", "Dĩ An", "Bến Cát"],
  },
  {
    id: "hp",
    name: "Hải Phòng",
    slug: "hai-phong",
    listingCount: "215 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80",
    districts: ["Hồng Bàng", "Ngô Quyền", "Lê Chân"],
  },
  {
    id: "nt",
    name: "Nha Trang",
    slug: "nha-trang",
    listingCount: "184 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    districts: ["Vĩnh Nguyên", "Lộc Thọ", "Phước Hải"],
  },
  {
    id: "vt",
    name: "Vũng Tàu",
    slug: "vung-tau",
    listingCount: "156 tin đăng",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    districts: ["Phường 1", "Phường 2", "Thắng Tam", "Nguyễn An Ninh"],
  },
];
