import type { PropertyCategoryKey } from "./types";

export const PROPERTY_CATEGORIES: {
  key: PropertyCategoryKey;
  label: string;
  description: string;
}[] = [
  {
    key: "house",
    label: "Nhà nguyên căn",
    description: "Nhà nguyên căn, nhà phố, biệt thự",
  },
  {
    key: "apartment",
    label: "Căn hộ chung cư",
    description: "Căn hộ chung cư",
  },
  {
    key: "room",
    label: "Phòng trọ",
    description: "Phòng trọ",
  },
];

// Section 3: Dynamic amenities per category without duplication
export const APARTMENT_AMENITIES = [
  "WiFi",
  "Máy lạnh",
  "Máy nước nóng",
  "Tủ lạnh",
  "Máy giặt",
  "Thang máy",
  "Chỗ để xe",
  "Bảo vệ 24/7",
  "Camera",
  "Cho nuôi thú cưng",
  "Hồ bơi",
  "Phòng gym",
];

export const HOUSE_AMENITIES = [
  "WiFi",
  "Máy lạnh",
  "Máy nước nóng",
  "Tủ lạnh",
  "Máy giặt",
  "Thang máy",
  "Bảo vệ 24/7",
  "Camera",
  "Cho nuôi thú cưng",
  "Hồ bơi",
  "Phòng gym",
];

export const ROOM_AMENITIES = [
  "WiFi",
  "Thang máy",
  "Bảo vệ 24/7",
  "Camera",
  "Cho nuôi thú cưng",
  "Hồ bơi",
  "Phòng gym",
];

export const AMENITIES_BY_CATEGORY: Record<PropertyCategoryKey, string[]> = {
  apartment: APARTMENT_AMENITIES,
  house: HOUSE_AMENITIES,
  room: ROOM_AMENITIES,
};

// Section 5: Dynamic price units per category
export const PRICE_UNITS_BY_CATEGORY: Record<
  PropertyCategoryKey,
  { value: string; label: string }[]
> = {
  apartment: [{ value: "VND_MONTH", label: "VNĐ / tháng" }],
  house: [{ value: "VND_MONTH", label: "VNĐ / tháng" }],
  room: [
    { value: "VND_ROOM_MONTH", label: "VNĐ / phòng / tháng" },
    { value: "VND_PERSON_MONTH", label: "VNĐ / người / tháng" },
    { value: "VND_MONTH", label: "VNĐ / tháng" },
  ],
};

export const DEPOSIT_TYPES = [
  { value: "NONE", label: "Không đặt cọc" },
  { value: "AMOUNT", label: "Cọc theo số tiền" },
  { value: "MONTHS", label: "Cọc theo số tháng" },
] as const;

export const PAYMENT_CYCLES = [
  { value: "MONTHLY", label: "Hằng tháng (1 tháng)" },
] as const;

export const VIEWING_DAYS = [
  ["MONDAY", "Thứ 2"],
  ["TUESDAY", "Thứ 3"],
  ["WEDNESDAY", "Thứ 4"],
  ["THURSDAY", "Thứ 5"],
  ["FRIDAY", "Thứ 6"],
  ["SATURDAY", "Thứ 7"],
  ["SUNDAY", "Chủ nhật"],
] as const;

export const VIEWING_SLOTS = [
  { value: "MORNING", label: "Buổi sáng", time: "08:00 – 12:00" },
  { value: "AFTERNOON", label: "Buổi chiều", time: "13:00 – 17:00" },
  { value: "EVENING", label: "Buổi tối", time: "18:00 – 21:00" },
] as const;

export const ORIENTATIONS = [
  { value: "EAST", label: "Đông" },
  { value: "WEST", label: "Tây" },
  { value: "SOUTH", label: "Nam" },
  { value: "NORTH", label: "Bắc" },
  { value: "SOUTH_EAST", label: "Đông Nam" },
  { value: "NORTH_EAST", label: "Đông Bắc" },
  { value: "SOUTH_WEST", label: "Tây Nam" },
  { value: "NORTH_WEST", label: "Tây Bắc" },
];

export const FURNISHING_OPTIONS = [
  { value: "RAW", label: "Bàn giao thô / Chưa có nội thất" },
  { value: "BASIC", label: "Nội thất cơ bản" },
  { value: "PARTIAL", label: "Nội thất một phần" },
  { value: "FULL", label: "Đầy đủ nội thất" },
  { value: "LUXURY", label: "Nội thất cao cấp" },
];

// Hiện trạng bàn giao của từng tài sản trong biên bản bàn giao
export const HANDOVER_CONDITIONS = [
  { value: "BRAND_NEW", label: "Mới 100%" },
  { value: "GOOD", label: "Còn tốt" },
  { value: "NORMAL", label: "Bình thường" },
  { value: "USED_ACCEPTABLE", label: "Cũ, còn dùng được" },
  { value: "MINOR_DAMAGE", label: "Hư hỏng nhẹ" },
];

export const LEGAL_STATUS_OPTIONS = [
  { value: "PENDING", label: "Đang chờ sổ" },
  { value: "PINK_BOOK", label: "Sổ hồng / Sổ đỏ" },
  { value: "CONTRACT", label: "Hợp đồng mua bán" },
  { value: "OTHER", label: "Giấy tờ hợp lệ khác" },
];

export const MAX_IMAGES = 6;
export const MAX_VIDEOS = 3;
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 2 * 60;
