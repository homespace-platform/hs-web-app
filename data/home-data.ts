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

export const FEATURED_PROPERTIES: PropertyItem[] = [
  {
    id: "prop-1",
    title: "CHO THUÊ NHANH CĂN 3 PHÒNG NGỦ NT CAO CẤP",
    location: "Quận 7, TP. HCM",
    district: "Quận 7",
    city: "Tp Hồ Chí Minh",
    priceMillion: 28,
    beds: 3,
    baths: 2,
    areaM2: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
    propertyTypeLabel: "Chung cư",
    timeAgo: "43 giây trước",
    photosCount: 12,
    featured: true,
  },
  {
    id: "prop-2",
    title: "CĂN HỘ 2 PHÒNG NGỦ VINHOMES CENTRAL PARK VIEW SÔNG",
    location: "Bình Thạnh, TP. HCM",
    district: "Bình Thạnh",
    city: "Tp Hồ Chí Minh",
    priceMillion: 18,
    beds: 2,
    baths: 1,
    areaM2: 68,
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
    propertyTypeLabel: "Chung cư",
    timeAgo: "5 phút trước",
    photosCount: 8,
    featured: true,
  },
  {
    id: "prop-3",
    title: "STUDIO FULL NỘI THẤT MASTERI THẢO ĐIỀN BAN CÔNG THOÁNG",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "Tp Hồ Chí Minh",
    priceMillion: 14,
    beds: 1,
    baths: 1,
    areaM2: 50,
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "studio",
    propertyTypeLabel: "Studio",
    timeAgo: "12 phút trước",
    photosCount: 10,
    featured: true,
  },
  {
    id: "prop-4",
    title: "CĂN HỘ CAO CẤP ESTELLA HEIGHTS TIỆN ÍCH RESORT",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "Tp Hồ Chí Minh",
    priceMillion: 22,
    beds: 3,
    baths: 2,
    areaM2: 105,
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    isVerified: false,
    statusText: "Đang xác thực",
    category: "apartment",
    propertyTypeLabel: "Chung cư",
    timeAgo: "1 giờ trước",
    photosCount: 15,
    featured: true,
  },
];

export const RECENT_PROPERTIES: PropertyItem[] = [
  {
    id: "recent-1",
    title: "CĂN HỘ CAO CẤP THE RIVER THỦ THIÊM VIEW TRỌN SÔNG SÀI GÒN",
    location: "Thủ Đức, TP. HCM",
    district: "Thủ Đức",
    city: "Tp Hồ Chí Minh",
    priceMillion: 32,
    beds: 3,
    baths: 2,
    areaM2: 125,
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "apartment",
    propertyTypeLabel: "Chung cư",
    timeAgo: "15 giây trước",
    photosCount: 14,
  },
  {
    id: "recent-2",
    title: "NHÀ PHỐ HIỆN ĐẠI THẢO ĐIỀN CÓ SÂN VƯỜN TIỆN KINH DOANH",
    location: "Quận 2, TP. HCM",
    district: "Quận 2",
    city: "Tp Hồ Chí Minh",
    priceMillion: 38,
    beds: 4,
    baths: 4,
    areaM2: 190,
    imageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "house",
    propertyTypeLabel: "Nhà ở",
    timeAgo: "2 phút trước",
    photosCount: 18,
  },
  {
    id: "recent-3",
    title: "STUDIO DUPLEX FULL TIỆN NGHI GẦN ĐẠI HỌC QUỐC GIA",
    location: "Cầu Giấy, Hà Nội",
    district: "Cầu Giấy",
    city: "Hà Nội",
    priceMillion: 9.5,
    beds: 1,
    baths: 1,
    areaM2: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "studio",
    propertyTypeLabel: "Studio",
    timeAgo: "8 phút trước",
    photosCount: 6,
  },
  {
    id: "recent-4",
    title: "VĂN PHÒNG MẶT TIỀN TRUNG TÂM QUẬN 1 SẴN BÀN GHẾ CAO CẤP",
    location: "Quận 1, TP. HCM",
    district: "Quận 1",
    city: "Tp Hồ Chí Minh",
    priceMillion: 25,
    beds: 0,
    baths: 2,
    areaM2: 85,
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    isVerified: true,
    statusText: "Blockchain Verified",
    category: "office",
    propertyTypeLabel: "Văn phòng",
    timeAgo: "15 phút trước",
    photosCount: 11,
  },
];

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
