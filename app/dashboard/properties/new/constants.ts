import type { PropertyCategoryKey } from "./types";

export const PROPERTY_CATEGORIES: {
  key: PropertyCategoryKey;
  label: string;
  description: string;
}[] = [
  {
    key: "apartment",
    label: "Căn hộ / Chung cư",
    description: "Căn hộ chung cư, studio, duplex, penthouse, officetel",
  },
  {
    key: "house",
    label: "Nhà nguyên căn",
    description: "Nhà phố, nhà trong hẻm, biệt thự, nhà cấp 4",
  },
  {
    key: "office",
    label: "Văn phòng",
    description: "Văn phòng truyền thống, trọn gói, coworking, chia sẻ",
  },
  {
    key: "commercial",
    label: "Mặt bằng kinh doanh",
    description: "Cửa hàng, ki-ốt, showroom, shophouse, mặt bằng TTTM",
  },
  {
    key: "room",
    label: "Nhà trọ / Căn hộ dịch vụ",
    description: "Phòng trọ, phòng trong nhà, căn hộ dịch vụ, ký túc xá",
  },
];

export const SUBTYPES_BY_CATEGORY: Record<
  PropertyCategoryKey,
  { value: string; label: string }[]
> = {
  apartment: [
    { value: "apartment_normal", label: "Căn hộ thường" },
    { value: "studio", label: "Studio" },
    { value: "duplex", label: "Duplex" },
    { value: "penthouse", label: "Penthouse" },
    { value: "officetel", label: "Officetel" },
    { value: "other", label: "Loại khác" },
  ],
  house: [
    { value: "townhouse", label: "Nhà phố" },
    { value: "alley_house", label: "Nhà trong hẻm" },
    { value: "villa", label: "Biệt thự" },
    { value: "level4_house", label: "Nhà cấp 4" },
    { value: "other", label: "Loại khác" },
  ],
  office: [
    { value: "traditional_office", label: "Văn phòng truyền thống" },
    { value: "serviced_office", label: "Văn phòng dịch vụ" },
    { value: "coworking", label: "Coworking" },
    { value: "shared_office", label: "Văn phòng chia sẻ" },
    { value: "other", label: "Loại khác" },
  ],
  commercial: [
    { value: "shop", label: "Cửa hàng" },
    { value: "kiosk", label: "Ki-ốt" },
    { value: "showroom", label: "Showroom" },
    { value: "shophouse", label: "Shophouse" },
    { value: "mall_space", label: "Mặt bằng trong trung tâm thương mại" },
    { value: "other", label: "Loại khác" },
  ],
  room: [
    { value: "boarding_room", label: "Phòng trọ" },
    { value: "house_room", label: "Phòng trong nhà nguyên căn" },
    { value: "serviced_apartment", label: "Căn hộ dịch vụ" },
    { value: "dormitory", label: "Ký túc xá" },
    { value: "other", label: "Loại khác" },
  ],
};

export const RENTAL_TYPES_BY_CATEGORY: Record<
  PropertyCategoryKey,
  { value: string; label: string }[]
> = {
  apartment: [
    { value: "WHOLE", label: "Cho thuê nguyên căn" },
    { value: "PRIVATE_ROOM", label: "Phòng riêng trong căn hộ" },
    { value: "SHARED_ROOM", label: "Ở ghép" },
  ],
  house: [
    { value: "WHOLE", label: "Cho thuê nguyên căn" },
    { value: "PARTIAL", label: "Một phần căn nhà (thuê tầng/phòng)" },
  ],
  office: [
    { value: "WHOLE_FLOOR", label: "Nguyên sàn / Diện tích lớn" },
    { value: "PRIVATE_OFFICE", label: "Phòng làm việc riêng" },
    { value: "HOT_DESK", label: "Chỗ ngồi làm việc / Coworking" },
  ],
  commercial: [
    { value: "WHOLE", label: "Nguyên mặt bằng" },
    { value: "PARTIAL", label: "Một phần mặt bằng" },
    { value: "KIOSK", label: "Ki-ốt / Quầy kinh doanh" },
  ],
  room: [
    { value: "PRIVATE_ROOM", label: "Phòng riêng" },
    { value: "SHARED_ROOM", label: "Ở ghép (Share phòng / Giường tầng)" },
  ],
};

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

export const OFFICE_AMENITIES = [
  "Thang máy",
  "Lễ tân",
  "Bảo vệ 24/7",
  "Camera",
  "Máy phát điện",
  "Điều hòa trung tâm",
  "Phòng họp",
  "Internet",
  "Hệ thống PCCC",
];

export const COMMERCIAL_AMENITIES = [
  "Thang máy",
  "Camera",
  "Bảo vệ",
  "Vị trí đặt biển hiệu",
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
  office: OFFICE_AMENITIES,
  commercial: COMMERCIAL_AMENITIES,
  room: ROOM_AMENITIES,
};

// Room available furniture list
export const ROOM_FURNITURE_LIST = [
  "Giường",
  "Tủ quần áo",
  "Bàn làm việc",
  "Kệ bếp",
  "Tủ lạnh",
  "Máy giặt",
  "Máy lạnh",
  "Máy nước nóng",
  "Rèm cửa",
];

// Section 5: Dynamic price units per category
export const PRICE_UNITS_BY_CATEGORY: Record<
  PropertyCategoryKey,
  { value: string; label: string }[]
> = {
  apartment: [{ value: "VND_MONTH", label: "VNĐ / tháng" }],
  house: [{ value: "VND_MONTH", label: "VNĐ / tháng" }],
  office: [
    { value: "VND_MONTH", label: "VNĐ / tháng" },
    { value: "VND_M2_MONTH", label: "VNĐ / m² / tháng" },
    { value: "VND_SEAT_MONTH", label: "VNĐ / chỗ ngồi / tháng" },
  ],
  commercial: [
    { value: "VND_MONTH", label: "VNĐ / tháng" },
    { value: "VND_M2_MONTH", label: "VNĐ / m² / tháng" },
  ],
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
  { value: "NEGOTIATE", label: "Thỏa thuận" },
] as const;

export const PAYMENT_CYCLES = [
  { value: "MONTHLY", label: "Hằng tháng (1 tháng)" },
  { value: "TWO_MONTHS", label: "Mỗi 2 tháng" },
  { value: "QUARTERLY", label: "Mỗi quý (3 tháng)" },
  { value: "HALF_YEAR", label: "Mỗi 6 tháng" },
  { value: "NEGOTIATE", label: "Thỏa thuận" },
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
  { value: "FULL", label: "Đầy đủ nội thất" },
  { value: "LUXURY", label: "Nội thất cao cấp" },
];

export const LEGAL_STATUS_OPTIONS = [
  { value: "PENDING", label: "Đang chờ sổ" },
  { value: "PINK_BOOK", label: "Sổ hồng / Sổ đỏ" },
  { value: "CONTRACT", label: "Hợp đồng mua bán" },
  { value: "OTHER", label: "Giấy tờ hợp lệ khác" },
];

export const MAX_IMAGES = 6;
export const MAX_VIDEOS = 3;
