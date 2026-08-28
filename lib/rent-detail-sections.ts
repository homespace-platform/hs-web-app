import type { RentPropertyItem } from "@/data/mock-rent-data";

export type RentDetailItem = { label: string; value: string };
export type RentDetailSection = { title: string; items: RentDetailItem[] };

const FURNISHING_LABELS = {
  NONE: "Không nội thất",
  BASIC: "Nội thất cơ bản",
  FULL: "Đầy đủ nội thất",
};
const LEGAL_LABELS = {
  NONE: "Chưa cập nhật",
  PINK_BOOK: "Sổ hồng / sổ đỏ",
  CONTRACT: "Hợp đồng mua bán",
};

export function getRentDetailSections(
  property: Pick<RentPropertyItem, "category" | "details">,
): RentDetailSection[] {
  const details = property.details ?? {};
  const categoryItems = {
    apartment: [
      detail("Phòng khách", details.livingRooms, " phòng"),
      detail("Phòng bếp", details.kitchens, " phòng"),
      detail("Ban công", booleanLabel(details.hasBalcony)),
      detail("Tầng căn hộ", details.apartmentFloor),
      detail("Tổng số tầng chung cư", details.buildingTotalFloors),
      detail("Nội thất", label(details.furnishing, FURNISHING_LABELS)),
      detail("Pháp lý", label(details.legalStatus, LEGAL_LABELS)),
    ],
    house: [
      detail("Phòng khách", details.livingRooms, " phòng"),
      detail("Phòng bếp", details.kitchens, " phòng"),
      detail("Sân thượng", booleanLabel(details.hasRooftopTerrace)),
      detail("Tầng", details.floor),
      detail("Tổng số tầng", details.totalFloors),
      detail("Nội thất", label(details.furnishing, FURNISHING_LABELS)),
      detail("Pháp lý", label(details.legalStatus, LEGAL_LABELS)),
    ],
    room: [
      detail("Tầng phòng", details.roomFloor),
      detail("WC của phòng", label(details.privateBathroom, { PRIVATE: "WC riêng trong phòng", SHARED: "WC dùng chung" })),
      detail("Nội thất phòng", label(details.roomFurnishing, FURNISHING_LABELS)),
      detail("Cửa sổ / ban công", label(details.roomHasWindow, { YES: "Có", NO: "Không" })),
      detail("Gác lửng", booleanLabel(details.hasLoft)),
    ],
    studio: [
      detail("Khu bếp", label(details.hasKitchen, { YES: "Có", NO: "Không" })),
      detail("Vị trí không gian", label(details.spacePosition, { GROUND_LEVEL: "Mặt đất / tầng trệt", BUILDING_FLOOR: "Một tầng trong tòa nhà" })),
      detail("Tầng", details.floor),
      detail("Tổng số tầng tòa nhà", details.totalFloors),
      detail("Thang máy", label(details.elevator, { YES: "Có", NO: "Không" })),
    ],
    commercial: [
      detail("Vị trí không gian", label(details.spacePosition, { GROUND_LEVEL: "Mặt đất / tầng trệt", BUILDING_FLOOR: "Một tầng trong tòa nhà" })),
      detail("Tầng", details.floor),
      detail("Tổng số tầng tòa nhà", details.totalFloors),
      detail("Thang máy", label(details.elevator, { YES: "Có", NO: "Không" })),
    ],
    office: [],
    villa: [],
  }[property.category];
  const isHouseUnit = property.category === "house"
    && details.rentalMode !== undefined
    && details.rentalMode !== "WHOLE_PROPERTY";

  const sections: RentDetailSection[] = [
    { title: categoryTitle(property.category), items: clean(isHouseUnit ? [] : categoryItems) },
    {
      title: "Điều kiện thuê",
      items: clean([
        detail("Hình thức thuê", label(details.rentalMode, {
          WHOLE_PROPERTY: "Nguyên căn / nguyên mặt bằng",
          SINGLE_UNIT: "Một phòng / một căn",
          MULTIPLE_UNITS: "Nhiều phòng / nhiều căn",
        })),
        detail("Đơn vị cho thuê", details.unitLabel),
        detail("Tổng số đơn vị", details.totalUnits),
        detail("Đơn vị còn trống", details.availableUnits),
        detail("Tiền cọc", details.depositAmount, "", true),
        detail("Thuê tối thiểu", details.minimumLeaseMonths, " tháng"),
        ...(property.category === "house" || property.category === "room"
          ? [
              detail("Chính sách gửi xe", label(details.parkingPolicy, { NONE: "Không thu phí gửi xe", PAID: "Có thu phí gửi xe" })),
              detail("Phí gửi xe", details.parkingFee, "", true),
              detail("Số người tối đa", details.maxOccupants, " người"),
              detail("Số xe tối đa", details.maxVehicles, " xe"),
            ]
          : [
              detail("Phí gửi xe", details.parkingFee, "", true),
              detail(property.category === "apartment" ? "Phí quản lý chung cư" : "Phí quản lý", details.managementFee, "", true),
            ]),
        detail("Giá điện", details.electricityPrice, " / kWh", true),
        detail("Giá nước", details.waterPrice, " / m³", true),
      ]),
    },
  ];

  if (isHouseUnit) {
    sections.splice(1, 0, {
      title: "Thông tin phòng",
      items: clean([
        detail("Tầng phòng", details.roomFloor),
        detail("WC của phòng", label(details.privateBathroom, { PRIVATE: "WC riêng trong phòng", SHARED: "WC dùng chung" })),
        detail("Nội thất phòng", label(details.roomFurnishing, FURNISHING_LABELS)),
        detail("Cửa sổ / ban công", label(details.roomHasWindow, { YES: "Có", NO: "Không" })),
        detail("Ở chung với chủ nhà", label(details.sharedWithOwner, { YES: "Có", NO: "Không" })),
      ]),
    });
    sections.splice(1, 0, {
      title: "Thông tin tổng thể căn nhà",
      items: clean([
        detail("Phòng khách dùng chung", details.livingRooms, " phòng"),
        detail("Phòng bếp dùng chung", details.kitchens, " phòng"),
        detail("Sân thượng", booleanLabel(details.hasRooftopTerrace)),
        detail("Tổng số tầng", details.totalFloors),
        detail("Nội thất chung", label(details.furnishing, FURNISHING_LABELS)),
        detail("Pháp lý", label(details.legalStatus, LEGAL_LABELS)),
      ]),
    });
  }

  if (property.category === "room" && details.rentalMode === "MULTIPLE_UNITS") {
    sections.splice(1, 0, {
      title: "Thông tin tổng thể dãy trọ",
      items: clean([
        detail("Tổng số tầng", details.totalFloors),
        detail("Giờ mở cửa / ra vào", details.openingHours),
        detail("Giờ giới nghiêm", details.curfew),
        detail("Bếp dùng chung", label(details.sharedKitchen, { YES: "Có", NO: "Không" })),
        detail("Chỗ để xe chung", label(details.sharedParking, { YES: "Có", NO: "Không" })),
      ]),
    });
  }

  return sections.filter((section) => section.items.length);
}

function categoryTitle(category: RentPropertyItem["category"]) {
  return {
    apartment: "Thông tin căn hộ",
    house: "Thông tin ngôi nhà",
    room: "Thông tin phòng trọ",
    studio: "Thông tin studio / văn phòng",
    commercial: "Thông tin mặt bằng",
    office: "Thông tin văn phòng",
    villa: "Thông tin biệt thự",
  }[category];
}

function detail(labelText: string, value: unknown, suffix = "", money = false): RentDetailItem {
  if (value === undefined || value === null || value === "") return { label: labelText, value: "" };
  if (money) return { label: labelText, value: `${new Intl.NumberFormat("vi-VN").format(Number(value))} VNĐ${suffix}` };
  return { label: labelText, value: `${value}${suffix}` };
}

function booleanLabel(value: unknown) {
  return typeof value === "boolean" ? (value ? "Có" : "Không") : "";
}

function label(value: unknown, labels: Record<string, string>) {
  return typeof value === "string" ? labels[value] ?? value : "";
}

function clean(items: RentDetailItem[]) {
  return items.filter((item) => item.value);
}
